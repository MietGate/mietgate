import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCancel = location.pathname.includes("cancel");
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState(isCancel ? "cancel" : "checking");

  useEffect(() => {
    if (isCancel || !sessionId) return;
    let tries = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") { setStatus("success"); return; }
        if (data.status === "failed" || data.payment_status === "failed") { setStatus("failed"); return; }
      } catch {}
      if (++tries < 8) setTimeout(poll, 2000); else setStatus("failed");
    };
    poll();
  }, [sessionId, isCancel]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-10">
        {status === "checking" && (<><Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">Zahlung wird geprüft…</h1><p className="text-muted-foreground mt-2">Einen Moment bitte.</p></>)}
        {status === "success" && (<><CheckCircle2 className="h-14 w-14 text-success mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">Zahlung erfolgreich!</h1><p className="text-muted-foreground mt-2">Ihr Abo ist jetzt aktiv.</p><Button className="mt-6 w-full" onClick={() => navigate("/dashboard")}>Zum Dashboard</Button></>)}
        {(status === "cancel" || status === "failed") && (<><XCircle className="h-14 w-14 text-destructive mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">{status === "cancel" ? "Zahlung abgebrochen" : "Zahlung fehlgeschlagen"}</h1><p className="text-muted-foreground mt-2">Es wurde nichts berechnet.</p><Button variant="outline" className="mt-6 w-full" onClick={() => navigate("/preise")}>Zurück zu den Preisen</Button></>)}
      </div>
    </div>
  );
}
