"""Shared pytest fixtures/helpers for the backend test suite.

Registration requires email verification before login works (`is_active: False` until
the applicant/landlord clicks the link in a real email). This suite has no way to receive
that email, so `activate_user` bypasses it by flipping the flag directly in Mongo - the
same thing a human tester does manually. It intentionally does NOT test the verification
flow itself; that's a separate, narrower concern for a dedicated test if one gets written.
"""
import os
import pymongo


def test_db():
    """The same database the backend under test is actually using.

    Respects MONGO_URL/DB_NAME rather than assuming a local mongod on the default port
    and a hardcoded database name — a prior version of this suite shelled out to a
    `mongosh` binary with both hardcoded, which silently pointed at the wrong database
    (or nothing at all) as soon as the suite ran against anything but its original
    author's machine.
    """
    client = pymongo.MongoClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


def activate_user(email: str) -> None:
    test_db()["users"].update_one({"email": email}, {"$set": {"is_active": True}})
