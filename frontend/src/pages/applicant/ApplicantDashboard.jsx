import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, FileText, PartyPopper, ExternalLink, Zap, Wifi, Truck, Sparkles, ShieldCheck } from "lucide-react";

const STATUS_COLOR = {
  neu: "secondary", zusage: "default", absage: "destructive", favorit: "default",
};

const OFFER_ICON = { Strom: Zap, Internet: Wifi, Umzug: Truck, Reinigung: Sparkles, Versicherung: ShieldCheck };

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState(null);
  const [partners, setPartners] = useState(null);

  useEffect(() => {
    api.get("/my/applications").then((r) => setApps(r.data)).catch(() => setApps([]));
    api.get("/partners").then((r) => setPartners(r.data)).catch(() => {});
  }, []);
  if (!apps) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const wonApp = apps.find((a) => a.status === "zusage");

  return (
    <div className="space-y-6 animate-fade-up">
      <div><h1 className="font-display text-3xl font-bold">Hallo, {user?.first_name || "Bewerber"}!</h1><p className="text-muted-foreground mt-1">Ihre laufenden Bewerbungen.</p></div>

      {wonApp && (
        <div className="rounded-2xl border-2 border-primary/30 bg-accent/40 p-6 animate-fade-up" data-testid="congrats-banner">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"><PartyPopper className="h-5 w-5" /></div>
            <div>
              <h2 className="font-display text-xl font-bold">Glückwunsch zur neuen Wohnung! 🎉</h2>
              <p className="text-muted-foreground text-sm mt-1">Sie haben eine Zusage für „{wonApp.property_title}" erhalten. Diese Partnerangebote erleichtern Ihren Start:</p>
            </div>
          </div>
          {partners?.offers?.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              {partners.offers.map((o, i) => {
                const Icon = OFFER_ICON[o.category] || Sparkles;
                return (
                  <a key={i} href={o.url} target="_blank" rel="noreferrer" data-testid={`offer-${o.category}`}
                    className="rounded-xl border border-border bg-card p-4 hover:-translate-y-0.5 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-primary"><Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /></div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <p className="font-semibold mt-3 text-sm">{o.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
                  </a>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">Anzeige · Partnerangebote. MietGate erhält ggf. eine Vermittlungsprovision.</p>
        </div>
      )}

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
