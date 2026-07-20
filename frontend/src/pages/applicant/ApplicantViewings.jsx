import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CalendarDays, MapPin } from "lucide-react";

export default function ApplicantViewings() {
  const [views, setViews] = useState(null);

  const load = () => api.get("/my/viewings").then((r) => setViews(r.data)).catch(() => setViews([]));
  useEffect(() => { load(); }, []);

  const respond = async (id, action) => {
    await api.post(`/viewings/${id}/respond`, { action });
    toast.success(action === "confirm" ? "Termin bestätigt" : action === "decline" ? "Termin abgesagt" : "Umbuchung angefragt");
    load();
  };

  if (!views) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div><h1 className="font-display text-3xl font-bold">Meine Termine</h1><p className="text-muted-foreground mt-1">Besichtigungstermine verwalten.</p></div>

      {views.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3" />Keine Termine.
        </div>
      ) : (
        <div className="space-y-3">
          {views.map((v) => (
            <div key={v.id} className="rounded-xl border border-border bg-card p-5" data-testid={`myviewing-${v.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{v.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" /> {v.property_title} · {v.city}</p>
                  <p className="text-sm text-muted-foreground mt-1">{(v.slot || v.datetime) ? new Date(v.slot || v.datetime).toLocaleString("de-DE") : "Termin folgt"}</p>
                </div>
                <Badge variant={v.my_status === "confirmed" ? "default" : v.my_status === "declined" ? "destructive" : "secondary"}>
                  {v.my_status === "confirmed" ? "Bestätigt" : v.my_status === "declined" ? "Abgesagt" : v.my_status === "reschedule_requested" ? "Umbuchung angefragt" : "Eingeladen"}
                </Badge>
              </div>
              {v.my_status !== "confirmed" && v.my_status !== "declined" && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button size="sm" onClick={() => respond(v.id, "confirm")} data-testid={`confirm-${v.id}`}>Bestätigen</Button>
                  <Button size="sm" variant="outline" onClick={() => respond(v.id, "reschedule")}>Umbuchung anfragen</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => respond(v.id, "decline")}>Absagen</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
