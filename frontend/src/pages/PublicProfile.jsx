import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Check, User, Send, CheckCircle2, Home } from "lucide-react";

export default function PublicProfile() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({ contact_email: "", contact_phone: "", property_label: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    axios.get(`${API}/public/profile/${token}`).then((r) => setData(r.data)).catch(() => setError(true));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.contact_email && !form.contact_phone) {
      toast.error("Bitte geben Sie Ihre E-Mail-Adresse oder Telefonnummer an.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/public/profile/${token}/interest`, form);
      setDone(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Anfrage fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center p-6">
        <div><Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold">Profil nicht verfügbar</h1>
          <p className="text-muted-foreground mt-2">Dieser Profil-Link ist ungültig oder nicht mehr aktiv.</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center"><Link to="/"><Logo /></Link></div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center text-primary shrink-0"><User className="h-6 w-6" /></div>
            <div>
              <h1 className="font-display text-2xl font-bold">{data.display_name}</h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full mt-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Verifiziertes MietGate-Profil
              </span>
            </div>
          </div>

          <div className="mt-7">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Hinterlegte Dokumente</h2>
            {data.document_types.length === 0 ? (
              <p className="text-muted-foreground text-sm mt-2">Noch keine Dokumente hinterlegt.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.document_types.map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm bg-secondary/50 rounded-lg px-3.5 py-2.5">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {t} hinterlegt · von MietGate erfasst
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Dateiinhalte sind hier nicht einsehbar. {data.display_name.split(" ")[0]} kann Ihnen diese Dokumente
              jederzeit direkt freigeben, sobald Sie Interesse bekunden.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            {done ? (
              <div className="text-center py-4" data-testid="interest-sent">
                <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-display font-bold text-lg">Anfrage gesendet</h3>
                <p className="text-muted-foreground text-sm mt-1">{data.display_name.split(" ")[0]} wurde benachrichtigt und entscheidet, ob Dokumente freigegeben werden.</p>
              </div>
            ) : (
              <>
                <h2 className="font-display font-bold text-lg">Interesse bekunden</h2>
                <p className="text-muted-foreground text-sm mt-1">Geben Sie Ihre E-Mail-Adresse oder Telefonnummer an — wie es Ihnen lieber ist.</p>
                <form onSubmit={submit} className="space-y-3 mt-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Ihre E-Mail-Adresse</Label><Input type="email" value={form.contact_email} onChange={set("contact_email")} className="mt-1.5" data-testid="interest-email" /></div>
                    <div><Label>Ihre Telefonnummer</Label><Input type="tel" value={form.contact_phone} onChange={set("contact_phone")} className="mt-1.5" data-testid="interest-phone" /></div>
                  </div>
                  <div><Label>Objekt / Adresse (optional)</Label><Input value={form.property_label} onChange={set("property_label")} placeholder="z. B. 3-Zimmer-Wohnung, Musterstraße 1, Köln" className="mt-1.5" data-testid="interest-property" /></div>
                  <div><Label>Nachricht (optional)</Label><Textarea rows={3} value={form.message} onChange={set("message")} className="mt-1.5" data-testid="interest-message" /></div>
                  <Button type="submit" disabled={submitting} className="w-full" data-testid="interest-submit">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Interesse bekunden
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
