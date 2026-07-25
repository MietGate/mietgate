# MietGate — Launch-Audit (Stand 2026-07-25)

Vollständiges Audit über Vermieter-Flow, Bewerber-Flow, Admin-Bereich und Auth/Payment/Marketing/Compliance — vier parallele Tiefenprüfungen des kompletten Frontend- und Backend-Codes. Ziel: jeder Punkt, der vor einem echten Live-Gang mit zahlenden Kunden erledigt sein sollte.

Legende: 🔴 Blocker (vor Live-Gang zwingend) · 🟡 Wichtig (sollte vor/kurz nach Launch behoben sein) · 🟢 Nice-to-have (Post-Launch ok)

Nummerierung dient der Ansprache ("mach Nummer X") — keine feste Chronologie.

---

## A. Sicherheit & Autorisierung (bereichsübergreifend)

### 1. ✅ erledigt (2026-07-25) — Rollenprüfung mit Sicherheitslücke bei fehlendem Mitgliedschafts-Datensatz
`backend/routes_core.py:142-144,176-178,214-216` — Muster `if member and member["role"] not in (...)` überspringt die Prüfung komplett, wenn `member is None`. Betrifft `update_organization`, `invite_member`, `remove_member`. Richtig: `if not member or member["role"] not in (...)`.

### 2. ✅ erledigt (2026-07-25) — Fehlende Rollenprüfung bei kritischen Property-Aktionen
`backend/routes_property.py: update_property, toggle_link, activate_link (löst Stripe-Zahlung/Trial aus!), add_property_image, delete_property_image` prüfen nur `org_id`-Zugehörigkeit, nicht die Rolle. Jedes Teammitglied (auch "Assistent") kann Zahlungen/Trials auslösen und Objekte ändern. `delete_property` macht es korrekt — zeigt, dass es vergessen statt Absicht ist.

### 3. ✅ erledigt (2026-07-25) — Dokument-Upload ohne Eigentums-Prüfung der Bewerbung
`backend/routes_document.py:56-65` (`upload_document`) prüft nicht, ob `application["applicant_user_id"] == user["id"]`. Ein eingeloggter Bewerber kann durch fremde `application_id` ein Dokument an die Bewerbung eines anderen anhängen; der falsche Vermieter wird benachrichtigt.

### 4. ✅ erledigt (2026-07-25) — Öffentlicher Dokument-Upload missbrauchbar
`backend/routes_document.py:37-47` (`public_upload`) — keine Rate-Limits, kein Bewerbungs-Abschluss-Check, `application_id` wird im Klartext an den Client zurückgegeben. Jeder mit `code` + `application_id` kann beliebig viele Dateien zu einer fremden Bewerbung hochladen.

### 5. ✅ erledigt (2026-07-25) — CORS-Fallback erlaubt jede Origin mit Credentials
`backend/server.py:44-50` — wenn `CORS_ORIGINS` env in Prod nicht gesetzt ist, greift `allow_origin_regex: ".*"` kombiniert mit `allow_credentials=True`. CSRF/Session-Hijacking-Risiko. **Vor Launch verifizieren, dass die Env-Var gesetzt ist.**

### 6. ✅ erledigt (2026-07-25) — Kein serverseitiger Logout — JWT bleibt bis zu 7 Tage gültig
`backend/routes_auth.py:196-199` löscht nur `user_sessions`, das JWT selbst ist stateless und bleibt gültig. Kein Revocation-Mechanismus bei Logout, Passwortänderung oder Admin-Sperre einer aktiven Session.

### 7. ✅ erledigt (2026-07-25) — Rate-Limiting-Lücken
- Login-Lockout ist an `IP:E-Mail` gebunden (`routes_auth.py:158-179`) — durch IP-Rotation umgehbar, kein globaler Zähler pro E-Mail.
- `/auth/resend-verification` und `/auth/forgot-password` haben **kein** Rate-Limiting → Mail-Bombing einer fremden Adresse möglich.

### 8. ✅ erledigt (2026-07-25) — Fehlende Security-Header
`backend/server.py` — kein HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP.

