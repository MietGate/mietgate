import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Upload, Mail, Phone, Building2, MapPin, Save,
  Settings2, ArrowUp, ArrowDown, ListTodo, MessageSquare, PhoneCall, StickyNote, Bell,
} from "lucide-react";

const COLOR_OPTIONS = [
  { value: "bg-slate-400", label: "Grau" }, { value: "bg-blue-500", label: "Blau" },
  { value: "bg-violet-500", label: "Violett" }, { value: "bg-amber-500", label: "Gelb" },
  { value: "bg-primary", label: "Primärfarbe" }, { value: "bg-success", label: "Grün" },
  { value: "bg-destructive", label: "Rot" },
];
const ACTIVITY_TYPES = [
  { value: "note", label: "Notiz", Icon: StickyNote }, { value: "call", label: "Anruf", Icon: PhoneCall },
  { value: "email", label: "E-Mail", Icon: MessageSquare },
];
const EMPTY = { name: "", email: "", phone: "", company: "", address: "", zip: "", city: "", source: "", status: "neu", notes: "", deal_value: "" };

const fmtEUR = (n) => (n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("de-DE") : "");

function ActivityTab({ leadId }) {
  const [items, setItems] = useState(null);
  const [type, setType] = useState("note");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get(`/admin/leads/${leadId}/activities`).then((r) => setItems(r.data)).catch(() => setItems([])), [leadId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await api.post(`/admin/leads/${leadId}/activities`, { type, text }); setText(""); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Notiz, Gesprächsinhalt, E-Mail-Zusammenfassung…" className="flex-1" data-testid="activity-text" />
      </div>
      <Button size="sm" onClick={add} disabled={saving || !text.trim()} data-testid="activity-add">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Eintragen
      </Button>
      <div className="space-y-2 pt-2 border-t border-border">
        {items === null && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {items?.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>}
        {items?.map((a) => {
          const meta = ACTIVITY_TYPES.find((t) => t.value === a.type);
          const Icon = meta?.Icon || StickyNote;
          return (
            <div key={a.id} className="flex items-start gap-2 text-sm rounded-md bg-secondary/40 px-3 py-2">
              <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{a.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString("de-DE")}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TasksTab({ leadId, onChanged }) {
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get(`/admin/leads/${leadId}/tasks`).then((r) => setItems(r.data)).catch(() => setItems([])), [leadId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/admin/leads/${leadId}/tasks`, { title, due_at: dueAt ? new Date(dueAt).toISOString() : null });
      setTitle(""); setDueAt(""); load(); onChanged?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const toggle = async (t) => { await api.patch(`/admin/lead-tasks/${t.id}`, { done: !t.done }); load(); onChanged?.(); };
  const remove = async (id) => { await api.delete(`/admin/lead-tasks/${id}`); load(); onChanged?.(); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Rückruf vereinbaren" className="flex-1 min-w-[160px]" data-testid="task-title" />
        <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-[150px]" data-testid="task-due" />
        <Button size="sm" onClick={add} disabled={saving || !title.trim()} data-testid="task-add">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Hinzufügen
        </Button>
      </div>
      <div className="space-y-2 pt-2 border-t border-border">
        {items === null && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {items?.length === 0 && <p className="text-sm text-muted-foreground">Keine Aufgaben.</p>}
        {items?.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm rounded-md bg-secondary/40 px-3 py-2">
            <Checkbox checked={t.done} onCheckedChange={() => toggle(t)} data-testid={`task-done-${t.id}`} />
            <div className="flex-1">
              <p className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</p>
              {t.due_at && <p className="text-xs text-muted-foreground">Fällig: {fmtDate(t.due_at)}</p>}
            </div>
            <button onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadDetail({ lead, stages, open, onClose, onSaved, onDeleted, onTasksChanged }) {
  const [form, setForm] = useState(lead || EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (lead) setForm({ ...lead, deal_value: lead.deal_value ?? "" }); }, [lead]);
  if (!open || !lead) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      const { name, email, phone, company, address, zip, city, source, status, notes, deal_value } = form;
      await api.patch(`/admin/leads/${lead.id}`, { name, email, phone, company, address, zip, city, source, status, notes, deal_value: deal_value === "" ? 0 : Number(deal_value) });
      toast.success("Lead gespeichert"); onSaved?.(); onClose();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm("Lead wirklich löschen? Zugehörige Aufgaben und Aktivitäten werden mitgelöscht.")) return;
    await api.delete(`/admin/leads/${lead.id}`); toast.success("Lead gelöscht"); onDeleted?.(); onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" aria-describedby={undefined}>
        <SheetHeader>
          <SheetDescription className="sr-only">Lead-Details</SheetDescription>
          <SheetTitle className="text-left">{form.name || "Lead"}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="details" className="mt-6">
          <TabsList>
            <TabsTrigger value="details" data-testid="tab-lead-details">Details</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-lead-activity">Aktivität</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-lead-tasks">Aufgaben</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={set("name")} className="mt-1.5" data-testid="detail-name" /></div>
            <div><Label>Pipeline-Stufe</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1.5" data-testid="detail-status"><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>E-Mail</Label><Input value={form.email || ""} onChange={set("email")} className="mt-1.5" data-testid="detail-email" /></div>
              <div><Label>Telefon</Label><Input value={form.phone || ""} onChange={set("phone")} className="mt-1.5" data-testid="detail-phone" /></div>
            </div>
            <div><Label>Firma</Label><Input value={form.company || ""} onChange={set("company")} className="mt-1.5" data-testid="detail-company" /></div>
            <div><Label>Erwarteter Deal-Wert (€)</Label><Input type="number" min="0" step="1" value={form.deal_value} onChange={set("deal_value")} className="mt-1.5" data-testid="detail-deal-value" /></div>
            <div><Label>Adresse</Label><Input value={form.address || ""} onChange={set("address")} className="mt-1.5" placeholder="Straße & Hausnr." data-testid="detail-address" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>PLZ</Label><Input value={form.zip || ""} onChange={set("zip")} className="mt-1.5" data-testid="detail-zip" /></div>
              <div className="col-span-2"><Label>Ort</Label><Input value={form.city || ""} onChange={set("city")} className="mt-1.5" data-testid="detail-city" /></div>
            </div>
            <div><Label>Quelle</Label><Input value={form.source || ""} onChange={set("source")} className="mt-1.5" data-testid="detail-source" /></div>
            <div><Label>Notizen</Label><Textarea rows={4} value={form.notes || ""} onChange={set("notes")} className="mt-1.5" data-testid="detail-notes" /></div>
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" className="text-destructive" onClick={remove} data-testid="detail-delete"><Trash2 className="h-4 w-4 mr-1" /> Löschen</Button>
              <Button onClick={save} disabled={saving} data-testid="detail-save">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern</Button>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4"><ActivityTab leadId={lead.id} /></TabsContent>
          <TabsContent value="tasks" className="mt-4"><TasksTab leadId={lead.id} onChanged={onTasksChanged} /></TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function StageManager({ stages, onChanged }) {
  const [open, setOpen] = useState(false);
  const [newStage, setNewStage] = useState({ key: "", label: "", color: "bg-slate-400" });

  const patch = async (id, body) => {
    try { await api.patch(`/admin/lead-stages/${id}`, body); onChanged(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const move = (idx, dir) => {
    const target = stages[idx + dir];
    if (!target) return;
    patch(stages[idx].id, { order: target.order });
    patch(target.id, { order: stages[idx].order });
  };
  const add = async () => {
    if (!newStage.key.trim() || !newStage.label.trim()) { toast.error("Schlüssel und Bezeichnung erforderlich"); return; }
    try {
      await api.post("/admin/lead-stages", newStage);
      setNewStage({ key: "", label: "", color: "bg-slate-400" }); onChanged();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Diese Stufe wirklich löschen?")) return;
    try { await api.delete(`/admin/lead-stages/${id}`); onChanged(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" data-testid="manage-stages-btn"><Settings2 className="h-4 w-4 mr-2" /> Stufen verwalten</Button></DialogTrigger>
      <DialogContent aria-describedby={undefined} className="max-w-lg">
        <DialogHeader><DialogTitle>Pipeline-Stufen</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {stages.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border border-border p-2" data-testid={`stage-row-${s.key}`}>
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.color}`} />
              <Input value={s.label} onChange={(e) => patch(s.id, { label: e.target.value })} className="flex-1 h-8" />
              <Select value={s.color} onValueChange={(v) => patch(s.id, { color: v })}>
                <SelectTrigger className="w-[110px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{COLOR_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <button onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4 disabled:opacity-30" /></button>
              <button onClick={() => move(idx, 1)} disabled={idx === stages.length - 1}><ArrowDown className="h-4 w-4 disabled:opacity-30" /></button>
              <button onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Input value={newStage.key} onChange={(e) => setNewStage({ ...newStage, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="schluessel" className="w-[110px] h-8" data-testid="new-stage-key" />
          <Input value={newStage.label} onChange={(e) => setNewStage({ ...newStage, label: e.target.value })} placeholder="Bezeichnung" className="flex-1 h-8" data-testid="new-stage-label" />
          <Select value={newStage.color} onValueChange={(v) => setNewStage({ ...newStage, color: v })}>
            <SelectTrigger className="w-[110px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{COLOR_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={add} data-testid="new-stage-add"><Plus className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminLeads() {
  const [leads, setLeads] = useState(null);
  const [stages, setStages] = useState(null);
  const [dueTasks, setDueTasks] = useState([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [csv, setCsv] = useState("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const load = useCallback(() => api.get("/admin/leads").then((r) => setLeads(r.data)).catch(() => setLeads([])), []);
  const loadStages = useCallback(() => api.get("/admin/lead-stages").then((r) => setStages(r.data)).catch(() => setStages([])), []);
  const loadDue = useCallback(() => api.get("/admin/lead-tasks/due").then((r) => setDueTasks(r.data)).catch(() => setDueTasks([])), []);
  useEffect(() => { load(); loadStages(); loadDue(); }, [load, loadStages, loadDue]);

  const addLead = async () => {
    if (!form.name.trim()) { toast.error("Name ist erforderlich"); return; }
    setSaving(true);
    try {
      await api.post("/admin/leads", { ...form, deal_value: form.deal_value === "" ? 0 : Number(form.deal_value) });
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

  const onDragEnd = async (result) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId;
    setLeads((prev) => prev.map((l) => (l.id === draggableId ? { ...l, status: newStatus } : l)));
    try { await api.patch(`/admin/leads/${draggableId}`, { status: newStatus }); }
    catch { toast.error("Statusänderung fehlgeschlagen"); load(); }
  };

  if (!leads || !stages) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const activeLead = leads.find((l) => l.id === activeId) || null;
  const totalValue = leads.reduce((sum, l) => sum + (l.deal_value || 0), 0);

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-leads-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads & CRM</h1>
          <p className="text-muted-foreground mt-1">Interessenten per Drag & Drop durch die Vertriebspipeline führen. Pipeline-Wert: <span className="font-semibold text-foreground">{fmtEUR(totalValue)}</span></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StageManager stages={stages} onChanged={loadStages} />
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild><Button variant="outline" data-testid="import-leads-btn"><Upload className="h-4 w-4 mr-2" /> CSV importieren</Button></DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle>Leads per CSV importieren</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Kopfzeile erforderlich. Spalten: <code>name, email, phone, company, address, zip, city, source, notes</code>.</p>
              <Textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"name,email,phone,company,zip,city\nMax Muster,max@firma.de,0170,Muster GmbH,10115,Berlin"} className="font-mono text-xs" data-testid="csv-input" />
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
                <div><Label>Erwarteter Deal-Wert (€)</Label><Input type="number" min="0" step="1" value={form.deal_value} onChange={set("deal_value")} className="mt-1.5" data-testid="lead-deal-value" /></div>
                <div className="sm:col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={set("address")} className="mt-1.5" placeholder="Straße & Hausnr." data-testid="lead-address" /></div>
                <div><Label>PLZ</Label><Input value={form.zip} onChange={set("zip")} className="mt-1.5" data-testid="lead-zip" /></div>
                <div><Label>Ort</Label><Input value={form.city} onChange={set("city")} className="mt-1.5" data-testid="lead-city" /></div>
                <div className="sm:col-span-2"><Label>Notizen</Label><Textarea rows={2} value={form.notes} onChange={set("notes")} className="mt-1.5" data-testid="lead-notes" /></div>
              </div>
              <DialogFooter>
                <Button onClick={addLead} disabled={saving} data-testid="lead-submit">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {dueTasks.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-4" data-testid="due-tasks-panel">
          <p className="font-semibold text-sm flex items-center gap-2 mb-2"><Bell className="h-4 w-4 text-amber-500" /> Heute fällig ({dueTasks.length})</p>
          <div className="flex flex-wrap gap-2">
            {dueTasks.map((t) => (
              <button key={t.id} onClick={() => setActiveId(t.lead_id)} className="text-xs bg-card border border-border rounded-full px-3 py-1 hover:border-primary/40 flex items-center gap-1" data-testid={`due-task-${t.id}`}>
                <ListTodo className="h-3 w-3" /> {t.title} — {t.lead_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((col) => {
            const items = leads.filter((l) => l.status === col.key);
            const colValue = items.reduce((sum, l) => sum + (l.deal_value || 0), 0);
            return (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} data-testid={`lead-column-${col.key}`}
                    className={`min-w-[260px] w-[260px] rounded-xl border border-border bg-secondary/30 flex flex-col ${snapshot.isDraggingOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
                    <div className="px-3 py-2.5 border-b border-border sticky top-0 bg-secondary/60 backdrop-blur rounded-t-xl">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-semibold text-sm"><span className={`h-2 w-2 rounded-full ${col.color}`} />{col.label}</span>
                        <span className="text-xs font-semibold text-muted-foreground bg-card rounded-full px-2 py-0.5 min-w-[22px] text-center">{items.length}</span>
                      </div>
                      {colValue > 0 && <p className="text-xs text-muted-foreground mt-1">{fmtEUR(colValue)}</p>}
                    </div>
                    <div className="space-y-2 min-h-[80px] p-2.5 flex-1">
                      {items.map((l, idx) => (
                        <Draggable draggableId={l.id} index={idx} key={l.id}>
                          {(prov) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              onClick={() => setActiveId(l.id)} data-testid={`lead-card-${l.id}`}
                              className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                              <p className="font-medium text-sm truncate">{l.name}</p>
                              {l.company && <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1"><Building2 className="h-3 w-3" />{l.company}</p>}
                              {(l.zip || l.city) && <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{[l.zip, l.city].filter(Boolean).join(" ")}</p>}
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                {l.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" /></span>}
                                {l.phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /></span>}
                                {l.source && <span className="bg-secondary rounded px-1.5 py-0.5">{l.source}</span>}
                                {l.deal_value > 0 && <span className="ml-auto font-semibold text-foreground">{fmtEUR(l.deal_value)}</span>}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Keine Leads</p>}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      <LeadDetail lead={activeLead} stages={stages} open={!!activeId} onClose={() => setActiveId(null)} onSaved={load} onDeleted={load} onTasksChanged={loadDue} />
    </div>
  );
}
