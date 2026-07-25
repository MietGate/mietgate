import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Inbox, FileText, CalendarDays, MessageSquare, Plus, ArrowRight, Loader2
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, to }) => {
  const content = (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors" data-testid={`stat-${label.toLowerCase().replace(/[^a-z]/g, "")}`}>
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary"><Icon className="h-5 w-5" /></div>
        <span className="font-mono text-3xl font-extrabold">{value}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-3">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
};

export default function LandlordDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = () => { setError(false); api.get("/dashboard").then((r) => setData(r.data)).catch(() => setError(true)); };
  useEffect(() => { load(); }, []);

  if (error) return <p className="text-sm text-destructive py-20 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;
  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Willkommen, {user?.first_name || "Vermieter"}!</h1>
          <p className="text-muted-foreground mt-1">Hier ist Ihre Übersicht.</p>
        </div>
        <Button asChild data-testid="dashboard-new-property"><Link to="/objekte/neu"><Plus className="h-4 w-4 mr-1" /> Neues Objekt</Link></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Aktive Objekte" value={data.active_properties} to="/objekte" />
        <StatCard icon={Inbox} label="Neue Bewerbungen" value={data.new_applications} to="/objekte" />
        <StatCard icon={FileText} label="Dokumente" value={data.open_documents} />
        <StatCard icon={CalendarDays} label="Anstehende Besichtigungen" value={data.upcoming_viewings} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display font-bold text-lg">Neueste Bewerbungen</h2>
            <Link to="/objekte" className="text-sm text-primary hover:underline flex items-center gap-1">Alle <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="divide-y divide-border">
            {data.recent_applications.length === 0 && (
              <div className="p-10 text-center text-muted-foreground text-sm">
                Noch keine Bewerbungen. Erstellen Sie ein Objekt und teilen Sie den Bewerbungslink.
              </div>
            )}
            {data.recent_applications.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                <div>
                  <p className="font-medium">{a.form_data?.vorname} {a.form_data?.nachname || a.applicant_email}</p>
                  <p className="text-sm text-muted-foreground">{a.property_title}</p>
                </div>
                <Badge variant="secondary">{a.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display font-bold text-lg mb-4">Abo-Status</h2>
          <div className="flex items-center gap-2">
            <Badge className={data.subscription_status === "active" ? "bg-success text-success-foreground" : ""} variant={data.subscription_status === "active" ? "default" : "secondary"}>
              {data.subscription_status === "active" ? "Aktiv" : "Kein aktives Abo"}
            </Badge>
            {data.plan_key && <span className="text-sm text-muted-foreground capitalize">{data.plan_key}</span>}
          </div>
          {data.subscription_status !== "active" && (
            <>
              <p className="text-sm text-muted-foreground mt-3">Schalten Sie mehr Objekte und Funktionen frei.</p>
              <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/abo">Paket wählen</Link></Button>
            </>
          )}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /> {data.unread_messages} ungelesene Nachrichten</div>
          </div>
        </div>
      </div>
    </div>
  );
}