### 9. ✅ erledigt (2026-07-25) — Passwort-Mindestlänge zu niedrig
`frontend/src/pages/Register.jsx:134` nur `minLength={6}`, kein serverseitiges Pendant in `routes_auth.py`. Für ein Produkt mit SCHUFA-/Gehaltsdaten zu schwach — auf 8+ Zeichen erhöhen und serverseitig prüfen.

### 10. ✅ erledigt (2026-07-25) — Google-OAuth-Zustimmung wird nur aus GET-Query vertraut
`backend/routes_auth.py:206-221` — `agreed_terms` kommt als URL-Parameter, den ein direkter API-Aufruf beliebig setzen kann, ohne dass der Nutzer tatsächlich zugestimmt hat. Serverseitig sollte die Zustimmung mit Zeitstempel+IP unabhängig vom Client-Parameter protokolliert werden (auch rechtlich relevant als Nachweis).

---

## B. Payment / Stripe

### 11. ✅ erledigt (2026-07-25) — Doppelte Subscriptions möglich → Doppelabrechnung
`backend/routes_payment.py:20-40` (`/payments/checkout`, von der Pricing-Seite genutzt) prüft nicht, ob die Org bereits ein aktives/trialing Abo hat, bevor eine neue Checkout-Session erzeugt wird. Der `subscriptions`-Datensatz wird per `org_id`-Upsert überschrieben — die alte Stripe-Subscription läuft unbemerkt weiter und wird weiterberechnet.

### 12. ✅ erledigt (2026-07-25) — Trial-Versprechen wird nicht überall eingehalten
`backend/stripe_service.py:88-92` — der 3-Tage-Trial wird nur im `/link/activate`-Flow gesetzt, nicht im direkten `/payments/checkout` von der Pricing-Seite. Wer dort direkt bucht, wird sofort belastet, obwohl FAQ/Register das Gegenteil versprechen. Widerspricht dem eigenen Marketingversprechen — abmahnfähig als irreführende Werbung.

### 13. 🔴 Config-Checkliste vor Go-Live (stiller Totalausfall bei Fehlkonfiguration)
- `STRIPE_WEBHOOK_SECRET` gesetzt (sonst werden alle Webhooks mit 400 abgelehnt, keine Abos werden je aktiviert)
- `RESEND_API_KEY` gesetzt
- `EMAIL_FROM` auf verifizierte eigene Domain (nicht `onboarding@resend.dev`-Sandbox)
- `ADMIN_EMAIL` gesetzt (sonst verpuffen Kontaktanfragen unbemerkt)
- `CORS_ORIGINS` explizit gesetzt (siehe Punkt 5)
- `JWT_SECRET` gesetzt (sollte beim Boot validiert werden, nicht erst bei erstem Request)

### 14. ✅ erledigt (2026-07-25) — Webhook-Idempotenz nur für `checkout.session.completed` gegeben
`backend/routes_payment.py:75-100` — kein genereller Event-ID-Duplikatschutz. Bei Stripe-Retries von `invoice.payment_failed`/`invoice.payment_succeeded`/`subscription.updated` können mehrfach E-Mails/Notifications an den Kunden rausgehen.

### 15. ✅ erledigt (2026-07-25) — Sofortige Link-Sperre beim ersten fehlgeschlagenen Zahlungsversuch
`backend/stripe_service.py:256-276` sperrt sofort, noch bevor Stripes eigene automatische Retry-Logik (mehrere Tage) überhaupt greift. Kundenunfreundlich — ein kurzzeitiger Kartenfehler sperrt sofort laufende Bewerbungen/Besichtigungen. Kulanzpuffer (z. B. erst ab 2. Fehlschlag) empfohlen.

### 16. ✅ erledigt (2026-07-25) — PaymentResult-Seite zeigt fälschlich "fehlgeschlagen" bei langsamer Webhook-Verarbeitung
`frontend/src/pages/PaymentResult.jsx:18-31` pollt nur 16s, danach "fehlgeschlagen" — bei SEPA/langsameren Zahlungswegen real zu kurz. Zustand "noch nicht bestätigt" von "wirklich fehlgeschlagen" unterscheiden.

