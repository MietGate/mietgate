import { useState } from "react";
import { useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

export default function AuthReset() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const isActivate = location.pathname.includes("aktivieren");
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwörter stimmen nicht überein"); return; }
    if (!token) { toast.error("Kein gültiger Token"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      toast.success(isActivate ? "Konto aktiviert!" : "Passwort gesetzt!");
      if (data.token) {
        login(data.token, data.user);
        navigate(data.user.role === "applicant" ? "/bewerber" : data.user.role === "admin" ? "/admin" : "/dashboard");
      } else {
        navigate("/login");
      }
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary mb-4"><KeyRound className="h-5 w-5" /></div>
          <h1 className="font-display text-2xl font-bold">{isActivate ? "Konto aktivieren" : "Neues Passwort"}</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">{isActivate ? "Vergeben Sie ein Passwort, um Ihr Bewerberkonto zu aktivieren." : "Wählen Sie ein neues Passwort."}</p>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Passwort</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" data-testid="reset-password" /></div>
            <div><Label>Passwort bestätigen</Label><Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5" data-testid="reset-confirm" /></div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="reset-submit">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {isActivate ? "Aktivieren" : "Passwort speichern"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
