import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Building2, Link2, Inbox, CalendarCheck, ShieldCheck, LayoutGrid,
  ArrowRight, FileText, Users, Star
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const benefits = [
  { icon: Inbox, title: "Strukturierte Bewerbungen", desc: "Alle Anfragen an einem Ort – vollständig, vergleichbar, ohne E-Mail-Chaos." },
  { icon: LayoutGrid, title: "Bewerberpipeline", desc: "Kanban-Board von Neu bis Zusage, mit Sternen, Tags und Matching-Score." },
  { icon: CalendarCheck, title: "Besichtigungen organisieren", desc: "Einzeltermine, Zeitfenster oder Massenbesichtigungen – inkl. Erinnerungen." },
  { icon: ShieldCheck, title: "Sichere Dokumente", desc: "SCHUFA, Gehaltsnachweise & Co. – verschlüsselt, DSGVO-konform, nur für Berechtigte." },
];

const steps = [
  { n: "01", title: "Objekt erstellen", desc: "Wohnungsdaten hinterlegen – optional mit Link zum bestehenden Inserat." },
  { n: "02", title: "Bewerbungslink teilen", desc: "Kurzer, sicherer Link für ImmoScout, Kleinanzeigen, Social Media & Co." },
  { n: "03", title: "Bewerbungen erhalten", desc: "Interessenten bewerben sich strukturiert und laden Dokumente hoch." },
  { n: "04", title: "Besichtigung planen", desc: "Passende Bewerber einladen und Termine digital koordinieren." },
  { n: "05", title: "Mieter auswählen", desc: "Mit Matching-Score & Pipeline die richtige Entscheidung treffen." },
];

const faqs = [
  { q: "Wie funktioniert MietGate?", a: "Sie erstellen ein Objekt, erhalten einen individuellen Bewerbungslink und teilen ihn überall. Bewerbungen, Dokumente und Termine verwalten Sie zentral in MietGate." },
  { q: "Welche Dokumente können hochgeladen werden?", a: "SCHUFA-Auskunft, Gehaltsnachweise, Arbeitsvertrag, Ausweis, Aufenthaltstitel, Mietschuldenfreiheitsbescheinigung, Bürgschaft und weitere." },
  { q: "Ist MietGate DSGVO-konform?", a: "Ja. Wir setzen auf EU-Hosting, sichere Dokumentenzugriffe, Einwilligungen bei der Bewerbung und ein transparentes Löschkonzept." },
  { q: "Kann ich mehrere Wohnungen verwalten?", a: "Ja. Mit dem Plus-Paket verwalten Sie bis zu 5 Objekte, mit dem Makler-Paket bis zu 20 – inklusive Team & Rollen." },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.pexels.com/photos/18153132/pexels-photo-18153132.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand-dark/85" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-36">
          <motion.div {...fade} className="max-w-2xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary bg-primary/15 px-3 py-1 rounded-full">Für Vermieter, Makler & Hausverwaltungen</span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] mt-6">
              Schluss mit unübersichtlichen Wohnungsbewerbungen.
            </h1>
            <p className="text-lg text-white/70 mt-6 max-w-xl">
              Verwalten Sie Bewerbungen, Dokumente und Besichtigungen an einem Ort. MietGate beginnt dort, wo das Inserat endet.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button size="lg" asChild data-testid="hero-cta"><Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" className="bg-white/5 text-white border-white/20 hover:bg-white/10" asChild><Link to="/preise">Preise ansehen</Link></Button>
            </div>
            <p className="text-white/40 text-sm mt-4">Kein klassisches Immobilienportal – die Plattform für den Vermietungsprozess.</p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section id="funktionen" className="max-w-6xl mx-auto px-6 py-24">
        <motion.div {...fade} className="max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Weniger Aufwand. Bessere Bewerbungen.</h2>
          <p className="text-muted-foreground mt-3 text-lg">Alles, was Sie nach dem Inserat brauchen – in einer Plattform.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {benefits.map((b, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-6 hover:-translate-y-1 hover:shadow-md transition-all">
              <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary"><b.icon className="h-5 w-5" /></div>
              <h3 className="font-display font-bold text-lg mt-4">{b.title}</h3>
              <p className="text-muted-foreground text-sm mt-2">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section id="ablauf" className="bg-secondary/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center">So funktioniert MietGate</motion.h2>
          <div className="grid md:grid-cols-5 gap-5 mt-14">
            {steps.map((s, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.06 }} className="relative">
                <span className="font-mono text-primary font-bold text-sm">{s.n}</span>
                <h3 className="font-display font-bold mt-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm mt-1.5">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Target groups */}
      <section className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-14 items-center">
        <motion.div {...fade}>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Für jede Größe gemacht.</h2>
          <div className="mt-8 space-y-5">
            {[
              { icon: Building2, t: "Private Vermieter", d: "Einfach eine Wohnung vermieten – ohne Verwaltungschaos." },
              { icon: Users, t: "Makler", d: "Mehrere Objekte, Mitarbeiter und Rollen professionell verwalten." },
              { icon: FileText, t: "Hausverwaltungen", d: "Teams, Organisationen und Skalierung – mit White-Label-Option." },
            ].map((g, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><g.icon className="h-5 w-5" /></div>
                <div><h3 className="font-semibold">{g.t}</h3><p className="text-muted-foreground text-sm">{g.d}</p></div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div {...fade} className="rounded-2xl overflow-hidden border border-border shadow-lg">
          <img src="https://images.pexels.com/photos/7546322/pexels-photo-7546322.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Moderne Wohnung" className="w-full h-full object-cover" />
        </motion.div>
      </section>

      {/* Pricing preview */}
      <section className="bg-secondary/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div {...fade} className="text-center mb-4">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Transparente Preise</h2>
            <p className="text-muted-foreground mt-3 text-lg">Faire Pakete für jede Vermietergröße.</p>
          </motion.div>
          <PricingSection onSelect={() => navigate("/registrieren")} ctaLabel="Jetzt starten" />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center mb-10">Häufige Fragen</motion.h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-medium" data-testid={`faq-${i}`}>{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl bg-brand-dark text-white p-12 lg:p-16 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Bereit für stressfreies Vermieten?</h2>
          <p className="text-white/70 mt-3 max-w-lg mx-auto">Erstellen Sie Ihr erstes Objekt in wenigen Minuten.</p>
          <Button size="lg" className="mt-8" asChild><Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
