import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ArrowRight, UserCheck, Link2, Send, ShieldCheck, FileCheck, Zap, Check, Crown
} from "lucide-react";
import { useSEO } from "@/lib/seo";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const faqs = [
  { q: "Was kostet das Mieter-Profil?", a: "4,99 € pro Monat, jederzeit monatlich kündbar. Sie erhalten ein verifiziertes Profil und Ihren persönlichen, teilbaren Bewerber-Link." },
  { q: "Welche Dokumente kann ich hinterlegen?", a: "Typische Unterlagen wie SCHUFA-Auskunft, Gehaltsnachweise, Ausweis und eine Selbstauskunft – sicher verschlüsselt und nur für berechtigte Vermieter sichtbar." },
  { q: "Wer sieht meine Daten?", a: "Nur Vermieter, denen Sie Ihren Profil-Link aktiv zusenden. Ihre Daten werden DSGVO-konform in der EU gespeichert und nicht weiterverkauft." },
  { q: "Wie hilft mir das bei der Wohnungssuche?", a: "Ein vollständiges, verifiziertes Profil signalisiert Vermietern Seriosität – Sie heben sich von anderen Bewerbern ab und sparen Zeit bei jeder Anfrage." },
];

const steps = [
  { icon: UserCheck, n: "1", t: "Profil erstellen & verifizieren", d: "Hinterlegen Sie einmal Ihre Angaben und Dokumente (SCHUFA, Gehaltsnachweise & Co.) – sicher und verschlüsselt." },
  { icon: Link2, n: "2", t: "Ihren Profil-Link erhalten", d: "Sie bekommen einen persönlichen, verifizierten Bewerber-Link mit einem Vertrauens-Badge." },
  { icon: Send, n: "3", t: "Bei Anfragen mitschicken", d: "Fügen Sie den Link Ihrer Anfrage bei. Vermieter sehen sofort: geprüftes Profil & Dokumente liegen bereit." },
];

const perks = [
  "Verifiziertes Bewerber-Profil mit Vertrauens-Badge",
  "Persönlicher, teilbarer Profil-Link für Inserats-Anfragen",
  "Dokumente einmal hinterlegen – überall wiederverwenden",
  "Bevorzugte Sichtbarkeit bei Vermietern",
  "Bewerbungsstatus & Termine im Überblick",
  "Jederzeit monatlich kündbar",
];

export default function ForTenants() {
  useSEO({
    title: "Für Mieter",
    description: "Ein Bewerber-Profil, das Sie bei jeder Wohnungsbewerbung wiederverwenden können. Dokumente einmal hochladen, mit Vermietern sicher teilen.",
    path: "/fuer-mieter",
  });
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border bg-secondary/40 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center relative">
          <motion.div {...fade}>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary bg-primary/10 px-3 py-1 rounded-full">Für Mieter</span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-6 text-brand-dark">Heben Sie sich ab – mit einem verifizierten Mieter-Profil.</h1>
            <p className="text-lg text-muted-foreground mt-5 max-w-2xl mx-auto">Erstellen Sie ein geprüftes Profil und erhalten Sie einen teilbaren Link. Schicken Sie ihn bei Inserats-Anfragen mit – so wissen Vermieter sofort, dass Ihr Profil und Ihre Dokumente bereitstehen.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Button size="lg" asChild data-testid="tenant-cta"><Link to="/registrieren?role=applicant">Profil erstellen <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/login">Anmelden</Link></Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-secondary/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <motion.div {...fade}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-400/15 px-3 py-1 rounded-full"><Crown className="h-3.5 w-3.5" /> Mieter-Premium</span>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-brand-dark mt-4">Alles drin für <span className="text-primary">4,99 €</span> / Monat</h2>
            <p className="text-muted-foreground mt-3">Ein kleiner Beitrag, große Wirkung: Ihr Profil überzeugt Vermieter auf den ersten Blick.</p>
            <Button size="lg" className="mt-7" asChild data-testid="tenant-premium-cta"><Link to="/registrieren?role=applicant">Jetzt Profil erstellen <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </motion.div>
          <motion.ul {...fade} transition={{ duration: 0.5, delay: 0.08 }} className="space-y-3">
            {perks.map((p, i) => (
              <li key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-x-1">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5"><Check className="h-3.5 w-3.5" /></span>
                <span className="text-sm text-foreground/90">{p}</span>
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: ShieldCheck, t: "Sicher & DSGVO-konform", d: "Ihre Dokumente sind verschlüsselt und nur für berechtigte Vermieter sichtbar." },
            { icon: FileCheck, t: "Einmal hinterlegen", d: "Kein wiederholtes Zusammensuchen von Unterlagen für jede Bewerbung." },
            { icon: Zap, t: "Schneller zur Wohnung", d: "Ein vollständiges, geprüftes Profil erhöht Ihre Chancen spürbar." },
          ].map((c, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: i * 0.06 }}
              className="rounded-xl border border-border bg-card p-6 hover:-translate-y-1 hover:shadow-md hover:border-primary/40 transition-all group">
              <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary transition-transform group-hover:scale-110"><c.icon className="h-5 w-5" /></div>
              <h3 className="font-display font-semibold mt-4 text-brand-dark">{c.t}</h3>
              <p className="text-muted-foreground text-sm mt-2">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">So funktioniert's</motion.h2>
        <motion.p {...fade} transition={{ duration: 0.5, delay: 0.05 }} className="text-muted-foreground text-lg text-center mt-3 max-w-xl mx-auto">In drei Schritten zum verifizierten Profil-Link.</motion.p>
        <div className="relative isolate grid md:grid-cols-3 gap-6 mt-14">
          {/* Loading track: base line + progress fill + travelling pulse */}
          <div className="hidden md:block absolute top-[27px] left-[28px] h-1 rounded-full bg-border/70 -z-10 overflow-visible"
            style={{ width: "calc(66.666% + 18px)" }}>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.3 }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary/70 to-primary origin-left" />
            <span className="animate-travel absolute top-1/2 -translate-y-1/2 -ml-1.5 h-3 w-3 rounded-full bg-primary"
              style={{ boxShadow: "0 0 12px 3px hsl(var(--brand-teal) / 0.55)" }} />
          </div>
          {steps.map((s, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.12 }} className="relative" data-testid={`tenant-step-${i}`}>
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

      {/* Tenant FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">Häufige Fragen</motion.h2>
        <motion.div {...fade} transition={{ duration: 0.5, delay: 0.08 }} className="mt-10">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="border border-border rounded-xl px-5 bg-card transition-colors hover:border-primary/40" data-testid={`tenant-faq-${i}`}>
                <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 text-center">
        <motion.div {...fade}>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-brand-dark">Bereit für Ihr verifiziertes Profil?</h2>
          <p className="text-muted-foreground mt-3">In wenigen Minuten erstellt – und bei jeder Anfrage einsatzbereit.</p>
          <Button size="lg" className="mt-8" asChild><Link to="/registrieren?role=applicant">Profil erstellen <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
