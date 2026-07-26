import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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

/* Animated vignette for "Sichere Dokumente": lines scramble into ciphertext, a lock snaps shut, then a checkmark pulses. */
function EncryptDocTile() {
  const [encrypted, setEncrypted] = useState(0); // how many lines are encrypted
  const [locked, setLocked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const timers = [];
    const schedule = (fn, ms) => timers.push(setTimeout(fn, ms));
    const lockAt = 600 + docLineWidths.length * 280;

    function cycle() {
      setEncrypted(0);
      setLocked(false);
      setConfirmed(false);
      docLineWidths.forEach((_, i) => schedule(() => setEncrypted(i + 1), 600 + i * 280));
      schedule(() => setLocked(true), lockAt);
      schedule(() => { setConfirmed(true); setPulseKey((k) => k + 1); }, lockAt + 500);
      schedule(cycle, 4600);
    }
    cycle();
    return () => timers.forEach(clearTimeout);
  }, []);

  // wrapper spans the full painted area (tile + overhanging badge) so it centers optically
  return (
    <div className="relative h-[3.875rem] w-[3.375rem]" data-testid="encrypt-doc-animation">
      <div className="absolute top-0 left-0 h-14 w-12 rounded-lg border border-border bg-card shadow-sm p-2 flex flex-col justify-center gap-1.5">
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
        className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-success text-white flex items-center justify-center ring-2 ring-card shadow-sm">
        {/* confirmation pulse ring */}
        {confirmed && (
          <motion.span key={pulseKey}
            initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 2.1, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-success" />
        )}
        <motion.span
          animate={{ scale: confirmed ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative">
          {confirmed ? <Check className="h-4 w-4" strokeWidth={3} /> : <Lock className="h-3.5 w-3.5" />}
        </motion.span>
      </motion.span>
    </div>
  );
}

/* Drives the looping tile animations: counts 0..count, pauses, then restarts. */
function useLoopStep(count, stepMs, pauseMs = 1100, startMs = 450) {
  const [step, setStep] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    const timers = [];
    function cycle() {
      setCycleKey((k) => k + 1);
      setStep(0);
      for (let i = 1; i <= count; i++) {
        timers.push(setTimeout(() => setStep(i), startMs + (i - 1) * stepMs));
      }
      timers.push(setTimeout(cycle, startMs + count * stepMs + pauseMs));
    }
    cycle();
    return () => timers.forEach(clearTimeout);
  }, [count, stepMs, pauseMs, startMs]);

  return { step, cycleKey };
}

/* Counts from 0 to target once `run` flips true. */
function useCountUp(target, run, duration = 1000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) { setN(0); return undefined; }
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return n;
}

/* Bewerberpipeline: an applicant card advances through three pipeline columns. */
function PipelineTile() {
  const { step, cycleKey } = useLoopStep(3, 720, 900);
  const columnX = [0, 34, 68];

  return (
    <div className="relative h-14 w-24" data-testid="pipeline-animation">
      <div className="absolute inset-0 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((c) => (
          <div key={c} className="rounded-md border border-border bg-secondary/60 p-1 flex flex-col gap-1">
            <span className="h-1 w-3/4 rounded-full bg-border" />
          </div>
        ))}
      </div>
      <motion.span key={cycleKey}
        initial={{ x: 0, opacity: 0 }}
        animate={{ x: columnX[Math.max(step - 1, 0)], opacity: step > 0 ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="absolute top-[18px] left-0 h-4 w-7 rounded-[3px] bg-primary shadow-sm flex items-center justify-center">
        <span className="h-1 w-3.5 rounded-full bg-white/80" />
      </motion.span>
    </div>
  );
}

/* Matching-Score: a ring fills while the score counts up. */
function ScoreTile() {
  const { step } = useLoopStep(1, 1300, 1500);
  const run = step >= 1;
  const value = useCountUp(87, run, 1100);
  const circumference = 2 * Math.PI * 15;

  return (
    <div className="relative h-14 w-14" data-testid="score-animation">
      <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3.5" />
        <motion.circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--brand-teal))" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: run ? circumference * (1 - 0.87) : circumference }}
          transition={{ duration: 1.1, ease: "easeOut" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-brand-dark tabular-nums">
        {value}
      </span>
    </div>
  );
}

/* Besichtigungen: calendar slots get booked one after another. */
const bookedSlots = [1, 3, 5];
function CalendarTile() {
  const { step } = useLoopStep(3, 620, 1000);

  return (
    <div className="h-14 w-14 rounded-lg border border-border bg-card shadow-sm p-2 flex flex-col gap-1.5" data-testid="calendar-animation">
      <span className="h-1 w-1/2 rounded-full bg-secondary" />
      <div className="grid grid-cols-3 gap-1 flex-1">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const bookedAt = bookedSlots.indexOf(i);
          const isBooked = bookedAt !== -1 && step > bookedAt;
          return (
            <motion.div key={i}
              animate={{ scale: isBooked ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`rounded-[3px] transition-colors ${isBooked ? "bg-primary" : "bg-secondary/80"}`} />
          );
        })}
      </div>
    </div>
  );
}

