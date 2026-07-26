import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Send, Plus, Phone } from "lucide-react";

const TICKET_STATUSES = ["open", "in_bearbeitung", "erledigt"];
const TICKET_LABEL = { open: "Offen", in_bearbeitung: "In Bearbeitung", erledigt: "Erledigt" };
const SOURCE_LABEL = { telefon: "Telefon", formular: "Kontaktformular" };

function NewTicketDialog({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "", source: "telefon" });

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Bitte Name, E-Mail und Nachricht ausfüllen."); return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/admin/support-tickets", form);
      toast.success("Ticket erstellt");
      setOpen(false); setForm({ name: "", email: "", message: "", source: "telefon" });
      onCreated(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" data-testid="new-ticket-btn"><Plus className="h-4 w-4 mr-1" /> Neues Ticket</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Neues Ticket anlegen</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Für Anfragen, die telefonisch oder auf anderem Weg reinkommen – nicht über das Kontaktformular.</p>
          <div>
            <Label>Quelle</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="telefon">Telefon</SelectItem><SelectItem value="formular">Sonstiges</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" data-testid="new-ticket-name" /></div>
          <div><Label>E-Mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" data-testid="new-ticket-email" /></div>
          <div><Label>Anliegen</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-1.5" placeholder="Worum ging es in dem Anruf?" data-testid="new-ticket-message" /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving} data-testid="new-ticket-save">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ticket erstellen</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [sending, setSending] = useState({});

  const load = () => {
    setError(false);
    Promise.all([api.get("/admin/support-tickets"), api.get("/admin/activities")]).then(([t, a]) => {
      setTickets(t.data); setActivities(a.data); setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  };
  useEffect(() => { load(); }, []);
  const onTicketCreated = (ticket) => setTickets((prev) => [ticket, ...prev]);

  const setStatus = async (tid, status) => {
    try {
      await api.patch(`/admin/support-tickets/${tid}`, { status });
      setTickets(tickets.map((t) => (t.id === tid ? { ...t, status } : t)));
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const sendReply = async (tid) => {
    const message = (replyDrafts[tid] || "").trim();
    if (!message) return;
    setSending({ ...sending, [tid]: true });
    try {
      const { data } = await api.post(`/admin/support-tickets/${tid}/reply`, { message });
      setTickets(tickets.map((t) => (t.id === tid ? { ...t, replies: [...(t.replies || []), data], status: "in_bearbeitung" } : t)));
      setReplyDrafts({ ...replyDrafts, [tid]: "" });
      toast.success("Antwort gesendet");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSending({ ...sending, [tid]: false }); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return <p className="text-sm text-destructive py-10 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;

  return (
    <div className="space-y-6 animate-fade-up max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Support & Logs</h1>
        <NewTicketDialog onCreated={onTicketCreated} />
      </div>
      <Tabs defaultValue="tickets">
        <TabsList><TabsTrigger value="tickets">Kontaktanfragen</TabsTrigger><TabsTrigger value="logs">Audit Logs</TabsTrigger></TabsList>
        <TabsContent value="tickets" className="mt-6 space-y-2">
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">Keine Anfragen.</p>}
          {tickets.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium flex items-center gap-2 flex-wrap">
                  {t.name} · <a href={`mailto:${t.email}`} className="text-primary hover:underline inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{t.email}</a>
                  {t.source === "telefon" && <Badge variant="outline" className="text-xs font-normal gap-1"><Phone className="h-3 w-3" /> Telefon</Badge>}
                </p>
                <Select value={t.status} onValueChange={(v) => setStatus(t.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{TICKET_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t.message}</p>
              {t.replies?.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {t.replies.map((r) => (
                    <div key={r.id} className="text-sm bg-secondary/40 rounded-md p-2">
                      <p className="whitespace-pre-wrap">{r.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.sent_by} · {new Date(r.created_at).toLocaleString("de-DE")}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 mt-3">
                <Textarea rows={2} value={replyDrafts[t.id] || ""} onChange={(e) => setReplyDrafts({ ...replyDrafts, [t.id]: e.target.value })}
                  placeholder="Antwort verfassen…" className="flex-1" data-testid={`reply-text-${t.id}`} />
                <Button size="sm" onClick={() => sendReply(t.id)} disabled={sending[t.id] || !(replyDrafts[t.id] || "").trim()} data-testid={`reply-send-${t.id}`}>
                  {sending[t.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="logs" className="mt-6 space-y-1">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
              <Badge variant="outline" className="font-mono text-xs">{a.action}</Badge>
              <span className="text-muted-foreground">{a.entity}</span>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("de-DE")}</span>
            </div>
          ))}
          {activities.length === 0 && <p className="text-sm text-muted-foreground">Keine Aktivitäten.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
