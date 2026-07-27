import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateViewingDialog, InviteDialog, TYPE_LABEL } from "@/components/Viewings";
import { downloadIcs } from "@/lib/ics";
import { toast } from "sonner";
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, Users, Trash2,
  CalendarPlus, Plus, Building2, Clock,
} from "lucide-react";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

const STATUS_META = {
  confirmed: { label: "bestätigt", cls: "text-success" },
  declined: { label: "abgesagt", cls: "text-destructive" },
  reschedule_requested: { label: "Umbuchung", cls: "text-amber-600" },
  invited: { label: "eingeladen", cls: "text-muted-foreground" },
};

const TYPE_DOT = { single: "bg-primary", slots: "bg-amber-500", group: "bg-violet-500" };

const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameDay = (a, b) => toKey(a) === toKey(b);

/* Flattens viewings into calendar entries: slot-based viewings yield one entry per slot. */
function toEntries(viewings) {
  const out = [];
  viewings.forEach((v) => {
    if (v.type === "slots") {
      (v.slots || []).forEach((s, i) => {
        if (s?.time) out.push({ key: `${v.id}-${i}`, viewing: v, when: s.time, slot: s });
      });
    } else if (v.datetime) {
      out.push({ key: v.id, viewing: v, when: v.datetime, slot: null });
    }
  });
  return out.sort((a, b) => new Date(a.when) - new Date(b.when));
}

function countStatus(viewing) {
  const parts = viewing.participants || [];
  return {
    total: parts.length,
    confirmed: parts.filter((p) => p.status === "confirmed").length,
    declined: parts.filter((p) => p.status === "declined").length,
    pending: parts.filter((p) => p.status === "invited" || p.status === "reschedule_requested").length,
  };
}