### 17. ✅ erledigt (2026-07-25) — Kein Zugriff auf Stripe Billing Portal im Normalfall
`frontend/src/pages/landlord/Billing.jsx` — Zahlungsmethode ändern/Rechnungen einsehen ist nur über den "Zahlung gesperrt"-Banner erreichbar (`PropertyDetail.jsx`), nicht auf der regulären Abo-Seite. Für B2B-Kunden in Deutschland werden Rechnungen erwartet.

### 18. ✅ erledigt (2026-07-25) — "Abo kündigen" ohne Bestätigungsdialog
`frontend/src/pages/landlord/Billing.jsx:23-26` — sofortiger `POST /subscription/cancel` beim Klick, kein `confirm()`.

### 19. ✅ erledigt (2026-07-25) — Admin-Plan-Preisänderung synct nicht mit echtem Stripe-Preis
`AdminPlans.jsx` speichert `price_monthly`/`price_yearly` nur in der eigenen DB — der tatsächliche Stripe-Preis (`CATALOG` in `stripe_service.py`) ändert sich dadurch nicht. Kein Warnhinweis im UI → Verwechslungsgefahr zwischen Anzeige- und echtem Verkaufspreis.

### 20. ✅ erledigt (2026-07-25) — Admin-Dashboard-Zahlen unvollständig/irreführend
`backend/routes_admin.py:13-36` — Abos mit Status `past_due` tauchen weder bei "aktiv" noch "gekündigt" auf und verschwinden komplett aus der Statistik. `trialing`-Abos werden nirgends separat gezählt, obwohl der 3-Tage-Trial das Kernstück des Monetarisierungsmodells ist.

---

## C. DSGVO / Impressum / AGB / Rechtliches

### 21. ✅ teilweise erledigt (2026-07-25) — Impressum: Adresse + Steuernummer aktualisiert
`frontend/src/pages/LegalPages.jsx` — Hamburg-Adresse + Steuernummer 43/027/06145 hinzugefügt, Gesellschaftsform vereinfacht auf "BORK Solutions". Verbleibender organisatorischer Schritt: Handelsregistereintragung vor/unmittelbar nach Launch abschließen, dann HR-Nummer nachtragen (derzeit i. Gr.).

### 22. ✅ erledigt (2026-07-25) — Widerrufsrecht bei digitalen Leistungen rechtlich angreifbar
Die Widerrufsbelehrung (`LegalPages.jsx:236`) behauptet, die "aktive Buchung" stelle die nach § 356 Abs. 5 BGB nötige ausdrückliche Zustimmung zum vorzeitigen Vertragsbeginn + Kenntnisnahme vom Widerrufsverlust dar — aber im Checkout-Flow selbst (Pricing/PricingSection, Stripe-Checkout) gibt es **keine separate Checkbox/aktiven Bestätigungsakt** unmittelbar vor dem Kauf. Ohne aktiven Bestätigungsakt erlischt das Widerrufsrecht nach BGH-Linie womöglich nicht — Kunden könnten auch nach Nutzung noch widerrufen. **Juristisch prüfen lassen**, ggf. Checkbox vor Checkout ergänzen.

### 23. ✅ erledigt (2026-07-25) — DSGVO-Löschung: physische Dateien im Object Storage nicht sicher gelöscht (mehrere Fundstellen)
- `backend/routes_property.py` — `delete_property` und `delete_property_image` löschen nur DB-Einträge, rufen nirgends `storage.delete_object` für R2 auf. Verwaiste Bewerberdokumente/Objektfotos bleiben dauerhaft gespeichert.
- `backend/routes_document.py:105-112` — Soft-Delete setzt `is_deleted: True` unabhängig davon, ob der R2-Delete tatsächlich erfolgreich war (kein gekoppeltes Error-Handling).
- `backend/maintenance.py:54-81` — GDPR-Cleanup löscht nur `db.documents`-Einträge; ob die zugrunde liegenden Dateien im Storage mitgelöscht werden, ist ungeklärt und sollte geprüft werden (Widerspruch zur Datenschutzerklärung, falls nicht).

### 24. ✅ erledigt (2026-07-25) — Kein vollständiges Löschrecht für Bewerbungsdaten/Konto
Nur einzelne Dokumente sind löschbar (`routes_document.py`); es gibt keinen Endpunkt, mit dem ein Bewerber seine komplette Bewerbung (Gehalt, SCHUFA-Status etc.) oder sein Konto vollständig löschen/anonymisieren kann (Art. 17 DSGVO).

