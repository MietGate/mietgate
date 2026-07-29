import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, Users, MailCheck, MailX, Clock } from "lucide-react";

const STATUS = {
  confirmed: { label: "Bestätigt", cls: "text-success" },
  pending: { label: "Ausstehend", cls: "text-muted-foreground" },
  unsubscribed: { label: "Abgemeldet", cls: "text-destructive" },
};

export default function AdminNewsletter() {
  const [subs, setSubs] = useState([]);
  const [counts, setCounts] = useState({ confirmed: 0, pending: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/newsletter/subscribers");
      setSubs(data.subscribers);
      setCounts(data.counts);
    } catch { toast.error("Abonnenten konnten nicht geladen werden"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) return;
    if (!window.confirm(`Newsletter jetzt an ${counts.confirmed} bestätigte Abonnenten senden? Das kann nicht rückgängig gemacht werden.`)) return;
    setSending(true);
    try {
      const { data } = await api.post("/admin/newsletter/send", { subject, body_html: body });
      toast.success(`Newsletter an ${data.sent} Abonnenten gesendet`);
      setSubject(""); setBody("");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSending(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl">
      <div><h1 className="font-display text-3xl font-bold">Newsletter</h1></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-4 flex items-center gap-3">
          <MailCheck className="h-5 w-5 text-success shrink-0" />
          <div><p className="text-xs text-muted-foreground">Bestätigt</p><p className="font-mono text-xl font-bold">{counts.confirmed}</p></div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div><p className="text-xs text-muted-foreground">Ausstehend</p><p className="font-mono text-xl font-bold">{counts.pending}</p></div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-4 flex items-center gap-3">
          <MailX className="h-5 w-5 text-destructive shrink-0" />
          <div><p className="text-xs text-muted-foreground">Abgemeldet</p><p className="font-mono text-xl font-bold">{counts.unsubscribed}</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6 space-y-4">
        <h2 className="font-display font-bold text-lg">Newsletter versenden</h2>
        <p className="text-sm text-muted-foreground">
          Geht an alle <b>{counts.confirmed}</b> bestätigten Abonnenten. Jede E-Mail enthält automatisch einen Abmeldelink.
        </p>
        <div><Label>Betreff</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" data-testid="newsletter-subject" /></div>
        <div><Label>Inhalt (HTML erlaubt)</Label><Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5 font-mono text-sm" data-testid="newsletter-body" /></div>
        <Button onClick={send} disabled={sending || !subject.trim() || !body.trim()} data-testid="newsletter-send">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          An {counts.confirmed} Abonnenten senden
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><Users className="h-4 w-4" /> Abonnenten ({subs.length})</h2>
        {subs.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Abonnenten.</p> : (
          <div className="rounded-2xl border border-border/70 bg-card shadow-soft divide-y divide-border overflow-hidden max-h-96 overflow-y-auto">
            {subs.map((s) => {
              const st = STATUS[s.status] || STATUS.pending;
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="truncate min-w-0">{s.email}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary" className={`font-normal ${st.cls}`}>{st.label}</Badge>
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {new Date(s.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
