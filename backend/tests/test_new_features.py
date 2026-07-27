"""New feature tests: Admin Partner Links, Maintenance run, Applicant Premium checkout.

Covers the batch added just now:
- GET/PUT /api/admin/partners (admin-only) + public visibility via /api/partners
- POST /api/admin/maintenance/run (admin-only)
- POST /api/premium/checkout (any authenticated user; 400 if user.premium already true)
- 403 for non-admin on /api/admin/partners and /api/admin/maintenance/run
"""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@mietgate.de"
ADMIN_PASSWORD = "MietGate2026!"

_RUN = uuid.uuid4().hex[:6]
LANDLORD_EMAIL = f"nf-landlord-{_RUN}@example.com"
LANDLORD_PASSWORD = "Test1234!"
APPLICANT_EMAIL = f"nf-applicant-{_RUN}@example.com"
APPLICANT_PASSWORD = "Applicant123!"


@pytest.fixture(scope="module")
def state():
    return {}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Setup: admin login + landlord register + applicant via public apply ----------
class TestSetup:
    def test_admin_login(self, s, state):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "admin"
        state["admin_token"] = r.json()["token"]

    def test_landlord_register(self, s, state):
        r = s.post(f"{API}/auth/register", json={
            "email": LANDLORD_EMAIL, "password": LANDLORD_PASSWORD,
            "first_name": "NF", "last_name": "Landlord",
            "role": "landlord", "org_name": f"NFOrg-{_RUN}",
        })
        assert r.status_code == 200, r.text
        state["landlord_token"] = r.json()["token"]
        state["landlord_user"] = r.json()["user"]

    def test_seed_applicant(self, s, state):
        """Create a real applicant via public apply flow (produces activation token)."""
        # Create property
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = s.post(f"{API}/properties", json={
            "title": f"NF_Wohnung-{_RUN}", "city": "Berlin", "zip": "10115",
            "area": 60.0, "rooms": 2.0, "cold_rent": 900.0, "warm_rent": 1100.0,
            "status": "active",
        }, headers=h)
        assert r.status_code == 200, r.text
        code = r.json()["application_code"]

        # Apply publicly
        r2 = s.post(f"{API}/public/apply", json={
            "code": code, "email": APPLICANT_EMAIL,
            "form_data": {"vorname": "Nina", "nachname": "Test"},
            "consent": True,
        })
        assert r2.status_code == 200, r2.text
        token = r2.json()["activation_token"]

        # Activate password
        r3 = s.post(f"{API}/auth/reset-password", json={"token": token, "password": APPLICANT_PASSWORD})
        assert r3.status_code == 200, r3.text

        # Login as applicant
        r4 = s.post(f"{API}/auth/login", json={"email": APPLICANT_EMAIL, "password": APPLICANT_PASSWORD})
        assert r4.status_code == 200, r4.text
        state["applicant_token"] = r4.json()["token"]
        state["applicant_user"] = r4.json()["user"]