### 25. ✅ erledigt (2026-07-25, im Zuge von #23) — Property-Löschung räumt verknüpfte Daten nicht auf
`backend/routes_property.py:123-133` löscht nur den Property-Datensatz, nicht `applications`, `viewings`, `documents`, `messages` — verwaiste personenbezogene Daten bleiben bestehen.

### 26. ✅ erledigt (2026-07-25) — Draft-Speicherung im Bewerbungsformular ohne DSGVO-Hinweis
`frontend/src/pages/PublicApplication.jsx:60-81` — personenbezogene Daten werden unbegrenzt im `localStorage` gehalten, ohne Hinweistext im Formular, ohne Ablaufdatum, ohne Löschmöglichkeit außer erfolgreichem Absenden. Transparenzpflicht-Risiko, insbesondere bei gemeinsam genutzten Geräten.

### 27. ✅ erledigt (2026-07-25) — Cookie-Banner nur binär, Datenschutztext beschreibt aber drei Kategorien
`frontend/src/components/CookieConsent.jsx` bietet nur "Alle"/"Nur notwendige", während die Datenschutzerklärung (`LegalPages.jsx:279-284`) Notwendig/Statistik/Marketing als separat wählbare Kategorien beschreibt. Text und tatsächliche Consent-UI abgleichen (TTDSG).

### 28. ✅ erledigt (2026-07-25) — Serverseitige Pflichtfeld-Validierung im Bewerbungsformular fehlt
`backend/routes_application.py` — Pflichtfelder aus `form_config` werden nur clientseitig (`PublicApplication.jsx`) erzwungen; das Backend akzeptiert `form_data: Dict[str, Any]` ungeprüft. Direkter API-Call kann unvollständige Bewerbungen einreichen.

---

## D. Bewerber-Flow (Funktionalität/UX)

### 29. ✅ erledigt (2026-07-25) — Payment-gesperrte Links zeigen identische Fehlermeldung wie "ungültiger Link"
`backend/routes_application.py:88-93`, `PublicApplication.jsx:83` — ein Bewerber mitten im Ausfüllen (mit Draft im localStorage!), dessen Vermieter zahlungssäumig wird, verliert kommentarlos den Zugang. Wirkt wie ein Bug statt wie ein Systemzustand.

### 30. ✅ erledigt (2026-07-25) — Kein Double-Submit-Schutz bei der Bewerbungsabgabe
`PublicApplication.jsx` `submit()` + `backend/routes_application.py:94-114` — kein Idempotency-Key, kein serverseitiger Schutz vor Doppel-Klick/Retry bei Timeout. Kann zu doppelten Bewerbungen/Nutzerkonten mit gleicher E-Mail führen (kein sichtbarer Unique-Index-Schutz).

### 31. ✅ erledigt (2026-07-25) — Datei-Upload im Bewerbungsformular ohne Ladezustand/Retry/Abbruch
`PublicApplication.jsx:157-170` — kein Spinner, kein Cancel, kein Retry bei Fehlschlag. Kernkonversionsschritt, oft auf Mobile bei langsamer Verbindung.

### 32. ✅ erledigt (2026-07-25) — Kein Weg für den Bewerber erkennbar, Dokumente nachzureichen
Wenn `document_timing !== "before"`, wird der Upload-Block auf der Erfolgsseite ausgeblendet (`PublicApplication.jsx:193`) — nirgends wird erklärt, dass der Bewerber sich einloggen und zu "Meine Dokumente" navigieren muss, um später hochzuladen.

### 33. ✅ erledigt (2026-07-25) — Keine Terminbestätigung per E-Mail an den Bewerber
`backend/routes_viewing.py:134-165` (`book-slot`) benachrichtigt nur den Vermieter. Der Bewerber bekommt nur einen Browser-Toast — kein schriftlicher Nachweis für einen wichtigen Besichtigungstermin.

### 34. ✅ erledigt (2026-07-25) — Zeitfenster wird bei Terminabsage nicht freigegeben
`backend/routes_viewing.py:173-186` (`respond_viewing`) setzt den Status auf "declined", gibt das reservierte Zeitfenster in `viewing.slots[]` aber nicht frei — der Slot bleibt für andere Bewerber blockiert.

