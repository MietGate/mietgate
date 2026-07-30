import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CalendarDays, MapPin, Clock, CalendarPlus, ChevronLeft, ChevronRight, List } from "lucide-react";
import { downloadIcs } from "@/lib/ics";

function ViewingCard({ v, onChanged }) {
  const [slot, setSlot] = useState("");
  const respond = async (action) => {
    await api.post(`/viewings/${v.id}/respond`, { action });
    toast.success(action === "confirm" ? "Termin bestätigt" : action === "decline" ? "Termin abgesagt" : "Umbuchung angefragt");
    onChanged();
  };
  const bookSlot = async () => {
    if (!slot) return;
    try { await api.post(`/viewings/${v.id}/book-slot`, { slot_time: slot }); toast.success("Zeitfenster gebucht"); onChanged(); }
    catch (e) { toast.error(e.response?.data?.detail || "Buchung fehlgeschlagen"); }
  };
  const when = v.slot || v.datetime;
  const addToCalendar = () => {
    const location = [v.property_title, v.city].filter(Boolean).join(" · ");
    const ok = downloadIcs({ title: v.title, start: when, durationMinutes: v.duration_minutes || 30, location, description: `Besichtigung: ${v.property_title || ""}` });
    if (ok) toast.success("Kalenderdatei heruntergeladen"); else toast.error("Kein gültiges Datum vorhanden");
  };
  const badge = v.cancelled ? { v: "destructive", t: "Vom Vermieter abgesagt" } : v.my_status === "confirmed" ? { v: "default", t: "Bestätigt" } : v.my_status === "declined" ? { v: "destructive", t: "Abgesagt" } : v.my_status === "reschedule_requested" ? { v: "secondary", t: "Umbuchung angefragt" } : { v: "secondary", t: "Eingeladen" };

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5" data-testid={`myviewing-${v.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{v.title}</h3>
            {v.type === "slots" && <Badge variant="outline">Zeitfenster</Badge>}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" /> {v.property_title} · {v.city}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {v.slot ? new Date(v.slot).toLocaleString("de-DE") : v.datetime ? new Date(v.datetime).toLocaleString("de-DE") : v.type === "slots" ? "Bitte Zeitfenster wählen" : "Termin folgt"}
          </p>
        </div>
        <Badge variant={badge.v}>{badge.t}</Badge>
      </div>

      {when && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={addToCalendar} data-testid={`ics-myviewing-${v.id}`}><CalendarPlus className="h-4 w-4 mr-1" /> Zum Kalender hinzufügen</Button>
        </div>
      )}

      {v.type === "slots" && !v.cancelled && v.my_status !== "declined" && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
          <Select value={slot} onValueChange={setSlot}>
            <SelectTrigger className="max-w-xs" data-testid={`slot-select-${v.id}`}>
              <SelectValue placeholder={v.free_slots?.length ? (v.my_status === "confirmed" ? "Anderes Zeitfenster wählen" : "Freies Zeitfenster wählen") : "Keine freien Zeitfenster"} />
            </SelectTrigger>
            <SelectContent>
              {v.free_slots?.map((s) => <SelectItem key={s} value={s}>{new Date(s).toLocaleString("de-DE")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={bookSlot} disabled={!slot} data-testid={`book-slot-${v.id}`}>
            <Clock className="h-4 w-4 mr-1" /> {v.my_status === "confirmed" ? "Umbuchen" : "Buchen"}
          </Button>
          {v.my_status === "confirmed" && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => respond("decline")}>Absagen</Button>
          )}
        </div>
      )}

      {v.type !== "slots" && !v.cancelled && v.my_status !== "confirmed" && v.my_status !== "declined" && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          <Button size="sm" onClick={() => respond("confirm")} data-testid={`confirm-${v.id}`}>Bestätigen</Button>
          <Button size="sm" variant="outline" onClick={() => respond("reschedule")}>Umbuchung anfragen</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => respond("decline")}>Absagen</Button>
        </div>
      )}
    </div>
  );
}

/* Month grid for the same appointments. Useful once someone is juggling viewings across
   several flats, where a flat list stops answering "what does my week look like". */
function CalendarView({ views, onChanged }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(null);

  const byDay = {};
  for (const v of views) {
    const when = v.slot || v.datetime;
    if (!when) continue;
    const key = new Date(when).toDateString();
    (byDay[key] = byDay[key] || []).push(v);
  }

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // Monday-first: JS getDay() is Sunday-first, so shift it.
  const leading = (first.getDay() + 6) % 7;
  const cells = [...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const today = new Date().toDateString();
  const shift = (delta) => { setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1)); setSelected(null); };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Vorheriger Monat" data-testid="cal-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-semibold">{month.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</p>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Nächster Monat" data-testid="cal-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`x${i}`} />;
            const key = d.toDateString();
            const items = byDay[key] || [];
            return (
              <button key={key} type="button" onClick={() => items.length && setSelected(key)}
                disabled={!items.length} data-testid={`cal-day-${d.getDate()}`}
                className={`aspect-square rounded-md text-sm flex flex-col items-center justify-center transition-colors ${
                  key === today ? "ring-1 ring-primary" : ""} ${
                  items.length ? "bg-accent/60 font-semibold hover:bg-accent cursor-pointer" : "text-muted-foreground"} ${
                  selected === key ? "bg-primary text-primary-foreground" : ""}`}>
                {d.getDate()}
                {items.length > 0 && <span className={`h-1 w-1 rounded-full mt-0.5 ${selected === key ? "bg-primary-foreground" : "bg-primary"}`} />}
              </button>
            );
          })}
        </div>
      </div>
      {/* Selecting a day filters the cards below; without a selection everything stays visible
          so the calendar never hides appointments. */}
      <div className="space-y-3">
        {(selected ? byDay[selected] : views).map((v) => <ViewingCard key={v.id} v={v} onChanged={onChanged} />)}
      </div>
    </div>
  );
}

export default function ApplicantViewings() {
  const [views, setViews] = useState(null);
  const [mode, setMode] = useState("list");
  const load = () => api.get("/my/viewings").then((r) => setViews(r.data)).catch(() => setViews([]));
  useEffect(() => { load(); }, []);

  if (!views) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-3xl font-bold">Meine Termine</h1><p className="text-muted-foreground mt-1">Besichtigungstermine verwalten.</p></div>
        {views.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setMode(mode === "list" ? "calendar" : "list")}
            data-testid="toggle-viewing-mode">
            {mode === "list"
              ? <><CalendarDays className="h-4 w-4 mr-1" /> Kalenderansicht</>
              : <><List className="h-4 w-4 mr-1" /> Listenansicht</>}
          </Button>
        )}
      </div>
      {views.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/50 p-16 text-center text-muted-foreground">
          <div className="h-14 w-14 rounded-2xl bg-accent text-primary flex items-center justify-center mx-auto mb-4"><CalendarDays className="h-6 w-6" /></div>
          Keine Termine.
        </div>
      ) : mode === "calendar" ? (
        <CalendarView views={views} onChanged={load} />
      ) : (
        <div className="space-y-3">{views.map((v) => <ViewingCard key={v.id} v={v} onChanged={load} />)}</div>
      )}
    </div>
  );
}
