import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ArrowRight, Check, X, ShieldCheck, Building2, Users, Briefcase, Play, Lock,
  HousePlus, Share2, Inbox, UserCheck,
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };
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

/* Mini software tiles: tiny UI vignettes in app styling, icon-sized */
function TileForm() {
  return (
    <div className="h-14 w-14 rounded-xl border border-border bg-card shadow-sm p-2 flex flex-col justify-between">
      <div className="h-1.5 rounded-full bg-secondary w-full" />
      <div className="h-1.5 rounded-full bg-secondary w-3/4" />
      <div className="h-2 rounded-sm bg-primary/20 border border-primary/40 w-2/3" />
      <div className="h-1.5 rounded-full bg-secondary w-full" />
    </div>
  );
}
function TilePipeline() {
  return (
    <div className="h-14 w-14 rounded-xl border border-border bg-card shadow-sm p-1.5 grid grid-cols-3 gap-1">
      {[2, 1, 1].map((n, i) => (
        <div key={i} className="rounded-[3px] bg-secondary/70 p-0.5 flex flex-col gap-0.5">
          {Array.from({ length: n }).map((_, k) => (
            <div key={k} className={`h-2 rounded-[2px] ${i === 2 ? "bg-primary/70" : "bg-card border border-border"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
function TileCalendar() {
  return (
    <div className="h-14 w-14 rounded-xl border border-border bg-card shadow-sm p-2 flex flex-col gap-1">
      <div className="h-1.5 rounded-full bg-secondary w-1/2" />
      <div className="grid grid-cols-3 gap-1 flex-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`rounded-[3px] ${i === 4 ? "bg-primary" : "bg-secondary/80"}`} />
        ))}
      </div>
    </div>
  );
}
function TileDocs() {
  return (
    <div className="h-14 w-14 rounded-xl border border-border bg-card shadow-sm p-2 flex flex-col justify-center gap-1.5 relative">
      <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-primary/50 shrink-0" /><span className="h-1.5 rounded-full bg-secondary flex-1" /></div>
      <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-primary/50 shrink-0" /><span className="h-1.5 rounded-full bg-secondary flex-1" /></div>
      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success text-white flex items-center justify-center ring-2 ring-card"><Lock className="h-2.5 w-2.5" /></span>
    </div>
  );
}

const benefits = [
  { tile: TileForm, title: "Strukturierte Bewerbungen", desc: "Vollständig und vergleichbar – ohne E-Mail-Chaos." },
  { tile: TilePipeline, title: "Übersichtliche Pipeline", desc: "Jeder Bewerber im Blick, von Eingang bis Zusage." },
  { tile: TileCalendar, title: "Besichtigungen organisiert", desc: "Termine planen, einladen, bestätigen lassen." },
  { tile: TileDocs, title: "Sichere Dokumente", desc: "Verschlüsselt, DSGVO-konform, nur für Sie." },
];

const steps = [
  { n: "1", icon: HousePlus, t: "Objekt anlegen", d: "In wenigen Minuten, optional mit Link zum bestehenden Inserat." },
  { n: "2", icon: Share2, t: "Link teilen", d: "Überall dort, wo Sie inserieren – ImmoScout, Kleinanzeigen & Co." },
  { n: "3", icon: Inbox, t: "Bewerbungen erhalten", d: "Strukturiert und mit den Dokumenten, die Sie brauchen." },
  { n: "4", icon: UserCheck, t: "Mieter auswählen", d: "Mit Pipeline, Matching-Score und Besichtigungen." },
];

const personas = [
  {
    icon: Building2, t: "Private Vermieter", sub: "Eine Wohnung, null Stress.",
    points: ["Objekt & Link in zehn Minuten", "Bewerber übersichtlich vergleichen", "Keine IT-Kenntnisse nötig"],
    cta: "Kostenlos starten", to: "/registrieren",
  },
  {
    icon: Briefcase, t: "Makler", sub: "Professionell auftreten, effizient vermitteln.",
    points: ["Bis zu 20 Objekte parallel", "Team-Mitglieder & Rollen", "Sauberer Nachweis gegenüber Eigentümern"],
    cta: "Kostenlos starten", to: "/registrieren?plan=makler",
  },
  {
    icon: Users, t: "Hausverwaltungen", sub: "Skalierbare Prozesse fürs ganze Team.",
    points: ["White-Label mit Ihrem Branding", "Einheitlicher Prozess für alle Einheiten", "Individuelle Konditionen möglich"],
    cta: "Angebot anfordern", to: "/kontakt",
  },
];

const VIDEO_CDN = "https://pub-458174d39e3a4b6f83e427f3971a4a2e.r2.dev/video";

const marqueeItems = [
  "In Minuten startklar – ohne IT",
  "Ein Ort für alle Bewerbungen",
  "DSGVO-konform · verschlüsselt · EU-Hosting",
  "Faire, transparente Preise",
];

function ExplainerVideoPlayer() {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  return (
    <div className="relative rounded-3xl overflow-hidden bg-black group"
      style={{ boxShadow: "0 40px 100px -20px rgba(0,0,0,0.5), 0 25px 60px -30px hsl(var(--brand-teal) / 0.4)" }}>
      <video
        ref={videoRef} controls={started} preload="metadata" playsInline
        poster={`${VIDEO_CDN}/thumbnail.jpg`}
        className={`w-full aspect-video block object-cover ${!playing ? "animate-ken-burns" : ""}`}
        onPlay={() => { setPlaying(true); setStarted(true); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        data-testid="explainer-video"
      >
        <source src={`${VIDEO_CDN}/erklaervideo.mp4`} type="video/mp4" />
        Ihr Browser unterstützt das Video-Tag nicht.
      </video>
      {!playing && (
        <button type="button" onClick={() => videoRef.current?.play()} aria-label="Video abspielen"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 sm:gap-5 bg-gradient-to-t from-black/70 via-black/15 to-black/10 hover:from-black/75 transition-colors cursor-pointer">
          <span className="absolute top-3 left-3 sm:top-5 sm:left-5 inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold bg-white/95 text-brand-dark px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg">
            <Play className="h-3 w-3 fill-current" /> 2 Min. Video
          </span>

          <span className="relative h-14 w-14 sm:h-28 sm:w-28 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-primary/70 animate-ping-ring" />
            <span className="absolute inset-0 rounded-full bg-primary/70 animate-ping-ring" style={{ animationDelay: "0.7s" }} />
            <span className="absolute inset-0 rounded-full bg-primary/70 animate-ping-ring" style={{ animationDelay: "1.4s" }} />
            <span className="relative h-full w-full rounded-full bg-white flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
              <Play className="h-6 w-6 sm:h-12 sm:w-12 text-primary fill-primary ml-1" />
            </span>
          </span>

          <span className="text-center px-4 sm:px-6">
            <span className="block text-white font-display font-semibold text-sm sm:text-xl drop-shadow-lg">Warum Vermieter jetzt wechseln</span>
            <span className="hidden sm:block text-white/70 text-sm mt-1">In 2 Minuten sehen Sie, was Ihnen bisher Stunden gekostet hat.</span>
          </span>
        </button>
      )}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="bg-background">
      <MarketingNav />

      {/* ============ 1.1 CINEMATIC HERO (dark) ============ */}
      <section className="relative bg-brand-dark text-white overflow-hidden" style={{ background: "hsl(var(--brand-dark))" }}>
        <div className="absolute inset-0 bg-dots-dark pointer-events-none" aria-hidden="true" />
        <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, hsl(var(--brand-teal) / 0.28), transparent 70%)", filter: "blur(40px)" }} aria-hidden="true" />

        <div className="relative max-w-4xl mx-auto px-6 pt-20 lg:pt-28 pb-56 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 bg-white/10 border border-white/15 px-4 py-2 rounded-full backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-soft-pulse" /> Für Vermieter, Makler & Hausverwaltungen
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }}
            className="font-display text-[2.6rem] leading-[1.06] sm:text-6xl lg:text-7xl font-semibold mt-8">
            Vermietung.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-primary to-teal-500">Endlich strukturiert.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }}
            className="text-lg sm:text-xl text-white/65 mt-7 max-w-2xl mx-auto leading-relaxed">
            Ein Bewerbungslink für Ihr Inserat. Strukturierte Bewerbungen, verschlüsselte Dokumente und organisierte Besichtigungen – statt E-Mail-Chaos.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Button size="lg" asChild data-testid="hero-cta" className="group px-8 text-base h-12">
              <Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
            </Button>
            <span className="text-sm text-white/50 flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Zahlung erst bei Veröffentlichung Ihres Links</span>
          </motion.div>
        </div>
      </section>

      {/* ============ 1.2 Video pulled over the dark/light edge ============ */}
      <section className="relative max-w-5xl mx-auto px-6 -mt-44 pb-10 z-10" id="video">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
          <ExplainerVideoPlayer />
        </motion.div>
      </section>

      {/* ============ 1.3 MARQUEE with trust points ============ */}
      <section className="border-y border-border bg-secondary/30 overflow-hidden py-4">
        <div className="animate-marquee gap-0">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0" aria-hidden={dup === 1 ? "true" : undefined}>
              {marqueeItems.map((w, i) => (
                <span key={`${dup}-${i}`} className="flex items-center text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 px-6">
                  {w} <span className="ml-12 h-1.5 w-1.5 rounded-full bg-primary/50" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ============ 2.4 PROBLEM / SOLUTION ============ */}
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

      {/* ============ 2.5 BENEFITS with image tiles ============ */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div {...fade} className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Alles, was Sie nach dem Inserat brauchen</h2>
            <p className="text-muted-foreground mt-3 text-lg">Vier Kernbereiche, die Ihnen Zeit sparen und bessere Entscheidungen ermöglichen.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            {benefits.map((b, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-6 hover:-translate-y-1 hover:shadow-md hover:border-primary/40 transition-all group">
                <div className="inline-block transition-transform group-hover:scale-110"><b.tile /></div>
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

      {/* ============ 2.6 PROCESS with image badges ============ */}
      <section id="ablauf" className="max-w-6xl mx-auto px-6 py-24">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">In vier Schritten zum Mieter</motion.h2>
        <motion.p {...fade} className="text-muted-foreground mt-3 text-lg text-center max-w-2xl mx-auto">Kein Umzug Ihrer Inserate nötig – MietGate ergänzt Ihren bestehenden Weg.</motion.p>
        <div className="relative isolate grid md:grid-cols-4 gap-6 mt-14">
          {/* Loading track: base line + progress fill + travelling pulse */}
          <div className="hidden md:block absolute top-[27px] left-[28px] h-1 rounded-full bg-border/70 -z-10 overflow-visible"
            style={{ width: "calc(75% + 18px)" }}>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.3 }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary/70 to-primary origin-left" />
            <span className="animate-travel absolute top-1/2 -translate-y-1/2 -ml-1.5 h-3 w-3 rounded-full bg-primary"
              style={{ boxShadow: "0 0 12px 3px hsl(var(--brand-teal) / 0.55)" }} />
          </div>
          {steps.map((s, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.12 }} className="relative">
              <span className="relative inline-block">
                <motion.span initial={{ scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.3 + i * 0.67 }}
                  className="h-14 w-14 rounded-full bg-brand-dark text-white flex items-center justify-center ring-4 ring-background shadow-md">
                  <s.icon className="h-6 w-6" />
                </motion.span>
                <motion.span initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.55 + i * 0.67 }}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground font-display text-xs font-semibold flex items-center justify-center ring-2 ring-background">{s.n}</motion.span>
              </span>
              <h3 className="font-display font-semibold mt-4 text-brand-dark">{s.t}</h3>
              <p className="text-muted-foreground text-sm mt-1.5">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ 1.6 PERSONAS over full-bleed image ============ */}
      <section className="relative overflow-hidden">
        <img src="/img/video-thumbnail.jpg" alt="" aria-hidden="true" loading="lazy"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(var(--brand-dark) / 0.93), hsl(var(--brand-dark) / 0.88))" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-white">
          <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">Für jede Größe gemacht</h2>
            <p className="text-white/60 mt-3 text-lg">Vom ersten Objekt bis zum ganzen Portfolio – MietGate wächst mit.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {personas.map((g, i) => (
              <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-md p-8 flex flex-col hover:bg-white/[0.11] hover:-translate-y-1 transition-all">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><g.icon className="h-6 w-6" /></div>
                <h3 className="font-display text-xl font-semibold mt-5">{g.t}</h3>
                <p className="text-white/55 text-sm mt-1">{g.sub}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {g.points.map((p, k) => (
                    <li key={k} className="flex items-start gap-2 text-sm text-white/85">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
                <Button className="mt-7 w-full" variant={i === 2 ? "secondary" : "default"} asChild>
                  <Link to={g.to}>{g.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>
          <motion.p {...fade} className="text-center text-white/40 text-sm mt-10 flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Sensible Bewerberdaten bleiben verschlüsselt in der EU <Lock className="h-3.5 w-3.5" />
          </motion.p>
        </div>
      </section>

      {/* ============ 1.7 PRICING ============ */}
      <section id="preise" className="bg-secondary/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div {...fade} className="text-center mb-4">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark">Faire, transparente Preise</h2>
            <p className="text-muted-foreground mt-3 text-lg">Starten Sie kostenlos. Zahlen Sie erst, wenn Sie mehr brauchen.</p>
          </motion.div>
          <PricingSection onSelect={(p) => navigate(p?.key === "enterprise" ? "/kontakt" : p?.key ? `/registrieren?plan=${p.key}` : "/registrieren")} ctaLabel="Jetzt starten" requireWithdrawalConsent={false} />
        </div>
      </section>

      {/* ============ 1.8 FAQ ============ */}
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

      {/* ============ 1.9 FINAL CTA (type-led) ============ */}
      <section className="relative bg-brand-dark text-white overflow-hidden" style={{ background: "hsl(var(--brand-dark))" }}>
        <div className="absolute inset-0 bg-dots-dark pointer-events-none rotate-180" aria-hidden="true" />
        <div className="absolute bottom-[-160px] left-1/2 -translate-x-1/2 h-[420px] w-[760px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, hsl(var(--brand-teal) / 0.24), transparent 70%)", filter: "blur(36px)" }} aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center">
          <motion.h2 {...fade} className="font-display text-4xl sm:text-6xl font-semibold leading-[1.08]">
            Die nächste Vermietung<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-primary to-teal-500">läuft anders.</span>
          </motion.h2>
          <motion.p {...fade} className="text-white/60 mt-6 max-w-lg mx-auto text-lg">
            Objekt anlegen, Link teilen, entspannt entscheiden – Ihr erster Bewerbungslink ist zehn Minuten entfernt.
          </motion.p>
          <motion.div {...fade}>
            <Button size="lg" className="mt-10 group h-12 px-8 text-base" asChild>
              <Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" /></Link>
            </Button>
            <p className="text-white/40 text-sm mt-5">Kostenlos starten · Zahlung erst bei Veröffentlichung · jederzeit kündbar</p>
          </motion.div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
