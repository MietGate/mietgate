import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, X, PartyPopper, Minus, Rocket } from "lucide-react";

const MINIMIZED_KEY = "mg_onboarding_minimized";

/* Progress card shown until the landlord has been through the full setup once.
   Steps come from the server, which derives them from real data — see routes_core.onboarding.

   Minimizing collapses it into a floating button so the checklist stays reachable without
   occupying the top of the dashboard; the choice is remembered per browser. Dismissing is
   the permanent version and is stored on the account. */
export function OnboardingChecklist() {
  const [data, setData] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(MINIMIZED_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    api.get("/onboarding").then((r) => setData(r.data)).catch(() => setData(null));
  }, []);

  const setMin = (v) => {
    setMinimized(v);
    try { localStorage.setItem(MINIMIZED_KEY, v ? "1" : "0"); } catch { /* storage unavailable */ }
  };

  const dismiss = async () => {
    setHidden(true);
    try { await api.post("/onboarding/flag", { key: "dismissed" }); } catch { /* cosmetic only */ }
  };

  if (!data || hidden || data.dismissed) return null;

  const pct = Math.round((data.done / data.total) * 100);
  const next = data.steps.find((s) => !s.done);
  const open = data.total - data.done;

  if (minimized) {
    return (
      <button onClick={() => setMin(false)} data-testid="onboarding-restore"
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5 rounded-full bg-brand-dark text-white pl-4 pr-5 py-3 shadow-lg hover:opacity-90 transition-opacity">
        <Rocket className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Erste Schritte</span>
        <span className="h-6 min-w-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center tabular-nums">
          {open}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6" data-testid="onboarding-checklist">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {data.complete && <PartyPopper className="h-5 w-5 text-primary mt-0.5 shrink-0" />}
          <div>
            <h2 className="font-display font-bold text-lg">
              {data.complete ? "Sie sind startklar!" : "Erste Schritte"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.complete
                ? "Alle Schritte erledigt. Sie können diese Karte jetzt ausblenden."
                : `${data.done} von ${data.total} Schritten erledigt`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMin(true)} className="p-2.5 rounded-md hover:bg-secondary text-muted-foreground"
            title="Minimieren" data-testid="minimize-onboarding">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={dismiss} className="p-2.5 rounded-md hover:bg-secondary text-muted-foreground"
            title="Dauerhaft ausblenden" data-testid="dismiss-onboarding">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-5 space-y-1">
        {data.steps.map((s) => {
          const isNext = next && s.key === next.key;
          return (
            <li key={s.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${isNext ? "bg-accent/50" : ""}`}
              data-testid={`onboarding-step-${s.key}`}>
              <span className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${
                s.done ? "bg-success border-success text-success-foreground" : "border-border"}`}>
                {s.done && <Check className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>{s.title}</p>
                {isNext && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
              </div>
              {isNext && (
                <Button size="sm" variant="outline" asChild className="shrink-0" data-testid={`onboarding-cta-${s.key}`}>
                  <Link to={s.link}>{s.cta} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
