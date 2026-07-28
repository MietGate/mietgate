"""Unit tests for the two highest-risk pieces of logic with zero prior coverage:
staged document release (DSGVO) and the Stripe VAT-regime bookkeeping (tax_facts).
Both are pure functions, so these run without a live server or database.
"""
import types
import pytest
from dotenv import load_dotenv

load_dotenv()  # stripe_service imports database.py, which reads MONGO_URL at module load

from constants import (
    doc_released_to_landlord, doc_release_hint, redact_doc_for_landlord,
    DOC_RELEASE_STAGE,
)
from stripe_service import tax_facts


# ---------- doc_released_to_landlord / redact_doc_for_landlord ----------

@pytest.mark.parametrize("status", ["neu", "pruefung", "interessant", "besichtigung"])
def test_bonity_docs_withheld_before_favorit(status):
    assert doc_released_to_landlord("Bonitätsauskunft", status) is False
    assert doc_released_to_landlord("Gehaltsnachweise", status) is False


@pytest.mark.parametrize("status", ["favorit", "zusage"])
def test_bonity_docs_released_from_favorit_onward(status):
    assert doc_released_to_landlord("Bonitätsauskunft", status) is True


@pytest.mark.parametrize("status", ["neu", "pruefung", "interessant", "besichtigung", "favorit"])
def test_id_docs_withheld_before_zusage(status):
    assert doc_released_to_landlord("Ausweis", status) is False
    assert doc_released_to_landlord("Aufenthaltstitel", status) is False


def test_id_docs_released_at_zusage():
    assert doc_released_to_landlord("Ausweis", "zusage") is True


def test_unlisted_doc_type_never_withheld():
    # "Sonstiges" and anything not in DOC_RELEASE_STAGE has no release gate.
    assert doc_released_to_landlord("Sonstiges", "neu") is True


@pytest.mark.parametrize("terminal_status", ["absage", "archiv", "zurueckgezogen"])
def test_bonity_docs_never_release_on_terminal_non_success_status(terminal_status):
    # These are deliberately absent from PIPELINE_STAGE_ORDER, so .get() falls back to -1
    # and nothing ever releases, even for a doc type gated at stage 0.
    assert doc_released_to_landlord("Bonitätsauskunft", terminal_status) is False


def test_release_hint_matches_required_stage():
    assert "Favorit" in doc_release_hint("Bonitätsauskunft")
    assert "Zusage" in doc_release_hint("Ausweis")
    assert doc_release_hint("Sonstiges") == ""


def test_redact_hides_filename_and_storage_path_when_withheld():
    rec = {"id": "d1", "doc_type": "Bonitätsauskunft", "storage_path": "org/secret.pdf",
           "original_filename": "schufa.pdf"}
    out = redact_doc_for_landlord(rec, "pruefung")
    assert out["released"] is False
    assert out["original_filename"] is None
    assert "storage_path" not in out
    assert out["release_hint"]  # non-empty, tells the landlord when it unlocks


def test_redact_keeps_metadata_visible_once_released():
    rec = {"id": "d1", "doc_type": "Bonitätsauskunft", "storage_path": "org/secret.pdf",
           "original_filename": "schufa.pdf"}
    out = redact_doc_for_landlord(rec, "favorit")
    assert out["released"] is True
    assert out["original_filename"] == "schufa.pdf"
    assert "release_hint" not in out


def test_every_gated_doc_type_has_a_hint():
    # If a new doc type is ever added to DOC_RELEASE_STAGE without updating
    # doc_release_hint's if/elif chain, the landlord would see an empty explanation
    # for a withheld document instead of knowing when it unlocks.
    for doc_type, stage in DOC_RELEASE_STAGE.items():
        assert doc_release_hint(doc_type), f"{doc_type} (stage {stage}) has no release hint"


# ---------- tax_facts ----------

def _session(automatic_tax=None, managed_payments=None, total_details=None):
    s = types.SimpleNamespace()
    s.automatic_tax = automatic_tax
    s.managed_payments = managed_payments
    s.total_details = total_details
    return s


def test_tax_facts_seller_of_record_session():
    s = _session(
        automatic_tax={"enabled": True, "liability": {"type": "self"}},
        managed_payments={"enabled": False},
        total_details={"amount_tax": 568},
    )
    facts = tax_facts(s)
    assert facts == {"tax_mode": "automatic_tax", "tax_liability": "self", "tax_amount": 568}


def test_tax_facts_legacy_managed_payments_session():
    # Pre-2026-07-28 sessions: Stripe was merchant of record. Must stay distinguishable
    # from the current regime in the books even after the code switch.
    s = _session(
        automatic_tax={"enabled": True, "liability": {"type": "stripe"}},
        managed_payments={"enabled": True},
        total_details={"amount_tax": 0},
    )
    facts = tax_facts(s)
    assert facts["tax_mode"] == "managed_payments"
    assert facts["tax_liability"] == "stripe"


def test_tax_facts_missing_fields_do_not_raise():
    # A session object missing these attributes entirely (e.g. a stub in another test)
    # must not crash tax_facts - it should degrade to Nones/automatic_tax default.
    s = types.SimpleNamespace()
    facts = tax_facts(s)
    assert facts["tax_mode"] == "automatic_tax"
    assert facts["tax_liability"] is None
    assert facts["tax_amount"] is None
