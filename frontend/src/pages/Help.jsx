import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Search, LifeBuoy, Loader2, Send, BookOpen, CheckCircle2 } from "lucide-react";

/* The catalogue is deliberately kept in code rather than the database: it describes how the
   product behaves, so it belongs next to the product and changes with it. `keywords` carries
   the words people actually type ("schufa", "absagen") when they don't know our wording. */
const LANDLORD_TOPICS = [
  {
    section: "Erste Schritte",
    items: [
      {
        q: "Wie lege ich mein erstes Objekt an?",
        keywords: "objekt wohnung anlegen erstellen neu immobilie",
        a: "Über „Objekte“ → „Neues Objekt“. Der Assistent führt Sie durch Basisdaten, Wohnungsdaten, Mietdaten, weitere Informationen, Bilder und das Bewerbungsformular. Nur der Titel ist Pflicht — alles andere können Sie später ergänzen. Anlegen und Bearbeiten ist kostenlos; erst der aktive Bewerbungslink ist kostenpflichtig.",
      },
      {
        q: "Wie kommen Bewerbungen zu mir?",
        keywords: "bewerbungslink link teilen inserat aktivieren scout kleinanzeigen",
        a: "Aktivieren Sie im Objekt den Bewerbungslink (Tab „Bewerbungslink“). Diesen Link fügen Sie in Ihr Inserat ein — unter dem Link finden Sie fertige Textbausteine zum Kopieren. Jeder, der sich darüber bewirbt, landet automatisch in Ihrer Pipeline.",
      },
      {
        q: "Was kostet MietGate?",
        keywords: "preis kosten abo paket zahlung tarif stripe kündigen",
        a: "Objekte anlegen und verwalten ist kostenlos. Bezahlt wird der aktive Bewerbungslink — mit 3 Tagen kostenlosem Test. Die aktuellen Pakete sehen Sie unter „Einstellungen“ → „Abo & Zahlungen“, dort können Sie auch jederzeit kündigen oder die Zahlungsmethode ändern.",
      },
    ],
  },
  {
    section: "Bewerbungen",
    items: [
      {
        q: "Wie funktioniert die Pipeline?",
        keywords: "pipeline spalten status phase verschieben kanban board",
        a: "Jede Bewerbung durchläuft die Phasen Neu → Prüfung → Interessant → Besichtigung → Favorit → Zusage. Sie ziehen Karten per Maus in die nächste Spalte oder ändern den Status in der Bewerberkarte. Bewerber sehen ihren Status ebenfalls und werden bei Änderungen benachrichtigt.",
      },
      {
        q: "Was bedeutet der Score neben einem Bewerber?",
        keywords: "score matching punkte bewertung 100 einschätzung",
        a: "Eine automatische Entscheidungshilfe von 0 bis 100. Sie berücksichtigt das Verhältnis von Einkommen zur Miete, Haushaltsgröße gegenüber Zimmerzahl, ob ein Einzugstermin angegeben wurde und wie vollständig die Dokumente sind. Der Score ersetzt Ihre eigene Prüfung nicht und ist bewusst frei von Merkmalen, die zu einer Benachteiligung führen könnten.",
      },
      {
        q: "Ich finde einen bestimmten Bewerber nicht mehr",
        keywords: "suchen finden filter bewerber verloren archiv",
        a: "Unter „Bewerbungen“ sehen Sie alle Bewerbungen über sämtliche Objekte hinweg, mit Suche nach Name und E-Mail sowie Filtern nach Objekt und Status. Ein Klick auf die Zeile öffnet die Bewerberkarte direkt. Zusätzlich gibt es oben die globale Suche.",
      },
    ],
  },
  {
    section: "Besichtigungen",
    items: [
      {
        q: "Welche Arten von Terminen gibt es?",
        keywords: "besichtigung termin einzel massen zeitfenster slots gruppe",
        a: "Einzelbesichtigung (ein fester Termin), Zeitfenster (mehrere Slots zur Auswahl, Bewerber buchen selbst) und Massenbesichtigung (ein Termin mit Teilnehmerobergrenze).",
      },
      {
        q: "Wie viele Bewerber passen in ein Zeitfenster?",
        keywords: "slot plätze kapazität mehrere gleichzeitig zuerst buchen",
        a: "Das legen Sie beim Anlegen unter „Plätze pro Zeitfenster“ fest. Bei einem Fenster von einer Stunde und 30 Minuten pro Besichtigung passen beispielsweise zwei Bewerber nacheinander hinein. Wer zuerst bucht, kommt zuerst; belegt ist ein Fenster erst, wenn alle Plätze vergeben sind.",
      },
      {
        q: "Was ist eine offene Besichtigung?",
        keywords: "offene besichtigung automatisch einladen alle bewerber",
        a: "Ein Termin, zu dem jeder neue Bewerber automatisch eingeladen wird. Die Einladung geht rund 10 Minuten nach Eingang der Bewerbung raus — so bekommt der Bewerber nicht zwei Mails in derselben Sekunde, und Sie können in dem Zeitfenster noch eingreifen.",
      },
      {
        q: "Ein Bewerber möchte den Termin verschieben",
        keywords: "umbuchung verschieben absagen termin ändern reschedule",
        a: "Die Anfrage erscheint bei dem Termin gelb hervorgehoben. Bei festen Terminen tragen Sie dort direkt eine neue Zeit ein und bieten sie an; bei Zeitfenstern wählt der Bewerber selbst ein anderes freies Fenster. Sie können die Anfrage auch begründet ablehnen.",
      },
    ],
  },
  {
    section: "Dokumente",
    items: [
      {
        q: "Wie fordere ich Dokumente an?",
        keywords: "dokumente anfordern unterlagen nachweise hochladen",
        a: "In der Bewerberkarte unter „Dokumente“ auf „Anfordern“ klicken und die benötigten Unterlagen ankreuzen. Der Bewerber sieht anschließend genau diese Liste mit einem Fortschritt („noch 2 von 3 offen“) und kann pro Zeile hochladen.",
      },
      {
        q: "Warum kann ich die Bonitätsauskunft nicht anfordern?",
        keywords: "schufa bonität gehaltsnachweis ausweis gesperrt gesetz dsgvo datenschutz",
        a: "Bonitäts- und Einkommensunterlagen dürfen Sie erst verlangen, wenn ein Bewerber in der engeren Auswahl ist — so sieht es die Orientierungshilfe der Datenschutzbehörden für die Wohnungswirtschaft vor. MietGate schaltet sie deshalb erst ab dem Status „Favorit“ frei, Ausweis und Aufenthaltstitel erst ab „Zusage“. Verschieben Sie den Bewerber in die entsprechende Phase, dann lässt sich das Dokument anfordern.",
      },
      {
        q: "Ein Bewerber sagt, er habe hochgeladen — ich sehe nichts",
        keywords: "dokument fehlt nicht sichtbar upload problem",
        a: "Prüfen Sie den Status der Bewerbung: Bonitäts- und Ausweisunterlagen werden erst ab „Favorit“ beziehungsweise „Zusage“ sichtbar. Bis dahin sehen Sie in der Liste, dass das Dokument vorliegt, aber nicht dessen Inhalt.",
      },
    ],
  },
  {
    section: "Zusage & Absage",
    items: [
      {
        q: "Was passiert bei einer Zusage?",
        keywords: "zusage vergeben glückwunsch mieter entscheiden",
        a: "Der Bewerber erhält sofort eine Zusage-Mail mit Ausblick auf Übergabe und Mietvertrag. Anschließend werden Sie gefragt, ob die übrigen Bewerber eine freundliche Absage erhalten sollen — das ist bewusst eine eigene Rückfrage, weil es viele Menschen auf einmal anschreibt und sich nicht zurücknehmen lässt. In der Bewerberkarte erscheint danach ein Block mit Kontaktdaten und einem Knopf für den Übergabetermin.",
      },
      {
        q: "Die Zusage hat sich zerschlagen — was nun?",
        keywords: "zusage rückgängig geplatzt abgesprungen neu vergeben",
        a: "Ziehen Sie die Bewerbung einfach in eine frühere Phase zurück. Der Bewerber erhält dann eine „Gute Neuigkeiten“-Mail statt eines kommentarlosen Rücksprungs, und Sie können neue Termine vergeben.",
      },
    ],
  },
  {
    section: "Konto & Datenschutz",
    items: [
      {
        q: "Wie lange werden Bewerberdaten gespeichert?",
        keywords: "löschen dsgvo aufbewahrung frist datenschutz speicherung",
        a: "Automatisch: abgelehnte Bewerbungen nach 6 Monaten, inaktive nach 12 Monaten, erfolgreich abgeschlossene nach 24 Monaten. Dokumente und Nachrichten werden dabei mitgelöscht. Bewerber können ihr Konto zusätzlich jederzeit selbst löschen.",
      },
      {
        q: "Kann ich Kollegen Zugriff geben?",
        keywords: "team mitarbeiter kollege einladen zugriff rechte",
        a: "Ja, unter „Team“ — sofern Ihr Paket das unterstützt. Rollen reichen von Vollzugriff bis zu rein lesendem Zugriff.",
      },
      {
        q: "Ich möchte weniger E-Mails bekommen",
        keywords: "email benachrichtigung abschalten weniger stumm spam",
        a: "Unter „Einstellungen“ → „Benachrichtigungen“ können Sie einzelne Kategorien abschalten. Vertragsrelevante Mails wie Zahlungshinweise erreichen Sie weiterhin.",
      },
    ],
  },
];

