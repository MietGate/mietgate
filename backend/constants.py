FORM_FIELDS = [
    # category, key, label, type, options
    {"key": "vorname", "label": "Vorname", "category": "Persönliche Daten", "type": "text"},
    {"key": "nachname", "label": "Nachname", "category": "Persönliche Daten", "type": "text"},
    {"key": "geburtsdatum", "label": "Geburtsdatum", "category": "Persönliche Daten", "type": "date"},
    {"key": "telefon", "label": "Telefonnummer", "category": "Persönliche Daten", "type": "tel"},
    {"key": "email", "label": "E-Mail", "category": "Persönliche Daten", "type": "email"},

    {"key": "anzahl_personen", "label": "Anzahl Personen im Haushalt", "category": "Haushalt", "type": "number"},
    {"key": "erwachsene", "label": "Erwachsene", "category": "Haushalt", "type": "number"},
    {"key": "kinder", "label": "Kinder", "category": "Haushalt", "type": "number"},
    {"key": "haustiere", "label": "Haustiere", "category": "Haushalt", "type": "select",
     "options": ["Keine", "Ja, Kleintiere", "Ja, Hund", "Ja, Katze", "Ja, Sonstige"]},
    {"key": "raucher", "label": "Raucher / Nichtraucher", "category": "Haushalt", "type": "select",
     "options": ["Nichtraucher", "Raucher"]},

    {"key": "beschaeftigungsstatus", "label": "Beschäftigungsstatus", "category": "Beruf & Einkommen", "type": "select",
     "options": ["Angestellt", "Selbstständig", "Beamter", "Student", "Rentner", "Arbeitssuchend"]},
    {"key": "arbeitgeber", "label": "Arbeitgeber", "category": "Beruf & Einkommen", "type": "text"},
    {"key": "beruf", "label": "Beruf", "category": "Beruf & Einkommen", "type": "text"},
    {"key": "nettoeinkommen", "label": "Monatliches Nettoeinkommen", "category": "Beruf & Einkommen", "type": "select",
     "options": ["unter_1000", "1000_2000", "2000_3000", "3000_plus"],
     "option_labels": {"unter_1000": "unter 1.000 €", "1000_2000": "1.000 – 2.000 €",
                        "2000_3000": "2.000 – 3.000 €", "3000_plus": "über 3.000 €"}},

    {"key": "aktuelle_wohnsituation", "label": "Aktuelle Wohnsituation", "category": "Wohnsituation", "type": "select",
     "options": ["Zur Miete", "Im Eigentum", "Bei Familie", "WG", "Sonstiges"]},
    {"key": "aktueller_vermieter", "label": "Aktueller Vermieter (Kontakt)", "category": "Wohnsituation", "type": "text"},
    {"key": "kuendigungsgrund", "label": "Grund des Umzugs", "category": "Wohnsituation", "type": "textarea"},
    {"key": "gewuenschter_einzugstermin", "label": "Gewünschter Einzugstermin", "category": "Wohnsituation", "type": "date"},

    {"key": "nachricht", "label": "Nachricht an den Vermieter", "category": "Sonstiges", "type": "textarea"},
    {"key": "zusatzinfo", "label": "Zusätzliche Informationen", "category": "Sonstiges", "type": "textarea"},
]

# default state per field: required | optional | disabled
DEFAULT_FORM_CONFIG = {
    "vorname": "required", "nachname": "required", "geburtsdatum": "optional",
    "telefon": "required", "email": "required",
    "anzahl_personen": "required", "erwachsene": "optional", "kinder": "optional",
    "haustiere": "optional", "raucher": "optional",
    "beschaeftigungsstatus": "required", "arbeitgeber": "optional", "beruf": "optional",
    "nettoeinkommen": "required",
    "aktuelle_wohnsituation": "optional", "aktueller_vermieter": "disabled",
    "kuendigungsgrund": "optional", "gewuenschter_einzugstermin": "required",
    "nachricht": "optional", "zusatzinfo": "disabled",
}

DOCUMENT_TYPES = [
    "SCHUFA", "Gehaltsnachweise", "Arbeitsvertrag", "Ausweis",
    "Aufenthaltstitel", "Mietschuldenfreiheitsbescheinigung", "Bürgschaft", "Sonstiges",
]

PIPELINE_STATUSES = ["neu", "pruefung", "interessant", "besichtigung", "favorit", "zusage", "absage", "archiv"]

STATUS_LABELS = {
    "neu": "Neu", "pruefung": "Prüfung", "interessant": "Interessant",
    "besichtigung": "Besichtigung", "favorit": "Favorit", "zusage": "Zusage",
    "absage": "Absage", "archiv": "Archiv",
    # Deliberately not in PIPELINE_STATUSES: only the applicant can set this,
    # the landlord must not be able to withdraw someone on their behalf.
    "zurueckgezogen": "Zurückgezogen",
}