### 35. ✅ erledigt (2026-07-25) — Terminlöschung entfernt den Termin komplett statt ihn als abgesagt zu markieren
`backend/routes_viewing.py:91-105` (`delete_viewing`) — falls die Absage-Mail nicht ankommt, verschwindet der Termin einfach aus der Bewerber-Ansicht, ohne jede nachträgliche Nachvollziehbarkeit.

### 36. 🟢 Kein Anti-Spam-Schutz auf öffentlichen Endpunkten
`/public/apply`, `/public/documents/upload` — kein Captcha/Honeypot, anfällig für automatisierten Missbrauch.

### 37. 🟢 Weitere kleinere Bewerber-UX-Punkte
Kamera-Direktaufnahme (`capture="environment"`) fürs Datei-Upload-Feld fehlt · nativer `window.confirm` beim Dokument-Löschen inkonsistent zum sonstigen UI · kein Hinweis auf automatische Draft-Speicherung während des Ausfüllens · Absage-Status im Dashboard ohne weiterführenden Hinweis.

---

## E. Vermieter-Flow (Funktionalität/UX)

### 38. ✅ erledigt (2026-07-25) — Kein Lösch-UI für Objekte im Frontend
`DELETE /api/properties/{id}` existiert (`routes_property.py:123-133`), aber weder `Properties.jsx` noch `PropertyDetail.jsx` bieten einen Button dafür — Vermieter können fehlerhafte/doppelte Objekte nicht selbst entfernen.

### 39. ✅ erledigt (2026-07-25) — Team-Rolle eines bestehenden Mitglieds kann nicht geändert werden
Nur Einladen (mit initialer Rolle) und Entfernen ist möglich. Eine Rollenänderung würde Entfernen + Neu-Einladen erfordern, aber `invite_member` lehnt "bereits Mitglied" ab (`routes_core.py:184`) — Rollenwechsel ist über die UI aktuell praktisch unmöglich ohne Support.

### 40. ✅ erledigt (2026-07-25) — Team-Einladung funktioniert nur für bereits registrierte Nutzer
Kein Einladungslink/-mail für noch nicht registrierte Personen — für die Zielgruppe Makler/Hausverwaltung (Team-Feature) ein echtes Hindernis.

### 41. ✅ erledigt (2026-07-25) — Nachrichten/Termin-Benachrichtigungen gehen nur an den ursprünglichen Objekt-Ersteller
`backend/routes_message.py:38-40`, `backend/routes_viewing.py:76,96-97,159-165` — bei Teams mit mehreren Mitarbeitern verpassen andere Teammitglieder eingehende Bewerbernachrichten/Terminantworten.

### 42. ✅ erledigt (2026-07-25) — Race Condition bei mehrfachem Klick auf "Bewerbungslink aktivieren"
`backend/routes_property.py:168-213` — kein Locking zwischen Prüfung und Checkout-Erstellung, kein Ladezustand auf dem Button im Plan-Picker-Dialog. Kann mehrere Checkout-Sessions erzeugen.

### 43. ✅ erledigt (2026-07-25) — Keine serverseitige Validierung von Zahlenfeldern
`backend/routes_property.py:81-98` — negative Miete/Fläche werden akzeptiert und würden auf der öffentlichen Bewerbungsseite erscheinen.

### 44. 🟢 Weitere Vermieter-UX-Punkte
Bild-Löschen ohne Bestätigungsdialog (inkonsistent zu Team/Termin/Absage) · Dashboard-Kacheln "Dokumente"/"Besichtigungen" nicht anklickbar · keine objektübergreifende Terminübersicht · PropertyForm ohne Autosave bei langem Formular · Kanban auf Tablet-Breite schlecht bedienbar · Logo-Vorschau lädt über privaten Download-Endpoint statt öffentlichem Bild-Endpoint (prüfen, ob White-Label-Logo auf der öffentlichen Bewerbungsseite überhaupt korrekt ohne Auth angezeigt wird).

---

## F. Admin-Bereich

