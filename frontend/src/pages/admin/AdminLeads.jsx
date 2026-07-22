import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Mail, Phone, Building2, Users } from "lucide-react";

const STATUSES = [
  { key: "neu", label: "Neu", dot: "bg-slate-400" },
  { key: "kontaktiert", label: "Kontaktiert", dot: "bg-blue-500" },
  { key: "interessiert", label: "Interessiert", dot: "bg-violet-500" },
  { key: "gewonnen", label: "Gewonnen", dot: "bg-success" },
  { key: "verloren", label: "Verloren", dot: "bg-destructive" },
];
const EMPTY = { name: "", email: "", phone: "", company: "", source: "", status: "neu", notes: "" };

export default function AdminLeads() {
  const [leads, setLeads] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [csv, setCsv] = useState("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = () => api.get("/admin/leads").then((r) => setLeads(r.data)).catch(() => setLeads([]));
  useEffect(() => { load(); }, []);

  const addLead = async () => {
    if (!form.name.trim()) { toast.error("Name ist erforderlich"); return; }
    setSaving(true);
    try {
      await api.post("/admin/leads", form);
      toast.success("Lead angelegt"); setForm({ ...EMPTY }); setAddOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
    finally { setSaving(false); }
  };

  const importCsv = async () => {
    if (!csv.trim()) { toast.error("Bitte CSV-Daten einfügen"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/admin/leads/import", { csv });
      toast.success(`${data.imported} Leads importiert`); setCsv(""); setImportOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
    finally { setSaving(false); }
  };

  const patch = async (id, upd) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...upd } : l)));
    try { await api.patch(`/admin/leads/${id}`, upd); }
    catch { toast.error("Speichern fehlgeschlagen"); load(); }
  };

  const remove = async (id) => {
    if (!window.confirm("Lead wirklich löschen?")) return;
    await api.delete(`/admin/leads/${id}`); toast.success("Lead gelöscht"); load();
  };

  if (!leads) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-leads-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads & CRM</h1>
          <p className="text-muted-foreground mt-1">Interessenten erfassen, importieren und durch die Vertriebspipeline führen.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild><Button variant="outline" data-testid="import-leads-btn"><Upload className="h-4 w-4 mr-2" /> CSV importieren</Button></DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Leads per CSV importieren</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Fügen Sie CSV-Daten mit Kopfzeile ein. Erkannte Spalten: <code>name, email, phone, company, source, notes</code>.</p>
              <Textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"name,email,phone,company\nMax Muster,max@firma.de,0170...,Muster GmbH"} className="font-mono text-xs" data-testid="csv-input" />
              <DialogFooter>
                <Button onClick={importCsv} disabled={saving} data-testid="csv-submit">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Importieren</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button data-testid="add-lead-btn"><Plus className="h-4 w-4 mr-2" /> Lead hinzufügen</Button></DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Neuer Lead</DialogTitle></DialogHeader>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={set("name")} className="mt-1.5" data-testid="lead-name" /></div>
                <div><Label>E-Mail</Label><Input value={form.email} onChange={set("email")} className="mt-1.5" data-testid="lead-email" /></div>
                <div><Label>Telefon</Label><Input value={form.phone} onChange={set("phone")} className="mt-1.5" data-testid="lead-phone" /></div>
                <div><Label>Firma</Label><Input value={form.company} onChange={set("company")} className="mt-1.5" data-testid="lead-company" /></div>
                <div><Label>Quelle</Label><Input value={form.source} onChange={set("source")} className="mt-1.5" placeholder="z.B. Messe, Website" data-testid="lead-source" /></div>
                <div className="sm:col-span-2"><Label>Notizen</Label><Textarea rows={2} value={form.notes} onChange={set("notes")} className="mt-1.5" data-testid="lead-notes" /></div>
              </div>
              <DialogFooter>
                <Button onClick={addLead} disabled={saving} data-testid="lead-submit">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATUSES.map((s) => (
          <div key={s.key} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{leads.filter((l) => l.status === s.key).length}</p>
          </div>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
          Noch keine Leads. Fügen Sie einen Lead hinzu oder importieren Sie eine CSV-Datei.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-card p-4" data-testid={`lead-row-${l.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{l.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    {l.company && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{l.company}</span>}
                    {l.email && <a href={`mailto:${l.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="h-3.5 w-3.5" />{l.email}</a>}
                    {l.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{l.phone}</span>}
                    {l.source && <span className="text-xs bg-secondary rounded px-1.5 py-0.5">{l.source}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={l.status} onValueChange={(v) => patch(l.id, { status: v })}>
                    <SelectTrigger className="w-[150px]" data-testid={`lead-status-${l.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(l.id)} data-testid={`delete-lead-${l.id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <Textarea rows={1} defaultValue={l.notes || ""} onBlur={(e) => e.target.value !== (l.notes || "") && patch(l.id, { notes: e.target.value })}
                placeholder="Notiz hinzufügen…" className="mt-3 text-sm" data-testid={`lead-note-${l.id}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
