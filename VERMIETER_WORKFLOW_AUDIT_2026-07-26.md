# MietGate — Vermieter-Workflow-Audit (Hands-on)
Datum: 2026-07-26

Durchgeführt als tatsächlicher Klick-Durchlauf (nicht nur Code-Lesen) mit einem frischen Test-Vermieter-Konto:
Registrierung → Objekt anlegen → Bewerbungslink aktivieren → Testbewerbung einreichen → Pipeline/Bewerber prüfen →
Besichtigungstermin anlegen, einladen, Kalenderdatei exportieren → Einstellungen/Kontoverwaltung.

Ziel der Frage: ist der Workflow gut, fehlen Funktionen, ist die Übersicht gut, und sollte das Objekt-Formular
mehrstufig ("Fibel"-Stil) statt als eine lange Seite umgesetzt werden.

---

## Kernempfehlung: Objekt-Formular auf Multi-Step-Wizard umstellen

**Befund:** „Neues Objekt" (`PropertyForm.jsx`) ist aktuell **eine einzige, lange Scroll-Seite** mit 6 Abschnitten
(Basisdaten, Wohnungsdaten, Mietdaten, Weitere Informationen, Dokumente & Status, Bewerbungsformular-Builder)
und darunter ~20 Zeilen Formular-Builder (Pflicht/Optional/Aus je Feld) — insgesamt über 40 Eingabeelemente auf
einer Seite ohne jede Gliederung außer Überschriften.

**Vergleich:** Der öffentliche Bewerbungs-Flow (`PublicApplication.jsx`), den der *Bewerber* ausfüllt, ist bereits
ein sauberer **7-Schritte-Wizard** mit Fortschrittsbalken, Zusammenfassungsseite und Zurück/Weiter-Navigation.

**Antwort auf die Frage: Ja, ein Wizard ist hier klar besser**, aus denselben Gründen, die schon für den
Bewerbungs-Flow gegolten haben:
- Kognitive Last sinkt: pro Schritt nur ein Thema (Adresse, dann Zahlen, dann Miete, dann Formular-Builder).
- Mobil nutzbar: Die aktuelle Seite ist auf dem Handy eine sehr lange Scrollstrecke mit vielen nebeneinander
  liegenden Zwei-Spalten-Feldern, die auf Mobilgeräten umbrechen.
- Der Formular-Builder (Pflicht/Optional/Aus für ~20 Bewerberfelder) ist der mit Abstand längste Teil und sollte
  ein eigener, klar erkennbarer Schritt sein — aktuell wirkt er wie ein Anhängsel am Ende einer bereits langen Seite.
- Konsistenz: Vermieter sehen nach der Registrierung *zwei völlig unterschiedliche* Formular-Paradigmen im selben
  Produkt (Wizard für Bewerber, Ein-Seiten-Formular für sich selbst) — wirkt uneinheitlich.

**Empfohlene Schritt-Aufteilung** (analog zur bestehenden Bewerbungsformular-Kategorisierung):
1. Adresse & Titel (Basisdaten)
2. Wohnungsdaten (Fläche, Zimmer, Ausstattung)
3. Mietdaten
4. Weitere Informationen (Einzugstermin, Beschreibung, Status)
5. Formular-Builder (was Bewerber angeben müssen)
6. Zusammenfassung/Speichern

Der Bearbeiten-Modus (Edit) kann davon unabhängig weiter alle Felder auf einer Seite zeigen — dort ist schnelles
Nachjustieren einzelner Felder wichtiger als eine geführte Erstellung. Der Wizard lohnt sich vor allem für die
*Erstellung*, wenn ein Vermieter zum ersten Mal vor einem leeren Formular steht.

---

## Bug gefunden & behoben (in dieser Session, noch nicht committed)

**Bewerbungsdetails zeigten rohe interne Feldnamen/-werte statt lesbarer Labels.**
`Pipeline.jsx` (Bewerber-Detailansicht) hat `app.form_data` direkt iteriert und dabei Schlüssel/Werte roh angezeigt:
- „Beschaeftigungsstatus" statt „Beschäftigungsstatus" (Umlaute gingen durch die naive `key.replace(/_/g," ")`-
  Transformation verloren, weil der interne Key selbst kein Umlaut enthält)
- „2000_3000" statt „2.000 – 3.000 €" (roher Auswahl-Slug statt der in `constants.py` hinterlegten `option_labels`)
- „2026-09-01" statt „1.9.2026" (ISO-Datum unformatiert)

Der öffentliche Bewerbungs-Flow und das Formular-Builder-Setup nutzen bereits die zentrale `FORM_FIELDS`-Konfiguration
aus dem Backend (`GET /api/form-fields`) mit `label`/`option_labels` — nur die Vermieter-seitige Detailansicht tat das
nicht. **Fix:** `Pipeline.jsx` lädt jetzt dieselbe Konfiguration und löst Label, Auswahl-Text und Datumsformat korrekt
auf. Verifiziert im Browser — zeigt jetzt korrekt „Beschäftigungsstatus: Angestellt",
„Monatliches Nettoeinkommen: 2.000 – 3.000 €", „Gewünschter Einzugstermin: 1.9.2026".

