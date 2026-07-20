import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const groups = [
  {
    title: "Allgemein",
    items: [
      { q: "Was ist MietGate?", a: "MietGate ist eine Plattform für Vermieter, Makler und Hausverwaltungen, die den gesamten Bewerbungs- und Vermietungsprozess digitalisiert – von der Bewerbung über Dokumente und Besichtigungen bis zur Zusage." },
      { q: "Ist MietGate ein Immobilienportal wie ImmoScout?", a: "Nein. MietGate konkurriert nicht mit Portalen. Es beginnt nach dem Inserat: Sie inserieren weiterhin wo Sie möchten und wickeln den Bewerbungsprozess über MietGate ab." },
      { q: "Brauche ich technische Vorkenntnisse?", a: "Nein. MietGate ist bewusst einfach gehalten. Sie legen ein Objekt an, teilen den Bewerbungslink – fertig." },
    ],
  },
  {
    title: "Für Vermieter",
    items: [
      { q: "Wie erstelle ich einen Bewerbungslink?", a: "Sobald Sie ein Objekt anlegen, erzeugt MietGate automatisch einen kurzen, sicheren Bewerbungslink. Diesen können Sie kopieren, deaktivieren oder neu generieren." },
      { q: "Kann ich selbst bestimmen, welche Angaben Bewerber machen?", a: "Ja. Mit dem Formular-Builder legen Sie für jedes Feld fest, ob es Pflicht, optional oder deaktiviert ist." },
      { q: "Wie funktioniert der Matching-Score?", a: "Der Score ist eine faire Entscheidungshilfe (0–100), basierend auf Einkommen, Haushaltsgröße, Einzugstermin und Dokumentenstatus. Diskriminierende Merkmale fließen nicht ein – Sie entscheiden immer selbst." },
      { q: "Kann ich mehrere Objekte und ein Team verwalten?", a: "Ja. Im Plus-Paket bis zu 5 Objekte, im Makler-Paket bis zu 20 – inklusive Team, Rollen und optionalem White-Label." },
    ],
  },
  {
    title: "Für Bewerber",
    items: [
      { q: "Muss ich mich registrieren, um mich zu bewerben?", a: "Nein. Sie füllen die Bewerbung direkt über den Link aus. Ihr Konto wird anschließend automatisch angelegt und per E-Mail aktiviert." },
      { q: "Welche Dokumente kann ich hochladen?", a: "SCHUFA, Gehaltsnachweise, Arbeitsvertrag, Ausweis, Aufenthaltstitel, Mietschuldenfreiheitsbescheinigung, Bürgschaft und weitere." },
      { q: "Kann ich meinen Bewerbungsstatus verfolgen?", a: "Ja. In Ihrem Konto sehen Sie den Status jeder Bewerbung, Nachrichten und Besichtigungstermine." },
    ],
  },
  {
    title: "Sicherheit & Datenschutz",
    items: [
      { q: "Ist MietGate DSGVO-konform?", a: "Ja. Wir setzen auf EU-Hosting, verschlüsselte Dokumente, Einwilligungen bei jeder Bewerbung und ein transparentes Löschkonzept." },
      { q: "Wie sicher sind meine Dokumente?", a: "Dokumente sind nie öffentlich zugänglich. Der Zugriff erfolgt nur über zeitlich begrenzte, signierte Links und ausschließlich für berechtigte Nutzer." },
      { q: "Wie lange werden meine Daten gespeichert?", a: "Abgelehnte Bewerbungen bis 6 Monate, bei Inaktivität bis 12 Monate, nach erfolgreicher Vermietung bis 24 Monate – sofern keine gesetzlichen Pflichten entgegenstehen." },
    ],
  },
  {
    title: "Preise & Abo",
    items: [
      { q: "Kann ich MietGate kostenlos testen?", a: "Ja. Sie können ohne Kreditkarte starten und Ihr erstes Objekt anlegen." },
      { q: "Kann ich jederzeit kündigen?", a: "Ja. Abos können zum Ende der Abrechnungsperiode gekündigt werden." },
      { q: "Was passiert bei Preisänderungen?", a: "Neue Kunden erhalten neue Preise. Bestehende Kunden behalten ihren bisherigen Tarif." },
    ],
  },
];

const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.45 } };

export default function FAQ() {
  return (
    <div className="bg-background min-h-screen">
      <MarketingNav />
      <section className="border-b border-border bg-secondary/40">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-brand-dark">Häufige Fragen</h1>
          <p className="text-muted-foreground mt-4 text-lg">Alles Wichtige zu MietGate – für Vermieter und Bewerber.</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {groups.map((g, gi) => (
          <motion.div key={gi} {...fade}>
            <h2 className="font-display text-2xl font-semibold text-brand-dark mb-4">{g.title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {g.items.map((f, i) => (
                <AccordionItem key={i} value={`${gi}-${i}`}>
                  <AccordionTrigger className="text-left font-medium" data-testid={`faq-${gi}-${i}`}>{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        ))}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h3 className="font-display text-xl font-semibold text-brand-dark">Ihre Frage war nicht dabei?</h3>
          <p className="text-muted-foreground mt-2">Unser Support hilft Ihnen gern weiter.</p>
          <Button className="mt-5" asChild><Link to="/kontakt">Kontakt aufnehmen</Link></Button>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
