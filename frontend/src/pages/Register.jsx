import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, User, MailCheck, Check, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [params] = useSearchParams();
  const planIntent = params.get("plan");
  const [role, setRole] = useState(params.get("role") === "applicant" ? "applicant" : "landlord");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", org_name: "", org_type: "private" });
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [shake, setShake] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const nudgeAgree = () => {
    toast.error("Bitte akzeptieren Sie die AGB und Datenschutzerklärung.");
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  useEffect(() => {
    if (params.get("error") === "terms_required") {
      toast.error("Bitte akzeptieren Sie die AGB und Datenschutzerklärung, bevor Sie sich mit Google registrieren.");
    }
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    if (!agreed) { nudgeAgree(); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        ...form, role, origin_url: window.location.origin, agreed_terms: agreed,
        signup_source: localStorage.getItem("mg_signup_source") || null,
      });
      if (data.requires_verification) { setSentTo(data.email); toast.success("Bestätigungs-E-Mail versendet"); return; }
      login(data.token, data.user);
      navigate(role === "applicant" ? "/bewerber" : "/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try { await api.post("/auth/resend-verification", { email: sentTo, origin_url: window.location.origin }); toast.success("E-Mail erneut versendet"); }
    catch { toast.error("Fehler beim erneuten Versenden"); }
  };

  const googleLogin = () => {
    if (!agreed) { nudgeAgree(); return; }
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/google/login?role=${role}&agreed_terms=true`;
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-brand-dark text-white p-12 relative overflow-hidden">
        <div className="absolute top-[-140px] left-1/2 -translate-x-1/2 h-[380px] w-[560px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, hsl(var(--brand-teal) / 0.25), transparent 70%)", filter: "blur(36px)" }} aria-hidden="true" />
        <Link to="/" className="relative"><Logo textClass="text-white" className="h-9 bg-white rounded-md p-1" /></Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-tight">In wenigen Minuten startklar.</h2>
          <p className="mt-4 text-white/70 max-w-md">Erstellen Sie Ihr erstes Objekt, teilen Sie den Bewerbungslink und erhalten Sie strukturierte Bewerbungen.</p>
          <ul className="mt-8 space-y-3">
            {[
              "Kostenlos registrieren – Zahlungsmethode erst bei Linkaktivierung nötig",
              "Zahlung erst bei Veröffentlichung Ihres Links",
              "DSGVO-konform · Hosting in der EU",
              "Jederzeit kündbar",
            ].map((t, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0"><Check className="h-3 w-3" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-white/40 text-sm flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> © 2026 MietGate.de</p>
      </div>
      <div className="h-screen flex justify-center p-6 lg:p-12 bg-background overflow-y-auto">
        {/* my-auto (not items-center) so the form centers but stays fully scrollable when it is taller than the viewport */}
        <div className="w-full max-w-sm my-auto py-2">
          <div className="lg:hidden mb-8"><Logo /></div>
          {sentTo ? (
            <div data-testid="verify-sent">
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary"><MailCheck className="h-6 w-6" /></div>
              <h1 className="font-display text-3xl font-bold mt-5">Bestätigen Sie Ihre E-Mail</h1>
              <p className="text-muted-foreground mt-2 text-sm">Wir haben eine Bestätigungs-E-Mail an <span className="font-semibold text-foreground">{sentTo}</span> gesendet. Bitte klicken Sie auf den Link darin, um Ihr Konto zu aktivieren.</p>
              <p className="text-muted-foreground mt-4 text-sm">Keine E-Mail erhalten? Prüfen Sie Ihren Spam-Ordner oder</p>
              <Button variant="outline" className="w-full mt-3" onClick={resend} data-testid="resend-verify">E-Mail erneut senden</Button>
              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link to="/login" className="text-primary font-medium hover:underline">Zurück zur Anmeldung</Link>
              </p>
            </div>
          ) : (
          <>
          <h1 className="font-display text-2xl font-bold">Konto erstellen</h1>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">Kostenlos starten. Zahlungsmethode erst bei Veröffentlichung des Bewerbungslinks nötig.</p>
          {planIntent && planIntent !== "starter" && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-accent/50 px-4 py-3 text-sm" data-testid="plan-intent-banner">
              Gewähltes Paket: <span className="font-semibold capitalize">{planIntent}</span> · Sie wählen es, sobald Sie Ihren ersten Bewerbungslink aktivieren.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
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
            <div><Label>Telefonnummer</Label><Input type="tel" required value={form.phone} onChange={set("phone")} className="mt-1.5" placeholder="+49 151 23456789" data-testid="reg-phone" /></div>
            <div>
              <Label>Passwort</Label>
              <div className="relative mt-1.5">
                <Input type={showPw ? "text" : "password"} required minLength={8} value={form.password} onChange={set("password")} className="pr-10" data-testid="reg-password" />
                <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                  className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground" aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {role === "landlord" && (
              <>
                <div><Label>Organisation / Firma (optional)</Label>
                  <Input value={form.org_name} onChange={set("org_name")} className="mt-1.5" placeholder="z.B. Mustermann Immobilien" data-testid="reg-org" />
                </div>
                <div><Label>Sie sind</Label>
                  <Select value={form.org_type} onValueChange={(v) => setForm({ ...form, org_type: v })}>
                    <SelectTrigger className="mt-1.5" data-testid="reg-org-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Privater Vermieter</SelectItem>
                      <SelectItem value="makler">Makler</SelectItem>
                      <SelectItem value="hausverwaltung">Hausverwaltung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <label className={`flex items-start gap-2 text-xs text-muted-foreground pt-1 ${shake ? "animate-shake" : ""}`}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5" data-testid="reg-agree" />
              <span>
                Ich akzeptiere die <Link to="/agb" target="_blank" className="text-primary hover:underline">AGB</Link> und die{" "}
                <Link to="/datenschutz" target="_blank" className="text-primary hover:underline">Datenschutzerklärung</Link>.
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={loading} data-testid="reg-submit">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kostenlos registrieren
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">oder</span></div>
          </div>
          <Button variant="outline" className="w-full" onClick={googleLogin} data-testid="reg-google">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-4 w-4 mr-2" />
            Mit Google registrieren
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-5">
            Bereits registriert? <Link to="/login" className="text-primary font-medium hover:underline">Anmelden</Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