# --- Staged release of sensitive documents -----------------------------------
#
# The data-protection authorities' "Orientierungshilfe der Aufsichtsbehörden für
# die Wohnungswirtschaft" splits a tenancy application into three phases and only
# allows a landlord to see certain data once the applicant has reached the matching
# phase:
#
#   1. Interessent / viewing      -> name + contact only
#   2. Shortlist, after viewing   -> bonity and income documents
#   3. Contract conclusion        -> ID, residence permit, bank details
#
# Applicants may upload whenever they like (that is a convenience feature), but the
# landlord only gets access at the right stage. This also keeps the applicant's
# consent genuinely voluntary: uploading early gains them nothing, so no pressure
# can build up.
PIPELINE_STAGE_ORDER = {
    "neu": 0, "pruefung": 1, "interessant": 2, "besichtigung": 3, "favorit": 4, "zusage": 5,
}

# doc_type -> minimum stage the application must have reached. Types not listed here
# (e.g. "Sonstiges") are never withheld. "absage", "archiv" and "zurueckgezogen" are
# absent from PIPELINE_STAGE_ORDER on purpose, so they never release anything.
DOC_RELEASE_STAGE = {
    "SCHUFA": 4,
    "Gehaltsnachweise": 4,
    "Arbeitsvertrag": 4,
    "Mietschuldenfreiheitsbescheinigung": 4,
    "Bürgschaft": 4,
    "Ausweis": 5,
    "Aufenthaltstitel": 5,
}

# Types the applicant is offered a guided bonity flow for (bonify / existing SCHUFA).
BONITY_DOC_TYPES = ["SCHUFA"]

# Defaults for the guided bonity step on the applicant's documents page. Admins can
# override all of these under /admin/partner — the defaults exist so the flow works
# out of the box without any configuration.
DEFAULT_BONIFY = {
    "bonify_url": "https://www.bonify.de/bonitaetsauskunft-fuer-mieter",
    "bonify_text": (
        "bonify (ein Unternehmen der SCHUFA) stellt eine Bonitätsauskunft für Mieter "
        "kostenlos aus — Sie können sie sofort als PDF herunterladen."
    ),
    "bonify_steps": [
        "Kostenloses bonify-Konto anlegen und Identität bestätigen",
        "Unter „Mieterauskunft“ das PDF herunterladen",
        "PDF hier hochladen — fertig",
    ],
    # Only set this if you actually have a partner agreement. When empty, the advertising
    # disclosure is not shown, because without a commission there is nothing to disclose.
    "bonify_is_affiliate": False,
}

# Ready-made snippets the landlord pastes into their listing on ImmoScout, Kleinanzeigen
# etc. Placeholders are filled in on copy: {{link}}, {{objekt}}, {{ort}}.
DEFAULT_INSERAT_TEMPLATES = [
    {
        "key": "kurz",
        "label": "Kurz",
        "text": "Bewerbungen bitte ausschließlich über folgenden Link: {{link}}",
    },
    {
        "key": "ausfuehrlich",
        "label": "Ausführlich",
        "text": (
            "Bitte bewerben Sie sich ausschließlich über folgenden Link:\n"
            "{{link}}\n\n"
            "Dort können Sie Ihre Angaben in wenigen Minuten vollständig eintragen. "
            "Bewerbungen per E-Mail oder Telefon können wir leider nicht berücksichtigen, "
            "da wir alle Anfragen einheitlich und nachvollziehbar bearbeiten."
        ),
    },
    {
        "key": "datenschutz",
        "label": "Mit Datenschutzhinweis",
        "text": (
            "Bewerbungen für {{objekt}} in {{ort}} bitte ausschließlich über folgenden Link:\n"
            "{{link}}\n\n"
            "Ihre Angaben werden verschlüsselt und DSGVO-konform verarbeitet. "
            "Bonitätsunterlagen benötigen wir erst nach der Besichtigung, wenn Sie in der "
            "engeren Auswahl sind. Nach Abschluss des Vermietungsverfahrens werden die Daten "
            "aller nicht berücksichtigten Bewerber gelöscht."
        ),
    },
]


def doc_released_to_landlord(doc_type: str, application_status: str) -> bool:
    """True if the landlord may see this document at the application's current status."""
    required = DOC_RELEASE_STAGE.get(doc_type)
    if required is None:
        return True
    return PIPELINE_STAGE_ORDER.get(application_status, -1) >= required


def doc_release_hint(doc_type: str) -> str:
    """Short explanation shown to the landlord in place of a withheld document."""
    required = DOC_RELEASE_STAGE.get(doc_type)
    if required == 5:
        return "Wird bei Zusage freigeschaltet"
    if required == 4:
        return "Wird ab Status „Favorit“ freigeschaltet"
    return ""


def redact_doc_for_landlord(rec: dict, application_status: str) -> dict:
    """Hide a not-yet-released document's content from the landlord.

    The landlord still learns that the applicant has provided it — otherwise they'd
    keep asking for it — but gets neither the file nor the filename until the
    application reaches the stage where the document may lawfully be seen.
    """
    doc_type = rec.get("doc_type", "Sonstiges")
    released = doc_released_to_landlord(doc_type, application_status)
    out = {**rec, "released": released}
    out.pop("storage_path", None)
    if not released:
        out["original_filename"] = None
        out["release_hint"] = doc_release_hint(doc_type)
    return out