→ Diff liegt in `frontend/src/components/Pipeline.jsx`, noch nicht committed (auf Wunsch committe ich das separat).

---

## Weitere Funde

### 1. Vermieter-Konten haben keine DSGVO-Selbstlöschung (Art. 17)
`DELETE /api/me/account` ist im Backend bewusst auf `role == "applicant"` beschränkt (Kommentar erklärt: Vermieter-
Konten besitzen geteilte Organisationsdaten und brauchen einen durchdachteren Off-Boarding-Flow statt Ein-Klick-Löschung
— eine vernünftige Design-Entscheidung, kein Versehen). Im Frontend (`Settings.jsx`) ist der „Konto löschen"-Bereich
entsprechend nur für `!isLandlord` sichtbar.

**Lücke:** Für Vermieter gibt es aktuell *nirgends* im UI einen Hinweis, wie sie eine Löschung überhaupt anfordern
können (kein Support-Link, kein Text im Einstellungen-Bereich) — nur eine Fehlermeldung, die man nie zu sehen bekommt,
weil der Button für Vermieter gar nicht existiert. Für DSGVO-Vollständigkeit reicht ein manueller/Support-gestützter
Prozess aus, er muss aber *auffindbar* sein.
**Empfehlung:** Kurzer Hinweistext in den Einstellungen für Vermieter („Konto löschen? Kontaktieren Sie
support@mietgate.de") als Zwischenlösung; ein automatisierter Owner-Offboarding-Flow (Objekte/Bewerbungen/Abo zuerst
klären) bleibt ein separates, größeres Feature für später.

### 2. Breadcrumb-Bug auf der Team-Seite
`/team` zeigt in der Kopfzeile „Übersicht" statt „Team". Ursache: `DashboardShell.jsx` filtert den Team-Nav-Eintrag
aus der Navigationsliste heraus, wenn der aktuelle Plan kein Team unterstützt (`supportsTeam`) — dieselbe gefilterte
Liste wird aber auch für die Breadcrumb-Label-Suche verwendet, die dann nichts findet und auf den Default „Übersicht"
zurückfällt. Betrifft jeden Vermieter im Starter-/Plus-Plan, der `/team` aufruft. Kosmetisch, niedrige Priorität.

### 3. Besichtigungstermin: keine Dauer einstellbar
Beim Anlegen einer Einzelbesichtigung gibt es nur ein Datum/Uhrzeit-Feld, keine Enddauer. Der `.ics`-Export setzt
dafür intern immer pauschal 30 Minuten (`frontend/src/lib/ics.js`), unabhängig von der tatsächlich geplanten Dauer.
Für die meisten Besichtigungen ok, aber bei größeren Objekten/Massenbesichtigungen ggf. zu kurz im Kalender des
Vermieters. Nice-to-have, kein Blocker.

---

## Was gut funktioniert (positiv geprüft)

- **Registrierung → E-Mail-Bestätigung → Dashboard**: sauber, klare Onboarding-Sidebar ("In 2 Minuten startklar").
- **Freemium-Modell**: Objekt anlegen/bearbeiten ist kostenlos, erst „Bewerbungslink aktivieren" verlangt ein Paket
  mit 3-Tage-Trial — inkl. korrekt eingebauter Widerrufsrecht-Checkbox vor Checkout (bereits gelöster Audit-Punkt).
- **Bewerbungslink-Tab**: Copy-Button, Live-Statistik, fertiger Beispieltext fürs Inserat — durchdacht.
- **Bewerbungs-Wizard** (Bewerberseite): 7 Schritte, Fortschrittsbalken, 14-Tage-Draft-Hinweis mit „jetzt löschen"-
  Option, DSGVO-Consent auf der Zusammenfassungsseite, Dokument-Upload direkt nach Absenden.
- **Pipeline/Kanban**: 8 Status-Spalten, Matching-Score mit Tooltip-Erklärung, Sterne-Bewertung, interne Notizen,
  eingebauter Chat mit Zeitstempeln — alles im selben Slide-over, keine Kontextwechsel nötig.
- **Automatischer Status-Sprung**: Ein Bewerber, der zu einer Besichtigung eingeladen wird, rutscht automatisch in
  die Spalte „Besichtigung" — spart manuelles Nachpflegen.
- **Besichtigungen**: alle drei Typen (Einzel/Slots/Massen) vorhanden, Einladen-Dialog, `.ics`-Kalenderexport
  funktioniert clientseitig sauber (Standard-ICS, in Google/Outlook/Apple importierbar).
- **Bilder-Tab**: eigener Upload-Bereich, klar getrennt von den Objektdaten.
- **Einstellungen**: Profil/Passwort/Organisation/White-Label sauber getrennt in Tabs, Passwort-Mindestlänge 8
  bereits durchgesetzt.

---

## Offene Punkte aus früheren Audits, die hier erneut relevant wurden
- Zwei-Wege-Kalender-Sync (aktuell nur Einweg-`.ics`-Export) — bereits in `README.md`/ROADMAP als bekanntes
  Nice-to-have vermerkt, kein neuer Fund.
- Automatisierte Nebenkostenabrechnung, Gewerbeobjekte-Workflow, öffentliche Makler-Profile — weiterhin nicht
  umgesetzt (siehe README, Abschnitt „Offene Aufgaben").
