import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ArrowRight, Check, X, Inbox, LayoutGrid, CalendarCheck, ShieldCheck,
  Building2, Users, Briefcase, Star, ShieldCheck as Shield, Clock, MapPin, FileText, CreditCard
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55 } };

const HERO_IMG = "https://images.unsplash.com/photo-1682184805271-11671b7ecf4c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const faqs = [
  { q: "Wie funktioniert MietGate?", a: "Sie erstellen ein Objekt, erhalten einen individuellen Bewerbungslink und teilen ihn überall dort, wo Sie inserieren. Bewerbungen, Dokumente und Termine verwalten Sie zentral in MietGate – vom Eingang bis zur Zusage." },
  { q: "Welche Dokumente können hochgeladen werden?", a: "SCHUFA-Auskunft, Gehaltsnachweise, Arbeitsvertrag, Ausweis, Aufenthaltstitel, Mietschuldenfreiheitsbescheinigung, Bürgschaft und weitere – sicher verschlüsselt und nur für Sie zugänglich." },
  { q: "Ist MietGate DSGVO-konform?", a: "Ja. Wir setzen auf EU-Hosting, sichere Dokumentenzugriffe mit zeitlich begrenzten Links, Einwilligungen bei jeder Bewerbung und ein transparentes Löschkonzept." },
  { q: "Kann ich mehrere Wohnungen verwalten?", a: "Ja. Mit dem Plus-Paket verwalten Sie bis zu 5 Objekte, mit dem Makler-Paket bis zu 20 – inklusive Team, Rollen und optionalem White-Label." },
  { q: "Ist MietGate ein Immobilienportal?", a: "Nein. MietGate ist kein Portal wie ImmoScout oder Kleinanzeigen. Es beginnt nach dem Inserat und organisiert den gesamten Bewerbungs- und Vermietungsprozess." },
];

const oldWay = [
  "Anfragen verstreut über E-Mail, Telefon & Messenger",
  "Unvollständige Angaben, ständiges Nachfragen",
  "Dokumente unsicher per Mail verschickt",
  "Besichtigungen manuell koordiniert",
  "Bauchgefühl statt Übersicht bei der Auswahl",
];
const newWay = [
  "Ein Bewerbungslink – alle Bewerbungen an einem Ort",
  "Strukturierte, vergleichbare Angaben nach Ihren Vorgaben",
  "Dokumente verschlüsselt & DSGVO-konform",
  "Termine digital geplant und bestätigt",
  "Matching-Score & Pipeline für klare Entscheidungen",
];

const benefits = [
  { icon: Inbox, title: "Strukturierte Bewerbungen", desc: "Vollständig und vergleichbar – ohne E-Mail-Chaos." },
  { icon: LayoutGrid, title: "Übersichtliche Pipeline", desc: "Jeder Bewerber im Blick, von Eingang bis Zusage." },
  { icon: CalendarCheck, title: "Besichtigungen organisiert", desc: "Termine planen, einladen, bestätigen lassen." },
  { icon: ShieldCheck, title: "Sichere Dokumente", desc: "Verschlüsselt, DSGVO-konform, nur für Sie." },
];

const audiences = [
  { icon: Building2, t: "Private Vermieter", d: "Eine Wohnung stressfrei vermieten – ohne Verwaltungsaufwand." },
  { icon: Briefcase, t: "Makler", d: "Mehrere Objekte, Mitarbeiter und Rollen professionell steuern." },
  { icon: Users, t: "Hausverwaltungen", d: "Teams, Skalierung und White-Label für Ihr Unternehmen." },
];

