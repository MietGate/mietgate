import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

export default function Billing() {
  const [sub, setSub] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = () => api.get("/subscription").then((r) => setSub(r.data));
  useEffect(() => { load(); }, []);

  const select = async (plan, interval, withdrawalConsent) => {
    if (plan.key === "enterprise") { toast.info("Bitte kontaktieren Sie uns unter support@mietgate.de"); return; }
    try {
      const { data } = await api.post("/payments/checkout", { plan_key: plan.key, interval, origin_url: window.location.origin, withdrawal_consent: !!withdrawalConsent });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const cancel = async () => {
    if (!window.confirm("Abo wirklich kündigen? Es bleibt bis zum Ende der aktuellen Periode aktiv, verlängert sich danach aber nicht mehr.")) return;
    try { await api.post("/subscription/cancel"); toast.success("Abo zum Periodenende gekündigt"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post("/subscription/billing-portal", { origin_url: window.location.origin });
      window.location.href = data.portal_url;
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setPortalLoading(false); }
  };

  if (!sub) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const usePct = sub.usage ? Math.min(100, (sub.usage.used / Math.max(1, sub.usage.limit)) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-up">
      <div><h1 className="font-display text-3xl font-bold">Abo & Zahlungen</h1><p className="text-muted-foreground mt-1">Verwalten Sie Ihr Paket und Ihre Zahlungen.</p></div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4"><CreditCard className="h-5 w-5 text-primary" /><h2 className="font-display font-bold text-lg">Aktuelles Paket</h2></div>
          {["active", "trialing"].includes(sub.subscription?.status) ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-bold capitalize">{sub.plan?.name || sub.subscription.plan_key}</span>
                <Badge className="bg-success text-success-foreground">{sub.subscription.status === "trialing" ? "Testphase" : "Aktiv"}</Badge>
              </div>
              {sub.subscription.cancel_at_period_end && <p className="text-sm text-amber-600 mt-2">Gekündigt zum Periodenende.</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={openBillingPortal} disabled={portalLoading} data-testid="billing-portal-btn">
                  {portalLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />} Zahlungsmethode & Rechnungen
                </Button>
                {!sub.subscription.cancel_at_period_end && <Button variant="outline" size="sm" onClick={cancel} data-testid="cancel-sub">Kündigen</Button>}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Kein aktives Abo. Wählen Sie unten ein Paket.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display font-bold text-lg mb-4">Objekt-Nutzung</h2>
          <div className="flex justify-between text-sm mb-2"><span>Aktive Objekte</span><span className="font-mono font-bold">{sub.usage?.used} / {sub.usage?.limit}</span></div>
          <Progress value={usePct} />
          {usePct >= 100 && <p className="text-sm text-destructive mt-3">Limit erreicht. Upgraden Sie für mehr Objekte.</p>}
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold mb-6">Paket wählen / wechseln</h2>
        <PricingSection onSelect={select} ctaLabel="Jetzt buchen" />
      </div>
    </div>
  );
}
