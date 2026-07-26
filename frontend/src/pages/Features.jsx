import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import {
  Link2, ClipboardList, ShieldCheck, LayoutGrid, CalendarCheck, MessageSquare,
  BarChart3, Users, Palette, ArrowRight, Check
} from "lucide-react";
import { useSEO } from "@/lib/seo";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const features = [
  {
    icon: Link2, title: "Der Bewerbungslink",
    lead: "Ein Link für alles. Statt Anfragen per Telefon, E-Mail und WhatsApp zu sammeln, erhalten Sie einen kurzen, sicheren Link.",
    points: [
      "Teilen Sie ihn auf ImmoScout, Kleinanzeigen, Social Media oder Ihrer Website",
      "Keine Adresse sichtbar – der Link ist anonym und professionell",
      "Jederzeit deaktivieren oder neu generieren",
      "Sie sehen genau, wie viele Bewerbungen eingegangen sind",
    ],
  },
  {
    icon: ClipboardList, title: "Strukturierte Bewerbungen",
    lead: "Sie entscheiden, welche Angaben Sie brauchen. Der Formular-Builder macht jede Frage zur Pflicht, optional oder blendet sie aus.",
    points: [
      "Persönliche Daten, Haushalt, Beruf & Einkommen, Wohnsituation",
      "Alle Bewerbungen sind vollständig und direkt vergleichbar",
      "Kein Nachfragen mehr nach fehlenden Informationen",
      "Bewerber müssen sich vorab nicht registrieren",
    ],
  },
  {
    icon: ShieldCheck, title: "Sichere Dokumente",
    lead: "SCHUFA, Gehaltsnachweise, Ausweis & Co. – verschlüsselt gespeichert und nur für Berechtigte zugänglich.",
    points: [
      "Keine öffentlichen Datei-Links – Zugriff nur für Sie",
      "Zeitlich begrenzte, signierte Download-Links",
      "Sie können Dokumente gezielt anfordern",
      "DSGVO-konform, EU-Hosting",
    ],
  },
  {
    icon: LayoutGrid, title: "Bewerberpipeline",
    lead: "Behalten Sie den Überblick mit einem visuellen Board – von der ersten Bewerbung bis zur Zusage.",
    points: [
      "Ziehen Sie Bewerber per Drag & Drop durch die Phasen",
      "Vergeben Sie Sterne, Tags und interne Notizen",
      "Neu → Prüfung → Interessant → Besichtigung → Favorit → Zusage",
      "Nichts geht mehr unter",
    ],
  },
  {
    icon: BarChart3, title: "Matching-Score",
    lead: "Eine faire Entscheidungshilfe: MietGate zeigt Ihnen auf einen Blick, wie gut ein Bewerber passt.",
    points: [
      "Berechnet aus Einkommen, Haushaltsgröße, Einzugstermin & Dokumenten",
      "Wert von 0–100 – z.B. „87/100 passend“",
      "Keine diskriminierenden Merkmale (Herkunft, Religion, Geschlecht …)",
      "Sie entscheiden am Ende immer selbst",
    ],
  },
  {
    icon: CalendarCheck, title: "Besichtigungen",
    lead: "Organisieren Sie Termine komplett in MietGate – auf drei Arten, ganz wie es passt.",
    points: [
      "Einzeltermin, freie Zeitfenster zum Selbst-Buchen oder Massenbesichtigung",
      "Bewerber bestätigen, sagen ab oder fragen eine Umbuchung an",
      "Automatische Erinnerungen",
      "Kein Terminchaos mehr",
    ],
  },
  {
    icon: MessageSquare, title: "Nachrichten & Benachrichtigungen",
    lead: "Kommunizieren Sie mit Bewerbern direkt in der Plattform – ohne private Kontaktdaten preiszugeben.",
    points: [
      "Objektbezogener Nachrichtenverlauf",
      "E-Mail- und In-App-Benachrichtigungen bei allen wichtigen Ereignissen",
      "Immer nachvollziehbar mit Zeitstempel",
    ],
  },
  {
    icon: Users, title: "Für Makler & Hausverwaltungen",
    lead: "Arbeiten Sie im Team – mit Organisationen, Rollen und Rechten.",
    points: [
      "Mitarbeiter einladen und Rollen vergeben (Owner, Admin, Mitarbeiter, Assistent)",
      "Objekte im Team teilen und verwalten",
      "Bis zu 20 aktive Objekte im Makler-Paket",
    ],
  },
  {
    icon: Palette, title: "White-Label (Add-on)",
    lead: "Ihr Auftritt, Ihre Marke. Zeigen Sie Bewerbern Ihr eigenes Logo und Ihre Farben.",
    points: [
      "Eigenes Logo, eigene Primärfarbe, eigener Firmenname",
      "„Powered by MietGate“ optional ausblenden",
      "Eigene Domain in Vorbereitung",
    ],
  },
];

