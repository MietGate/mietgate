import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, User } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "applicant" ? "applicant" : "landlord");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", org_name: "", org_type: "private" });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { ...form, role });
      login(data.token, data.user);
      toast.success("Konto erstellt!");
      navigate(role === "applicant" ? "/bewerber" : "/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    localStorage.setItem("mg_oauth_role", role);
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-brand-dark text-white p-12">
        <Link to="/"><Logo textClass="text-white" className="h-9 bg-white rounded-md p-1" /></Link>
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-tight">In 2 Minuten startklar.</h2>
          <p className="mt-4 text-white/70 max-w-md">Erstellen Sie Ihr erstes Objekt, teilen Sie den Bewerbungslink und erhalten Sie strukturierte Bewerbungen.</p>
        </div>
        <p className="text-white/40 text-sm">© 2026 MietGate.de</p>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h1 className="font-display text-3xl font-bold">Konto erstellen</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">Kostenlos testen. Keine Kreditkarte nötig.</p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button type="button" onClick={() => setRole("landlord")} data-testid="role-landlord"
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-colors ${role === "landlord" ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
              <Building2 className="h-5 w-5 text-primary" /> Vermieter
            </button>
            <button type="button" onClick={() => setRole("applicant")} data-testid="role-applicant"
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-colors ${role === "applicant" ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}>
              <User className="h-5 w-5 text-primary" /> Bewerber
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vorname</Label><Input required value={form.first_name} onChange={set("first_name")} className="mt-1.5" data-testid="reg-firstname" /></div>
              <div><Label>Nachname</Label><Input required value={form.last_name} onChange={set("last_name")} className="mt-1.5" data-testid="reg-lastname" /></div>
            </div>
            <div><Label>E-Mail</Label><Input type="email" required value={form.email} onChange={set("email")} className="mt-1.5" data-testid="reg-email" /></div>
            <div><Label>Passwort</Label><Input type="password" required minLength={6} value={form.password} onChange={set("password")} className="mt-1.5" data-testid="reg-password" /></div>
            {role === "landlord" && (
              <div><Label>Organisation / Firma (optional)</Label>
                <Input value={form.org_name} onChange={set("org_name")} className="mt-1.5" placeholder="z.B. Mustermann Immobilien" data-testid="reg-org" />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading} data-testid="reg-submit">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Konto erstellen
            </Button>
          </form>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">oder</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={googleLogin} data-testid="reg-google">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-4 w-4 mr-2" />
            Mit Google registrieren
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Bereits registriert? <Link to="/login" className="text-primary font-medium hover:underline">Anmelden</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
