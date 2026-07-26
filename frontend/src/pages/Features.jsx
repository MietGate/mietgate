import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import {
  Link2, ClipboardList, ShieldCheck, LayoutGrid, CalendarCheck, MessageSquare,
  BarChart3, Users, Palette, ArrowRight, Check, Copy, Mail, Building2, Globe, Lock
} from "lucide-react";
import { useSEO } from "@/lib/seo";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const LINK_PATH = "mietgate.de/b/8fk2q1";

/* Animated vignette for the "Bewerbungslink" feature: types out a link, then a copy tooltip pops up. */
function LinkGenTile() {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState("typing"); // typing -> tooltip -> copied

  useEffect(() => {
    const timers = [];
    const schedule = (fn, ms) => timers.push(setTimeout(fn, ms));

    function cycle() {
      setPhase("typing");
      setTyped("");
      LINK_PATH.split("").forEach((_, idx) => {
        schedule(() => setTyped(LINK_PATH.slice(0, idx + 1)), 260 + idx * 40);
      });
      const typedDone = 260 + LINK_PATH.length * 40;
      schedule(() => setPhase("tooltip"), typedDone + 250);
      schedule(() => setPhase("copied"), typedDone + 1350);
      schedule(cycle, typedDone + 2800);
    }
    cycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative h-12 w-fit min-w-[9.5rem]" data-testid="link-gen-animation">
      <div className="h-12 flex items-center gap-2 rounded-xl border border-border bg-card shadow-sm pl-3 pr-3.5">
        <span className="h-6 w-6 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0"><Link2 className="h-3.5 w-3.5" /></span>
        <span className="font-mono text-[12px] text-brand-dark whitespace-nowrap">
          {typed}
          {phase === "typing" && <span className="inline-block w-[2px] h-3.5 bg-primary ml-0.5 align-middle animate-pulse" />}
        </span>
      </div>
      <AnimatePresence>
        {phase !== "typing" && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{ right: "-1.75rem" }}
            className="absolute -top-3 flex flex-col items-end">
            <span className="flex items-center gap-1.5 rounded-full bg-brand-dark text-white text-[11px] font-medium pl-2.5 pr-3 py-1.5 shadow-lg whitespace-nowrap">
              {phase === "tooltip"
                ? <><Copy className="h-3 w-3 text-white/80" /> Link kopieren</>
                : <><Check className="h-3 w-3 text-primary" /> Kopiert!</>}
            </span>
            <span className="mr-4 h-2 w-2 rotate-45 bg-brand-dark -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const sourceChipIcons = [Mail, Building2, MessageSquare, Globe];
const chipSides = ["left", "right", "left", "right"];
const chipVerticalOffsets = [-14, -14, 14, 14];

/* Animated vignette for "Zentrale Bewerbungsverwaltung": source chips fly in from both sides and land as rows in a central inbox. */
function InboxConvergeTile() {
  const [step, setStep] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    const timers = [];
    const schedule = (fn, ms) => timers.push(setTimeout(fn, ms));

    function cycle() {
      setCycleKey((k) => k + 1);
      setStep(0);
      schedule(() => setStep(1), 500);
      schedule(() => setStep(2), 1000);
      schedule(() => setStep(3), 1500);
      schedule(() => setStep(4), 2000);
      schedule(cycle, 4000);
    }
    cycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative h-14 w-56 mx-auto" data-testid="inbox-converge-animation">
      {sourceChipIcons.map((Icon, i) => {
        const fromLeft = chipSides[i] === "left";
        const travel = fromLeft ? 92 : -92;
        return (
          <motion.span key={`${cycleKey}-chip-${i}`}
            initial={{ opacity: 0, x: 0 }}
            animate={step > i
              ? { x: [0, travel * 0.55, travel], y: [0, -9, 0], opacity: [1, 1, 0] }
              : { opacity: 1, x: 0 }}
            transition={step > i
              ? { duration: 0.55, ease: "easeIn", times: [0, 0.55, 1] }
              : { duration: 0.35, ease: "easeOut" }}
            style={{ top: `calc(50% + ${chipVerticalOffsets[i]}px)`, [fromLeft ? "left" : "right"]: 0 }}
            className="absolute -translate-y-1/2 h-6 w-6 rounded-full bg-accent text-primary flex items-center justify-center shadow-sm">
            <Icon className="h-3.5 w-3.5" />
          </motion.span>
        );
      })}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-11 w-10 rounded-lg border border-border bg-card shadow-sm p-1.5 flex flex-col justify-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.div key={`${cycleKey}-row-${i}`}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={step > i ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.35 }}
            style={{ transformOrigin: "center" }}
            className="h-1 rounded-full bg-primary/70" />
        ))}
      </div>
    </div>
  );
}