const steps = [
  { n: "1", t: "Objekt anlegen", d: "Wohnungsdaten eintragen – optional mit Link zum bestehenden Inserat. In 2 Minuten erledigt." },
  { n: "2", t: "Link teilen", d: "Ihren Bewerbungslink überall veröffentlichen, wo Sie inserieren." },
  { n: "3", t: "Bewerbungen sammeln", d: "Interessenten bewerben sich strukturiert und laden Dokumente hoch." },
  { n: "4", t: "Auswählen & besichtigen", d: "Mit Pipeline und Matching-Score die besten Bewerber einladen." },
  { n: "5", t: "Mieter finden", d: "Zusage erteilen – fertig. Der ganze Prozess an einem Ort." },
];

export default function Features() {
  useSEO({
    title: "Funktionen",
    description: "Bewerbungslink, strukturierte Bewerbungen, sichere Dokumente, Pipeline, Besichtigungsplanung und mehr – alle Funktionen von MietGate im Detail.",
    path: "/funktionen",
  });
  return (
    <div className="bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="border-b border-border bg-secondary/40">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.div {...fade}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary bg-primary/10 px-3 py-1 rounded-full">Funktionen</span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-6">Alles für Ihre Vermietung – an einem Ort</h1>
            <p className="text-lg text-muted-foreground mt-5 max-w-2xl mx-auto">
              MietGate ist kein Immobilienportal. Es beginnt dort, wo Ihr Inserat endet: bei der Bewerbung. Wir organisieren den kompletten Weg vom ersten Interessenten bis zum unterschriebenen Mieter – einfach und übersichtlich.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Button size="lg" asChild><Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/preise">Preise ansehen</Link></Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="max-w-5xl mx-auto px-6 py-20 space-y-6">
        {features.map((f, i) => (
          <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: (i % 2) * 0.05 }}
            className="rounded-2xl border border-border bg-card p-7 sm:p-9 grid md:grid-cols-3 gap-6 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all" data-testid={`feature-${i}`}>
            <div className={`md:col-span-1 ${i % 2 === 1 ? "md:order-2" : ""}`}>
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary"><f.icon className="h-6 w-6" /></div>
              <h2 className="font-display text-2xl font-semibold mt-4">{f.title}</h2>
            </div>
            <div className={`md:col-span-2 ${i % 2 === 1 ? "md:order-1" : ""}`}>
              <p className="text-foreground/80 text-lg">{f.lead}</p>
              <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {f.points.map((p, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </section>

      {/* How it works */}
      <section className="bg-brand-dark text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-bold text-center">So einfach funktioniert es</motion.h2>
          <div className="relative isolate grid md:grid-cols-5 gap-6 mt-14">
            {/* Loading track: base line + progress fill + travelling pulse */}
            <div className="hidden md:block absolute top-[27px] left-[28px] h-1 rounded-full bg-white/15 -z-10 overflow-visible"
              style={{ width: "calc(80% + 18px)" }}>
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut", delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary/70 to-primary origin-left" />
              <span className="animate-travel absolute top-1/2 -translate-y-1/2 -ml-1.5 h-3 w-3 rounded-full bg-primary"
                style={{ boxShadow: "0 0 12px 3px hsl(var(--brand-teal) / 0.55)" }} />
            </div>
            {steps.map((s, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.12 }} className="relative">
                <motion.div initial={{ scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.3 + i * 0.54 }}
                  className="h-14 w-14 rounded-full bg-primary text-primary-foreground font-display font-bold flex items-center justify-center ring-4 ring-brand-dark shadow-md">
                  {s.n}
                </motion.div>
                <h3 className="font-display font-semibold mt-4">{s.t}</h3>
                <p className="text-white/60 text-sm mt-1.5">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <motion.div {...fade}>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Bereit, es auszuprobieren?</h2>
          <p className="text-muted-foreground mt-3">Legen Sie Ihr erstes Objekt in wenigen Minuten an – kostenlos.</p>
          <Button size="lg" className="mt-8" asChild><Link to="/registrieren">Jetzt kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
