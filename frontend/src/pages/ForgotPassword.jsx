import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email, origin_url: window.location.origin });
      setSent(true);
    } catch { toast.error("Fehler. Bitte erneut versuchen."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary mb-4"><Mail className="h-5 w-5" /></div>
          <h1 className="font-display text-2xl font-bold">Passwort vergessen?</h1>
          {sent ? (
            <p className="text-muted-foreground mt-3 text-sm">Falls ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link zum Zurücksetzen gesendet. Prüfen Sie Ihr Postfach.</p>
          ) : (
            <>
              <p className="text-muted-foreground mt-1 mb-6 text-sm">Wir senden Ihnen einen Link zum Zurücksetzen.</p>
              <form onSubmit={submit} className="space-y-4">
                <div><Label>E-Mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" data-testid="forgot-email" /></div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="forgot-submit">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Link senden
                </Button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-muted-foreground mt-6"><Link to="/login" className="text-primary font-medium hover:underline">Zurück zur Anmeldung</Link></p>
        </div>
      </div>
    </div>
  );
}
