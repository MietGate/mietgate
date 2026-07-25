# MietGate.de

Vermieter-zentrierte Multi-Tenant-SaaS für den deutschen Immobilienmarkt zur Digitalisierung von Mietbewerbungen und zur Verwaltung des gesamten Vermietungsprozesses. MietGate ist **kein Immobilienportal** – es setzt **nach dem Inserat** an: Objekt → Bewerbungslink → strukturierte Bewerbung → Dokumente → Pipeline → Besichtigung → Mieterentscheidung.

Betreiber (rechtliche Einheit, hardcoded in den Legal-Seiten): **BORK Solutions UG (haftungsbeschränkt) i. Gr.**

---

## 1. Projektstatus

Produktionsreifes MVP. Aktuell **funktioniert** bereits:

- **Auth**: JWT (E-Mail/Passwort, Bearer-Token) + Emergent Google OAuth. Brute-Force-Lockout, Admin-Seeding, Passwort-Reset, **E-Mail-Verifizierung** für neue Accounts.
- **Multi-Tenancy**: Users → Organisationen → Objekte; Rollen (applicant / landlord / admin), Team-Mitglieder (owner/admin/employee/assistant), White-Label-Vorbereitung.
- **Objekte**: CRUD, mehrere Bilder (Object Storage), automatischer Bewerbungscode, Plan-Limits.
- **Bewerbungs-Funnel** (öffentlich, `/b/:code`): mehrstufig mit Fortschrittsanzeige, dynamischem Formular-Builder (Pflicht/Optional/Aus), Summary-Step „Ihre Angaben im Überblick", DSGVO-Consent, Dokument-Upload; legt automatisch ein Bewerberkonto an.
- **Bewerber-Pipeline** (Kanban, Drag & Drop, 8 Status): Matching-Score, Sterne, interne Notizen, integrierter Chat (WhatsApp-Style, Zeitstempel, Auto-Scroll).
- **Dokumente**: sicherer Upload/Download (Bearer oder temporärer Link), Soft-Delete, Dokumentanforderung.
- **Besichtigungen**: Einzel/Slots/Massen, Einladen/Zu-/Absage/Umbuchung, `.ics`-Kalender-Export.
- **Nachrichten** + In-App-Benachrichtigungen (Glocke).
- **Zahlungen**: Stripe-Abos (monatlich/jährlich mit Rabatt), Team-Gating, Bewerber-Premium (4,99 €/Mo), Abo-Kündigung.
- **Admin**: Dashboard/Statistiken, Nutzer sperren/entsperren, Organisationen, Pakete & Aktionen, Partner-/Affiliate-Links, Support-Tickets, **CRM/Leads (Pipedrive-Style Kanban)** mit CSV-Import und Detailansicht.
- **E-Mail-Benachrichtigungen** (Resend) über alle Workflows, Hintergrund-Jobs (Besichtigungs-Erinnerungen, DSGVO-Auto-Löschung).
- **Öffentliche Website**: Landing, `/fuer-vermieter`, `/fuer-mieter`, Preise, FAQ, vollständige Legal-Seiten (Impressum, AGB, Datenschutz, Widerruf, Cookies), Cookie-Consent, SEO/OG-Meta.

---

## 2. Tech-Stack

| Bereich   | Technologie |
|-----------|-------------|
| Backend   | **FastAPI** (Python 3.11), modulare Router (`routes_*.py`), Uvicorn |
| Datenbank | **MongoDB** (via Motor, async) |
| Frontend  | **React 19** + **CRACO** (Create React App – **nicht Vite**), React Router |
| Styling   | **Tailwind CSS** + shadcn/ui, framer-motion, @hello-pangea/dnd (Kanban) |

> ⚠️ **Korrektur zur Übergabe:** Das Frontend basiert auf **CRACO / Create React App** (`craco start`, Env-Präfix `REACT_APP_`), **nicht auf Vite**. Falls perspektivisch ein Vite-Migration gewünscht ist, wäre das ein separater Umbau (u. a. Env-Präfix `VITE_`, `index.html`-Position, Build-Config).

### 3rd-Party-Integrationen
- **Stripe** (Zahlungen) – eigene API-Keys nötig
- **Resend** (E-Mails) – im Emergent-Setup über `EMERGENT_EMAIL_KEY`; lokal eigener Resend-API-Key empfohlen
- **Emergent Object Storage (S3)** für private Dokumente/Bilder – lokal ggf. durch eigenen S3/Minio ersetzen
- **Emergent LLM Key** (OpenAI/Claude/Gemini) – lokal ggf. durch eigene Provider-Keys ersetzen
- **Google OAuth** (Emergent-managed) – lokal eigener OAuth-Client nötig

---

## 3. Offene Aufgaben & bekannte Punkte

### Noch nicht umgesetzte Features
- **Automatisierte Nebenkostenabrechnung** *(nicht implementiert)*: Erfassung von Verbrauchs-/Kostenpositionen je Objekt/Mietverhältnis, Verteilerschlüssel, automatische Erstellung und PDF-Export der Abrechnung. Datenmodell, Backend-Endpoints und UI fehlen komplett.
- **#8 Gewerbeobjekte-Workflow**: eigene Objektart „Gewerbe" mit angepasstem Formular-Builder (z. B. Geschäftszweck statt Haushaltsgröße).
- **#9 Zusätzliche Dokumentanforderungen**: gezieltes Anfordern von BWA / Einkommensteuerbescheid.
- **#10 Öffentliche Makler-Profile**: `mietgate.de/firmenname` mit allen aktiven Inseraten.
- **#15 Globale Suche**: über Objekte, Bewerber, Nachrichten, Leads.
- **Verifiziertes Mieter-Premium-Profil**: Kauf-Flow vollständig verdrahten (Upsell-CTA → direkt Stripe-Checkout statt Infoseite).
- **White-Label**: eigenes Logo/Farbe + eigene Domain auf der öffentlichen Bewerbungsseite.
- **Slot-Selbstbuchung** für Bewerber (UI).
- **#16 Audit-Log-UI**: Backend-`activities` sichtbar machen (wer/was/wann).
- **CRM-Erweiterung**: „Lead → Kunde" umwandeln (Organisation/Einladung anlegen).
- **Zwei-Wege-Kalender-Sync** (aktuell nur `.ics`-Export).
- **Echter Aktivierungslink** in Verifizierungs-/Aktivierungs-E-Mails durchgängig (statt teils nur Token).

