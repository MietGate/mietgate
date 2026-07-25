"""MietGate backend integration tests (pytest)."""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://property-manager-373.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@mietgate.de"
ADMIN_PASSWORD = "MietGate2026!"

# Unique landlord / applicant per test run to keep the suite idempotent.
_RUN = uuid.uuid4().hex[:6]
LANDLORD_EMAIL = f"test-landlord-{_RUN}@example.com"
LANDLORD_PASSWORD = "Test1234!"
APPLICANT_EMAIL = f"test-applicant-{_RUN}@example.com"


@pytest.fixture(scope="session")
def state():
    return {}


@pytest.fixture(scope="session")
def session_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Health & Plans ----------------
class TestHealth:
    def test_health(self, session_client):
        r = session_client.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_plans_seeded(self, session_client):
        r = session_client.get(f"{API}/plans")
        assert r.status_code == 200
        plans = r.json()
        keys = {p["key"] for p in plans}
        assert {"starter", "plus", "makler", "whitelabel"}.issubset(keys)


# ---------------- Auth ----------------
class TestAuth:
    def test_register_landlord(self, session_client, state):
        payload = {
            "email": LANDLORD_EMAIL, "password": LANDLORD_PASSWORD,
            "first_name": "Test", "last_name": "Landlord",
            "role": "landlord", "org_name": f"TestOrg-{_RUN}",
        }
        r = session_client.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["role"] == "landlord"
        assert data["user"]["org_id"]
        state["landlord_token"] = data["token"]
        state["landlord_user"] = data["user"]

    def test_login_landlord(self, session_client, state):
        r = session_client.post(f"{API}/auth/login",
                                json={"email": LANDLORD_EMAIL, "password": LANDLORD_PASSWORD})
        assert r.status_code == 200, r.text
        state["landlord_token"] = r.json()["token"]

    def test_login_invalid(self, session_client):
        r = session_client.post(f"{API}/auth/login",
                                json={"email": LANDLORD_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me(self, session_client, state):
        r = session_client.get(f"{API}/auth/me",
                               headers={"Authorization": f"Bearer {state['landlord_token']}"})
        assert r.status_code == 200
        assert r.json()["email"] == LANDLORD_EMAIL

    def test_admin_login(self, session_client, state):
        r = session_client.post(f"{API}/auth/login",
                                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "admin"
        state["admin_token"] = r.json()["token"]


# ---------------- Properties ----------------
class TestProperties:
    def test_create_property(self, session_client, state):
        payload = {
            "title": f"TEST_Wohnung-{_RUN}", "city": "Berlin", "zip": "10115",
            "area": 75.0, "rooms": 3.0, "cold_rent": 1200.0, "warm_rent": 1500.0,
            "status": "active",
        }
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties", json=payload, headers=h)
        assert r.status_code == 200, r.text
        prop = r.json()
        assert prop["title"] == payload["title"]
        assert prop["application_code"] and len(prop["application_code"]) >= 4
        state["property_id"] = prop["id"]
        state["application_code"] = prop["application_code"]

    def test_get_property(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.get(f"{API}/properties/{state['property_id']}", headers=h)
        assert r.status_code == 200
        assert r.json()["id"] == state["property_id"]

    def test_no_creation_time_limit(self, session_client, state):
        """Property creation/editing is free and unlimited; the plan limit only
        applies to activating an application link (see TestLinkActivation)."""
        payload = {"title": f"TEST_Second-{_RUN}", "status": "active"}
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties", json=payload, headers=h)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        assert r.json()["link_active"] is False, "new properties start with an inactive (unpaid) link"

    def test_link_toggle_requires_active_link(self, session_client, state):
        """A freshly created property's link starts inactive; toggling an already-inactive
        link is rejected (activation only happens through /link/activate)."""
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties/{state['property_id']}/link/toggle", headers=h)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_link_activate_needs_payment(self, session_client, state):
        """No subscription exists yet for this org, so activating a link must
        require checkout (a 3-day trial) rather than activating for free."""
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties/{state['property_id']}/link/activate", json={}, headers=h)
        assert r.status_code == 200, r.text
        assert r.json().get("needs_payment") is True

    def test_entitlements_zero_without_subscription(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.get(f"{API}/me/entitlements", headers=h)
        assert r.status_code == 200
        assert r.json()["limit"] == 0

    def test_admin_grants_manual_subscription(self, session_client, state):
        """Simulates a completed Stripe checkout via the admin manual-override
        endpoint (ROADMAP item 9), so the rest of the suite can exercise the
        paid link-activation and public-application flow without a real Stripe
        checkout, which can't be driven headlessly."""
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        r = session_client.post(f"{API}/organizations/{state['landlord_user']['org_id']}/subscription",
                                json={"plan_key": "starter", "status": "active"}, headers=h)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "active"

    def test_link_activate_succeeds_within_plan(self, session_client, state):
        """With an active subscription and usage under the plan's limit, activation is free."""
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties/{state['property_id']}/link/activate", json={}, headers=h)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("activated") is True
        assert d["property"]["link_active"] is True
        state["application_code"] = d["property"]["application_code"]

    def test_link_activate_second_property_hits_limit(self, session_client, state):
        """Starter plan allows only 1 active link; a second activation must 402."""
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        props = session_client.get(f"{API}/properties", headers=h).json()
        second = next(p for p in props if p["id"] != state["property_id"])
        r = session_client.post(f"{API}/properties/{second['id']}/link/activate", json={}, headers=h)
        assert r.status_code == 402, f"Expected 402, got {r.status_code}: {r.text}"

    def test_link_regenerate(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties/{state['property_id']}/link/regenerate", headers=h)
        assert r.status_code == 200
        new_code = r.json()["application_code"]
        assert new_code != state["application_code"]
        state["application_code"] = new_code


# ---------------- Public application flow ----------------
class TestPublicApplication:
    def test_public_property(self, session_client, state):
        r = session_client.get(f"{API}/public/property/{state['application_code']}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["property"]["title"].startswith("TEST_Wohnung")
        assert isinstance(data["fields"], list)

    def test_public_apply_rejects_no_consent(self, session_client, state):
        payload = {"code": state["application_code"], "email": APPLICANT_EMAIL,
                   "form_data": {"vorname": "Max", "nachname": "Mustermann"}, "consent": False}
        r = session_client.post(f"{API}/public/apply", json=payload)
        assert r.status_code == 400

    def test_public_apply_ok(self, session_client, state):
        payload = {"code": state["application_code"], "email": APPLICANT_EMAIL,
                   "form_data": {"vorname": "Max", "nachname": "Mustermann",
                                 "telefon": "+491700000000", "einkommen": "3500"},
                   "consent": True}
        r = session_client.post(f"{API}/public/apply", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] and d["application_id"]
        assert d["account_created"] is True and d["activation_token"]
        state["application_id"] = d["application_id"]
        state["activation_token"] = d["activation_token"]


# ---------------- Applications (landlord) ----------------
class TestApplications:
    def test_list_with_matching_score(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.get(f"{API}/applications?property_id={state['property_id']}", headers=h)
        assert r.status_code == 200, r.text
        apps = r.json()
        assert any(a["id"] == state["application_id"] for a in apps)
        a = next(a for a in apps if a["id"] == state["application_id"])
        assert "matching_score" in a
        assert isinstance(a["matching_score"], (int, float))

    def test_update_status(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        for status in ["pruefung", "interessant", "favorit"]:
            r = session_client.patch(f"{API}/applications/{state['application_id']}/status",
                                     json={"status": status}, headers=h)
            assert r.status_code == 200
            assert r.json()["status"] == status
        # verify persisted
        r = session_client.get(f"{API}/applications/{state['application_id']}", headers=h)
        assert r.json()["status"] == "favorit"

    def test_update_status_invalid(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.patch(f"{API}/applications/{state['application_id']}/status",
                                 json={"status": "invalid_status"}, headers=h)
        assert r.status_code == 400

    def test_update_app_meta(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.patch(f"{API}/applications/{state['application_id']}",
                                 json={"stars": 4, "tags": ["top"],
                                       "internal_notes": "sehr guter Bewerber"}, headers=h)
        assert r.status_code == 200
        r2 = session_client.get(f"{API}/applications/{state['application_id']}", headers=h)
        assert r2.json()["stars"] == 4
        assert r2.json()["internal_notes"] == "sehr guter Bewerber"


# ---------------- Applicant login + documents ----------------
class TestApplicantAndDocuments:
    def test_activate_applicant(self, session_client, state):
        # set password via reset-password using activation_token
        r = session_client.post(f"{API}/auth/reset-password",
                                json={"token": state["activation_token"], "password": "Applicant123!"})
        assert r.status_code == 200
        # login
        r2 = session_client.post(f"{API}/auth/login",
                                 json={"email": APPLICANT_EMAIL, "password": "Applicant123!"})
        assert r2.status_code == 200
        state["applicant_token"] = r2.json()["token"]
        state["applicant_user"] = r2.json()["user"]

    def test_document_upload_authenticated(self, session_client, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 test file"), "application/pdf")}
        data = {"doc_type": "Gehaltsnachweis", "application_id": state["application_id"]}
        # requests can't send both json headers and multipart; drop Content-Type
        r = requests.post(f"{API}/documents/upload", files=files, data=data, headers=h)
        assert r.status_code == 200, r.text
        state["document_id"] = r.json()["id"]

    def test_public_document_upload(self, session_client, state):
        files = {"file": ("test2.pdf", io.BytesIO(b"%PDF-1.4 public"), "application/pdf")}
        data = {"code": state["application_code"], "application_id": state["application_id"],
                "doc_type": "Ausweis"}
        r = requests.post(f"{API}/public/documents/upload", files=files, data=data)
        assert r.status_code == 200, r.text

    def test_download_requires_auth(self, session_client, state):
        r = requests.get(f"{API}/documents/{state['document_id']}/download")
        assert r.status_code == 401

    def test_download_owner_ok(self, session_client, state):
        r = requests.get(f"{API}/documents/{state['document_id']}/download",
                         headers={"Authorization": f"Bearer {state['applicant_token']}"})
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

    def test_download_via_query_token(self, session_client, state):
        r = requests.get(f"{API}/documents/{state['document_id']}/download?auth={state['applicant_token']}")
        assert r.status_code == 200

    def test_download_forbidden_other_user(self, session_client, state):
        # Create a second landlord (different org). Should be denied.
        other = {
            "email": f"other-{_RUN}@example.com", "password": "Test1234!",
            "first_name": "Other", "last_name": "User",
            "role": "landlord", "org_name": f"OtherOrg-{_RUN}",
        }
        r0 = session_client.post(f"{API}/auth/register", json=other)
        assert r0.status_code == 200
        other_tok = r0.json()["token"]
        r = requests.get(f"{API}/documents/{state['document_id']}/download",
                         headers={"Authorization": f"Bearer {other_tok}"})
        assert r.status_code == 403


# ---------------- Viewings ----------------
class TestViewings:
    def test_create_viewing(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/viewings",
                                json={"property_id": state["property_id"], "type": "single",
                                      "title": "TEST Besichtigung",
                                      "datetime": "2026-02-15T14:00:00Z",
                                      "notes": "TEST"}, headers=h)
        assert r.status_code == 200, r.text
        state["viewing_id"] = r.json()["id"]

    def test_invite_applicant(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/viewings/{state['viewing_id']}/invite",
                                json={"application_ids": [state["application_id"]]}, headers=h)
        assert r.status_code == 200
        parts = r.json()["participants"]
        assert any(p["application_id"] == state["application_id"] for p in parts)

    def test_my_viewings(self, session_client, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = session_client.get(f"{API}/my/viewings", headers=h)
        assert r.status_code == 200
        assert any(v["id"] == state["viewing_id"] for v in r.json())

    def test_respond_viewing(self, session_client, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = session_client.post(f"{API}/viewings/{state['viewing_id']}/respond",
                                json={"action": "confirm"}, headers=h)
        assert r.status_code == 200


# ---------------- Messaging ----------------
class TestMessaging:
    def test_send_message_landlord(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/messages",
                                json={"application_id": state["application_id"],
                                      "body": "Hallo Bewerber"}, headers=h)
        assert r.status_code == 200

    def test_get_messages(self, session_client, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = session_client.get(f"{API}/messages?application_id={state['application_id']}", headers=h)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_notifications(self, session_client, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = session_client.get(f"{API}/notifications", headers=h)
        assert r.status_code == 200
        r2 = session_client.get(f"{API}/notifications/unread-count", headers=h)
        assert r2.status_code == 200 and "count" in r2.json()


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.get(f"{API}/dashboard", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["active_properties"] >= 1
        assert d["total_applications"] >= 1


# ---------------- Payments ----------------
class TestPayments:
    def test_checkout(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/payments/checkout",
                                json={"plan_key": "plus", "interval": "monthly",
                                      "origin_url": BASE_URL}, headers=h)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("checkout_url", "").startswith("http")


# ---------------- Admin ----------------
class TestAdmin:
    def test_admin_stats(self, session_client, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        r = session_client.get(f"{API}/admin/stats", headers=h)
        assert r.status_code == 200
        assert "total_users" in r.json()

    def test_admin_users(self, session_client, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        r = session_client.get(f"{API}/admin/users", headers=h)
        assert r.status_code == 200
        assert any(u["email"] == LANDLORD_EMAIL for u in r.json())

    def test_admin_block_unblock(self, session_client, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        target_id = state["landlord_user"]["id"]
        r = session_client.post(f"{API}/admin/users/{target_id}/block", headers=h)
        assert r.status_code == 200
        # blocked user cannot login
        rl = session_client.post(f"{API}/auth/login",
                                 json={"email": LANDLORD_EMAIL, "password": LANDLORD_PASSWORD})
        assert rl.status_code == 403
        r2 = session_client.post(f"{API}/admin/users/{target_id}/unblock", headers=h)
        assert r2.status_code == 200
        rl2 = session_client.post(f"{API}/auth/login",
                                  json={"email": LANDLORD_EMAIL, "password": LANDLORD_PASSWORD})
        assert rl2.status_code == 200
        state["landlord_token"] = rl2.json()["token"]

    def test_admin_orgs(self, session_client, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        r = session_client.get(f"{API}/admin/organizations", headers=h)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_admin_update_plan(self, session_client, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        payload = {"key": "starter", "name": "Starter", "price_monthly": 14.99,
                   "price_yearly": 143.9, "max_properties": 1, "sort_order": 1,
                   "features": ["1 aktives Objekt"],
                   "monthly_lookup": "starter_monthly", "yearly_lookup": "starter_yearly",
                   "is_active": True}
        r = session_client.put(f"{API}/admin/plans/starter", json=payload, headers=h)
        assert r.status_code == 200

    def test_admin_create_promotion(self, session_client, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        payload = {"name": f"TEST_Promo_{_RUN}", "plan_key": "all",
                   "start": "2026-01-01T00:00:00+00:00",
                   "end": "2026-12-31T23:59:59+00:00",
                   "discount_percent": 10, "active": True, "show_on_landing": True}
        r = session_client.post(f"{API}/admin/promotions", json=payload, headers=h)
        assert r.status_code == 200
        state["promotion_id"] = r.json()["id"]

    def test_cleanup_promotion(self, session_client, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        r = session_client.delete(f"{API}/admin/promotions/{state['promotion_id']}", headers=h)
        assert r.status_code == 200


# ---------------- Gating: Team & White-Label (NEW) ----------------
class TestGating:
    """Verifies fix #2 (team gating) and fix #3 (white-label gating)."""

    def _mongo_shell(self, cmd: str) -> str:
        """Run a mongosh eval command inside the DB_NAME database."""
        import subprocess
        r = subprocess.run(
            ["mongosh", "--quiet", "mongodb://localhost:27017/mietgate", "--eval", cmd],
            capture_output=True, text=True, timeout=15,
        )
        return (r.stdout or "") + (r.stderr or "")

    # --- FIX 2 negative: no subscription => 402 on invite_member ---
    def test_subscription_reports_no_team_without_plan(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.get(f"{API}/subscription", headers=h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("supports_team") is False, f"expected supports_team=false, got {j}"
        assert j.get("white_label_addon") is False

    def test_invite_member_negative_402(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(
            f"{API}/organization/members",
            json={"email": f"invitee-{_RUN}@example.com", "role": "employee"},
            headers=h,
        )
        assert r.status_code == 402, f"Expected 402 (no team plan), got {r.status_code}: {r.text}"
        assert "Makler" in r.text or "Team" in r.text or "upgraden" in r.text.lower()

    # --- FIX 3 negative: no add-on => 402 when enabling white-label ---
    def test_white_label_negative_402(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.put(
            f"{API}/organization",
            json={"white_label": {"enabled": True, "company_name": "X"}},
            headers=h,
        )
        assert r.status_code == 402, f"Expected 402 (no WL add-on), got {r.status_code}: {r.text}"

    # --- FIX 2 positive: activate makler sub in Mongo, then invite succeeds ---
    def test_activate_makler_sub_via_mongo(self, session_client, state):
        org_id = state["landlord_user"]["org_id"]
        # Upsert an active makler subscription for this org
        cmd = (
            f'db.subscriptions.updateOne({{org_id:"{org_id}"}}, '
            f'{{$set:{{org_id:"{org_id}",plan_key:"makler",status:"active",'
            f'stripe_customer_id:"cus_test",stripe_subscription_id:"sub_test"}}}}, '
            f'{{upsert:true}}); '
            f'db.subscriptions.findOne({{org_id:"{org_id}"}});'
        )
        out = self._mongo_shell(cmd)
        assert "makler" in out, f"Mongo shell did not confirm sub: {out[:400]}"
        # Verify via API
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.get(f"{API}/subscription", headers=h)
        assert r.status_code == 200
        j = r.json()
        assert j.get("supports_team") is True, f"expected supports_team=true, got {j}"

    def test_invite_member_positive_needs_existing_user(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        # Unknown user email => 404
        r = session_client.post(
            f"{API}/organization/members",
            json={"email": f"nobody-{_RUN}@example.com", "role": "employee"},
            headers=h,
        )
        assert r.status_code == 404, f"Expected 404 (no such user), got {r.status_code}: {r.text}"

    def test_invite_member_positive_success(self, session_client, state):
        # Create a real user that can be invited
        invitee_email = f"invitee-real-{_RUN}@example.com"
        reg = session_client.post(f"{API}/auth/register", json={
            "email": invitee_email, "password": "Test1234!",
            "first_name": "Inv", "last_name": "Itee",
            "role": "landlord", "org_name": f"InviteeOrg-{_RUN}",
        })
        assert reg.status_code == 200, reg.text
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(
            f"{API}/organization/members",
            json={"email": invitee_email, "role": "employee"},
            headers=h,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        assert r.json().get("ok") is True
        # Verify listed
        lst = session_client.get(f"{API}/organization/members", headers=h)
        assert lst.status_code == 200
        assert any(m.get("email") == invitee_email for m in lst.json())

    # --- FIX 3 positive: set add-on flag on org, then PUT WL succeeds ---
    def test_white_label_positive_success(self, session_client, state):
        org_id = state["landlord_user"]["org_id"]
        cmd = (
            f'db.organizations.updateOne({{id:"{org_id}"}}, '
            f'{{$set:{{white_label_addon:true}}}}); '
            f'db.organizations.findOne({{id:"{org_id}"}});'
        )
        out = self._mongo_shell(cmd)
        assert "white_label_addon" in out, out[:400]
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        # /subscription now reports flag
        r_sub = session_client.get(f"{API}/subscription", headers=h)
        assert r_sub.status_code == 200
        assert r_sub.json().get("white_label_addon") is True
        # PUT with white_label.enabled=true succeeds
        r = session_client.put(
            f"{API}/organization",
            json={"white_label": {"enabled": True, "company_name": "ABC Immobilien"}},
            headers=h,
        )
        assert r.status_code == 200, f"Expected 200 after add-on, got {r.status_code}: {r.text}"
        assert (r.json().get("white_label") or {}).get("enabled") is True
        assert (r.json().get("white_label") or {}).get("company_name") == "ABC Immobilien"


# ---------------- Regression: Invite from pipeline (existing sub after gating tests) ----------------
class TestPipelineInviteRegression:
    """Sanity check: viewing invite endpoint still adds participant + sets status 'besichtigung'."""
    def test_invite_sets_status_besichtigung(self, session_client, state):
        # Fresh applicant + application to avoid interfering with earlier tests
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        # Ensure at least one viewing exists (was created in TestViewings)
        assert state.get("viewing_id"), "viewing_id missing"
        # Re-invite the existing application; endpoint is idempotent (skips existing)
        r = session_client.post(
            f"{API}/viewings/{state['viewing_id']}/invite",
            json={"application_ids": [state["application_id"]]}, headers=h,
        )
        assert r.status_code == 200
        # Fetch application, expect status == 'besichtigung'
        a = session_client.get(f"{API}/applications/{state['application_id']}", headers=h)
        assert a.status_code == 200
        assert a.json()["status"] == "besichtigung", f"expected besichtigung, got {a.json().get('status')}"
