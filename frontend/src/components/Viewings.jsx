import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CalendarDays, Plus, Users, Trash2, Loader2, UserPlus, CalendarPlus } from "lucide-react";
import { downloadIcs } from "@/lib/ics";

const TYPE_LABEL = { single: "Einzelbesichtigung", slots: "Zeitfenster", group: "Massenbesichtigung" };

function CreateViewingDialog({ propertyId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("single");
  const [form, setForm] = useState({ title: "", datetime: "", max_participants: "", notes: "" });
  const [slots, setSlots] = useState([""]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const payload = {
      property_id: propertyId, type, title: form.title || "Besichtigung",
      datetime: type === "slots" ? null : form.datetime,
      slots: type === "slots" ? slots.filter(Boolean) : [],
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      notes: form.notes,
    };
    try {
      await api.post("/viewings", payload);
      toast.success("Termin erstellt"); setOpen(false); onCreated();
      setForm({ title: "", datetime: "", max_participants: "", notes: "" }); setSlots([""]);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button data-testid="new-viewing-btn"><Plus className="h-4 w-4 mr-1" /> Termin erstellen</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Neue Besichtigung</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Art der Besichtigung</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1.5" data-testid="viewing-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Einzelbesichtigung</SelectItem>
                <SelectItem value="slots">Zeitfenster / Slots</SelectItem>
                <SelectItem value="group">Massenbesichtigung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Titel</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="z.B. Besichtigung Samstag" /></div>
          {type !== "slots" ? (
            <div><Label>Datum & Uhrzeit</Label><Input type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} className="mt-1.5" data-testid="viewing-datetime" /></div>
          ) : (
            <div>
              <Label>Zeitfenster</Label>
              <div className="space-y-2 mt-1.5">
                {slots.map((s, i) => (
                  <Input key={i} type="datetime-local" value={s} onChange={(e) => { const n = [...slots]; n[i] = e.target.value; setSlots(n); }} />
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setSlots([...slots, ""])}>+ Slot</Button>
              </div>
            </div>
          )}
          {type === "group" && <div><Label>Max. Teilnehmer</Label><Input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} className="mt-1.5" /></div>}
          <div><Label>Notizen</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} data-testid="save-viewing">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Erstellen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ viewing, propertyId, onDone }) {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) api.get(`/applications?property_id=${propertyId}`).then((r) => setApps(r.data));
  }, [open, propertyId]);

  const invite = async () => {
    await api.post(`/viewings/${viewing.id}/invite`, { application_ids: selected });
    toast.success("Einladungen versendet"); setOpen(false); setSelected([]); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" data-testid={`invite-${viewing.id}`}><UserPlus className="h-4 w-4 mr-1" /> Einladen</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Bewerber einladen</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {apps.length === 0 && <p className="text-sm text-muted-foreground">Keine Bewerber vorhanden.</p>}
          {apps.map((a) => (
            <label key={a.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-secondary">
              <Checkbox checked={selected.includes(a.id)} onCheckedChange={(c) => setSelected(c ? [...selected, a.id] : selected.filter((x) => x !== a.id))} />
              <span className="text-sm">{[a.form_data?.vorname, a.form_data?.nachname].filter(Boolean).join(" ") || a.applicant_email}</span>
            </label>
          ))}
        </div>
        <DialogFooter><Button onClick={invite} disabled={selected.length === 0}>{selected.length} einladen</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Viewings({ propertyId, property }) {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await api.get(`/viewings?property_id=${propertyId}`);
    setViews(data); setLoading(false);
  }, [propertyId]);
  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm("Termin wirklich löschen? Eingeladene Bewerber erhalten dadurch sofort eine Absage-E-Mail zum Termin.")) return;
    try { await api.delete(`/viewings/${id}`); toast.success("Termin gelöscht"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const addToCalendar = (v) => {
    const location = property ? [property.street, property.house_number, property.zip, property.city].filter(Boolean).join(" ") : "";
    const ok = downloadIcs({ title: v.title, start: v.datetime, location, description: v.notes || "" });
    if (ok) toast.success("Kalenderdatei heruntergeladen"); else toast.error("Kein gültiges Datum für diesen Termin");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><CreateViewingDialog propertyId={propertyId} onCreated={load} /></div>
      {views.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3" />Noch keine Besichtigungen geplant.
        </div>
      ) : (
        <div className="space-y-3">
          {views.map((v) => (
            <div key={v.id} className="rounded-xl border border-border bg-card p-5" data-testid={`viewing-${v.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{v.title}</h3>
                    <Badge variant="secondary">{TYPE_LABEL[v.type]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {v.type === "slots" ? `${v.slots?.length || 0} Zeitfenster` : (v.datetime ? new Date(v.datetime).toLocaleString("de-DE") : "Kein Datum")}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Users className="h-3.5 w-3.5" /> {v.participants?.length || 0} Teilnehmer</p>
                </div>
                <div className="flex gap-2">
                  {v.type !== "slots" && v.datetime && (
                    <Button variant="outline" size="sm" onClick={() => addToCalendar(v)} data-testid={`ics-viewing-${v.id}`}><CalendarPlus className="h-4 w-4 mr-1" /> Zum Kalender</Button>
                  )}
                  <InviteDialog viewing={v} propertyId={propertyId} onDone={load} />
                  <Button variant="ghost" size="icon" onClick={() => del(v.id)} data-testid={`del-viewing-${v.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {v.participants?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                  {v.participants.map((p, i) => (
                    <Badge key={i} variant="outline" className="font-normal">
                      {p.applicant_email} · {p.status === "confirmed" ? "✓ bestätigt" : p.status === "declined" ? "✗ abgesagt" : p.status === "reschedule_requested" ? "↻ Umbuchung" : "eingeladen"}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
