import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import {
  Building2, Inbox, FileText, CalendarDays, MessageSquare, Plus, ArrowRight, Loader2, Zap, AlertTriangle, Users
} from "lucide-react";

/* A rotating accent per stat instead of one flat teal everywhere, but pulled from the
   existing brand hue family (teal/gold/navy/green) only — this audience is landlords,
   Hausverwalter and Makler, not a consumer app, so the earlier violet/coral mix read as
   playful-startup rather than trustworthy real-estate software. Same tokens used for
   premium and success elsewhere in the app, just tinted lighter for a chip background. */
const STAT_TONES = [
  "bg-accent text-primary",
  "bg-[hsl(38,70%,93%)] text-[hsl(32,55%,34%)]",
  "bg-[hsl(214,45%,93%)] text-[hsl(214,55%,32%)]",
  "bg-[hsl(142,40%,93%)] text-[hsl(142,45%,26%)]",
];

const StatCard = ({ icon: Icon, label, value, to, tone = 0 }) => {
  const content = (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5 hover:border-primary/40 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all" data-testid={`stat-${label.toLowerCase().replace(/[^a-z]/g, "")}`}>
      <div className="flex items-center justify-between">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${STAT_TONES[tone % STAT_TONES.length]}`}><Icon className="h-5 w-5" /></div>
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

      <OnboardingChecklist />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Aktive Objekte" value={data.active_properties} to="/objekte" tone={0} />
        <StatCard icon={Users} label="Bewerbungen gesamt" value={data.total_applications} to="/bewerbungen" tone={1} />
        <StatCard icon={Inbox} label="Neue Bewerbungen" value={data.new_applications} to="/objekte" tone={2} />
        <StatCard icon={CalendarDays} label="Anstehende Besichtigungen" value={data.upcoming_viewings} tone={3} />
        {/* Dokumente-Kachel bewusst hier draußen gelassen (nicht gelöscht) — wird bald wieder
            gebraucht: <StatCard icon={FileText} label="Dokumente" value={data.open_documents} tone={2} /> */}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card shadow-soft">
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
              /* The whole row is the target — it looked clickable (hover highlight) but wasn't,
                 so the obvious next action from the dashboard was a dead end. */
              <Link key={a.id} to={`/objekte/${a.property_id}?tab=pipeline&open=${a.id}`}
                data-testid={`dashboard-application-${a.id}`}
                className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                <div>
                  <p className="font-medium">{[a.form_data?.vorname, a.form_data?.nachname].filter(Boolean).join(" ") || a.applicant_email}</p>
                  <p className="text-sm text-muted-foreground">{a.property_title}</p>
                </div>
                <Badge variant="secondary">{a.status}</Badge>
              </Link>
            ))}
          </div>
        </div>

        {["active", "trialing"].includes(data.subscription_status) ? (
          <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5">
            <h2 className="font-display font-bold text-lg mb-4">Abo-Status</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-success text-success-foreground">
                {data.subscription_status === "active" ? "Aktiv" : "Testphase"}
              </Badge>
              {data.plan_key && <span className="text-sm text-muted-foreground capitalize">{data.plan_key}</span>}
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /> {data.unread_messages} ungelesene Nachrichten</div>
            </div>
          </div>
        ) : data.subscription_status === "past_due" ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 shadow-soft p-5">
            <h2 className="font-display font-bold text-lg mb-4">Abo-Status</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-destructive text-destructive-foreground">Zahlung fehlgeschlagen</Badge>
              {data.plan_key && <span className="text-sm text-muted-foreground capitalize">{data.plan_key}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
              Aktualisieren Sie Ihre Zahlungsmethode, um Ihre Bewerbungslinks wieder zu aktivieren.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to="/einstellungen?tab=abo">Zahlungsmethode aktualisieren</Link></Button>
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /> {data.unread_messages} ungelesene Nachrichten</div>
            </div>
          </div>
        ) : (
          /* Same dark-card upsell language as the "verifiziertes Mieterprofil" pitch on
             ApplicantDocuments — one visual system for "here's a paid feature" everywhere. */
          <div className="glass-dark hero-glow relative overflow-hidden rounded-2xl text-white p-7 shadow-soft-lg" data-testid="dashboard-premium-upsell">
            <div className="relative flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/15 ring-1 ring-primary/30 text-primary flex items-center justify-center">
                <Zap className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold">Mehr Objekte freischalten</h2>
                <p className="text-sm text-white/70 mt-1.5 leading-relaxed">
                  Objekt anlegen und bearbeiten ist kostenlos. Veröffentlichen Sie Ihren Bewerbungslink
                  mit einem Paket Ihrer Wahl — 3 Tage kostenlos testen, jederzeit kündbar.
                </p>
              </div>
            </div>
            <Link to="/einstellungen?tab=abo" data-testid="dashboard-premium-cta"
              className="relative inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transition-all mt-5">
              Paket wählen
            </Link>
            <div className="relative mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-white/70"><MessageSquare className="h-4 w-4" /> {data.unread_messages} ungelesene Nachrichten</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
