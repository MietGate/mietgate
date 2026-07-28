# MietGate — Risikoregister Security-Audit

**Stand:** 2026-07-28 · **Umfang:** Autorisierung/IDOR über Organisationsgrenzen, Stripe-Webhook,
JWT-/Session-Handling · **Methode:** vollständiges Code-Review aller 5.319 Zeilen Backend-Routen,
jeder Endpunkt mit ID-Parameter einzeln auf Org-Scoping geprüft.

Bewusst **nicht** im Umfang (siehe Backlog #3): Dependency-/CVE-Scan, Secrets-in-Git-Historie,
Lasttests. Ohne echten Traffic nicht zeitkritisch.

Bewertung = Schwere × Ausnutzbarkeit. "Ausnutzbarkeit" berücksichtigt, ob ein Angreifer eine
rate-nicht-limitierte, erratbare ID braucht (alle internen IDs sind UUID4 bzw. `secrets`-Token).

---

## Behoben in dieser Runde

| # | Befund | Schwere | Ausnutzbar | Ort |
|---|--------|---------|-----------|-----|
| 1 | Passwort-Reset- und E-Mail-Bestätigungs-Token wurden per `print()` in den Anwendungs-Log geschrieben | **Hoch** | Hoch | `routes_auth.py` |
| 2 | `DELETE /organization/members/{id}` ohne Org-Scope → Mitgliedschaft einer *fremden* Organisation löschbar | **Hoch** | Mittel | `routes_core.py` |
| 3 | `POST /viewings/{id}/invite` prüfte die Bewerbungs-IDs nicht gegen die eigene Org → fremde Bewerber-E-Mail im Response, fremder Bewerbungsstatus überschrieben | **Hoch** | Mittel | `routes_viewing.py` |
| 4 | Hochgeladene Dateien wurden mit client-gewähltem Content-Type `inline` ausgeliefert → gespeichertes HTML/SVG führt Skripte auf der API-Origin aus | Mittel | Mittel | `routes_document.py`, `routes_profile.py`, `routes_application.py`, `routes_property.py` |
| 5 | `GET /payments/status/{session_id}` war komplett unauthentifiziert — Statuspreisgabe + jeder Aufruf löst einen Stripe-API-Call aus | Mittel | Niedrig | `routes_payment.py` |
| 6 | Link-Neugenerierung und Titelbild-Setzen ohne Rollenprüfung → Nur-Lese-Rolle „Assistent" konnte einen Live-Link invalidieren | Niedrig | Niedrig | `routes_property.py` |
| 7 | Admin-Nutzersuche gab die Sucheingabe ungeschützt als Regex an MongoDB weiter (ReDoS) | Niedrig | Niedrig | `routes_admin.py` |
| 8 | Freigabe-Links für Bewerberdokumente liefen nie ab, waren nicht widerrufbar und gaben auch künftig hochgeladene Dokumente frei | Mittel (DSGVO) | Mittel | `routes_profile.py` |

**Zu #1 — Handlungsbedarf außerhalb des Codes:** Die Token standen im Render-Logstream. Wer
Zugriff auf die Logs hatte (oder hatte), konnte jedes Konto übernehmen. Der Code ist gefixt; ob
alte Logs noch existieren und rotiert werden müssen, ist eine Frage an das Render-Dashboard.

**Zu #4:** Die Auswirkung war begrenzt, weil das Session-Token im `localStorage` der
*Frontend*-Origin liegt und nicht von der API-Origin gelesen werden kann. Bleibt: Phishing unter
einer mietgate-Domain. Jetzt wird alles außer JPEG/PNG/GIF/WebP/PDF als `attachment` mit
`application/octet-stream` ausgeliefert.

**Zu #8 — drei Teile, alle behoben:**
- **Ablauf:** Eine Freigabe gilt jetzt 14 Tage (`SHARE_TTL_DAYS`), danach liefert der Link 404.
- **Widerruf:** `POST /my/profile-inquiries/{id}/revoke` entfernt das Share-Token, der Link in
  der Mailbox des Vermieters läuft danach ins Leere. Rückgängig machbar über „Erneut freigeben",
  das ein frisches Token mit neuem Fenster ausstellt — sonst wäre Widerruf eine Einbahnstraße.
- **Snapshot:** Beim Freigeben werden die zu diesem Zeitpunkt vorhandenen Dokument-IDs
  festgehalten (`shared_document_ids`). Später hochgeladene Dokumente sind nicht mehr
  automatisch mit drin. Durchgesetzt in der Listenansicht **und** im Direkt-Download.

Freigaben, die vor dieser Änderung erteilt wurden, haben kein Ablaufdatum und gelten damit als
abgelaufen — genau das offene Zeitfenster war ja das Problem. Der Bewerber kann mit einem Klick
neu freigeben. Abgedeckt durch `backend/tests/test_document_share.py`.

---

## Geprüft und in Ordnung

- **Stripe-Webhook**: `construct_event()` verifiziert die Signatur auf dem einzigen Webhook-Pfad;
  bei fehlendem `STRIPE_WEBHOOK_SECRET` schlägt die Prüfung fehl (kein Bypass). Idempotenz über
  `processed_webhook_events` mit Unique-Index und 30-Tage-TTL — Stripe-Retries lösen keine
  Doppel-E-Mails aus.
- **JWT**: HS256 mit Secret aus der Umgebung (kein Default), 7 Tage Laufzeit, `jti`-Blockliste
  beim Logout mit TTL-Index. Kein `algorithms`-Wildcard, also kein `alg:none`-Angriff.
- **Org-Scoping der Kern-Endpunkte**: Objekte, Bewerbungen, Dokumente, Nachrichten, Termine,
  Team-Verwaltung, Abo — jeweils gegen `user["org_id"]` bzw. `applicant_user_id` geprüft.
  Nach den Fixes oben ist kein Endpunkt mit ID-Parameter mehr ungescoped.
- **Gestaffelte Dokumentenfreigabe**: Sowohl in der Listenansicht als auch im Direkt-Download
  durchgesetzt — der Download-Pfad ist kein Bypass.
- **Admin-Bereich**: alle 40+ Endpunkte über `require_roles("admin")`; Admin-Passwort kommt aus
  der Umgebung, kein eingebauter Default.
- **Brute-Force**: Login doppelt limitiert (pro IP+E-Mail und global pro E-Mail), dazu
  Ratelimits auf Passwort-vergessen, Verifizierungs-Neuversand und Login-Code.
- **CORS**: Whitelist aus `CORS_ORIGINS`, kein Wildcard mit `allow_credentials`.
- **CSRF**: Authentifizierung läuft ausschließlich über den `Authorization`-Header, nicht über
  Cookies — damit strukturell kein CSRF-Risiko.

---

## Offen — bewusst nicht in dieser Runde behoben

| Befund | Bewertung | Warum offen |
|--------|-----------|-------------|
| `POST /public/documents/upload` ist unauthentifiziert und hat kein Ratelimit — mit gültigem Objekt-Code und Bewerbungs-ID lassen sich bis zu 30 Dateien pro Bewerbung hochladen. | Niedrig | Beide Werte müssen bekannt sein (UUID4), Obergrenze greift. Ratelimit wäre sinnvoll, ist aber Missbrauchs-Härtung, kein Autorisierungsfehler. |
| Kein Ratelimit auf `POST /public/apply` | Niedrig | Spam-Vektor auf Bewerbungslinks. Vor echtem Traffic nicht messbar. |
| Keine Content-Security-Policy im Security-Header-Middleware | Niedrig | Die API liefert kein HTML mehr aus (siehe #4), damit stark entwertet. |
| Dependency-/CVE-Scan, Secrets-in-Git-Historie | — | Ausdrücklich aus dem Umfang genommen. |

---

## Wiederholung verhindern

Alle drei IDOR-Befunde (#2, #3 sowie der bereits am 2026-07-25 behobene) folgen demselben Muster:
ein `find_one({"id": x})` **ohne** `org_id` im Filter. Direkt daneben steht jeweils korrekt
gescopter Code — es sind keine Denkfehler, sondern Auslassungen.

Praktikable Regel für künftige Änderungen: **Jedes `find_one` auf `applications`, `properties`,
`viewings`, `documents` oder `org_members`, dessen ID aus einer Request kommt, gehört mit
`org_id` (bzw. `applicant_user_id`) in denselben Filter** — nicht in ein `if` danach. Als Grep
prüfbar:

```bash
grep -rn 'find_one({"id":' backend/routes_*.py
```

Jeder Treffer ohne zweites Scope-Feld braucht unmittelbar danach einen expliziten Vergleich.
