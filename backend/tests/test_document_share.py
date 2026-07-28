"""Unit tests for the document-release window on applicant profile shares.

`_share_active` is the single gate in front of every shared document: both the public
list view and the direct-download URL call it. It is a pure function on the inquiry
document, so these run without a live server or database.
"""
from datetime import datetime, timezone, timedelta

import pytest
from dotenv import load_dotenv

load_dotenv()  # routes_profile imports database.py, which reads MONGO_URL at module load

from routes_profile import _share_active, SHARE_TTL_DAYS


def _iso(**delta):
    return (datetime.now(timezone.utc) + timedelta(**delta)).isoformat()


def granted(**overrides):
    base = {"status": "granted", "share_token": "t", "share_expires_at": _iso(days=7),
            "shared_document_ids": ["doc-1"]}
    base.update(overrides)
    return base


def test_active_while_inside_window():
    assert _share_active(granted()) is True


def test_expired_once_past_the_window():
    assert _share_active(granted(share_expires_at=_iso(minutes=-1))) is False


@pytest.mark.parametrize("status", ["pending", "declined", "revoked"])
def test_inactive_unless_granted(status):
    assert _share_active(granted(status=status)) is False


def test_legacy_grant_without_expiry_is_treated_as_expired():
    """Shares created before the window existed were open-ended — the exact thing being
    closed. They must not keep working just because they predate the field."""
    legacy = granted()
    del legacy["share_expires_at"]
    assert _share_active(legacy) is False


def test_missing_inquiry_is_inactive():
    assert _share_active(None) is False
    assert _share_active({}) is False


def test_naive_timestamp_is_read_as_utc():
    """Mongo can hand back a naive datetime depending on how the row was written; that
    must not raise on comparison or silently read as local time."""
    naive_future = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=3)
    assert _share_active(granted(share_expires_at=naive_future)) is True
    naive_past = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=3)
    assert _share_active(granted(share_expires_at=naive_past)) is False


def test_ttl_is_a_bounded_window():
    # Guards against someone "fixing" an expiry complaint by setting this to a decade.
    assert 1 <= SHARE_TTL_DAYS <= 90