### Offene Tests / QA
- **Dashboard-Flow-Tests** *(ausstehend)*: End-to-End-Tests der Dashboards (Landlord/Applicant/Admin) – Navigation, Statistik-Kacheln, Pipeline-Interaktionen, CRM-Board (Drag & Drop, Detailansicht), Zahlungs-/Abo-Flows. Bisher überwiegend Backend- und punktuelle Frontend-Verifikation.
- **CRM-Board UI** wurde per curl + Compile-Check verifiziert, aber noch nicht per vollständigem UI-E2E-Durchlauf.
- **Google-OAuth** end-to-end manuell verifizieren.

### Bekannte Bugs / Stolpersteine
- **Brute-Force-Lockout beim Login**: Nach mehreren Fehlversuchen liefert `/api/auth/login` HTTP 429 („Zu viele Versuche"). Sperre liegt je `IP:E-Mail` in der Collection `login_attempts`. Reset: Einträge dort löschen (siehe unten). Empfehlung: TTL-Index auf `login_attempts` ergänzen.
- **Externe Asset-Abhängigkeiten**: OG-Image in `frontend/public/index.html` verweist noch auf eine externe (Emergent-)URL. Logo ist bereits lokal (`frontend/public/mietgate-logo.png`).
- **Object Storage / LLM / E-Mail** hängen im aktuellen Stand an Emergent-managed Keys – für rein lokalen Betrieb durch eigene Provider ersetzen.

---

## 4. Lokales Setup

### Voraussetzungen
- Python **3.11+**, Node **20+**, **Yarn**, laufende **MongoDB** (lokal oder Atlas).

### Environment-Dateien

`backend/.env`
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=mietgate
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=<zufälliger-langer-string>
ADMIN_EMAIL=admin@mietgate.de
ADMIN_PASSWORD=MietGate2026!
EMERGENT_LLM_KEY=<optional / eigener LLM-Key>
EMERGENT_EMAIL_KEY=<optional / Resend-Key>
EMAIL_FROM_NAME=MietGate
STRIPE_SECRET_KEY=<sk_test_...>
STRIPE_PUBLISHABLE_KEY=<pk_test_...>
STRIPE_ACCOUNT_ID=<optional>
STRIPE_WEBHOOK_SECRET=<whsec_...>
STRIPE_MODE=test
```

`frontend/.env`
```
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
```

> Hinweis: Alle Backend-Routen sind unter `/api` erreichbar. Das Frontend spricht das Backend ausschließlich über `REACT_APP_BACKEND_URL` an.

### Backend starten
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
Der Admin-Account wird beim Start aus `ADMIN_EMAIL` / `ADMIN_PASSWORD` geseedet.

### Frontend starten
```bash
cd frontend
yarn install
yarn start        # läuft auf http://localhost:3000
```

### Tests (Backend)
```bash
cd backend
python -m pytest tests/ -v
```

### Login-Lockout zurücksetzen (falls HTTP 429)
```bash
# im backend-Verzeichnis, venv aktiv:
python -c "import asyncio,os; from motor.motor_asyncio import AsyncIOMotorClient; from dotenv import load_dotenv; load_dotenv('.env'); \
c=AsyncIOMotorClient(os.environ['MONGO_URL']); db=c[os.environ['DB_NAME']]; \
print(asyncio.run(db.login_attempts.delete_many({})))"
```

---

## 5. Projektstruktur (Kurzüberblick)

```
backend/
  server.py            # FastAPI-App, Startup, Router-Registrierung
  database.py          # Mongo-Client & Indizes
  routes_*.py          # auth, property, application, viewing, message, document, payment, admin, core
  email_service.py     # Resend-Versand
  maintenance.py       # Hintergrund-Jobs (Erinnerungen, DSGVO-Löschung)
  helpers.py, security.py, constants.py

frontend/
  src/App.js           # Routing
  src/pages/           # public, landlord, applicant, admin, LegalPages
  src/components/       # UI, Pipeline.jsx, DashboardShell.jsx, ...
  src/pages/admin/AdminLeads.jsx   # CRM/Leads (Kanban + Detailansicht)
  public/index.html, public/mietgate-logo.png

memory/                # PRD.md, test_credentials.md (Handoff-Doku)
```

## 6. Test-Credentials
- **Admin**: `admin@mietgate.de` / `MietGate2026!`
- Weitere Testkonten und Hinweise in `memory/test_credentials.md`.

---

## 7. Wichtige Hinweise für die Weiterarbeit (Claude Code)
- **Sprache**: Nutzer spricht Deutsch – UI, E-Mails und Legal-Texte auf Deutsch halten.
- **Legal**: „BORK Solutions UG (haftungsbeschränkt) i. Gr." ist fest hinterlegt – keine Platzhalter/Fake-Registernummern einsetzen.
- **Keine „Emergent"-Nennung** in nutzerseitigen Datenschutztexten (generisch: „Hosting in der EU").
- **Env-Only**: URLs/Keys ausschließlich aus `.env`, keine Defaults hardcoden.
