import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const isCancel = location.pathname.includes("cancel");
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState(isCancel ? "cancel" : "checking");
  const [planKey, setPlanKey] = useState(null);

  const startPolling = () => {
    setStatus("checking");
    let tries = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        setPlanKey(data.plan_key);
        if (data.payment_status === "paid") { setStatus("success"); refresh?.(); return; }
        if (data.status === "failed" || data.payment_status === "failed") { setStatus("failed"); return; }
      } catch {}
      // No definitive answer yet from Stripe/webhook — don't claim "failed" on a mere timeout,
      // slower payment methods (e.g. SEPA) can take longer than a few seconds to confirm.
      if (++tries < 8) setTimeout(poll, 2000); else setStatus("pending");
    };
    poll();
  };

  useEffect(() => {
    if (isCancel || !sessionId) return;
    startPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isCancel]);

  const isPremium = planKey === "premium";
  const goHome = () => navigate(isPremium || user?.role === "applicant" ? "/bewerber" : "/dashboard");

  /* On abort, take signed-in users back into the app they started from — not to the public
     pricing page. Only visitors without an account belong on /preise. */
  const goBack = () => {
    if (!user) return navigate("/preise");
    if (user.role === "applicant") return navigate("/bewerber");
    return navigate("/einstellungen?tab=abo");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-10">
        {status === "checking" && (<><Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">Zahlung wird geprüft…</h1><p className="text-muted-foreground mt-2">Einen Moment bitte.</p></>)}
        {status === "success" && (<><CheckCircle2 className="h-14 w-14 text-success mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">Zahlung erfolgreich!</h1><p className="text-muted-foreground mt-2">{isPremium ? "Ihr Premium-Profil ist jetzt aktiv." : "Ihr Abo ist jetzt aktiv."}</p><Button className="mt-6 w-full" onClick={goHome} data-testid="payment-success-continue">Zum Dashboard</Button></>)}
        {status === "pending" && (<><Loader2 className="h-14 w-14 text-primary mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">Zahlung wird noch bestätigt</h1><p className="text-muted-foreground mt-2">Das kann bei manchen Zahlungsarten (z.B. SEPA) etwas länger dauern. Es wurde noch nichts fehlgeschlagen — prüfen Sie es gleich erneut.</p><Button className="mt-6 w-full" onClick={startPolling} data-testid="payment-pending-retry">Erneut prüfen</Button><Button variant="ghost" className="mt-2 w-full" onClick={goHome}>Später prüfen</Button></>)}
        {(status === "cancel" || status === "failed") && (<><XCircle className="h-14 w-14 text-destructive mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">{status === "cancel" ? "Zahlung abgebrochen" : "Zahlung fehlgeschlagen"}</h1><p className="text-muted-foreground mt-2">Es wurde nichts berechnet.</p><Button variant="outline" className="mt-6 w-full" onClick={goBack} data-testid="payment-cancel-back">Zurück{user ? " zur Software" : ""}</Button></>)}
      </div>
    </div>
  );
}
