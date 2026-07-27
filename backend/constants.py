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