const steps = [
  { n: "1", t: "Objekt anlegen", d: "In wenigen Minuten, optional mit Link zum bestehenden Inserat." },
  { n: "2", t: "Link teilen", d: "Überall dort, wo Sie inserieren – ImmoScout, Kleinanzeigen & Co." },
  { n: "3", t: "Bewerbungen erhalten", d: "Strukturiert und mit den Dokumenten, die Sie brauchen." },
  { n: "4", t: "Mieter auswählen", d: "Mit Pipeline, Matching-Score und Besichtigungen." },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-20 lg:pt-12 lg:pb-24 grid lg:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary bg-primary/10 px-3 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-soft-pulse" /> Early Access · Jetzt kostenlos starten
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.06] mt-6 text-brand-dark">
              Schluss mit dem Bewerbungs&shy;chaos.
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl leading-relaxed">
              Verwalten Sie Bewerbungen, Dokumente und Besichtigungen an <span className="text-foreground font-medium">einem Ort</span>. MietGate beginnt dort, wo Ihr Inserat endet – und führt Sie sicher zum passenden Mieter.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-8 max-w-md">
              <Button size="lg" asChild data-testid="hero-cta"><Link to="/registrieren" className="w-full">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/funktionen" className="w-full">Funktionen ansehen</Link></Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start gap-x-6 gap-y-2 mt-7 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary shrink-0" /> Kostenlos starten</span>
              <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-primary shrink-0" /> Zahlung erst bei Link-Veröffentlichung</span>
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary shrink-0" /> DSGVO & EU-Hosting</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative hero-glow">
            {/* Product preview: faithful replica of the MietGate pipeline board */}
            <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-2xl shadow-brand-dark/15">
              <div className="flex items-center gap-1.5 px-4 h-10 bg-secondary/70 border-b border-border">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
                <span className="ml-3 text-[11px] text-muted-foreground font-mono truncate">app.mietgate.de · Bewerberpipeline</span>
              </div>
              <div className="p-3 bg-secondary/20">
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { t: "Prüfung", items: [
                      { n: "Anna S.", s: "87", c: "bg-success/15 text-success border-success/30", st: 4, d: 3 },
                      { n: "M. Yıldırım", s: "64", c: "bg-amber-100 text-amber-800 border-amber-200", st: 3, d: 2 },
                    ]},
                    { t: "Besichtigung", items: [
                      { n: "Fam. Weber", s: "78", c: "bg-success/15 text-success border-success/30", st: 5, d: 4 },
                    ]},
                    { t: "Zusage", items: [
                      { n: "L. Fischer", s: "91", c: "bg-success/15 text-success border-success/30", st: 5, d: 4 },
                    ]},
                  ].map((col, ci) => (
                    <div key={ci} className="rounded-lg bg-secondary/40 p-2">
                      <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="font-semibold text-[11px] text-foreground/80">{col.t}</span>
                        <span className="text-[10px] font-semibold bg-secondary text-muted-foreground rounded px-1.5 py-0.5">{col.items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {col.items.map((a, k) => (
                          <div key={k} className="rounded-md border border-border bg-card p-2 shadow-sm">
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-medium text-[11px] truncate">{a.n}</p>
                              <span className={`font-mono text-[9px] font-bold px-1 py-0.5 rounded border shrink-0 ${a.c}`}>{a.s}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{a.st}</span>
                              <span className="flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />{a.d}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 sm:left-6 bg-card border border-border rounded-xl shadow-lg p-4 w-56">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-soft-pulse" /> Matching-Score</span>
                <span className="font-mono text-lg font-bold text-primary">87<span className="text-sm text-muted-foreground">/100</span></span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary rounded-full animate-bar" style={{ width: "87%" }} /></div>
              <p className="text-xs text-muted-foreground mt-2">Anna S. · 2 Personen · Dokumente vollständig</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Clock, k: "In Minuten", v: "startklar – ohne IT" },
            { icon: Inbox, k: "Ein Ort", v: "für alle Bewerbungen" },
            { icon: ShieldCheck, k: "DSGVO", v: "verschlüsselt & EU-Hosting" },
            { icon: Star, k: "Fair", v: "transparente Preise" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <s.icon className="h-5 w-5 text-primary" />
              <span className="font-display text-xl font-semibold mt-2 text-brand-dark">{s.k}</span>
              <span className="text-sm text-muted-foreground">{s.v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Der Unterschied ist deutlich spürbar</h2>
          <p className="text-muted-foreground mt-3 text-lg">Vom unübersichtlichen Posteingang zum klaren, digitalen Prozess.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <motion.div {...fade} className="rounded-2xl border border-border bg-card p-8 md:opacity-90">
            <div className="flex items-center gap-3">
              <span className="h-11 w-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0"><X className="h-5 w-5" /></span>
              <span className="font-display text-2xl font-semibold text-muted-foreground">Ohne MietGate</span>
            </div>
            <ul className="mt-7 space-y-4">
              {oldWay.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground line-through decoration-destructive/30 decoration-1">
                  <span className="h-6 w-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5"><X className="h-3.5 w-3.5" /></span>
                  <span className="no-underline">{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...fade} transition={{ duration: 0.55, delay: 0.08 }} className="relative rounded-2xl border-2 border-primary bg-accent/50 p-8 shadow-xl shadow-primary/10 md:-translate-y-2 grain overflow-hidden">
            <span className="absolute top-5 right-5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2.5 py-1 rounded-full">Empfohlen</span>
            <div className="flex items-center gap-3 relative">
              <span className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Check className="h-5 w-5" /></span>
              <span className="font-display text-2xl font-semibold text-brand-dark">Mit MietGate</span>
            </div>
            <ul className="mt-7 space-y-4 relative">
              {newWay.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground font-medium">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5"><Check className="h-3.5 w-3.5" /></span>
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div {...fade} className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Alles, was Sie nach dem Inserat brauchen</h2>
            <p className="text-muted-foreground mt-3 text-lg">Vier Kernbereiche, die Ihnen Zeit sparen und bessere Entscheidungen ermöglichen.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            {benefits.map((b, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-6 hover:-translate-y-1 hover:shadow-md transition-all">
                <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary"><b.icon className="h-5 w-5" /></div>
                <h3 className="font-display font-semibold text-lg mt-4 text-brand-dark">{b.title}</h3>
                <p className="text-muted-foreground text-sm mt-2">{b.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fade} className="mt-10">
            <Button variant="outline" asChild data-testid="all-features-cta"><Link to="/funktionen">Alle Funktionen im Detail <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </motion.div>
        </div>
      </section>

      {/* Process */}
      <section id="ablauf" className="max-w-6xl mx-auto px-6 py-24">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">In vier Schritten zum Mieter</motion.h2>
        <div className="grid md:grid-cols-4 gap-6 mt-14">
          {steps.map((s, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.07 }} className="relative">
              <div className="h-11 w-11 rounded-full bg-brand-dark text-white font-display font-semibold flex items-center justify-center text-lg">{s.n}</div>
              <h3 className="font-display font-semibold mt-4 text-brand-dark">{s.t}</h3>
              <p className="text-muted-foreground text-sm mt-1.5">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Audiences */}
      <section className="max-w-6xl mx-auto px-6 py-24">
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
      </section>

      {/* Pricing */}
      <section id="preise" className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div {...fade} className="text-center mb-4">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Faire, transparente Preise</h2>
            <p className="text-muted-foreground mt-3 text-lg">Starten Sie kostenlos. Zahlen Sie erst, wenn Sie mehr brauchen.</p>
          </motion.div>
          <PricingSection onSelect={(p) => navigate(p?.key ? `/registrieren?plan=${p.key}` : "/registrieren")} ctaLabel="Jetzt starten" />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark mb-10">Häufige Fragen</motion.h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-medium" data-testid={`faq-${i}`}>{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-center text-sm text-muted-foreground mt-8">Noch Fragen? <Link to="/kontakt" className="text-primary font-medium hover:underline">Kontaktieren Sie uns</Link>.</p>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div {...fade} className="rounded-3xl bg-brand-dark text-white p-12 lg:p-16 text-center relative overflow-hidden grain">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold">Vermieten Sie ab heute entspannter.</h2>
            <p className="text-white/70 mt-3 max-w-lg mx-auto">Legen Sie Ihr erstes Objekt an und teilen Sie Ihren Bewerbungslink in wenigen Minuten.</p>
            <Button size="lg" className="mt-8" asChild><Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
            <p className="text-white/50 text-sm mt-4">Kostenlos starten · Zahlung erst bei Veröffentlichung · jederzeit kündbar</p>
          </div>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
