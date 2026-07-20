import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ArrowRight, Inbox, BarChart3, Clock, ShieldCheck,
  Building2, Briefcase, Users, Check, Link2, LayoutGrid, CalendarCheck
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const outcomes = [
  { icon: Inbox, t: "Schluss mit dem Posteingang-Chaos", d: "Alle Bewerbungen strukturiert an einem Ort statt verstreut über E-Mail, WhatsApp und Portale." },
  { icon: BarChart3, t: "Bessere Entscheidungen", d: "Vergleichbare Angaben und ein Matching-Score helfen Ihnen, fair und fundiert zu wählen." },
  { icon: Clock, t: "Deutlich weniger Zeitaufwand", d: "Weniger Rückfragen, weniger Terminchaos – der Prozess läuft weitgehend von selbst." },
  { icon: ShieldCheck, t: "Rechtssicher & entspannt", d: "DSGVO-konform, verschlüsselte Dokumente und automatische Löschfristen." },
];

const personas = [
  {
    icon: Building2, t: "Private Vermieter",
    scenario: "Sie vermieten eine Wohnung und ertrinken in unvollständigen Nachrichten.",
    points: ["Ein Link statt 50 chaotische E-Mails", "Nur vollständige Bewerbungen", "In Minuten startklar – ohne Technik-Kenntnisse"],
  },
  {
    icon: Briefcase, t: "Makler",
    scenario: "Sie betreuen mehrere Objekte parallel und brauchen den Überblick.",
    points: ["Mehrere Objekte & Pipelines gleichzeitig", "Team & Rollen für Ihre Mitarbeiter", "White-Label mit Ihrem Branding (Add-on)"],
    highlight: true,
  },
  {
    icon: Users, t: "Hausverwaltungen",
    scenario: "Sie skalieren Vermietungen über ein ganzes Portfolio.",
    points: ["Organisationsverwaltung & Teams", "Einheitliche, nachvollziehbare Prozesse", "Aktivitäten-Protokoll & Compliance"],
  },
];

const faqs = [
  { q: "Wie schnell bin ich startklar?", a: "In wenigen Minuten: Konto erstellen, Objekt anlegen, Bewerbungslink teilen. Es sind keine technischen Kenntnisse nötig." },
  { q: "Was kostet mich der Start?", a: "Der Einstieg ist kostenlos. Eine Zahlungsmethode wird erst benötigt, wenn Sie Ihren Bewerbungslink veröffentlichen – dann startet Ihre 3-tägige Testphase." },
  { q: "Ist das DSGVO-konform?", a: "Ja. Dokumente werden verschlüsselt gespeichert, das Hosting erfolgt in der EU und Bewerberdaten werden nach definierten Fristen automatisch gelöscht." },
  { q: "Kann ich im Team arbeiten?", a: "Ja – ab dem Makler-Paket können Sie Mitarbeiter mit Rollen (Admin, Mitarbeiter, Assistent) einladen und Objekte gemeinsam verwalten." },
];

const steps = [
  { icon: Link2, n: "1", t: "Objekt anlegen & Link teilen", d: "Wohnung anlegen, Bewerbungsformular anpassen und Ihren sicheren Bewerbungslink überall teilen – Portale, Social Media, Website." },
  { icon: LayoutGrid, n: "2", t: "Bewerbungen sammeln & sichten", d: "Alle Bewerbungen laufen strukturiert in Ihrer Pipeline auf – vollständig, vergleichbar und mit Matching-Score." },
  { icon: CalendarCheck, n: "3", t: "Besichtigen & zusagen", d: "Termine vergeben, Favoriten markieren, Dokumente sicher prüfen – und dem passenden Mieter zusagen." },
];

