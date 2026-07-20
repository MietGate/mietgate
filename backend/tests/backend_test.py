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

    def test_plan_limit_enforcement(self, session_client, state):
        """Free plan allows only 1 active property; second active must return 402."""
        payload = {"title": f"TEST_Second-{_RUN}", "status": "active"}
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties", json=payload, headers=h)
        assert r.status_code == 402, f"Expected 402, got {r.status_code}: {r.text}"

    def test_link_toggle(self, session_client, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = session_client.post(f"{API}/properties/{state['property_id']}/link/toggle", headers=h)
        assert r.status_code == 200
        assert r.json()["link_active"] is False
        # toggle back
        r2 = session_client.post(f"{API}/properties/{state['property_id']}/link/toggle", headers=h)
        assert r2.json()["link_active"] is True

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
