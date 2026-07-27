import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Flame } from "lucide-react";

function useCountdown(target) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!target) return;
    const end = new Date(target).getTime();
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setLeft({ days: 0, hours: 0, minutes: 0, expired: true }); return; }
      setLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

function PromoBanner({ endDate }) {
  const left = useCountdown(endDate);
  if (!left || left.expired) return null;
  return (
    <div className="max-w-2xl mx-auto mb-8 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-300 px-6 py-4 flex flex-wrap items-center justify-center gap-3 text-center shadow-lg shadow-amber-500/20" data-testid="promo-banner">
      <Flame className="h-5 w-5 text-orange-900 shrink-0 animate-pulse" />
      <p className="text-sm font-semibold text-orange-950">
        Sommeraktion – reduzierte Preise enden in{" "}
        <span className="font-mono font-extrabold tabular-nums">
          {left.days > 0 ? `${left.days} Tg. ` : ""}{left.hours} Std. {left.minutes} Min.
        </span>
      </p>
    </div>
  );
}

export function PricingSection({ onSelect, ctaLabel = "Auswählen", disabled = false, requireWithdrawalConsent = true }) {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [yearly, setYearly] = useState(false);
  const [withdrawalConsent, setWithdrawalConsent] = useState(false);
  // The consent belongs at the moment of commitment, so it lives in a confirm step
  // rather than above the plan list where it has no context yet.
  const [pending, setPending] = useState(null); // { plan, interval }

  const select = (plan, interval) => {
    if (plan.key === "enterprise" || !requireWithdrawalConsent) {
      onSelect?.(plan, interval, false);
      return;
    }
    setWithdrawalConsent(false);
    setPending({ plan, interval });
  };

  const confirmPurchase = () => {
    if (!withdrawalConsent || !pending) return;
    onSelect?.(pending.plan, pending.interval, true);
    setPending(null);
  };

  const loadPlans = () => {
    setStatus("loading");
    api.get("/plans")
      .then((r) => { setPlans(r.data); setStatus("ready"); })
      .catch(() => setStatus("error"));
  };

  useEffect(loadPlans, []);
  const main = plans.filter((p) => !p.is_addon);
  const addon = plans.find((p) => p.is_addon);
  const promoEnd = main.find((p) => p.promo?.end)?.promo?.end;

  const priceOf = (p) => {
    if (p.billing_mode === "one_time") {
      if (p.promo?.fixed_price != null) return p.promo.fixed_price;
      return p.one_time_price;
    }
    const base = yearly ? p.price_yearly : p.price_monthly;
    if (p.promo) {
      const fixed = yearly ? p.promo.fixed_price_yearly : p.promo.fixed_price;
      if (fixed != null) return fixed;
      if (p.promo.discount_percent) return +(base * (1 - p.promo.discount_percent / 100)).toFixed(2);
    }
    return base;
  };

  // Percent off, computed from the real numbers rather than hardcoded — stays correct if prices change.
  const percentOff = (p) => {
    if (!p.promo) return null;
    const anchor = p.billing_mode === "one_time" ? p.one_time_price : (yearly ? p.price_yearly : p.price_monthly);
    const action = priceOf(p);
    if (!anchor) return null;
    return Math.round((1 - action / anchor) * 100);
  };

  return (
    <div>
      {promoEnd && <PromoBanner endDate={promoEnd} />}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm ${!yearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Monatlich</span>
        <Switch checked={yearly} onCheckedChange={setYearly} data-testid="pricing-toggle" />
        <span className={`text-sm ${yearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Jährlich <Badge variant="secondary" className="ml-1 text-success">−20%</Badge></span>
      </div>
      {status === "loading" && (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto" data-testid="plans-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-7 animate-pulse">
              <div className="h-5 w-24 rounded bg-secondary" />
              <div className="h-10 w-32 rounded bg-secondary mt-4" />
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3, 4].map((k) => <div key={k} className="h-3 rounded bg-secondary" style={{ width: `${90 - k * 8}%` }} />)}
              </div>
              <div className="h-9 rounded-md bg-secondary mt-7" />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="max-w-xl mx-auto rounded-2xl border border-dashed border-border bg-card p-8 text-center" data-testid="plans-error">
          <p className="font-medium text-foreground">Die Preise konnten gerade nicht geladen werden.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Bitte versuchen Sie es erneut. Falls das Problem bestehen bleibt, erreichen Sie uns unter{" "}
            <a href="mailto:support@mietgate.de" className="text-primary hover:underline">support@mietgate.de</a>.
          </p>
          <Button variant="outline" className="mt-5" onClick={loadPlans} data-testid="plans-retry">Erneut versuchen</Button>
        </div>
      )}

      <div className={`grid md:grid-cols-3 gap-6 max-w-5xl mx-auto ${status === "ready" ? "" : "hidden"}`}>
        {main.map((p, i) => (
          <motion.div key={p.key} data-testid={`plan-${p.key}`}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative rounded-2xl border p-7 bg-card flex flex-col hover:-translate-y-1.5 hover:shadow-xl transition-all ${p.highlight ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20" : "border-border hover:border-primary/40"}`}>
            {p.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 animate-glow-pulse">Beliebt</Badge>}
            {p.promo && (
              <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-amber-300 to-orange-300 text-orange-950 border-0 shadow-sm font-semibold">
                −{percentOff(p)}% bis {new Date(p.promo.end).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
              </Badge>
            )}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              {p.promo && (
                <span className="text-lg text-muted-foreground line-through font-mono">
                  {(p.billing_mode === "one_time" ? p.one_time_price : (yearly ? p.price_yearly : p.price_monthly)).toFixed(2)}€
                </span>
              )}
              <AnimatePresence mode="wait">
                <motion.span key={yearly ? "yearly" : "monthly"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }} className={`font-mono text-4xl font-extrabold ${p.promo ? "text-amber-700" : "text-foreground"}`}>
                  {priceOf(p).toFixed(2)}€
                </motion.span>
              </AnimatePresence>
              <span className="text-muted-foreground text-sm">{p.billing_mode === "one_time" ? "einmalig" : `/ ${yearly ? "Jahr" : "Monat"}`}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {p.billing_mode === "one_time" ? "inkl. MwSt." : "zzgl. MwSt."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {p.billing_mode === "one_time"
                ? `Bewerbungslink ${p.one_time_duration_days} Tage aktiv · 1 Objekt`
                : `bis zu ${p.max_properties} aktive${p.max_properties === 1 ? "s" : ""} Objekt${p.max_properties === 1 ? "" : "e"}`}
            </p>
            {p.billing_mode !== "one_time" && p.promo && !yearly && (
              <p className="text-sm font-semibold text-amber-700 mt-1" data-testid={`savings-monthly-${p.key}`}>
                Sie sparen {(p.price_monthly - priceOf(p)).toFixed(2)}€ im Monat
              </p>
            )}
            {p.billing_mode === "one_time" && p.promo && (
              <p className="text-sm font-semibold text-amber-700 mt-1" data-testid={`savings-${p.key}`}>
                Sie sparen {(p.one_time_price - priceOf(p)).toFixed(2)}€
              </p>
            )}
            {p.billing_mode !== "one_time" && yearly && (() => {
              const monthlyNow = p.promo?.fixed_price ?? p.price_monthly;
              const saved = monthlyNow * 12 - priceOf(p);
              return saved > 0 ? (
                <p className={`text-sm font-semibold mt-1 ${p.promo ? "text-amber-700" : "text-success"}`} data-testid={`savings-${p.key}`}>
                  Sie sparen {saved.toFixed(2)}€ pro Jahr
                </p>
              ) : null;
            })()}
            {p.billing_mode === "one_time" && !p.promo && (
              <p className="text-sm text-muted-foreground mt-1">Genug Zeit, um in Ruhe den passenden Mieter zu finden</p>
            )}
            <ul className="mt-6 space-y-2.5 flex-1">
              {p.features?.map((f, i) => (
                f.startsWith("Alles aus") ? (
                  <li key={i} className="text-sm font-semibold text-foreground pt-1">{f}</li>
                ) : (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span className="text-foreground/80">{f}</span>
                  </li>
                )
              ))}
            </ul>
            <Button className="mt-7 w-full" variant={p.highlight ? "default" : "outline"} disabled={disabled}
              onClick={() => select(p, p.billing_mode === "one_time" ? "one_time" : (yearly ? "yearly" : "monthly"))} data-testid={`select-${p.key}`}>
              {p.billing_mode === "one_time" ? "Einmalig kaufen" : ctaLabel}
            </Button>
          </motion.div>
        ))}
      </div>
      <div className="mt-10 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {addon && (
          <div className="rounded-2xl border border-dashed border-border p-6 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-bold flex items-center gap-2">{addon.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">Eigenes Branding, Logo & Farben, eigene Domain (in Vorbereitung) · <span className="font-mono">{priceOf(addon).toFixed(2)}€/{yearly ? "Jahr" : "Monat"}</span></p>
            </div>
            <Button variant="outline"  onClick={() => select(addon, yearly ? "yearly" : "monthly")} data-testid="select-whitelabel">Hinzubuchen</Button>
          </div>
        )}
        <div className="rounded-2xl border border-border p-6 bg-brand-dark text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-display font-bold">Enterprise</h4>
            <p className="text-sm text-white/70 mt-1">Über 20 Objekte? Individuelles Angebot für Ihr Unternehmen.</p>
          </div>
          <Button variant="secondary" onClick={() => onSelect?.({ key: "enterprise" })} data-testid="select-enterprise">Angebot anfordern</Button>
        </div>
      </div>

      {/* Confirm step: plan summary plus the withdrawal consent, right where the purchase happens. */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Buchung bestätigen</DialogTitle></DialogHeader>
          {pending && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{pending.plan.name}</span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-muted-foreground">Abrechnung</span>
                  <span className="font-medium">
                    {pending.interval === "one_time" ? "Einmalig" : pending.interval === "yearly" ? "Jährlich" : "Monatlich"}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-muted-foreground">Preis</span>
                  <span className="text-right">
                    <span className="font-mono font-bold block">
                      {priceOf(pending.plan).toFixed(2)}€
                      {pending.interval !== "one_time" && ` / ${pending.interval === "yearly" ? "Jahr" : "Monat"}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pending.plan.billing_mode === "one_time" ? "inkl. MwSt." : "zzgl. MwSt., wird im Checkout addiert"}
                    </span>
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer" data-testid="withdrawal-consent-label">
                <Checkbox checked={withdrawalConsent} onCheckedChange={setWithdrawalConsent} className="mt-0.5" data-testid="withdrawal-consent-checkbox" />
                <span>
                  Ich stimme ausdrücklich zu, dass MietGate mit der Ausführung der kostenpflichtigen Leistung vor Ablauf der Widerrufsfrist beginnt, und nehme zur Kenntnis, dass ich dadurch mein{" "}
                  <Link to="/widerruf" target="_blank" rel="noreferrer" className="text-primary hover:underline">Widerrufsrecht</Link> mit vollständiger Vertragserfüllung verliere.
                </span>
              </label>

              <p className="text-xs text-muted-foreground">
                Im nächsten Schritt werden Sie zur gesicherten Zahlung weitergeleitet. Erst dort wird der Kauf verbindlich abgeschlossen.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>Abbrechen</Button>
            <Button onClick={confirmPurchase} disabled={!withdrawalConsent || disabled} data-testid="confirm-purchase">
              Weiter zur Zahlung
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
