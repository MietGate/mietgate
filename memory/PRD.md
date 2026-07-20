# MietGate.de — Product Requirements & Progress

## Original Problem Statement
Vermieter-zentrierte Multi-Tenant SaaS für den deutschen Immobilienmarkt zur Digitalisierung von Mietbewerbungen und Verwaltung des gesamten Vermietungsprozesses (Objekt → Bewerbungslink → strukturierte Bewerbung → Dokumente → Pipeline → Besichtigung → Mieterentscheidung). KEIN Immobilienportal — setzt NACH dem Inserat an.

## Architecture
- **Backend**: FastAPI (modular routers), MongoDB (Motor), all routes under `/api`.
- **Frontend**: React 19 + CRACO, TailwindCSS + shadcn/ui, framer-motion, @hello-pangea/dnd (Kanban). Teal (logo) + Prussian-blue brand via CSS variables (re-brandable).
- **Auth**: JWT email/password (Bearer token in localStorage `mg_token`) + Emergent Google OAuth (`/api/auth/google/session`). Roles: applicant, landlord, admin. Multi-tenant via organizations + org_members.
- **Integrations**: Stripe subscriptions (claimable sandbox, tax mode = SMP/"full" for Germany), Emergent Object Storage (private docs, backend-proxied download w/ auth), Resend emails (activation, application received).

## User Personas
- Private Vermieter (Einfachheit), Mehrfachvermieter, Makler (Team/Rollen), Hausverwaltungen (Skalierung/White-Label), Bewerber.

## Core Requirements (static)
Bewerbungslink, Formular-Builder (Pflicht/Optional/Aus), Dokumente + Sicherheit, Besichtigungen (Einzel/Slots/Massen), Bewerberpipeline (Kanban), Matching Score (nicht-diskriminierend), Stripe, Admin, Organisationen, White-Label-Vorbereitung, DSGVO.

## Implemented (2026-07-20 — Fork session)
- ✅ E-Mail-Benachrichtigungen (P1) vollständig verkabelt via email_service.send_email (Emergent-managed Resend): Statuswechsel→Bewerber, neue Bewerbung→Vermieter, Besichtigung Einladung/Absage→Bewerber, Slot-Buchung/Rückmeldung/Umbuchung→Vermieter, Zahlungsbestätigung (Abo/White-Label/Premium). Neuer Helper helpers.email_user(). Getestet iteration_5.json (28/28, keine Bugs).
- ✅ Hintergrund-Jobs aktiviert: `maintenance.py` (Besichtigungs-Erinnerungen ~24h vorher + DSGVO Auto-Löschung 6/12/24 Monate) via `asyncio.create_task(maintenance_loop())` im Startup (stündlich). SyntaxError in maintenance.py behoben.
- ✅ Bewerber-Premium 4,99€/Mo: Frontend Upsell-Karte + Checkout im ApplicantDashboard (POST /api/premium/checkout, Stripe). PaymentResult rollenbasiert (Bewerber → /bewerber, refresh user).
- ✅ Admin Partner-/Affiliate-Link-Editor: neue Seite /admin/partner (AdminPartners.jsx) + Nav-Item; Backend GET/PUT /api/admin/partners + POST /api/admin/maintenance/run (manueller Lauf, admin-only).
- ✅ Enterprise-CTA auf /preise verlinkt jetzt /kontakt.
- ✅ Getestet: iteration_4.json — Backend 16/16 neu, Frontend-Flows 100%, keine Bugs.

## Implemented (2026-07-20)
- ✅ Auth: register/login/me/logout, JWT + Google OAuth, brute-force lockout, admin seeding, password reset (console/email).
- ✅ Organizations + members (owner/admin/employee/assistant), invite/remove, org settings, White-Label toggle.
- ✅ Properties CRUD, auto application_code, plan-limit enforcement (create + status-activate), link toggle/regenerate/count.
- ✅ Public application page (branding, property info, external listing button, dynamic form from form-builder config, GDPR consent, doc upload), auto applicant account + activation email.
- ✅ Applications: Kanban pipeline (drag & drop, 8 statuses), stars/tags/notes, matching score, per-applicant sheet (docs, messages, status).
- ✅ Documents: applicant + public upload, secure download (Bearer or ?auth=), soft-delete, document request.
- ✅ Viewings: single/slots/group, invite, confirm/decline/reschedule, applicant view.
- ✅ Messaging (landlord↔applicant) + in-app notifications + bell.
- ✅ Dashboards: landlord, applicant, admin (stats, users block/unblock, orgs, plans edit, promotions).
- ✅ Pricing (dynamic from DB, monthly/yearly, promotions), Stripe checkout + subscription cancel.
- ✅ Marketing landing page (hero, benefits, process, target groups, pricing, FAQ), Settings.
- ✅ Tested: 42/42 backend pytest passed; frontend core flows verified.

## Prioritized Backlog
- **P1**: Real activation-link URL in emails (currently token shown); Google OAuth end-to-end manual verification; slot-based viewing self-booking UI for applicants; dashboard "upcoming viewings" should also count slot-type.
- **P1**: White-Label custom logo/color upload wiring on public page; eigene Domain.
- **P2**: SCHUFA affiliate real partner link; post-rental partner offers; Vertragsgenerator; GDPR auto-deletion jobs (6/12/24 months); richer audit-log UI; TTL index on login_attempts.
- **P2**: Applicant premium profile (4,99 €/Monat) purchase flow.

## Next Action Items
- Verify Google OAuth login manually; wire real activation link into the account-activation email.
- Consider slot self-booking for applicants and White-Label branding on the public page.

## Test Credentials
- Admin: admin@mietgate.de / MietGate2026!  (see /app/memory/test_credentials.md)
- Backend suite: `python -m pytest backend/tests/backend_test.py -v -n 0`
