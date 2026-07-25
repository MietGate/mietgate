# MietGate — Roadmap / Priorisierte Aufgabenliste
Stand: 2026-07-25. Basis: `UX_AUDIT_2026-07-25.md` (Detailfunde) + zwei neue, vom Gründer angeforderte Workflows.

Nummerierung dient nur der Ansprache ("mach Nummer X") — keine strikte Chronologie. Kombinierbare Punkte sind bereits in einem Block zusammengefasst.

---

## 1. Team-Sicherheitslücken beheben ✅ erledigt (2026-07-25)
- Entferntes Team-Mitglied verliert tatsächlich den Zugriff (`users.org_id` beim Entfernen mit-bereinigen)
- Rollen (Owner/Admin/Mitarbeiter/Assistent) werden bei kritischen Aktionen (Objekt löschen, Abo kündigen, Bewerbungen) tatsächlich geprüft, nicht nur bei Team-Verwaltung selbst
- Team-Einladung benachrichtigt den Eingeladenen (E-Mail/In-App) statt seine Org kommentarlos zu wechseln
- Team.jsx blendet Einladen/Entfernen-Buttons für nicht-berechtigte Rollen aus statt 403 zu werfen

## 2. Dokumente-Kernfixes
- "Meine Dokumente"-Upload mit `application_id` verknüpfen, damit Vermieter sie tatsächlich sehen (aktuell komplett unsichtbar)
- Echte Löschung aus Cloudflare R2 bei Dokument-Löschung (aktuell nur DB-Flag, DSGVO-Löschrecht nicht erfüllt)
- Auth-Token aus Download-URL entfernen, stattdessen per Header übertragen (betrifft `ApplicantDocuments.jsx`, `Pipeline.jsx`, `Settings.jsx` Logo-Download)
- Client-seitige Datei-Größen-/Typ-Prüfung vor Upload (15 MB-Limit früher kommunizieren) + HEIC-Unterstützung/Hinweis

## 3. Registrierung-Compliance ✅ erledigt (2026-07-25)
- AGB/Datenschutz-Pflicht-Checkbox bei Register.jsx ergänzen
- Google-Login-Rolle-Bug auf der Login-Seite fixen (legt aktuell immer Landlord-Konto an)
- Organisationstyp (Privat/Makler/Hausverwaltung) bei Registrierung tatsächlich abfragen statt hartcodiert "private"

## 4. Stripe-Webhook ausbauen (Grundlage für Punkt 5)
- Handler für `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_failed`, Trial-Ende-Events ergänzen
- `subscriptions.status` bleibt dadurch synchron zu Stripes tatsächlichem Zustand — behebt gleichzeitig den falschen "Monatl. Umsatz"-Wert im Admin-Dashboard
- **Notwendige Voraussetzung für Punkt 5**, da die neue Trial-/Sperrlogik in Echtzeit wissen muss, wann eine Zahlung fehlschlägt

## 5. Neuer Workflow: Kostenlose Registrierung + bezahlpflichtiger Link mit 3-Tage-Trial
Wie besprochen:
- Vermieter/Hausverwaltung/Makler registrieren sich **kostenlos** und können Objekte beliebig anlegen/bearbeiten — keine Zahlungspflicht an diesem Punkt
- Erst der Klick auf **"Bewerbungslink generieren"** löst den Zahlungs-Workflow aus: Plan wählen → Stripe-Checkout mit `trial_period_days: 3`, **Kreditkarte wird sofort hinterlegt**, automatische Abbuchung nach 3 Tagen
- **Bei Zahlungsfehlschlag / Trial-Ende ohne erfolgreiche Zahlung:**
  - Bewerbungslink wird deaktiviert (keine neuen Bewerbungen mehr möglich)
  - Landlord bekommt Benachrichtigung **in-app UND per E-Mail** ("Ihre Zahlung ist fehlgeschlagen — bitte aktualisieren Sie Ihre Zahlungsmethode, um weiter Bewerbungen zu erhalten")
  - Landlord behält Zugriff auf sein Dashboard, aber die **Bewerber-/Pipeline-Ansicht wird geblurt/gesperrt** — er sieht, dass Daten da sind, aber keine nützlichen Inhalte, bis er erneut zahlt (Datenverlust vermeiden, aber Zahlungsanreiz schaffen)
  - Nach erfolgreicher Zahlungsaktualisierung: sofortige Wiederherstellung des vollen Zugriffs
- Betrifft: `PropertyForm.jsx`/`PropertyDetail.jsx` (Link-Generieren-Button + Bezahl-Trigger), `routes_property.py` (Limit-Logik entkoppeln von Objekt-Erstellung, stattdessen an Link-Aktivierung binden), `stripe_service.py` (Trial-Checkout), neue Middleware/Guard für "gesperrter Zugriff wegen Zahlung", Pipeline/Dashboard-UI (Blur-Zustand), E-Mail-Vorlage für Zahlungsfehlschlag
- Der bisherige Bug "Gewähltes Paket geht nach Registrierung verloren" (aus dem alten Audit) erledigt sich durch diesen Umbau automatisch mit, da Checkout nicht mehr bei Registrierung, sondern bei Link-Generierung passiert