const APPLICANT_TOPICS = [
  {
    section: "Ihre Bewerbung",
    items: [
      {
        q: "Wie sehe ich, wie es um meine Bewerbung steht?",
        keywords: "status bewerbung stand wie weit phase",
        a: "In Ihrer Übersicht sehen Sie jede Bewerbung mit aktuellem Status. Bei jeder Änderung durch den Vermieter erhalten Sie zusätzlich eine Benachrichtigung und eine E-Mail.",
      },
      {
        q: "Kann ich meine Bewerbung zurückziehen?",
        keywords: "zurückziehen abbrechen löschen bewerbung stornieren",
        a: "Ja. Öffnen Sie die Bewerbung in Ihrer Übersicht und wählen Sie „Bewerbung zurückziehen“. Der Vermieter sieht dann, dass Sie nicht mehr interessiert sind.",
      },
    ],
  },
  {
    section: "Dokumente",
    items: [
      {
        q: "Welche Dokumente muss ich hochladen?",
        keywords: "dokumente unterlagen nachweise welche pflicht",
        a: "Nur die, die der Vermieter tatsächlich angefordert hat. Unter „Dokumente“ sehen Sie diese als Liste mit Fortschritt („noch 2 von 3 offen“) und können pro Zeile hochladen. Freiwillig vorab hochgeladene Unterlagen zählen dabei mit.",
      },
      {
        q: "Muss ich eine SCHUFA-Auskunft einreichen?",
        keywords: "schufa bonität bonify auskunft kostenlos einkommen",
        a: "Erst wenn Sie in der engeren Auswahl sind — vorher darf ein Vermieter sie nicht verlangen. Sie können sie aber jederzeit vorbereiten: unter „Dokumente“ finden Sie einen geführten Weg, unter anderem kostenlos über bonify.",
      },
      {
        q: "Wer sieht meine Dokumente?",
        keywords: "sichtbar datenschutz wer sieht privat sicher",
        a: "Nur der Vermieter der jeweiligen Bewerbung, und Bonitäts- sowie Ausweisunterlagen erst ab der engeren Auswahl. Löschen Sie ein Dokument, ist der Zugriff sofort beendet.",
      },
    ],
  },
  {
    section: "Termine",
    items: [
      {
        q: "Wie bestätige ich einen Besichtigungstermin?",
        keywords: "termin bestätigen besichtigung zusagen einladung",
        a: "Unter „Termine“. Bei festen Terminen bestätigen oder sagen Sie ab; bei Zeitfenstern wählen Sie ein freies Fenster. Oben rechts können Sie zwischen Listen- und Kalenderansicht wechseln.",
      },
      {
        q: "Ich kann zum Termin nicht — was tun?",
        keywords: "verschieben umbuchung absagen kann nicht verhindert",
        a: "Wählen Sie „Umbuchung anfragen“. Der Vermieter kann Ihnen daraufhin eine neue Zeit anbieten. Bei Zeitfenstern können Sie stattdessen direkt ein anderes freies Fenster buchen.",
      },
    ],
  },
  {
    section: "Konto",
    items: [
      {
        q: "Was bringt das verifizierte Mieterprofil?",
        keywords: "premium profil kosten mieterprofil link teilen vorteil",
        a: "Sie erhalten einen teilbaren Profil-Link mit Ihren hinterlegten Angaben und Unterlagen. Damit bewerben Sie sich mit einem Klick, auch bei Wohnungen außerhalb von MietGate, und Vermieter sehen sofort, dass Ihre Angaben vollständig sind.",
      },
      {
        q: "Wie lösche ich mein Konto?",
        keywords: "konto löschen daten entfernen dsgvo account",
        a: "Unter „Einstellungen“ → „Passwort“ finden Sie „Konto löschen“. Alle Bewerbungen, Dokumente und Nachrichten werden dabei endgültig entfernt.",
      },
    ],
  },
];

