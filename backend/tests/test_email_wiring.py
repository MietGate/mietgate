"""MietGate: Email-wiring smoke tests for iteration_5.

Verifies that all endpoints that were newly wired with best-effort emails still
respond with the expected status codes and payload shape and DO NOT return 500
because of the email-side-effect wiring.

Endpoints under test:
  - POST   /api/public/apply           (existing applicant email + NEW landlord email)
  - PATCH  /api/applications/{id}/status (NEW email to applicant + label)
  - POST   /api/viewings/{vid}/invite   (invite email to applicant + status->besichtigung)
  - POST   /api/viewings/{vid}/respond  (NEW email to landlord)
  - POST   /api/viewings/{vid}/book-slot (NEW email to landlord)
  - DELETE /api/viewings/{vid}          (NEW cancellation emails)

Plus a light regression pass (login, property CRUD, viewing create, application list).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

_RUN = uuid.uuid4().hex[:6]
LL_EMAIL = f"em-ll-{_RUN}@example.com"
LL_PASS = "Test1234!"
APP_EMAIL = f"em-app-{_RUN}@example.com"
APP_PASS = "Applicant123!"


@pytest.fixture(scope="module")
def state():
    return {}


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _hll(state):  # landlord auth header
    return {"Authorization": f"Bearer {state['ll_token']}"}


def _hap(state):  # applicant auth header
    return {"Authorization": f"Bearer {state['ap_token']}"}


# ---------------- Setup: register landlord, create property, seed application ----------------
class TestSetup:
    def test_register_landlord(self, http, state):
        r = http.post(f"{API}/auth/register", json={
            "email": LL_EMAIL, "password": LL_PASS,
            "first_name": "Em", "last_name": "Ll",
            "role": "landlord", "org_name": f"EmailOrg-{_RUN}",
        })
        assert r.status_code == 200, r.text
        j = r.json()
        state["ll_token"] = j["token"]
        state["ll_user"] = j["user"]

    def test_create_property(self, http, state):
        r = http.post(f"{API}/properties",
                      json={"title": f"TEST_EmailWohnung-{_RUN}", "city": "Berlin",
                            "cold_rent": 900, "warm_rent": 1200, "rooms": 2, "area": 55,
                            "status": "active"}, headers=_hll(state))
        assert r.status_code == 200, r.text
        state["prop_id"] = r.json()["id"]
        state["code"] = r.json()["application_code"]

    def test_public_apply_creates_applicant_and_returns_200(self, http, state):
        """POST /api/public/apply: response unchanged (ok, application_id).
        Landlord email is best-effort — a mail failure MUST NOT break this call.
        """
        payload = {
            "code": state["code"], "email": APP_EMAIL,
            "form_data": {"vorname": "Max", "nachname": "Muster",
                          "telefon": "+491700000000", "anzahl_personen": 2,
                          "nettoeinkommen": "3000_plus",
                          "gewuenschter_einzugstermin": "2026-03-01"},
            "consent": True,
        }
        r = http.post(f"{API}/public/apply", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True
        assert j["application_id"]
        assert j["account_created"] is True
        assert j["activation_token"]
        state["app_id"] = j["application_id"]
        state["activation_token"] = j["activation_token"]

    def test_activate_applicant_and_login(self, http, state):
        r = http.post(f"{API}/auth/reset-password",
                      json={"token": state["activation_token"], "password": APP_PASS})
        assert r.status_code == 200
        r2 = http.post(f"{API}/auth/login",
                       json={"email": APP_EMAIL, "password": APP_PASS})
        assert r2.status_code == 200
        state["ap_token"] = r2.json()["token"]
        state["ap_user"] = r2.json()["user"]


# ---------------- Application status change → applicant email ----------------
class TestApplicationStatusEmail:
    def test_patch_status_pruefung_200(self, http, state):
        r = http.patch(f"{API}/applications/{state['app_id']}/status",
                       json={"status": "pruefung"}, headers=_hll(state))
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True, "status": "pruefung"}

    def test_patch_status_interessant_200(self, http, state):
        r = http.patch(f"{API}/applications/{state['app_id']}/status",
                       json={"status": "interessant"}, headers=_hll(state))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "interessant"

    def test_patch_status_zusage_200(self, http, state):
        r = http.patch(f"{API}/applications/{state['app_id']}/status",
                       json={"status": "zusage"}, headers=_hll(state))
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "zusage"

    def test_patch_status_persisted(self, http, state):
        r = http.get(f"{API}/applications/{state['app_id']}", headers=_hll(state))
        assert r.status_code == 200
        assert r.json()["status"] == "zusage"

    def test_patch_status_invalid_400(self, http, state):
        r = http.patch(f"{API}/applications/{state['app_id']}/status",
                       json={"status": "nope"}, headers=_hll(state))
        assert r.status_code == 400


# ---------------- Viewings: invite / respond / delete (single-datetime) ----------------
class TestViewingSingle:
    def test_create_viewing_single(self, http, state):
        r = http.post(f"{API}/viewings",
                      json={"property_id": state["prop_id"], "type": "single",
                            "title": f"TEST_View-Single-{_RUN}",
                            "datetime": "2026-03-15T14:00:00Z",
                            "notes": "email-test"}, headers=_hll(state))
        assert r.status_code == 200, r.text
        state["vid_single"] = r.json()["id"]

    def test_invite_returns_200_and_participants(self, http, state):
        r = http.post(f"{API}/viewings/{state['vid_single']}/invite",
                      json={"application_ids": [state["app_id"]]}, headers=_hll(state))
        assert r.status_code == 200, r.text
        parts = r.json()["participants"]
        assert any(p["application_id"] == state["app_id"] for p in parts)

    def test_invite_sets_application_status_besichtigung(self, http, state):
        r = http.get(f"{API}/applications/{state['app_id']}", headers=_hll(state))
        assert r.status_code == 200
        assert r.json()["status"] == "besichtigung"

    def test_respond_confirm_200(self, http, state):
        r = http.post(f"{API}/viewings/{state['vid_single']}/respond",
                      json={"action": "confirm", "message": "Passt bei mir"}, headers=_hap(state))
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

    def test_respond_reschedule_200(self, http, state):
        r = http.post(f"{API}/viewings/{state['vid_single']}/respond",
                      json={"action": "reschedule"}, headers=_hap(state))
        assert r.status_code == 200, r.text

    def test_respond_decline_200(self, http, state):
        r = http.post(f"{API}/viewings/{state['vid_single']}/respond",
                      json={"action": "decline"}, headers=_hap(state))
        assert r.status_code == 200, r.text

    def test_respond_not_invited_403(self, http, state):
        # applicant is invited to vid_single, but let's test 403 by creating a fresh viewing
        r = http.post(f"{API}/viewings",
                      json={"property_id": state["prop_id"], "type": "single",
                            "title": "TEST_View-Nobody",
                            "datetime": "2026-04-01T10:00:00Z"}, headers=_hll(state))
        assert r.status_code == 200
        vid = r.json()["id"]
        r2 = http.post(f"{API}/viewings/{vid}/respond",
                       json={"action": "confirm"}, headers=_hap(state))
        assert r2.status_code == 403
        # cleanup: delete this empty viewing (no participants -> no emails)
        rd = http.delete(f"{API}/viewings/{vid}", headers=_hll(state))
        assert rd.status_code == 200

    def test_delete_viewing_with_participants_200(self, http, state):
        """DELETE sends cancellation email(s) to all participants (best-effort)."""
        r = http.delete(f"{API}/viewings/{state['vid_single']}", headers=_hll(state))
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}


# ---------------- Viewings: slots-based (book-slot) ----------------
class TestViewingSlots:
    def test_create_slot_viewing(self, http, state):
        r = http.post(f"{API}/viewings",
                      json={"property_id": state["prop_id"], "type": "slots",
                            "title": f"TEST_View-Slots-{_RUN}",
                            "slots": ["2026-03-20T10:00:00Z",
                                      "2026-03-20T11:00:00Z",
                                      "2026-03-20T12:00:00Z"]},
                      headers=_hll(state))
        assert r.status_code == 200, r.text
        state["vid_slots"] = r.json()["id"]

    def test_invite_to_slot_viewing(self, http, state):
        r = http.post(f"{API}/viewings/{state['vid_slots']}/invite",
                      json={"application_ids": [state["app_id"]]}, headers=_hll(state))
        assert r.status_code == 200, r.text

    def test_book_slot_200(self, http, state):
        r = http.post(f"{API}/viewings/{state['vid_slots']}/book-slot",
                      json={"slot_time": "2026-03-20T11:00:00Z"}, headers=_hap(state))
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        assert r.json()["slot"] == "2026-03-20T11:00:00Z"

    def test_book_slot_rebook_switches_slot_200(self, http, state):
        r = http.post(f"{API}/viewings/{state['vid_slots']}/book-slot",
                      json={"slot_time": "2026-03-20T12:00:00Z"}, headers=_hap(state))
        assert r.status_code == 200, r.text
        assert r.json()["slot"] == "2026-03-20T12:00:00Z"

    def test_book_slot_wrong_type_400(self, http, state):
        # create a "single" viewing then attempt book-slot -> 400 Kein Zeitfenster-Termin
        r = http.post(f"{API}/viewings",
                      json={"property_id": state["prop_id"], "type": "single",
                            "title": "TEST_View-NotSlots",
                            "datetime": "2026-05-01T10:00:00Z"}, headers=_hll(state))
        assert r.status_code == 200
        vid = r.json()["id"]
        # applicant needs to be invited first, otherwise 403. We invite so we hit the type check.
        ri = http.post(f"{API}/viewings/{vid}/invite",
                       json={"application_ids": [state["app_id"]]}, headers=_hll(state))
        assert ri.status_code == 200
        r2 = http.post(f"{API}/viewings/{vid}/book-slot",
                       json={"slot_time": "x"}, headers=_hap(state))
        assert r2.status_code == 400
        # cleanup
        rd = http.delete(f"{API}/viewings/{vid}", headers=_hll(state))
        assert rd.status_code == 200


# ---------------- Regression: existing flows ----------------
class TestRegression:
    def test_health(self, http):
        r = http.get(f"{API}/health")
        assert r.status_code == 200 and r.json()["status"] == "ok"

    def test_login_still_works(self, http, state):
        r = http.post(f"{API}/auth/login",
                      json={"email": LL_EMAIL, "password": LL_PASS})
        assert r.status_code == 200
        state["ll_token"] = r.json()["token"]

    def test_property_list(self, http, state):
        r = http.get(f"{API}/properties", headers=_hll(state))
        assert r.status_code == 200
        assert any(p["id"] == state["prop_id"] for p in r.json())

    def test_property_update(self, http, state):
        # PUT expects the full PropertyPayload (title is required)
        r = http.put(f"{API}/properties/{state['prop_id']}",
                     json={"title": f"TEST_EmailWohnung-{_RUN}", "city": "Berlin",
                           "cold_rent": 950, "warm_rent": 1250,
                           "rooms": 2, "area": 55, "status": "active"},
                     headers=_hll(state))
        assert r.status_code == 200, r.text
        r2 = http.get(f"{API}/properties/{state['prop_id']}", headers=_hll(state))
        assert r2.status_code == 200
        assert r2.json()["cold_rent"] == 950

    def test_application_list_by_property(self, http, state):
        r = http.get(f"{API}/applications?property_id={state['prop_id']}", headers=_hll(state))
        assert r.status_code == 200
        assert any(a["id"] == state["app_id"] for a in r.json())

    def test_viewing_create_still_works(self, http, state):
        r = http.post(f"{API}/viewings",
                      json={"property_id": state["prop_id"], "type": "single",
                            "title": "TEST_Regression-View",
                            "datetime": "2026-06-01T09:00:00Z"}, headers=_hll(state))
        assert r.status_code == 200
        # cleanup (no participants -> no emails)
        rd = http.delete(f"{API}/viewings/{r.json()['id']}", headers=_hll(state))
        assert rd.status_code == 200