export default function ForLandlords() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border bg-secondary/40 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center relative">
          <motion.div {...fade}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary bg-primary/10 px-3 py-1 rounded-full">Für Vermieter, Makler & Hausverwaltungen</span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-6 text-brand-dark">Weniger Chaos. Bessere Mieter. Schneller vermietet.</h1>
            <p className="text-lg text-muted-foreground mt-5 max-w-2xl mx-auto">MietGate nimmt Ihnen den Verwaltungsaufwand ab – von der Bewerbung bis zur Zusage. Damit Sie sich auf das Wesentliche konzentrieren: den passenden Mieter zu finden.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Button size="lg" asChild data-testid="landlord-cta"><Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/funktionen">Alle Funktionen im Detail</Link></Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Kostenlos starten · Zahlung erst bei Veröffentlichung des Bewerbungslinks</p>
          </motion.div>
        </div>
      </section>

      {/* Outcomes, not features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div {...fade} className="max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Was sich für Sie ändert</h2>
          <p className="text-muted-foreground mt-3 text-lg">Kein neues Tool um des Tools willen – sondern spürbar weniger Aufwand und bessere Entscheidungen.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-5 mt-12">
          {outcomes.map((b, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: (i % 2) * 0.06 }}
              className="rounded-xl border border-border bg-card p-6 flex gap-4 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 transition-all" data-testid={`landlord-outcome-${i}`}>
              <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><b.icon className="h-5 w-5" /></div>
              <div>
                <h3 className="font-display font-semibold text-lg text-brand-dark">{b.t}</h3>
                <p className="text-muted-foreground text-sm mt-1.5">{b.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Personas with scenarios */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div {...fade} className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Passt zu Ihrer Situation</h2>
            <p className="text-muted-foreground mt-3 text-lg">Ob eine Wohnung oder ein ganzes Portfolio – MietGate wächst mit.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {personas.map((g, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`rounded-2xl border bg-card p-8 flex flex-col ${g.highlight ? "border-2 border-primary shadow-lg shadow-primary/10 md:-translate-y-2" : "border-border"}`} data-testid={`landlord-persona-${i}`}>
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary"><g.icon className="h-6 w-6" /></div>
                <h3 className="font-display text-xl font-semibold mt-5 text-brand-dark">{g.t}</h3>
                <p className="text-muted-foreground text-sm mt-2 italic">„{g.scenario}"</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {g.points.map((p, k) => (
                    <li key={k} className="flex items-start gap-2 text-sm text-foreground/90">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5"><Check className="h-3 w-3" /></span>{p}
                    </li>
                  ))}
                </ul>
                <Button variant={g.highlight ? "default" : "outline"} className="mt-6 w-full" asChild><Link to="/registrieren">Passendes Paket wählen</Link></Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">So funktioniert's</motion.h2>
        <motion.p {...fade} transition={{ duration: 0.5, delay: 0.05 }} className="text-muted-foreground text-lg text-center mt-3 max-w-xl mx-auto">In drei Schritten vom Inserat zum passenden Mieter.</motion.p>
        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {steps.map((s, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-8" data-testid={`landlord-step-${i}`}>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center text-primary"><s.icon className="h-5 w-5" /></div>
                <span className="font-display text-2xl font-bold text-primary/30">{s.n}</span>
              </div>
              <h3 className="font-display font-semibold text-lg mt-5 text-brand-dark">{s.t}</h3>
              <p className="text-muted-foreground text-sm mt-2">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Landlord-specific FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">Häufige Fragen von Vermietern</motion.h2>
        <motion.div {...fade} transition={{ duration: 0.5, delay: 0.08 }} className="mt-10">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="border border-border rounded-xl px-5 bg-card" data-testid={`landlord-faq-${i}`}>
                <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
        <p className="text-center text-sm text-muted-foreground mt-6">Mehr Fragen? <Link to="/faq" className="text-primary hover:underline">Zur vollständigen FAQ</Link></p>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <motion.div {...fade} className="rounded-3xl bg-brand-dark text-white p-12 lg:p-16 text-center relative overflow-hidden grain">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold relative">Bereit, entspannter zu vermieten?</h2>
          <p className="text-white/70 mt-3 relative">Legen Sie Ihr erstes Objekt in wenigen Minuten an – kostenlos.</p>
          <Button size="lg" className="mt-8 relative" asChild><Link to="/registrieren">Jetzt kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          <p className="text-white/50 text-sm mt-4 relative">Kostenlos starten · Zahlung erst bei Veröffentlichung · jederzeit kündbar</p>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
