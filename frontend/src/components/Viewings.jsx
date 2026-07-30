import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
import { SegmentedDateInput } from "@/components/SegmentedDateInput";

/* Date + time for a viewing, stored as one "YYYY-MM-DDTHH:MM" string like before, but
   rendered as the segmented date (see SegmentedDateInput) paired with a plain time input
   instead of a single native <input type="datetime-local">. That combined native control
   is what produced the confusing behaviour: a segment could flash invalid mid-type even
   when the year was already correctly pre-filled by us. */
function DateTimeField({ value, onChange, testId }) {
  const [datePart, timePart] = (value || "").split("T");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedDateInput value={datePart || ""} testId={testId && `${testId}-date`}
        onChange={(d) => onChange(d ? `${d}T${timePart || "10:00"}` : "")} />
      <Input type="time" value={timePart || ""} data-testid={testId && `${testId}-time`}
        onChange={(e) => onChange(`${datePart || ""}T${e.target.value}`)}
        className="w-28" />
    </div>
  );
}

export const TYPE_LABEL = { single: "Einzelbesichtigung", slots: "Zeitfenster", group: "Massenbesichtigung" };

// A literal `[]` default parameter is a new array reference on every render — with no
// stable prop passed in, the effect that depends on it below would fire, setState, re-render,
// get handed another new `[]`, and fire again forever ("Maximum update depth exceeded").
const NO_PRESELECT = [];

/* Slots carried a single application_id before per-slot capacity existed; older rows are
   read in that shape, so count both. */
const slotTaken = (s) => (s.application_ids ? s.application_ids.length : (s.application_id ? 1 : 0));

function slotSummary(v) {
  const slots = v.slots || [];
  const seats = slots.reduce((n, s) => n + (s.capacity || 1), 0);
  const taken = slots.reduce((n, s) => n + slotTaken(s), 0);
  return `${slots.length} Zeitfenster · ${taken}/${seats} Plätze belegt`;
}

/* Shared by the per-property tab and the global calendar.
   `properties` turns on the object picker; `defaultDate` (yyyy-mm-dd) pre-fills a clicked calendar day. */
