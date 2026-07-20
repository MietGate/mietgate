import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, FileText, CalendarDays } from "lucide-react";

const STATUS_COLOR = {
  neu: "secondary", zusage: "default", absage: "destructive", favorit: "default",
};

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState(null);

  useEffect(() => { api.get("/my/applications").then((r) => setApps(r.data)).catch(() => setApps([])); }, []);
  if (!apps) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div><h1 className="font-display text-3xl font-bold">Hallo, {user?.first_name || "Bewerber"}!</h1><p className="text-muted-foreground mt-1">Ihre laufenden Bewerbungen.</p></div>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-display font-bold text-lg mt-4">Noch keine Bewerbungen</h3>
          <p className="text-muted-foreground mt-1">Bewerben Sie sich über einen MietGate-Bewerbungslink.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3" data-testid={`my-app-${a.id}`}>
              <div>
                <h3 className="font-semibold">{a.property_title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {a.document_count} Dokumente</span>
                  <span>Beworben am {new Date(a.created_at).toLocaleDateString("de-DE")}</span>
                </div>
              </div>
              <Badge variant={STATUS_COLOR[a.status] || "secondary"}>{a.status_label}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
