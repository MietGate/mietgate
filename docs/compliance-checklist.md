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

## 2. AVV-Check (Auftragsverarbeitungsverträge)

Für jeden der fünf jetzt in `/datenschutz` §6 genannten Dienstleister prüfen, ob ein
unterschriebener AVV nach Art. 28 DSGVO vorliegt:

- [ ] **Render** — AVV im Dashboard unter Account → Legal/DPA, oder anfragen
- [ ] **MongoDB Atlas** — DPA ist bei Atlas meist automatisch Teil der ToS, im Account-Bereich
      prüfen ob explizit akzeptiert
- [ ] **Cloudflare (R2)** — DPA separat im Cloudflare-Dashboard abschließen, ist nicht automatisch
      Teil des kostenlosen R2-Plans
- [ ] **Stripe** — DPA meist automatisch mit den Stripe-ToS akzeptiert, im Dashboard unter
      Settings → Legal gegenprüfen
- [ ] **Resend** — DPA anfordern/abschließen; zusätzlich prüfen, ob Resends eigener AVV mit
      Amazon SES (der faktische Versand läuft über AWS SES, siehe `feedback-smtp.eu-west-1
      .amazonses.com` MX-Record) für dich einsehbar/durchgereicht ist — sonst fehlt ein Glied
      in der Auftragsverarbeiter-Kette
- [ ] Alle unterschriebenen AVVs an einem Ort ablegen (z. B. eigener Ordner), falls eine
      Behörde danach fragt

## 3. Backup / Restore-Test

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

## 4. Render-Logs prüfen (Nachgang zum Security-Audit)

Aus [[project_mietgate_security_audit_2026-07-28]]: Passwort-Reset- und
E-Mail-Bestätigungs-Token wurden bis zum Fix in `8bc4cb8` per `print()` in den Log geschrieben.

- [ ] Im Render-Dashboard unter Logs prüfen, wie weit die Log-Historie zurückreicht und ob
      dort noch Zeilen mit `[PASSWORD RESET]` oder `[EMAIL VERIFY]` stehen
- [ ] Falls ja: die zugehörigen Konten identifizieren (Token sind zeitlich an einen
      `user_id` gebunden) und im Zweifel deren Passwort zurücksetzen lassen bzw. informieren
- [ ] Falls die Log-Retention das ohnehin schon automatisch gelöscht hat: hier vermerken,
      dass geprüft wurde, damit das nicht offen bleibt
