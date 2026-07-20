import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, UserCheck, Link2, Send, ShieldCheck, FileCheck, Zap, Check, Crown
} from "lucide-react";

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

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

      <section className="max-w-5xl mx-auto px-6 py-20">
        <motion.h2 {...fade} className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-center text-brand-dark">So funktioniert's</motion.h2>
        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {steps.map((s, i) => (
            <motion.div key={i} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-8">
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
              <li key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
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
            <motion.div key={i} {...fade} transition={{ duration: 0.45, delay: i * 0.06 }} className="rounded-xl border border-border bg-card p-6">
              <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary"><c.icon className="h-5 w-5" /></div>
              <h3 className="font-display font-semibold mt-4 text-brand-dark">{c.t}</h3>
              <p className="text-muted-foreground text-sm mt-2">{c.d}</p>
            </motion.div>
          ))}
        </div>
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