function SupportBox({ user }) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!message.trim()) { toast.error("Bitte beschreiben Sie Ihr Anliegen."); return; }
    setSending(true);
    try {
      await api.post("/contact", { name: name || "Unbekannt", email, message: message.trim() });
      setSent(true); setMessage("");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSending(false); }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/5 p-6 text-center" data-testid="support-sent">
        <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
        <p className="font-semibold mt-3">Ihre Nachricht ist angekommen</p>
        <p className="text-sm text-muted-foreground mt-1">
          Wir melden uns per E-Mail an {email || "Ihre hinterlegte Adresse"}.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSent(false)}>
          Weitere Frage stellen
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6" data-testid="support-box">
      <div className="flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-lg">Nichts gefunden? Schreiben Sie uns</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Wir antworten per E-Mail, in der Regel innerhalb eines Werktags.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
        <div><Label>E-Mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" data-testid="support-email" /></div>
      </div>
      <div className="mt-3">
        <Label>Ihr Anliegen</Label>
        <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5"
          placeholder="Was können wir für Sie tun?" data-testid="support-message" />
      </div>
      <Button className="mt-4" onClick={submit} disabled={sending} data-testid="support-send">
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Absenden
      </Button>
    </div>
  );
}

export default function Help() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const topics = user?.role === "applicant" ? APPLICANT_TOPICS : LANDLORD_TOPICS;

  /* Search across question, answer and the keyword list, so "schufa" finds the bonity
     entry even though that word no longer appears in our own wording. */
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return topics;
    const words = term.split(/\s+/);
    return topics
      .map((s) => ({
        ...s,
        items: s.items.filter((it) => {
          const hay = `${it.q} ${it.a} ${it.keywords}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        }),
      }))
      .filter((s) => s.items.length > 0);
  }, [q, topics]);

  const hits = results.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Hilfe</h1>
        <p className="text-muted-foreground mt-1">Anleitungen, häufige Fragen und der direkte Draht zu uns.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9"
          placeholder="Problem mit Stichwort suchen, z.B. „schufa“ oder „absagen“…" data-testid="help-search" />
      </div>

      {q.trim() && (
        <p className="text-sm text-muted-foreground" data-testid="help-hits">
          {hits === 0 ? "Keine Treffer — schreiben Sie uns unten gern direkt." : `${hits} Treffer`}
        </p>
      )}

      {results.map((section) => (
        <div key={section.section}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display font-bold text-lg">{section.section}</h2>
          </div>
          <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
            {section.items.map((it) => (
              <AccordionItem key={it.q} value={it.q}>
                <AccordionTrigger className="text-left text-sm font-medium">{it.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{it.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}

      <SupportBox user={user} />

      <p className="text-sm text-muted-foreground">
        Rechtliches finden Sie unter{" "}
        <Link to="/datenschutz" className="text-primary hover:underline">Datenschutz</Link>,{" "}
        <Link to="/agb" className="text-primary hover:underline">AGB</Link> und{" "}
        <Link to="/impressum" className="text-primary hover:underline">Impressum</Link>.
      </p>
    </div>
  );
}
