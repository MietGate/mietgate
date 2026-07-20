import { useState } from "react";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact", form);
      setSent(true);
      toast.success("Nachricht gesendet!");
    } catch {
      toast.error("Senden fehlgeschlagen. Bitte erneut versuchen.");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-background min-h-screen">
      <MarketingNav />
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-brand-dark">Kontakt & Support</h1>
          <p className="text-muted-foreground mt-4 text-lg">Fragen zu MietGate? Wir helfen Ihnen gern weiter – in der Regel innerhalb von 24 Stunden.</p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 rounded-2xl border border-border bg-card p-8">
            {sent ? (
              <div className="text-center py-10" data-testid="contact-success">
                <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
                <h2 className="font-display text-2xl font-semibold mt-5 text-brand-dark">Vielen Dank!</h2>
                <p className="text-muted-foreground mt-2">Ihre Anfrage ist bei uns eingegangen. Wir melden uns zeitnah bei Ihnen.</p>
                <Button variant="outline" className="mt-6" onClick={() => { setSent(false); setForm({ name: "", email: "", message: "" }); }}>Weitere Nachricht senden</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Name</Label><Input required value={form.name} onChange={set("name")} className="mt-1.5" data-testid="contact-name" /></div>
                  <div><Label>E-Mail</Label><Input type="email" required value={form.email} onChange={set("email")} className="mt-1.5" data-testid="contact-email" /></div>
                </div>
                <div><Label>Ihre Nachricht</Label><Textarea required rows={6} value={form.message} onChange={set("message")} className="mt-1.5" placeholder="Wie können wir helfen?" data-testid="contact-message" /></div>
                <Button type="submit" size="lg" disabled={loading} data-testid="contact-submit">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Nachricht senden
                </Button>
              </form>
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            {[
              { icon: Mail, t: "E-Mail", d: "kontakt@mietgate.de" },
              { icon: MessageSquare, t: "Support", d: "Für Vermieter, Makler & Hausverwaltungen" },
              { icon: ShieldCheck, t: "Datenschutz", d: "EU-Hosting · DSGVO-konform" },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><c.icon className="h-5 w-5" /></div>
                <div><p className="font-semibold text-brand-dark">{c.t}</p><p className="text-sm text-muted-foreground">{c.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