const docLineWidths = ["w-full", "w-4/5", "w-full", "w-3/5"];

/* Animated vignette for "Sichere Dokumente": document lines scramble into ciphertext, then a lock snaps shut. */
function EncryptDocTile() {
  const [encrypted, setEncrypted] = useState(0); // how many lines are encrypted
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const timers = [];
    const schedule = (fn, ms) => timers.push(setTimeout(fn, ms));

    function cycle() {
      setEncrypted(0);
      setLocked(false);
      docLineWidths.forEach((_, i) => schedule(() => setEncrypted(i + 1), 600 + i * 280));
      schedule(() => setLocked(true), 600 + docLineWidths.length * 280);
      schedule(cycle, 4200);
    }
    cycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative h-14 w-12" data-testid="encrypt-doc-animation">
      <div className="h-14 w-12 rounded-lg border border-border bg-card shadow-sm p-2 flex flex-col justify-center gap-1.5">
        {docLineWidths.map((w, i) => (
          <div key={i} className={`relative h-1 overflow-hidden ${w}`}>
            {/* plain line */}
            <motion.span animate={{ opacity: encrypted > i ? 0 : 1 }} transition={{ duration: 0.2 }}
              className="absolute inset-0 rounded-full bg-secondary" />
            {/* encrypted line: dotted cipher */}
            <motion.span animate={{ opacity: encrypted > i ? 1 : 0 }} transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center gap-[2px]">
              {Array.from({ length: 6 }).map((_, k) => (
                <span key={k} className="h-1 w-1 rounded-full bg-primary/70 shrink-0" />
              ))}
            </motion.span>
          </div>
        ))}
      </div>
      <motion.span
        initial={false}
        animate={locked ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 15 }}
        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success text-white flex items-center justify-center ring-2 ring-card shadow-sm">
        <Lock className="h-3 w-3" />
      </motion.span>
    </div>
  );
}

/* Wraps given keywords (platforms, key terms) in the CI accent color within a plain text string. */
function highlight(text, keywords) {
  const pattern = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text.split(pattern).map((part, i) =>
    keywords.includes(part) ? <span key={i} className="font-semibold">{part}</span> : part
  );
}

const linkHighlights = ["Telefon", "E-Mail", "WhatsApp", "ImmoScout", "Kleinanzeigen", "Social Media", "Website", "Link"];

