import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CalendarDays, MapPin, Clock, CalendarPlus } from "lucide-react";
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
    const ok = downloadIcs({ title: v.title, start: when, location, description: `Besichtigung: ${v.property_title || ""}` });
    if (ok) toast.success("Kalenderdatei heruntergeladen"); else toast.error("Kein gültiges Datum vorhanden");
  };
  const badge = v.cancelled ? { v: "destructive", t: "Vom Vermieter abgesagt" } : v.my_status === "confirmed" ? { v: "default", t: "Bestätigt" } : v.my_status === "declined" ? { v: "destructive", t: "Abgesagt" } : v.my_status === "reschedule_requested" ? { v: "secondary", t: "Umbuchung angefragt" } : { v: "secondary", t: "Eingeladen" };

  return (
    <div className="rounded-xl border border-border bg-card p-5" data-testid={`myviewing-${v.id}`}>
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
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button size="sm" onClick={() => respond("confirm")} data-testid={`confirm-${v.id}`}>Bestätigen</Button>
          <Button size="sm" variant="outline" onClick={() => respond("reschedule")}>Umbuchung anfragen</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => respond("decline")}>Absagen</Button>
        </div>
      )}
    </div>
  );
}

export default function ApplicantViewings() {
  const [views, setViews] = useState(null);
  const load = () => api.get("/my/viewings").then((r) => setViews(r.data)).catch(() => setViews([]));
  useEffect(() => { load(); }, []);

  if (!views) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div><h1 className="font-display text-3xl font-bold">Meine Termine</h1><p className="text-muted-foreground mt-1">Besichtigungstermine verwalten.</p></div>
      {views.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3" />Keine Termine.
        </div>
      ) : (
        <div className="space-y-3">{views.map((v) => <ViewingCard key={v.id} v={v} onChanged={load} />)}</div>
      )}
    </div>
  );
}