/* Nachrichten: chat bubbles arrive alternately, then a notification badge pops. */
function MessageTile() {
  const { step, cycleKey } = useLoopStep(4, 520, 900);

  return (
    <div className="relative h-14 w-20 flex flex-col justify-center gap-1.5" data-testid="message-animation">
      {[0, 1, 2].map((i) => {
        const fromLeft = i % 2 === 0;
        return (
          <div key={i} className={`relative h-3 ${fromLeft ? "w-11 self-start" : "w-9 self-end"}`}>
            {/* always-visible placeholder so the tile never looks empty mid-cycle */}
            <span className="absolute inset-0 rounded-full bg-secondary/40" />
            <motion.span key={`${cycleKey}-b-${i}`}
              initial={{ opacity: 0, x: fromLeft ? -10 : 10, scale: 0.8 }}
              animate={step > i ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: fromLeft ? -10 : 10, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`absolute inset-0 rounded-full ${fromLeft ? "bg-secondary" : "bg-primary/80"}`} />
          </div>
        );
      })}
      <motion.span key={`${cycleKey}-bell`}
        initial={{ scale: 0, opacity: 0 }}
        animate={step > 3 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-success text-white flex items-center justify-center ring-2 ring-card text-[9px] font-bold">
        3
      </motion.span>
    </div>
  );
}

/* Makler & Hausverwaltungen: team members join one by one. */
const teamShades = ["bg-primary", "bg-brand-dark", "bg-primary/60", "bg-secondary"];
function TeamTile() {
  const { step, cycleKey } = useLoopStep(4, 480, 1000);

  return (
    <div className="h-14 flex items-center" data-testid="team-animation">
      <div className="flex -space-x-2">
        {teamShades.map((shade, i) => (
          <div key={i} className="relative h-7 w-7">
            {/* always-visible placeholder so the tile never looks empty mid-cycle */}
            <span className="absolute inset-0 rounded-full ring-2 ring-card bg-secondary/50" />
            <motion.span key={`${cycleKey}-m-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={step > i ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className={`absolute inset-0 rounded-full ring-2 ring-card ${shade} ${i === 3 ? "text-muted-foreground text-[9px] font-bold flex items-center justify-center" : ""}`}>
              {i === 3 ? "+9" : null}
            </motion.span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* White-Label: the same mini page re-skins itself in different brand colors. */
const brandColors = ["hsl(var(--brand-teal))", "#7c3aed", "#ea580c", "#0369a1"];
function BrandTile() {
  const { step } = useLoopStep(brandColors.length, 900, 400, 500);
  const color = brandColors[Math.max(step - 1, 0)];

  return (
    <div className="h-14 w-12 rounded-lg border border-border bg-card shadow-sm p-2 flex flex-col gap-1.5" data-testid="brand-animation">
      <motion.span animate={{ backgroundColor: color }} transition={{ duration: 0.5 }}
        className="h-3 w-3 rounded-[3px]" />
      <span className="h-1 w-full rounded-full bg-secondary" />
      <span className="h-1 w-3/4 rounded-full bg-secondary" />
      <motion.span animate={{ backgroundColor: color }} transition={{ duration: 0.5 }}
        className="h-2 w-2/3 rounded-[2px] mt-auto" />
    </div>
  );
}

/* One tile per feature card, in the same order as `features`. */
const featureTiles = [
  LinkGenTile, InboxConvergeTile, EncryptDocTile, PipelineTile,
  ScoreTile, CalendarTile, MessageTile, TeamTile, BrandTile,
];

/* Hero backdrop scatter. `gap` is the distance from the text column's edge (max-w-4xl = 896px),
   so a tile can never end up behind the copy regardless of viewport width. */
const HERO_COLUMN_HALF = 448;
const floaters = [
  { side: "left", gap: 10, top: "15%", drift: 20, spin: 4, dur: 19 },   // Bewerbungslink (breit)
  { side: "right", gap: 0, top: "58%", drift: -16, spin: -5, dur: 23 }, // Bewerbungseingang (breit)
  { side: "left", gap: 96, top: "70%", drift: 14, spin: 6, dur: 21 },   // Verschlüsselung
  { side: "right", gap: 52, top: "15%", drift: -20, spin: 3, dur: 26 }, // Pipeline
  { side: "left", gap: 74, top: "43%", drift: 18, spin: -4, dur: 17 },  // Score
  { side: "right", gap: 104, top: "39%", drift: -14, spin: 5, dur: 24 },// Kalender
  { side: "left", gap: 34, top: "83%", drift: 16, spin: -3, dur: 20 },  // Nachrichten
  { side: "right", gap: 36, top: "80%", drift: -18, spin: 4, dur: 25 }, // Team
  { side: "left", gap: 110, top: "24%", drift: 13, spin: -6, dur: 18 }, // White-Label
];

/* The feature vignettes drifting through the hero background, space-station style. */
function HeroFloatingTiles() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden xl:block opacity-[0.13]" aria-hidden="true">
      {floaters.map(({ side, gap, top, drift, spin, dur }, i) => {
        const Tile = featureTiles[i];
        const offset = `calc(50% + ${HERO_COLUMN_HALF + gap}px)`;
        return (
          <motion.div key={i} className="absolute"
            style={{ top, [side === "left" ? "right" : "left"]: offset }}
            animate={reduceMotion ? { scale: 0.7 } : {
              scale: 0.7,
              y: [0, drift, 0],
              x: [0, drift * -0.35, 0],
              rotate: [0, spin, 0],
            }}
            transition={reduceMotion ? undefined : {
              duration: dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.7,
            }}>
            <Tile />
          </motion.div>
        );
      })}
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
        <HeroFloatingTiles />
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
        {features.map((f, i) => {
          const Tile = featureTiles[i];
          return (
          <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: (i % 2) * 0.05 }}
            className="rounded-2xl border border-border bg-card p-7 sm:p-9 grid md:grid-cols-3 gap-6 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all" data-testid={`feature-${i}`}>
            <div className={`md:col-span-1 flex flex-col items-center justify-center text-center ${i % 2 === 1 ? "md:order-2" : ""}`}>
              <Tile />
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
          );
        })}
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