# ---------- Admin Partner Links ----------
class TestPartners:
    def test_admin_get_partners_ok(self, s, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        r = s.get(f"{API}/admin/partners", headers=h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "offers" in j
        assert isinstance(j.get("offers"), list)

    def test_admin_get_partners_forbidden_for_landlord(self, s, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = s.get(f"{API}/admin/partners", headers=h)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_admin_get_partners_forbidden_for_applicant(self, s, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = s.get(f"{API}/admin/partners", headers=h)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_admin_put_partners_forbidden_for_non_admin(self, s, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = s.put(f"{API}/admin/partners",
                  json={"bonify_url": "https://x", "bonify_text": "x", "offers": []},
                  headers=h)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_admin_put_partners_and_public_visibility(self, s, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        payload = {
            "bonify_url": f"https://bonify-test-{_RUN}.example.com",
            "bonify_text": f"TEST_BONITY_TEXT_{_RUN}",
            "bonify_steps": ["Schritt eins", "Schritt zwei"],
            "bonify_is_affiliate": True,
            "offers": [
                {"category": "Strom", "name": f"TEST_Anbieter_{_RUN}",
                 "url": f"https://strom-{_RUN}.example.com",
                 "description": f"TEST offer description {_RUN}"},
                {"category": "Internet", "name": "InetCo",
                 "url": "https://inet.example.com", "description": "Schnelles Internet"},
            ],
        }
        r = s.put(f"{API}/admin/partners", json=payload, headers=h)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("bonify_url") == payload["bonify_url"]
        assert data.get("bonify_text") == payload["bonify_text"]
        assert data.get("bonify_steps") == payload["bonify_steps"]
        assert len(data.get("offers", [])) == 2

        # Read back via admin GET
        r2 = s.get(f"{API}/admin/partners", headers=h)
        assert r2.status_code == 200
        assert r2.json().get("bonify_url") == payload["bonify_url"]
        assert len(r2.json().get("offers", [])) == 2

        # Public visibility on /api/partners (no auth)
        r3 = requests.get(f"{API}/partners")
        assert r3.status_code == 200, r3.text
        pub = r3.json()
        assert pub.get("bonify_url") == payload["bonify_url"]
        # The former SCHUFA affiliate fields must not leak back out.
        assert "schufa_url" not in pub
        offers = pub.get("offers", [])
        assert any(o.get("name") == f"TEST_Anbieter_{_RUN}" for o in offers), pub
        # ensure Mongo _id was NOT leaked
        assert "_id" not in pub


# ---------- Admin Maintenance run ----------
class TestMaintenance:
    def test_maintenance_run_admin_ok(self, s, state):
        h = {"Authorization": f"Bearer {state['admin_token']}"}
        r = s.post(f"{API}/admin/maintenance/run", headers=h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "reminders" in j and "deleted_applications" in j
        assert isinstance(j["reminders"], int)
        assert isinstance(j["deleted_applications"], int)

    def test_maintenance_run_forbidden_for_landlord(self, s, state):
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = s.post(f"{API}/admin/maintenance/run", headers=h)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_maintenance_run_forbidden_for_applicant(self, s, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = s.post(f"{API}/admin/maintenance/run", headers=h)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_maintenance_run_requires_auth(self, s):
        r = requests.post(f"{API}/admin/maintenance/run")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


# ---------- Applicant Premium checkout ----------
class TestPremiumCheckout:
    def test_premium_checkout_applicant(self, s, state):
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = s.post(f"{API}/premium/checkout",
                   json={"origin_url": BASE_URL}, headers=h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("checkout_url", "").startswith("http"), j
        assert j.get("session_id"), j
        # Should route to Stripe
        assert "stripe.com" in j["checkout_url"] or "checkout" in j["checkout_url"].lower()

    def test_premium_checkout_landlord_allowed(self, s, state):
        """Per spec: even landlord can trigger premium checkout as long as not already premium."""
        h = {"Authorization": f"Bearer {state['landlord_token']}"}
        r = s.post(f"{API}/premium/checkout",
                   json={"origin_url": BASE_URL}, headers=h)
        assert r.status_code == 200, r.text
        assert r.json().get("checkout_url", "").startswith("http")

    def test_premium_checkout_400_if_already_premium(self, s, state):
        """Flip user.premium in Mongo directly and verify 400."""
        import subprocess
        uid = state["applicant_user"]["id"]
        cmd = f'db.users.updateOne({{id:"{uid}"}}, {{$set:{{premium:true}}}}); db.users.findOne({{id:"{uid}"}}, {{premium:1}});'
        subprocess.run(
            ["mongosh", "--quiet", "mongodb://localhost:27017/mietgate", "--eval", cmd],
            capture_output=True, text=True, timeout=15,
        )
        h = {"Authorization": f"Bearer {state['applicant_token']}"}
        r = s.post(f"{API}/premium/checkout",
                   json={"origin_url": BASE_URL}, headers=h)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        # cleanup: reset premium=false
        cmd2 = f'db.users.updateOne({{id:"{uid}"}}, {{$set:{{premium:false}}}});'
        subprocess.run(
            ["mongosh", "--quiet", "mongodb://localhost:27017/mietgate", "--eval", cmd2],
            capture_output=True, text=True, timeout=15,
        )

    def test_premium_checkout_requires_auth(self, s):
        r = requests.post(f"{API}/premium/checkout", json={"origin_url": BASE_URL})
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