## 6. Admin-Vertriebspipeline auf Pipedrive-Minimal-Niveau ausbauen
Basis ist die bestehende `AdminLeads.jsx`-Kanban (aktuell schon der solideste Teil des Admin-Bereichs). Gewünschte Erweiterungen:
- **Aufgaben/Erinnerungen** — Follow-up-Termine pro Lead, fällige Aufgaben auf einen Blick (z.B. eigene "Heute fällig"-Ansicht)
- **Aktivitäten-Timeline** — Notizen, Anrufe, E-Mails chronologisch pro Lead protokollieren
- **Deal-Wert-Tracking** — erwarteter/tatsächlicher Umsatzwert pro Lead + Gesamt-Pipeline-Wert sichtbar machen
- **Anpassbare Pipeline-Stufen** — eigene Status-Spalten statt fest codierter Stufen
- **Vorschläge für weitere Pipedrive-Standardfunktionen** (du warst dir nicht sicher, was noch fehlt — hier ein paar Kandidaten, die zum "minimal Pipedrive"-Niveau dazugehören und die wir bei Bedarf mit aufnehmen können):
  - Kontakt-/Firmenverknüpfung (mehrere Leads einer Hausverwaltung zuordnen)
  - "Verloren"-Grund-Tracking (warum ein Deal nicht zustande kam — wichtig für spätere Vertriebs-Auswertung)
  - Einfaches Forecast-/Report-Dashboard (Pipeline-Wert nach Stufe, Conversion-Rate Stufe-zu-Stufe)
  - E-Mail-Integration/-Verlauf (zumindest ein Log gesendeter Mails, kein volles Postfach nötig)
  - Erinnerungs-Benachrichtigungen bei fälligen Aufgaben (E-Mail/In-App)

## 7. Admin-Plan-Verwaltung reparieren ✅ erledigt (2026-07-25)
- `supports_team` wird beim Speichern aktuell stillschweigend auf `false` zurückgesetzt (Bug) — Feld ins Formular aufnehmen und im Save-Payload mitschicken
- Fehlende Felder ergänzen: `features`-Liste (öffentlich sichtbare Bullet-Points), `is_active`, Möglichkeit einen neuen Plan anzulegen

## 8. Support-Ticket-Workflow vervollständigen ✅ erledigt (2026-07-25)
- Tickets im Admin beantwortbar/schließbar machen (Backend-Endpunkt existiert bereits, UI fehlt komplett)
- Benachrichtigung (E-Mail an Gründer) bei neuer Support-/Kontaktanfrage

## 9. Admin-Override für manuell abgeschlossene Deals ✅ erledigt (2026-07-25)
- Möglichkeit, einer Organisation Plan/Abo-Status manuell zu setzen (Banküberweisung, Sonderkonditionen) ohne dass der Kunde den Stripe-Checkout durchlaufen muss

## 10. Fehlende Bestätigungsdialoge ergänzen ✅ erledigt (2026-07-25)
- Kanban-Drag auf "Absage" (verschickt sofort E-Mail an Bewerber)
- Termin löschen (verschickt sofort Absage-Mail an Teilnehmer)
- Team-Mitglied entfernen
- Dokument löschen (Bewerber-Seite)

## 11. Bewerberpipeline: Sortierung/Filter + mobiltaugliche Ansicht ✅ erledigt (2026-07-25)
- Sortierung nach Score/Sternen/Einkommen, Filter, ggf. kompakte Listenansicht für Handy statt 8-Spalten-Kanban

## 12. Draft-Speicherung im öffentlichen Bewerbungsformular ✅ erledigt (2026-07-25)
- Fortschritt in `localStorage` sichern, damit ein Tab-Crash/Sperrbildschirm nicht alle Eingaben löscht

## 13. Benachrichtigungen klickbar machen ✅ erledigt (2026-07-25)
- Glocken-Benachrichtigungen sollen zur relevanten Stelle verlinken (aktuell inert)

## 14. Fehlerbehandlung vereinheitlichen ✅ erledigt (2026-07-25)
- Mehrere Seiten zeigen bei echtem API-Fehler fälschlich den "leer"-Zustand statt eines Fehlerhinweises (Dashboard, Properties, Team, AdminOrganizations, AdminUsers, AdminPlans)

## 15. Kleinere Fixes: Enterprise-CTA + 404-Seite ✅ erledigt (2026-07-25)
- "Angebot anfordern" auf Landing zu `/kontakt` statt `/registrieren?plan=enterprise`
- Catch-all 404-Seite ergänzen

## 16. Restliche Polish-Punkte ✅ erledigt (2026-07-25) (siehe UX_AUDIT_2026-07-25.md für Details)
TTL-Index auf `login_attempts`, Cookie-Banner erneut öffnbar machen (Footer-Link), Bewerbername-Anzeigefehler ("Vorname email@x.de"), Matching-Score-Tooltip/Erklärung, Passwort-Formular für Google-Login-Nutzer anpassen, Slot-Termine Absage-Option, Zeitfenster-Rebooking, u.v.m.

---

### Sag mir einfach die Nummer, und wir legen los. Mehrere Nummern gleichzeitig sind möglich, wenn sie zusammenhängen.
