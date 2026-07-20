import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.user);
      toast.success("Willkommen zurück!");
      navigate(data.user.role === "applicant" ? "/bewerber" : data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    localStorage.setItem("mg_oauth_role", "landlord");
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-brand-dark text-white p-12">
        <Link to="/"><Logo textClass="text-white" className="h-9 bg-white rounded-md p-1" /></Link>
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-tight">Vermieten. Digital. Organisiert.</h2>
          <p className="mt-4 text-white/70 max-w-md">Verwalten Sie Bewerbungen, Dokumente und Besichtigungen an einem Ort – professionell und DSGVO-konform.</p>
        </div>
        <p className="text-white/40 text-sm">© 2026 MietGate.de</p>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h1 className="font-display text-3xl font-bold">Anmelden</h1>
          <p className="text-muted-foreground mt-1 mb-8 text-sm">Willkommen zurück bei MietGate.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email" className="mt-1.5" placeholder="name@beispiel.de" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <Link to="/passwort-vergessen" className="text-xs text-primary hover:underline" data-testid="forgot-link">Passwort vergessen?</Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password" className="mt-1.5" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Anmelden
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">oder</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={googleLogin} data-testid="login-google">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-4 w-4 mr-2" />
            Mit Google anmelden
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Noch kein Konto? <Link to="/registrieren" className="text-primary font-medium hover:underline">Registrieren</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