function ViewingDetail({ entry, property, onClose, onChanged }) {
  const v = entry?.viewing;
  if (!v) return null;
  const counts = countStatus(v);

  const del = async () => {
    if (!window.confirm("Termin wirklich löschen? Eingeladene Bewerber erhalten dadurch sofort eine Absage-E-Mail.")) return;
    try { await api.delete(`/viewings/${v.id}`); toast.success("Termin gelöscht"); onClose(); onChanged(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const addToCalendar = () => {
    const location = property ? [property.street, property.house_number, property.zip, property.city].filter(Boolean).join(" ") : "";
    const ok = downloadIcs({ title: v.title, start: entry.when, location, description: v.notes || "" });
    if (ok) toast.success("Kalenderdatei heruntergeladen"); else toast.error("Kein gültiges Datum für diesen Termin");
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{v.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TYPE_LABEL[v.type]}</Badge>
            {property && (
              <Link to={`/objekte/${v.property_id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {property.title}
              </Link>
            )}
          </div>

          <div className="rounded-lg border border-border divide-y divide-border text-sm">
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Termin</span>
              <span className="font-medium">{new Date(entry.when).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })}</span>
            </div>
            {v.type === "slots" && (
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Zeitfenster gesamt</span>
                <span className="font-medium">{v.slots?.length || 0}</span>
              </div>
            )}
            {v.max_participants && (
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Max. Teilnehmer</span>
                <span className="font-medium">{v.max_participants}</span>
              </div>
            )}
            {v.notes && (
              <div className="px-3 py-2">
                <span className="text-muted-foreground block mb-1">Notizen</span>
                <span>{v.notes}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Teilnehmer ({counts.total})
            </p>
            {counts.total === 0 ? (
              <p className="text-sm text-muted-foreground">Noch niemand eingeladen.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {v.participants.map((p, i) => {
                  const meta = STATUS_META[p.status] || STATUS_META.invited;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                      <span className="truncate">{p.applicant_email}</span>
                      <span className={`shrink-0 font-medium ${meta.cls}`}>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <InviteDialog viewing={v} propertyId={v.property_id} onDone={onChanged} />
            <Button variant="outline" size="sm" onClick={addToCalendar}>
              <CalendarPlus className="h-4 w-4 mr-1" /> Zum Kalender
            </Button>
            <Button variant="ghost" size="sm" onClick={del} className="text-destructive ml-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Löschen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Calendar() {
  const [viewings, setViewings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [propFilter, setPropFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [createFor, setCreateFor] = useState(null); // yyyy-mm-dd of the clicked day

  const load = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([api.get("/viewings"), api.get("/properties")]);
      setViewings(v.data);
      setProperties(p.data);
    } catch (e) {
      toast.error("Termine konnten nicht geladen werden");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const propById = useMemo(() => Object.fromEntries(properties.map((p) => [p.id, p])), [properties]);

  const entries = useMemo(() => {
    const filtered = propFilter === "all" ? viewings : viewings.filter((v) => v.property_id === propFilter);
    return toEntries(filtered);
  }, [viewings, propFilter]);

  const byDay = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const k = toKey(new Date(e.when));
      (map[k] = map[k] || []).push(e);
    });
    return map;
  }, [entries]);

  // Month grid starting on Monday, padded to full weeks.
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Mon = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return entries.filter((e) => new Date(e.when) >= now).slice(0, 6);
  }, [entries]);

  const today = new Date();
  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Kalender</h1>
          <p className="text-muted-foreground mt-1">Alle Besichtigungen über alle Objekte hinweg.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={propFilter} onValueChange={setPropFilter}>
            <SelectTrigger className="w-[200px]" data-testid="calendar-property-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Objekte</SelectItem>
              {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <CreateViewingDialog
            properties={properties}
            propertyId={propFilter !== "all" ? propFilter : undefined}
            onCreated={load} />
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} data-testid="calendar-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} data-testid="calendar-next"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())} data-testid="calendar-today">Heute</Button>
        </div>
        <h2 className="font-display text-xl font-semibold" data-testid="calendar-month">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </h2>
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          {Object.entries(TYPE_LABEL).map(([k, label]) => (
            <span key={k} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${TYPE_DOT[k]}`} />{label}</span>
          ))}
        </div>
      </div>

      {/* Month grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden" data-testid="calendar-grid">
        <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const dayEntries = byDay[toKey(d)] || [];
            return (
              <button key={i} type="button" onClick={() => setCreateFor(toKey(d))}
                data-testid={`calendar-day-${toKey(d)}`}
                className={`group relative min-h-[104px] border-b border-r border-border p-1.5 text-left align-top transition-colors last-of-type:border-r-0
                  ${inMonth ? "bg-card hover:bg-secondary/40" : "bg-secondary/20 text-muted-foreground/60"}`}>
                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold
                  ${isToday ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : ""}`}>
                  {d.getDate()}
                </span>
                <span className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <div className="mt-1 space-y-1">
                  {dayEntries.slice(0, 3).map((e) => {
                    const c = countStatus(e.viewing);
                    return (
                      <span key={e.key} role="button" tabIndex={0}
                        onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); setSelected(e); } }}
                        data-testid={`calendar-entry-${e.key}`}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] bg-secondary hover:bg-primary/15 cursor-pointer truncate">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_DOT[e.viewing.type]}`} />
                        <span className="tabular-nums shrink-0">
                          {new Date(e.when).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="truncate">{e.viewing.title}</span>
                        {c.total > 0 && <span className="ml-auto shrink-0 text-muted-foreground">{c.confirmed}/{c.total}</span>}
                      </span>
                    );
                  })}
                  {dayEntries.length > 3 && (
                    <span className="block px-1 text-[11px] text-muted-foreground">+{dayEntries.length - 3} weitere</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming list */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> Nächste Termine</h2>
        {upcoming.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <CalendarDays className="h-9 w-9 mx-auto mb-2" />
            Keine anstehenden Besichtigungen.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {upcoming.map((e) => {
              const c = countStatus(e.viewing);
              const prop = propById[e.viewing.property_id];
              return (
                <button key={e.key} onClick={() => setSelected(e)} data-testid={`upcoming-${e.key}`}
                  className="w-full flex flex-wrap items-center gap-3 py-3 text-left hover:bg-secondary/40 -mx-2 px-2 rounded transition-colors">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[e.viewing.type]}`} />
                  <span className="text-sm font-medium min-w-[150px]">
                    {new Date(e.when).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-sm">{e.viewing.title}</span>
                  {prop && <span className="text-sm text-muted-foreground truncate">· {prop.title}</span>}
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {c.total === 0 ? "keine Teilnehmer" : `${c.confirmed} von ${c.total} bestätigt`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ViewingDetail
        entry={selected}
        property={selected ? propById[selected.viewing.property_id] : null}
        onClose={() => setSelected(null)}
        onChanged={load} />

      {/* Clicking an empty day opens the create dialog pre-filled with that date */}
      <CreateViewingDialog
        hideTrigger
        open={!!createFor}
        onOpenChange={(o) => !o && setCreateFor(null)}
        defaultDate={createFor}
        properties={properties}
        propertyId={propFilter !== "all" ? propFilter : undefined}
        onCreated={() => { setCreateFor(null); load(); }} />
    </div>
  );
}
