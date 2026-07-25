import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { API } from "@/lib/api";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ArrowRight, Check, X, ShieldCheck, Building2, Users, Briefcase, Star,
  FileText, Play, Lock, CalendarCheck, Sparkles, ClipboardList, Palette
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55 } };
const fadeLeft = { initial: { opacity: 0, x: -16 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { duration: 0.45 } };

const faqs = [
  { q: "Wie funktioniert MietGate?", a: "Sie erstellen ein Objekt, erhalten einen individuellen Bewerbungslink und teilen ihn überall dort, wo Sie inserieren. Bewerbungen, Dokumente und Termine verwalten Sie zentral in MietGate – vom Eingang bis zur Zusage." },
  { q: "Welche Dokumente können hochgeladen werden?", a: "SCHUFA-Auskunft, Gehaltsnachweise, Arbeitsvertrag, Ausweis, Aufenthaltstitel, Mietschuldenfreiheitsbescheinigung, Bürgschaft und weitere – sicher verschlüsselt und nur für Sie zugänglich." },
  { q: "Ist MietGate DSGVO-konform?", a: "Ja. Wir setzen auf EU-Hosting, sichere Dokumentenzugriffe, Einwilligungen bei jeder Bewerbung und ein transparentes Löschkonzept mit automatischen Fristen." },
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

const steps = [
  { n: "1", t: "Objekt anlegen", d: "In wenigen Minuten, optional mit Link zum bestehenden Inserat." },
  { n: "2", t: "Link teilen", d: "Überall dort, wo Sie inserieren – ImmoScout, Kleinanzeigen & Co." },
  { n: "3", t: "Bewerbungen erhalten", d: "Strukturiert und mit den Dokumenten, die Sie brauchen." },
  { n: "4", t: "Mieter auswählen", d: "Mit Pipeline, Matching-Score und Besichtigungen." },
];

const personas = [
  {
    icon: Building2, t: "Private Vermieter", sub: "Eine Wohnung, null Stress.",
    points: ["Objekt & Bewerbungslink in Minuten", "Alle Bewerber übersichtlich vergleichen", "Keine IT-Kenntnisse nötig"],
    cta: "Kostenlos starten", to: "/registrieren",
  },
  {
    icon: Briefcase, t: "Makler", sub: "Professionell auftreten, effizient vermitteln.", featured: true,
    points: ["Bis zu 20 Objekte parallel steuern", "Team-Mitglieder & Rollen verwalten", "Schneller Vergleich per Matching-Score", "Strukturierte Übergabe an Eigentümer"],
    cta: "Kostenlos starten", to: "/registrieren?plan=makler",
  },
  {
    icon: Users, t: "Hausverwaltungen", sub: "Skalierbare Prozesse fürs ganze Team.",
    points: ["White-Label mit eigenem Branding", "Einheitlicher Prozess für alle Einheiten", "Individuelle Konditionen möglich"],
    cta: "Angebot anfordern", to: "/kontakt",
  },
];

/* ---------- Video player ---------- */
function ExplainerVideoPlayer() {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  return (
    <div className="relative rounded-3xl overflow-hidden bg-black group"
      style={{ boxShadow: "0 30px 80px -20px hsl(var(--brand-teal) / 0.35), 0 18px 50px -25px hsl(var(--brand-dark) / 0.45)" }}>
      <video
        ref={videoRef} controls={started} preload="metadata" playsInline
        poster={`${API}/public/marketing/erklaervideo-poster.jpg`}
        className="w-full aspect-video block"
        onPlay={() => { setPlaying(true); setStarted(true); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        data-testid="explainer-video"
      >
        <source src={`${API}/public/marketing/erklaervideo.mp4`} type="video/mp4" />
        Ihr Browser unterstützt das Video-Tag nicht.
      </video>
      {!playing && (
        <button type="button" onClick={() => videoRef.current?.play()} aria-label="Video abspielen"
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 via-black/10 to-transparent hover:bg-black/20 transition-colors cursor-pointer">
          <span className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/95 text-brand-dark px-3 py-1.5 rounded-full shadow-lg">
            <Play className="h-3 w-3 fill-current" /> 2 Min. Video
          </span>
          <span className="h-28 w-28 rounded-full bg-white flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110 animate-glow-pulse">
            <Play className="h-12 w-12 text-primary fill-primary ml-1.5" />
          </span>
        </button>
      )}
    </div>
  );
}

/* ---------- Hero product mockup ---------- */
function PipelineMockup() {
  return (
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
            <div key={ci} className="rounded-lg bg-secondary/40 p-2 animate-fade-up" style={{ animationDelay: `${0.35 + ci * 0.15}s`, animationFillMode: "both" }}>
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
  );
}

/* ---------- Bento cells: small CSS product visuals ---------- */
function BentoPipeline() {
  return (
    <div className="mt-5 grid grid-cols-3 gap-2 text-[10px]">
      {[
        { t: "Neu", n: 4, dot: "bg-slate-400" },
        { t: "Favorit", n: 2, dot: "bg-amber-400" },
        { t: "Zusage", n: 1, dot: "bg-success" },
      ].map((c, i) => (
        <div key={i} className="rounded-lg bg-secondary/60 p-2">
          <span className="flex items-center gap-1 font-semibold text-foreground/70"><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.t}</span>
          <div className="mt-1.5 space-y-1">
            {Array.from({ length: Math.min(c.n, 3) }).map((_, k) => (
              <div key={k} className="h-4 rounded bg-card border border-border" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BentoFormBuilder() {
  const rows = [
    { l: "Nettoeinkommen", m: "Pflicht", on: true },
    { l: "Haustiere", m: "Optional", on: false },
    { l: "Selbstauskunft", m: "Pflicht", on: true },
  ];
  return (
    <div className="mt-5 space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <span className="font-medium">{r.l}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.on ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{r.m}</span>
        </div>
      ))}
    </div>
  );
}

function BentoDocs() {
  return (
    <div className="mt-5 space-y-2">
      {["SCHUFA-Auskunft.pdf", "Gehaltsnachweis.pdf"].map((f, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate flex-1">{f}</span>
          <Lock className="h-3 w-3 text-success shrink-0" />
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-success" /> Ende-zu-Ende verschlüsselt gespeichert</p>
    </div>
  );
}

function BentoScore() {
  return (
    <div className="mt-5">
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-4xl font-extrabold text-primary">87</span>
        <span className="text-muted-foreground text-sm">/100</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-bar" style={{ width: "87%" }} />
      </div>
      <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> Einkommen ≥ 3× Warmmiete</p>
        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> Haushaltsgröße passt</p>
        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> Dokumente vollständig</p>
      </div>
    </div>
  );
}

function BentoViewings() {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {[
        { t: "Sa 10:00", ok: false }, { t: "Sa 10:30", ok: true }, { t: "Sa 11:00", ok: false },
      ].map((s, i) => (
        <span key={i} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border ${s.ok ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
          {s.t}{s.ok && " ✓"}
        </span>
      ))}
      <p className="w-full text-[10px] text-muted-foreground mt-1">Bewerber buchen selbst – Sie werden benachrichtigt.</p>
    </div>
  );
}

function BentoTeam() {
  return (
    <div className="mt-5">
      <div className="flex -space-x-2">
        {["JK", "SM", "TB"].map((x, i) => (
          <span key={i} className="h-8 w-8 rounded-full bg-primary/15 text-primary border-2 border-card flex items-center justify-center text-[10px] font-bold">{x}</span>
        ))}
        <span className="h-8 w-8 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-semibold text-muted-foreground">+2</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Palette className="h-3.5 w-3.5 text-primary" />
        <span className="flex gap-1">
          {["bg-primary", "bg-brand-dark", "bg-amber-400", "bg-rose-400"].map((c, i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full ${c} ${i === 0 ? "ring-2 ring-primary/40 ring-offset-1" : ""}`} style={c === "bg-brand-dark" ? { background: "hsl(var(--brand-dark))" } : undefined} />
          ))}
        </span>
        <span className="text-[10px] text-muted-foreground">Ihr Branding</span>
      </div>
    </div>
  );
}

const bento = [
  { icon: ClipboardList, t: "Bewerberpipeline", d: "Jeder Bewerber im Blick – per Drag & Drop vom Eingang bis zur Zusage.", visual: <BentoPipeline />, span: "lg:col-span-2" },
  { icon: Sparkles, t: "Matching-Score", d: "Objektive Entscheidungshilfe statt Bauchgefühl.", visual: <BentoScore /> },
  { icon: FileText, t: "Formular-Builder", d: "Sie bestimmen, was Bewerber angeben müssen.", visual: <BentoFormBuilder /> },
  { icon: Lock, t: "Sichere Dokumente", d: "SCHUFA, Gehaltsnachweise & Co. – verschlüsselt, DSGVO-konform.", visual: <BentoDocs /> },
  { icon: CalendarCheck, t: "Besichtigungen", d: "Zeitfenster anbieten, Bewerber buchen selbst.", visual: <BentoViewings /> },
  { icon: Users, t: "Team & White-Label", d: "Rollen fürs Team, Ihr Logo & Ihre Farben für Bewerber.", visual: <BentoTeam /> },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="bg-background">
      <MarketingNav />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden="true" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[720px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, hsl(var(--brand-teal) / 0.14), transparent 70%)", filter: "blur(30px)" }} aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-6 pt-14 pb-20 lg:pt-20 lg:pb-24 grid lg:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary bg-primary/10 px-3 py-1.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-soft-pulse" /> Für Vermieter, Makler & Hausverwaltungen
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] mt-6 text-brand-dark">
              Vom Inserat zum passenden Mieter – <span className="relative whitespace-nowrap text-primary">ohne Chaos<svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 200 9" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7C50 2 150 2 198 6" stroke="hsl(var(--brand-teal))" strokeWidth="3" strokeLinecap="round" opacity="0.35"/></svg></span>.
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl leading-relaxed">
              Ein Bewerbungslink für Ihr Inserat. Strukturierte Bewerbungen, sichere Dokumente und organisierte Besichtigungen – alles an einem Ort.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button size="lg" asChild data-testid="hero-cta" className="group text-base h-12 px-7">
                <Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-6">
                <a href="#video" className="flex items-center"><span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2"><Play className="h-3 w-3 fill-current" /></span> 2-Min-Video ansehen</a>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start gap-x-6 gap-y-2 mt-7 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary shrink-0" /> Kostenlos starten, Zahlung erst bei Veröffentlichung</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary shrink-0" /> DSGVO-konform · Hosting in der EU</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative hero-glow">
            <PipelineMockup />
            <div className="absolute -bottom-5 -left-4 sm:left-6 bg-card border border-border rounded-xl shadow-lg p-4 w-56 animate-float">
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

      {/* ============ FACT BAND ============ */}
      <section className="border-y border-border bg-brand-dark text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-center">
          {[
            { k: "10 Min.", v: "bis zum ersten Bewerbungslink" },
            { k: "1 Link", v: "für alle Portale & Kanäle" },
            { k: "100 %", v: "DSGVO-konform, EU-Hosting" },
            { k: "0 €", v: "bis zur Veröffentlichung" },
          ].map((s, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: i * 0.07 }}>
              <span className="font-display text-2xl font-bold text-white block">{s.k}</span>
              <span className="text-[13px] text-white/60">{s.v}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ VIDEO ============ */}
      <section id="video" className="max-w-4xl mx-auto px-6 py-20 scroll-mt-24">
        <motion.div {...fade} className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">So funktioniert MietGate</h2>
          <p className="text-muted-foreground mt-3 text-lg">In unter 2 Minuten erklärt.</p>
        </motion.div>
        <motion.div {...fade}>
          <ExplainerVideoPlayer />
        </motion.div>
      </section>

      {/* ============ BENTO FEATURES ============ */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Alles drin, was nach dem Inserat kommt</h2>
            <p className="text-muted-foreground mt-3 text-lg">Sechs Werkzeuge, ein System – gebaut für den deutschen Mietmarkt.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bento.map((b, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className={`rounded-2xl border border-border bg-card p-6 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 transition-all group flex flex-col ${b.span || ""}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary transition-transform group-hover:scale-110 shrink-0"><b.icon className="h-5 w-5" /></div>
                  <h3 className="font-display font-semibold text-lg text-brand-dark">{b.t}</h3>
                </div>
                <p className="text-muted-foreground text-sm mt-3">{b.d}</p>
                <div className="flex-1">{b.visual}</div>
              </motion.div>
            ))}
          </div>
          <motion.div {...fade} className="mt-10 text-center">
            <Button variant="outline" asChild data-testid="all-features-cta"><Link to="/funktionen">Alle Funktionen im Detail <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </motion.div>
        </div>
      </section>

      {/* ============ PROBLEM / SOLUTION ============ */}
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
                <motion.li key={i} {...fadeLeft} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-start gap-3 text-muted-foreground">
                  <span className="h-6 w-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5"><X className="h-3.5 w-3.5" /></span>
                  <span>{t}</span>
                </motion.li>
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
                <motion.li key={i} {...fadeLeft} transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                  className="flex items-start gap-3 text-foreground font-medium">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5"><Check className="h-3.5 w-3.5" /></span>
                  {t}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ============ PROCESS ============ */}
      <section id="ablauf" className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">In vier Schritten zum Mieter</motion.h2>
          <motion.p {...fade} className="text-muted-foreground mt-3 text-lg text-center max-w-2xl mx-auto">Kein Umzug Ihrer Inserate nötig – MietGate ergänzt Ihren bestehenden Weg.</motion.p>
          <div className="relative grid md:grid-cols-4 gap-6 mt-14">
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="hidden md:block absolute top-[22px] left-[22px] h-0.5 bg-gradient-to-r from-primary/50 via-primary/25 to-primary/50 origin-left -z-10"
              style={{ width: "calc(75% + 18px)" }} />
            {steps.map((s, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.12 }} className="relative">
                <div className="h-11 w-11 rounded-full bg-brand-dark text-white font-display font-semibold flex items-center justify-center text-lg ring-4 ring-secondary/40">{s.n}</div>
                <h3 className="font-display font-semibold mt-4 text-brand-dark">{s.t}</h3>
                <p className="text-muted-foreground text-sm mt-1.5">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PERSONAS ============ */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Für jede Größe gemacht</h2>
          <p className="text-muted-foreground mt-3 text-lg">Vom ersten Objekt bis zum ganzen Portfolio – MietGate wächst mit.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {personas.map((g, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`rounded-2xl p-8 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl group ${g.featured ? "border-2 border-primary bg-accent/40 shadow-lg shadow-primary/10" : "border border-border bg-card hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary transition-transform group-hover:scale-110"><g.icon className="h-6 w-6" /></div>
                {g.featured && <span className="text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2.5 py-1 rounded-full">Beliebt</span>}
              </div>
              <h3 className="font-display text-xl font-semibold mt-5 text-brand-dark">{g.t}</h3>
              <p className="text-muted-foreground text-sm mt-1">{g.sub}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {g.points.map((p, k) => (
                  <li key={k} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span className="text-foreground/85">{p}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-7 w-full" variant={g.featured ? "default" : "outline"} asChild>
                <Link to={g.to}>{g.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="preise" className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div {...fade} className="text-center mb-4">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Faire, transparente Preise</h2>
            <p className="text-muted-foreground mt-3 text-lg">Starten Sie kostenlos. Zahlen Sie erst, wenn Sie mehr brauchen.</p>
          </motion.div>
          <PricingSection onSelect={(p) => navigate(p?.key === "enterprise" ? "/kontakt" : p?.key ? `/registrieren?plan=${p.key}` : "/registrieren")} ctaLabel="Jetzt starten" />
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <motion.div {...fade} className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Häufige Fragen</h2>
          <p className="text-muted-foreground mt-3 text-lg">Kurz und ehrlich beantwortet.</p>
        </motion.div>
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

      {/* ============ FINAL CTA ============ */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <motion.div {...fade} className="rounded-3xl bg-brand-dark text-white p-12 lg:p-16 text-center relative overflow-hidden grain">
          <div className="absolute inset-0 opacity-60 animate-gradient-shift"
            style={{ backgroundImage: "linear-gradient(120deg, hsl(var(--brand-teal) / 0.3), transparent 45%, hsl(var(--brand-teal) / 0.18) 75%, transparent)" }} />
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: "hsl(var(--brand-teal) / 0.5)" }} />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "hsl(var(--brand-teal) / 0.4)" }} />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold">Vermieten Sie ab heute entspannter.</h2>
            <p className="text-white/70 mt-3 max-w-lg mx-auto">Legen Sie Ihr erstes Objekt an und teilen Sie Ihren Bewerbungslink in wenigen Minuten.</p>
            <Button size="lg" className="mt-8 group h-12 px-7 text-base" asChild>
              <Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
            </Button>
            <p className="text-white/50 text-sm mt-4">Kostenlos starten · Zahlung erst bei Veröffentlichung · jederzeit kündbar</p>
          </div>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
