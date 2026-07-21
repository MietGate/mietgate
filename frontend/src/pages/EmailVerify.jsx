import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function EmailVerify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get("token");
    if (!token) { setStatus("error"); setMessage("Kein Bestätigungs-Token gefunden."); return; }
    api.post("/auth/verify-email", { token })
      .then(({ data }) => {
        login(data.token, data.user);
        setStatus("success");
        setTimeout(() => navigate(data.user?.role === "applicant" ? "/bewerber" : "/dashboard"), 1500);
      })
      .catch((e) => { setStatus("error"); setMessage(formatApiError(e.response?.data?.detail) || "Bestätigung fehlgeschlagen."); });
  }, [params, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-10" data-testid="email-verify">
        <div className="flex justify-center mb-6"><Logo /></div>
        {status === "checking" && (<><Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">E-Mail wird bestätigt…</h1></>)}
        {status === "success" && (<><CheckCircle2 className="h-14 w-14 text-success mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">E-Mail bestätigt!</h1><p className="text-muted-foreground mt-2">Ihr Konto ist jetzt aktiv. Sie werden weitergeleitet…</p></>)}
        {status === "error" && (<><XCircle className="h-14 w-14 text-destructive mx-auto" /><h1 className="font-display text-2xl font-bold mt-6">Bestätigung fehlgeschlagen</h1><p className="text-muted-foreground mt-2">{message}</p><Button asChild className="mt-6 w-full"><Link to="/login">Zur Anmeldung</Link></Button></>)}
      </div>
    </div>
  );
}
