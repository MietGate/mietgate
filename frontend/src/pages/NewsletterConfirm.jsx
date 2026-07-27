import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Loader2, MailCheck, XCircle } from "lucide-react";

export default function NewsletterConfirm() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | ok | error

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); return; }
    api.get(`/newsletter/confirm?token=${encodeURIComponent(token)}`)
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm text-center">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="rounded-2xl border border-border bg-card p-8">
          {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}
          {status === "ok" && (
            <>
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary mx-auto mb-4"><MailCheck className="h-6 w-6" /></div>
              <h1 className="font-display text-xl font-bold">Anmeldung bestätigt</h1>
              <p className="text-muted-foreground mt-2 text-sm">Vielen Dank! Sie erhalten ab sofort unseren Newsletter.</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-4"><XCircle className="h-6 w-6" /></div>
              <h1 className="font-display text-xl font-bold">Link ungültig</h1>
              <p className="text-muted-foreground mt-2 text-sm">Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.</p>
            </>
          )}
          <p className="mt-6 text-sm"><Link to="/" className="text-primary font-medium hover:underline">Zur Startseite</Link></p>
        </div>
      </div>
    </div>
  );
}