const features = [
  {
    icon: Link2, title: "Der Bewerbungslink",
    lead: highlight("Ein Link für alles. Statt Anfragen per Telefon, E-Mail und WhatsApp zu sammeln, erhalten Sie einen kurzen, sicheren Link.", linkHighlights),
    points: [
      highlight("Teilen Sie ihn auf ImmoScout, Kleinanzeigen, Social Media oder Ihrer Website", linkHighlights),
      "Keine Adresse sichtbar – der Link ist anonym und professionell",
      "Jederzeit deaktivieren oder neu generieren",
      "Sie sehen genau, wie viele Bewerbungen eingegangen sind",
    ],
  },
  {
    icon: ClipboardList, title: "Zentrale Bewerbungsverwaltung",
    lead: "Empfangen und verwalten Sie Bewerbungen aus allen Quellen in einer einzigen Übersicht – schnell, strukturiert und intuitiv.",
    points: [
      "Persönliche Daten, Haushalt, Beruf & Einkommen, Wohnsituation",
      "Alle Bewerbungen sind vollständig und direkt vergleichbar",
      "Kein Nachfragen mehr nach fehlenden Informationen",
      "Bewerber müssen sich vorab nicht registrieren",
    ],
  },
  {
    icon: ShieldCheck, title: "Sichere Dokumente",
    lead: highlight("SCHUFA, Gehaltsnachweise, Ausweis & Co. – verschlüsselt gespeichert und nur für Berechtigte zugänglich.", ["SCHUFA", "verschlüsselt"]),
    points: [
      "Keine öffentlichen Datei-Links – Zugriff nur für Sie",
      highlight("Zeitlich begrenzte, signierte Download-Links", ["Download-Links"]),
      "Sie können Dokumente gezielt anfordern",
      highlight("DSGVO-konform, EU-Hosting", ["DSGVO-konform", "EU-Hosting"]),
    ],
  },
  {
    icon: LayoutGrid, title: "Bewerberpipeline",
    lead: highlight("Behalten Sie den Überblick mit einem visuellen Board – von der ersten Bewerbung bis zur Zusage.", ["Board"]),
    points: [
      highlight("Ziehen Sie Bewerber per Drag & Drop durch die Phasen", ["Drag & Drop"]),
      "Vergeben Sie Sterne, Tags und interne Notizen",
      "Neu → Prüfung → Interessant → Besichtigung → Favorit → Zusage",
      "Nichts geht mehr unter",
    ],
  },
  {
    icon: BarChart3, title: "Matching-Score",
    lead: "Eine faire Entscheidungshilfe: MietGate zeigt Ihnen auf einen Blick, wie gut ein Bewerber passt.",
    points: [
      highlight("Berechnet aus Einkommen, Haushaltsgröße, Einzugstermin & Dokumenten", ["Einkommen", "Haushaltsgröße", "Einzugstermin", "Dokumenten"]),
      "Wert von 0–100 – z.B. „87/100 passend“",
      "Keine diskriminierenden Merkmale (Herkunft, Religion, Geschlecht …)",
      "Sie entscheiden am Ende immer selbst",
    ],
  },
  {
    icon: CalendarCheck, title: "Besichtigungen",
    lead: "Organisieren Sie Termine komplett in MietGate – auf drei Arten, ganz wie es passt.",
    points: [
      highlight("Einzeltermin, freie Zeitfenster zum Selbst-Buchen oder Massenbesichtigung", ["Einzeltermin", "Selbst-Buchen", "Massenbesichtigung"]),
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
      highlight("E-Mail- und In-App-Benachrichtigungen bei allen wichtigen Ereignissen", ["E-Mail", "In-App-Benachrichtigungen"]),
      "Immer nachvollziehbar mit Zeitstempel",
    ],
  },
  {
    icon: Users, title: "Für Makler & Hausverwaltungen",
    lead: "Arbeiten Sie im Team – mit Organisationen, Rollen und Rechten.",
    points: [
      highlight("Mitarbeiter einladen und Rollen vergeben (Owner, Admin, Mitarbeiter, Assistent)", ["Owner", "Admin", "Assistent"]),
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
      highlight("Eigene Domain in Vorbereitung", ["Eigene Domain"]),
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
      <section className="relative bg-brand-dark text-white overflow-hidden" style={{ background: "hsl(var(--brand-dark))" }}>
        <div className="absolute inset-0 bg-dots-dark pointer-events-none" aria-hidden="true" />
        <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, hsl(var(--brand-teal) / 0.28), transparent 70%)", filter: "blur(40px)" }} aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.div {...fade}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/90 bg-white/10 border border-white/15 px-3 py-1 rounded-full backdrop-blur">Funktionen</span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-6">
              Alles für Ihre{" "}
              <span className="relative z-0 inline-block pb-0.5">
                Vermietung
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
                  style={{ transformOrigin: "left center" }}
                  className="absolute left-0 right-0 bottom-0 h-[5px] sm:h-[6px] rounded-full bg-primary/50 -z-10" aria-hidden="true" />
              </span>
              {" "}– an einem Ort
            </h1>
            <p className="text-lg text-white/65 mt-5 max-w-2xl mx-auto">
              MietGate ist kein Immobilienportal. Es beginnt dort, wo Ihr Inserat endet: bei der Bewerbung. Wir organisieren den kompletten Weg vom ersten Interessenten bis zum unterschriebenen Mieter – einfach und übersichtlich.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Button size="lg" asChild><Link to="/registrieren">Kostenlos starten <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" asChild className="border-white/25 text-white bg-transparent hover:bg-white/10 hover:text-white"><Link to="/preise">Preise ansehen</Link></Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="max-w-5xl mx-auto px-6 py-20 space-y-6">
        {features.map((f, i) => (
          <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: (i % 2) * 0.05 }}
            className="rounded-2xl border border-border bg-card p-7 sm:p-9 grid md:grid-cols-3 gap-6 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all" data-testid={`feature-${i}`}>
            <div className={`md:col-span-1 ${i === 0 ? "flex flex-col items-center text-center justify-center" : ""} ${i === 1 ? "flex flex-col items-center text-center" : ""} ${i % 2 === 1 ? "md:order-2" : ""}`}>
              {i === 0
                ? <LinkGenTile />
                : i === 1
                ? <InboxConvergeTile />
                : i === 2
                ? <EncryptDocTile />
                : <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary"><f.icon className="h-6 w-6" /></div>}
              <h2 className="font-display text-2xl font-semibold mt-4">{f.title}</h2>
            </div>
            <div className={`md:col-span-2 ${i % 2 === 1 ? "md:order-1" : ""}`}>
              <p className="text-foreground/80 text-lg">{f.lead}</p>
              <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {f.points.map((p, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span>{p}</span>
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