### 45. ✅ erledigt (2026-07-25) — White-Label-Anzeige/Bearbeitung im Admin liest das falsche Feld
`AdminOrganizations.jsx:32,59` liest `o.white_label?.enabled` (Kunden-eigene Aktivierung), während der bezahlte Zusatz unter `organizations.white_label_addon` gespeichert wird (`routes_admin.py:107`, `stripe_service.py:146`). Ein Admin kann beim Speichern versehentlich ein bezahltes Addon zurücksetzen, weil die Checkbox den falschen Zustand anzeigt.

### 46. ✅ erledigt (2026-07-25) — AdminDashboard zeigt bei API-Fehler dauerhaft nur den Ladespinner
`AdminDashboard.jsx:17` — `.catch(() => {})` schluckt Fehler still, keine Fehlermeldung/Retry (im Gegensatz zu anderen Admin-Seiten).

### 47. ✅ verifiziert (2026-07-25) — `lead_stages`-Seed-Daten vor Launch verifizieren (bereits in seed.py korrekt implementiert)
Falls die Collection beim ersten Start leer ist, sind alle neu angelegten Leads im Kanban unsichtbar (`_lead_stage_keys()` liefert dann nichts, keine Spalte rendert).

### 48. ✅ erledigt (2026-07-25) — Support-Ticket-Workflow ohne Antwortfunktion
`routes_admin.py:178-186`, `AdminSupport.jsx` — nur Status änderbar, keine Möglichkeit, dem Kunden direkt aus der App zu antworten (nur `mailto:`), keine Historie.

### 49. ✅ erledigt (2026-07-25) — "Heute fällig"-Panel in AdminLeads aktualisiert sich nicht automatisch
Nach Erledigen einer Aufgabe im Tasks-Tab bleibt sie im "Heute fällig"-Banner sichtbar, bis die Seite neu geladen wird (fehlender Callback zwischen Komponenten).

### 50. 🟢 Weitere Admin-Punkte
Kein Audit-Log für die meisten Admin-Aktionen (nur `set_manual_subscription` geloggt) · kein UI für bestehenden `/admin/payments`-Endpoint · kein Export (CSV) für Leads/Nutzer/Zahlungen · keine Zeitreihen/Trends im Dashboard · `AdminPlans` ohne Vorschau der öffentlichen Feature-Liste.

---

## G. Tote/unbenutzte Dateien

### 51. 🟢 `LandingLegacy.jsx` und `LandingBento.jsx` sind unbenutzt
Nirgends geroutet (nur `Landing.jsx` wird verwendet). Vor Launch entfernen oder klar als archiviert kennzeichnen, um Verwirrung zu vermeiden.

---

## H. Gesammelte Nice-to-haves (Post-Launch, keine Blocker)

- Objekt-Duplizieren-Funktion, Bulk-Aktionen in der Pipeline (Mehrfach-Absage/-Einladung)
- Export von Bewerberdaten/Pipeline (CSV/PDF)
- Undo-Funktion / Kulanzfenster nach versehentlicher Statusänderung
- 2FA-Option für Konten mit Zugriff auf sensible Dokumente
- "Alle Geräte abmelden"/Session-Übersicht
- Live-Vorschau der White-Label-Farben/Logo vor dem Speichern
- Direkter Deep-Link zum Stripe-Billing-Portal in der Zahlungsfehler-E-Mail
- AGB-Versionsstand mitprotokollieren (nicht nur Zeitstempel der Zustimmung)
- TTL-Index auch auf `email_verification_tokens` (aktuell nur bei `password_reset_tokens`)

---

## Empfohlene Reihenfolge

1. **Zuerst A + B (Sicherheit + Payment)** — betreffen Geld und Zugriffsrechte, am schwersten nachträglich zu reparieren.
2. **Dann C (Recht/DSGVO)** — Punkt 21 und 22 sollten möglichst parallel mit einem Anwalt/Steuerberater geklärt werden, da das keine reinen Code-Fixes sind.
3. **Dann D + E + F** je nachdem, welcher Nutzerkreis zuerst live geht (Bewerber-Flow ist die Konversionsseite — hohe Priorität).
4. **G und H** bei Gelegenheit, kein Launch-Hindernis.

Sag mir einfach die Nummer(n), und wir legen los.
