import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Inbox, LayoutGrid, CalendarCheck, ShieldCheck, BarChart3,
  Link2, Building2, Briefcase, Users, Check
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const benefits = [
  { icon: Link2, t: "Ein Bewerbungslink", d: "Teilen Sie einen sicheren Link – auf ImmoScout, Kleinanzeigen, Social Media oder Ihrer Website." },
  { icon: Inbox, t: "Strukturierte Bewerbungen", d: "Vollständig und vergleichbar dank Formular-Builder. Kein Nachfragen mehr." },
  { icon: LayoutGrid, t: "Bewerberpipeline", d: "Alle Bewerber im Kanban-Board – von Eingang bis Zusage, per Drag & Drop." },
  { icon: BarChart3, t: "Matching-Score", d: "Faire Entscheidungshilfe aus Einkommen, Haushalt, Termin & Dokumenten." },
  { icon: CalendarCheck, t: "Besichtigungen", d: "Einzeltermine, Slots zum Selbstbuchen oder Massenbesichtigungen – mit Erinnerungen." },
  { icon: ShieldCheck, t: "Sichere Dokumente", d: "Verschlüsselt, DSGVO-konform, nur für Sie – über zeitlich begrenzte Links." },
];

const audiences = [
  { icon: Building2, t: "Private Vermieter", d: "Eine Wohnung stressfrei vermieten – ohne Verwaltungsaufwand." },
  { icon: Briefcase, t: "Makler", d: "Mehrere Objekte, Mitarbeiter und Rollen professionell steuern." },
  { icon: Users, t: "Hausverwaltungen", d: "Teams, Skalierung und White-Label für Ihr Unternehmen." },
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
            <p className="text-lg text-muted-foreground mt-5 max-w-2xl mx-auto">MietGate organisiert Ihren gesamten Vermietungsprozess – von der Bewerbung über Dokumente und Besichtigungen bis zur Zusage. An einem Ort, DSGVO-konform.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Button size="lg" asChild data-testid="landlord-cta"><Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/preise">Preise ansehen</Link></Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Kostenlos starten · Zahlung erst bei Veröffentlichung des Bewerbungslinks</p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div {...fade} className="max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Alles, was Sie nach dem Inserat brauchen</h2>
          <p className="text-muted-foreground mt-3 text-lg">Sechs Kernbereiche, die Zeit sparen und bessere Entscheidungen ermöglichen.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {benefits.map((b, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: (i % 3) * 0.06 }}
              className="rounded-xl border border-border bg-card p-6 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 transition-all" data-testid={`landlord-benefit-${i}`}>
              <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary"><b.icon className="h-5 w-5" /></div>
              <h3 className="font-display font-semibold text-lg mt-4 text-brand-dark">{b.t}</h3>
              <p className="text-muted-foreground text-sm mt-2">{b.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">Für jede Größe gemacht</motion.h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {audiences.map((g, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-8">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary"><g.icon className="h-6 w-6" /></div>
                <h3 className="font-display text-xl font-semibold mt-5 text-brand-dark">{g.t}</h3>
                <p className="text-muted-foreground mt-2">{g.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <motion.div {...fade}>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-brand-dark">Bereit, entspannter zu vermieten?</h2>
          <p className="text-muted-foreground mt-3">Legen Sie Ihr erstes Objekt in wenigen Minuten an – kostenlos.</p>
          <Button size="lg" className="mt-8" asChild><Link to="/registrieren">Jetzt kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