export function CreateViewingDialog({ propertyId, properties, defaultDate, preselectApplicants = NO_PRESELECT,
                                     onCreated, open: openProp, onOpenChange, hideTrigger }) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = controlled ? onOpenChange : setOpenState;

  const [type, setType] = useState("single");
  const [propId, setPropId] = useState(propertyId || "");
  const [form, setForm] = useState({ title: "", datetime: "", max_participants: "", notes: "", duration_minutes: "30" });
  const [slots, setSlots] = useState([""]);
  const [saving, setSaving] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [invitees, setInvitees] = useState([]);
  const [slotCapacity, setSlotCapacity] = useState("1");
  const [openInvite, setOpenInvite] = useState(false);

  // When a day is clicked in the calendar, start that day at 10:00.
  useEffect(() => {
    if (!open) return;
    if (defaultDate) {
      setForm((f) => ({ ...f, datetime: `${defaultDate}T10:00` }));
      setSlots([`${defaultDate}T10:00`]);
    }
    if (propertyId) setPropId(propertyId);
  }, [open, defaultDate, propertyId]);

  const targetProperty = propertyId || propId;

  /* Creating a date and inviting people were two separate trips before; whoever the caller
     already has in mind (e.g. from the inbox quick action) starts out ticked. */
  useEffect(() => {
    if (!open || !targetProperty) { return; }
    api.get(`/applications?property_id=${targetProperty}`)
      .then((r) => setApplicants(r.data))
      .catch(() => setApplicants([]));
  }, [open, targetProperty]);

  useEffect(() => { if (open) setInvitees(preselectApplicants); }, [open, preselectApplicants]);

  const toggleInvitee = (id) =>
    setInvitees((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const submit = async () => {
    if (!targetProperty) { toast.error("Bitte wählen Sie ein Objekt aus."); return; }
    // A date and time typed in the "wrong" order can sit half-composed (e.g. "T14:00"
    // with no date yet) — only a fully-formed value should ever reach the backend.
    const isCompleteDateTime = (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v || "");
    if (type !== "slots" && !isCompleteDateTime(form.datetime)) {
      toast.error("Bitte Datum und Uhrzeit vollständig angeben."); return;
    }
    setSaving(true);
    const payload = {
      property_id: targetProperty, type, title: form.title || "Besichtigung",
      datetime: type === "slots" ? null : form.datetime,
      slots: type === "slots" ? slots.filter(isCompleteDateTime) : [],
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      notes: form.notes,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : 30,
      slot_capacity: Math.max(1, Number(slotCapacity) || 1),
      open_invite: openInvite,
    };
    try {
      const { data } = await api.post("/viewings", payload);
      if (invitees.length) {
        // A failed invite must not read as a failed appointment — the date exists either way.
        try {
          await api.post(`/viewings/${data.id}/invite`, { application_ids: invitees });
          toast.success(`Termin erstellt · ${invitees.length} Einladung(en) versendet`);
        } catch {
          toast.warning("Termin erstellt, Einladungen konnten nicht versendet werden");
        }
      } else {
        toast.success("Termin erstellt");
      }
      setOpen(false); onCreated();
      setForm({ title: "", datetime: "", max_participants: "", notes: "", duration_minutes: "30" });
      setSlots([""]); setInvitees([]); setSlotCapacity("1"); setOpenInvite(false);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild><Button data-testid="new-viewing-btn"><Plus className="h-4 w-4 mr-1" /> Termin erstellen</Button></DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Neue Besichtigung</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {properties && (
            <div>
              <Label>Objekt</Label>
              <Select value={propId} onValueChange={setPropId}>
                <SelectTrigger className="mt-1.5" data-testid="viewing-property"><SelectValue placeholder="Objekt wählen" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
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
            <div><Label>Datum & Uhrzeit</Label>
              <div className="mt-1.5">
                <DateTimeField value={form.datetime} onChange={(v) => setForm({ ...form, datetime: v })} testId="viewing-datetime" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Zeitfenster</Label>
                <div className="space-y-2 mt-1.5">
                  {slots.map((s, i) => (
                    <DateTimeField key={i} value={s} onChange={(v) => { const n = [...slots]; n[i] = v; setSlots(n); }} />
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setSlots([...slots, ""])}>+ Slot</Button>
                </div>
              </div>
              <div>
                <Label>Plätze pro Zeitfenster</Label>
                <Input type="number" min="1" value={slotCapacity} onChange={(e) => setSlotCapacity(e.target.value)}
                  className="mt-1.5" data-testid="viewing-slot-capacity" />
                <p className="text-xs text-muted-foreground mt-1">
                  Wer zuerst bucht, kommt zuerst. Bei einem Zeitfenster von einer Stunde und
                  30 Minuten pro Besichtigung passen z.&nbsp;B. 2 Bewerber nacheinander hinein.
                </p>
              </div>
            </div>
          )}
          {type === "group" && <div><Label>Max. Teilnehmer</Label><Input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} className="mt-1.5" /></div>}
          <div><Label>Dauer (Minuten)</Label><Input type="number" min="5" step="5" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="mt-1.5" data-testid="viewing-duration" /></div>
          <div><Label>Notizen</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" /></div>
          <label className="flex items-start gap-2.5 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary/50">
            <Checkbox checked={openInvite} onCheckedChange={setOpenInvite} className="mt-0.5" data-testid="viewing-open-invite" />
            <span className="text-sm">
              Offene Besichtigung
              <span className="block text-xs text-muted-foreground mt-0.5">
                Jeder neue Bewerber wird automatisch eingeladen. Die Einladung geht rund
                10 Minuten nach der Bewerbung raus, damit Sie vorher noch eingreifen können.
              </span>
            </span>
          </label>
          {applicants.length > 0 && (
            <div>
              <Label>Bewerber einladen <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto rounded-md border border-border p-1.5">
                {applicants.map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-secondary"
                    data-testid={`create-invite-${a.id}`}>
                    <Checkbox checked={invitees.includes(a.id)} onCheckedChange={() => toggleInvitee(a.id)} />
                    <span className="truncate">
                      {[a.form_data?.vorname, a.form_data?.nachname].filter(Boolean).join(" ") || a.applicant_email}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} data-testid="save-viewing">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {invitees.length ? `Erstellen & ${invitees.length} einladen` : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleRequest({ viewing, participant, onDone }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newDatetime, setNewDatetime] = useState("");
  const needsDatetime = viewing.type !== "slots";

  const respond = async (action) => {
    if (action === "reoffer" && needsDatetime && !newDatetime) {
      toast.error("Bitte einen neuen Termin auswählen."); return;
    }
    setBusy(true);
    try {
      await api.post(`/viewings/${viewing.id}/participants/${participant.application_id}/reschedule-response`,
        { action, message: message.trim() || null, new_datetime: action === "reoffer" ? newDatetime || null : null });
      toast.success(action === "reoffer" ? "Neuer Termin vorgeschlagen" : "Umbuchung abgelehnt");
      onDone();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3" data-testid={`reschedule-${participant.application_id}`}>
      <p className="text-sm font-medium text-amber-900">
        ↻ {participant.applicant_email} bittet um einen anderen Termin
      </p>
      {/* Slot-type viewings let the applicant pick any free slot themselves; a single/group
          viewing has one shared datetime that only the landlord can move here. */}
      {needsDatetime && (
        <Input type="datetime-local" value={newDatetime} onChange={(e) => setNewDatetime(e.target.value)}
          className="mt-2 bg-white" data-testid={`reschedule-newtime-${participant.application_id}`} />
      )}
      <Input value={message} onChange={(e) => setMessage(e.target.value)} className="mt-2 bg-white"
        placeholder="Optionale Nachricht an den Bewerber" data-testid={`reschedule-msg-${participant.application_id}`} />
      <div className="flex flex-wrap gap-2 mt-2">
        <Button size="sm" disabled={busy} onClick={() => respond("reoffer")} data-testid={`reschedule-reoffer-${participant.application_id}`}>
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Neuen Termin anbieten
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => respond("decline")} data-testid={`reschedule-decline-${participant.application_id}`}>
          Nicht möglich
        </Button>
      </div>
    </div>
  );
}

export function InviteDialog({ viewing, propertyId, onDone }) {
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [preselect, setPreselect] = useState([]);

  const load = useCallback(async () => {
    const { data } = await api.get(`/viewings?property_id=${propertyId}`);
    setViews(data); setLoading(false);
  }, [propertyId]);
  useEffect(() => { load(); }, [load]);

  /* ?invite=<applicationId> arrives from the inbox quick action: open the create dialog
     with that applicant already ticked, then drop the param so a reload doesn't repeat it. */
  useEffect(() => {
    const invite = searchParams.get("invite");
    if (!invite) return;
    setPreselect([invite]);
    setCreateOpen(true);
    const next = new URLSearchParams(searchParams); next.delete("invite");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const del = async (id) => {
    if (!window.confirm("Termin wirklich löschen? Eingeladene Bewerber erhalten dadurch sofort eine Absage-E-Mail zum Termin.")) return;
    try { await api.delete(`/viewings/${id}`); toast.success("Termin gelöscht"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const addToCalendar = (v) => {
    const location = property ? [property.street, property.house_number, property.zip, property.city].filter(Boolean).join(" ") : "";
    const ok = downloadIcs({ title: v.title, start: v.datetime, durationMinutes: v.duration_minutes || 30, location, description: v.notes || "" });
    if (ok) toast.success("Kalenderdatei heruntergeladen"); else toast.error("Kein gültiges Datum für diesen Termin");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateViewingDialog propertyId={propertyId} onCreated={load}
          open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setPreselect([]); }}
          preselectApplicants={preselect} hideTrigger />
        {!createOpen && (
          <Button onClick={() => setCreateOpen(true)} data-testid="new-viewing-btn">
            <Plus className="h-4 w-4 mr-1" /> Termin erstellen
          </Button>
        )}
      </div>
      {views.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/50 p-16 text-center text-muted-foreground">
          <div className="h-14 w-14 rounded-2xl bg-accent text-primary flex items-center justify-center mx-auto mb-4"><CalendarDays className="h-6 w-6" /></div>
          Noch keine Besichtigungen geplant.
        </div>
      ) : (
        <div className="space-y-3">
          {views.map((v) => (
            <div key={v.id} className="rounded-2xl border border-border/70 bg-card shadow-soft p-5" data-testid={`viewing-${v.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{v.title}</h3>
                    <Badge variant="secondary">{TYPE_LABEL[v.type]}</Badge>
                    {v.open_invite && <Badge data-testid={`open-invite-${v.id}`}>Offene Besichtigung</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {v.type === "slots" ? slotSummary(v) : (v.datetime ? new Date(v.datetime).toLocaleString("de-DE") : "Kein Datum")}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Users className="h-3.5 w-3.5" /> {v.participants?.length || 0} Teilnehmer</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {v.type !== "slots" && v.datetime && (
                    <Button variant="outline" size="sm" onClick={() => addToCalendar(v)} data-testid={`ics-viewing-${v.id}`}><CalendarPlus className="h-4 w-4 mr-1" /> Zum Kalender</Button>
                  )}
                  <InviteDialog viewing={v} propertyId={propertyId} onDone={load} />
                  <Button variant="ghost" size="icon" onClick={() => del(v.id)} data-testid={`del-viewing-${v.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {v.participants?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {v.participants.filter((p) => p.status !== "reschedule_requested").map((p, i) => (
                      <Badge key={i} variant="outline" className="font-normal">
                        {p.applicant_email} · {p.status === "confirmed" ? "✓ bestätigt" : p.status === "declined" ? "✗ abgesagt" : "eingeladen"}
                      </Badge>
                    ))}
                  </div>
                  {/* A reschedule request needs an answer, so it gets its own row with actions
                      instead of being just another status chip the landlord can't act on. */}
                  {v.participants.filter((p) => p.status === "reschedule_requested").map((p) => (
                    <RescheduleRequest key={p.application_id} viewing={v} participant={p} onDone={load} />
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
