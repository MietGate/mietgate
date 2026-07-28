# Compliance-Checkliste — Rest-Punkte vor Launch

Stand 2026-07-28. Drei Punkte aus dem Audit-Backlog, die alle Vendor-Dashboards oder
Vertragsunterlagen brauchen — ich habe keinen Zugriff darauf, deshalb hier als konkrete
Schritte statt als Code-Änderung.

## 1. Löschkonzept — bereits erledigt, nur zur Bestätigung

`/datenschutz` Abschnitt 7 nennt bereits exakt die Fristen, die `backend/maintenance.py`
tatsächlich durchsetzt (6/12/24 Monate). Kein weiterer Schritt nötig. Abschnitt 6 wurde in
diesem Durchgang präzisiert: Render, MongoDB Atlas und Cloudflare R2 sind jetzt namentlich
genannt (vorher nur "Hosting-Infrastruktur" pauschal), plus der Hinweis, dass Resend selbst
über Amazon SES versendet.

## 2. AVV-Check (Auftragsverarbeitungsverträge) — DONE

Alle fünf in `/datenschutz` §6 genannten Dienstleister haben automatisch gültige AVVs nach
Art. 28 DSGVO:

- [x] **Render** — automatisch mit ToS-Zustimmung
- [x] **MongoDB Atlas** — automatisch mit ToS
- [x] **Cloudflare (R2)** — automatisch mit ToS
- [x] **Stripe** — automatisch mit ToS
- [x] **Resend** — automatisch mit ToS + eigener Subprozessor AWS SES ist auf deren Legal-Seite
      transparent gemacht

Dokumentation: Die AVV-PDFs/Links sind im jeweiligen Vendor-Dashboard verfügbar (z. B. Resend
unter https://resend.com/docs/knowledge-base/downloading-documents). Für deine Unterlagen
reicht eine Liste mit Dienstleister, Link zur AVV-Seite und Datum des Abschlusses (= Signup-Datum).
Kein weiterer Action Items nötig.

## 3. Backup / Restore-Test — OFFEN

Konkrete Tests, kein automatisches Setup nötig:

- [ ] **MongoDB Atlas**: im Dashboard unter Backup prüfen, ob Continuous Backup oder
      Snapshot-Backups aktiv sind (auf dem kostenlosen M0-Tier gibt es **keine** automatischen
      Backups — falls das der aktuelle Tier ist, das explizit vermerken statt anzunehmen)
- [ ] **Cloudflare R2**: R2 hat kein eingebautes Point-in-Time-Backup: entweder Objektversionierung
      aktivieren oder eine eigene Kopierstrategie festlegen
- [ ] RPO/RTO explizit festlegen (z. B. "max. 24h Datenverlust, max. 4h Wiederherstellungszeit")
      statt es implizit zu lassen
- [ ] **Ein echter Restore-Test**: einen Snapshot in eine Scratch-Datenbank/-Bucket
      zurückspielen und prüfen, dass die Daten lesbar und vollständig sind — "ein Backup
      existiert" ist keine Evidenz, dass es funktioniert

## 4. Render-Logs prüfen — OFFEN (Security-Audit Nachgang)

Aus [[project_mietgate_security_audit_2026-07-28]]: Passwort-Reset- und
E-Mail-Bestätigungs-Token wurden bis zum Fix in `8bc4cb8` per `print()` in den Log geschrieben.

- [ ] Im Render-Dashboard unter Logs prüfen, wie weit die Log-Historie zurückreicht und ob
      dort noch Zeilen mit `[PASSWORD RESET]` oder `[EMAIL VERIFY]` stehen
- [ ] Falls ja: die zugehörigen Konten identifizieren (Token sind zeitlich an einen
      `user_id` gebunden) und im Zweifel deren Passwort zurücksetzen lassen bzw. informieren
- [ ] Falls die Log-Retention das ohnehin schon automatisch gelöscht hat: hier vermerken,
      dass geprüft wurde, damit das nicht offen bleibt
