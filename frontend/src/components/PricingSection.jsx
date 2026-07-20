import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export function PricingSection({ onSelect, ctaLabel = "Auswählen" }) {
  const [plans, setPlans] = useState([]);
  const [yearly, setYearly] = useState(false);

  useEffect(() => { api.get("/plans").then((r) => setPlans(r.data)).catch(() => {}); }, []);
  const main = plans.filter((p) => !p.is_addon);
  const addon = plans.find((p) => p.is_addon);

  const priceOf = (p) => {
    const base = yearly ? p.price_yearly : p.price_monthly;
    if (p.promo) {
      if (p.promo.fixed_price != null) return p.promo.fixed_price;
      if (p.promo.discount_percent) return +(base * (1 - p.promo.discount_percent / 100)).toFixed(2);
    }
    return base;
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm ${!yearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Monatlich</span>
        <Switch checked={yearly} onCheckedChange={setYearly} data-testid="pricing-toggle" />
        <span className={`text-sm ${yearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Jährlich <Badge variant="secondary" className="ml-1 text-success">−20%</Badge></span>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {main.map((p) => (
          <div key={p.key} data-testid={`plan-${p.key}`}
            className={`relative rounded-2xl border p-7 bg-card flex flex-col ${p.highlight ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20" : "border-border"}`}>
            {p.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Beliebt</Badge>}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              {p.promo && <span className="text-lg text-muted-foreground line-through font-mono">{(yearly ? p.price_yearly : p.price_monthly).toFixed(2)}€</span>}
              <span className="font-mono text-4xl font-extrabold text-foreground">{priceOf(p).toFixed(2)}€</span>
              <span className="text-muted-foreground text-sm">/ {yearly ? "Jahr" : "Monat"}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">bis zu {p.max_properties} aktive{p.max_properties === 1 ? "s" : ""} Objekt{p.max_properties === 1 ? "" : "e"}</p>
            <ul className="mt-6 space-y-2.5 flex-1">
              {p.features?.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-7 w-full" variant={p.highlight ? "default" : "outline"}
              onClick={() => onSelect?.(p, yearly ? "yearly" : "monthly")} data-testid={`select-${p.key}`}>
              {ctaLabel}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-10 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {addon && (
          <div className="rounded-2xl border border-dashed border-border p-6 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-bold flex items-center gap-2">{addon.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">Eigenes Branding, Logo & Farben · <span className="font-mono">{priceOf(addon).toFixed(2)}€/{yearly ? "Jahr" : "Monat"}</span></p>
            </div>
            <Button variant="outline" onClick={() => onSelect?.(addon, yearly ? "yearly" : "monthly")} data-testid="select-whitelabel">Hinzubuchen</Button>
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
    </div>
  );
}
