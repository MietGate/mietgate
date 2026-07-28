from database import db, NO_ID
from email_service import send_email

# Emails an Bewerber, die im Namen der Vermieter-Organisation verschickt werden — diese
# sind White-Label-relevant und daher pro Organisation überschreibbar. Login-Code,
# Passwort-Reset, Kontobestätigung und die Kontaktformular-Antwort bleiben bewusst
# fest im Code (Sicherheit bzw. Plattform-Kommunikation, kein Bezug zu einer Marke).
DEFAULT_TEMPLATES = {
    "viewing_invite": {
        "name": "Einladung zur Besichtigung",
        "subject": "Einladung zur Besichtigung",
        "title": "Sie sind zu einer Besichtigung eingeladen",
        "body_html": (
            "<p>Sie wurden zur Besichtigung <b>{{viewing_title}}</b> eingeladen.</p>"
            "{{when_block}}"
            "<p>Bitte bestätigen Sie den Termin in Ihrem MietGate-Konto.</p>"
        ),
        "placeholders": ["viewing_title", "when_block"],
    },
    "viewing_cancelled": {
        "name": "Besichtigung abgesagt",
        "subject": "Besichtigung abgesagt",
        "title": "Ihre Besichtigung wurde abgesagt",
        "body_html": (
            "<p>Die Besichtigung <b>{{viewing_title}}</b> wurde vom Vermieter abgesagt.</p>"
            "<p>Bei Fragen wenden Sie sich bitte an den Vermieter.</p>"
        ),
        "placeholders": ["viewing_title"],
    },
    "viewing_slot_confirmed": {
        "name": "Zeitfenster bestätigt",
        "subject": "Zeitfenster bestätigt",
        "title": "Ihr Besichtigungstermin ist bestätigt",
        "body_html": (
            "<p>Ihr Zeitfenster für die Besichtigung <b>{{viewing_title}}</b> wurde erfolgreich gebucht:</p>"
            "<p><b>{{slot_time}}</b></p>"
            "<p>Sie können den Termin jederzeit in Ihrem MietGate-Konto unter \"Meine Termine\" einsehen.</p>"
        ),
        "placeholders": ["viewing_title", "slot_time"],
    },
    "viewing_reminder": {
        "name": "Erinnerung: Besichtigung morgen",
        "subject": "Erinnerung: Ihre Besichtigung",
        "title": "Besichtigung morgen",
        "body_html": "<p>Ihre Besichtigung <b>{{viewing_title}}</b> findet am <b>{{when}}</b> statt.</p>",
        "placeholders": ["viewing_title", "when"],
    },
    "application_received": {
        "name": "Bewerbung eingegangen",
        "subject": "Ihre Bewerbung bei MietGate",
        "title": "Bewerbung eingegangen",
        "body_html": (
            "<p>Vielen Dank für Ihre Bewerbung für <b>{{property_title}}</b>.</p>"
            "{{activation_block}}"
            "{{premium_block}}"
        ),
        "placeholders": ["property_title", "activation_block", "premium_block"],
    },
}


async def seed_defaults():
    """Keep DB templates in sync with the defaults above, unless an admin edited them.

    Without the re-sync, adding a placeholder to a default here would silently do
    nothing on any environment where the row was already seeded.
    """
    for key, tpl in DEFAULT_TEMPLATES.items():
        existing = await db.email_templates.find_one({"key": key})
        if not existing:
            await db.email_templates.insert_one({"key": key, **tpl})
        elif not existing.get("customized"):
            await db.email_templates.update_one({"key": key}, {"$set": tpl})


def _fill(text: str, context: dict) -> str:
    for k, v in context.items():
        text = text.replace("{{" + k + "}}", "" if v is None else str(v))
    return text


async def render_and_send(template_key: str, to_email: str, org_id: str, context: dict,
                          category: str = None):
    tpl = None
    if org_id:
        org = await db.organizations.find_one({"id": org_id}, NO_ID)
        if org and org.get("white_label_addon"):
            override = await db.org_email_templates.find_one({"org_id": org_id, "template_key": template_key}, NO_ID)
            if override:
                tpl = override
    if not tpl:
        tpl = await db.email_templates.find_one({"key": template_key}, NO_ID) or DEFAULT_TEMPLATES[template_key]
    subject = _fill(tpl["subject"], context)
    title = _fill(tpl["title"], context)
    body_html = _fill(tpl["body_html"], context)
    await send_email(to_email, subject, title, body_html, category=category)
