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
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Mail, Phone, Building2, MapPin, Save } from "lucide-react";

const STATUSES = [
  { key: "neu", label: "Neu", dot: "bg-slate-400" },
  { key: "kontaktiert", label: "Kontaktiert", dot: "bg-blue-500" },
  { key: "interessiert", label: "Interessiert", dot: "bg-violet-500" },
  { key: "gewonnen", label: "Gewonnen", dot: "bg-success" },
  { key: "verloren", label: "Verloren", dot: "bg-destructive" },
];
const EMPTY = { name: "", email: "", phone: "", company: "", address: "", zip: "", city: "", source: "", status: "neu", notes: "" };

function LeadDetail({ lead, open, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState(lead || EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (lead) setForm(lead); }, [lead]);
  if (!open || !lead) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      const { name, email, phone, company, address, zip, city, source, status, notes } = form;
      await api.patch(`/admin/leads/${lead.id}`, { name, email, phone, company, address, zip, city, source, status, notes });
      toast.success("Lead gespeichert"); onSaved?.(); onClose();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm("Lead wirklich löschen?")) return;
    await api.delete(`/admin/leads/${lead.id}`); toast.success("Lead gelöscht"); onDeleted?.(); onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" aria-describedby={undefined}>
        <SheetHeader>
          <SheetDescription className="sr-only">Lead-Details</SheetDescription>
          <SheetTitle className="text-left">{form.name || "Lead"}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={set("name")} className="mt-1.5" data-testid="detail-name" /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="mt-1.5" data-testid="detail-status"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>E-Mail</Label><Input value={form.email || ""} onChange={set("email")} className="mt-1.5" data-testid="detail-email" /></div>
            <div><Label>Telefon</Label><Input value={form.phone || ""} onChange={set("phone")} className="mt-1.5" data-testid="detail-phone" /></div>
          </div>
          <div><Label>Firma</Label><Input value={form.company || ""} onChange={set("company")} className="mt-1.5" data-testid="detail-company" /></div>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AdminLeads() {
  const [leads, setLeads] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [csv, setCsv] = useState("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const load = useCallback(() => api.get("/admin/leads").then((r) => setLeads(r.data)).catch(() => setLeads([])), []);
  useEffect(() => { load(); }, [load]);

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

  const onDragEnd = async (result) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId;
    setLeads((prev) => prev.map((l) => (l.id === draggableId ? { ...l, status: newStatus } : l)));
    try { await api.patch(`/admin/leads/${draggableId}`, { status: newStatus }); }
    catch { toast.error("Statusänderung fehlgeschlagen"); load(); }
  };

  if (!leads) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const activeLead = leads.find((l) => l.id === activeId) || null;

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-leads-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Leads & CRM</h1>
          <p className="text-muted-foreground mt-1">Interessenten per Drag & Drop durch die Vertriebspipeline führen.</p>
        </div>
        <div className="flex gap-2">
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((col) => {
            const items = leads.filter((l) => l.status === col.key);
            return (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} data-testid={`lead-column-${col.key}`}
                    className={`min-w-[260px] w-[260px] rounded-xl border border-border bg-secondary/30 flex flex-col ${snapshot.isDraggingOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border sticky top-0 bg-secondary/60 backdrop-blur rounded-t-xl">
                      <span className="flex items-center gap-2 font-semibold text-sm"><span className={`h-2 w-2 rounded-full ${col.dot}`} />{col.label}</span>
                      <span className="text-xs font-semibold text-muted-foreground bg-card rounded-full px-2 py-0.5 min-w-[22px] text-center">{items.length}</span>
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
                              <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
                                {l.email && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" /></span>}
                                {l.phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /></span>}
                                {l.source && <span className="bg-secondary rounded px-1.5 py-0.5">{l.source}</span>}
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

      <LeadDetail lead={activeLead} open={!!activeId} onClose={() => setActiveId(null)} onSaved={load} onDeleted={load} />
    </div>
  );
}
