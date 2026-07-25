import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Loader2, Users, Building2, FileText, CreditCard, TrendingUp, XCircle, LifeBuoy, Clock, AlertTriangle } from "lucide-react";

const Card = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-xl border border-border bg-card p-5" data-testid={`admin-stat-${label.toLowerCase().replace(/[^a-z]/g, "")}`}>
    <div className="flex items-center justify-between">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent || "bg-accent text-primary"}`}><Icon className="h-5 w-5" /></div>
      <span className="font-mono text-3xl font-extrabold">{value}</span>
    </div>
    <p className="text-sm text-muted-foreground mt-3">{label}</p>
  </div>
);

export default function AdminDashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState(false);
  const load = () => { setError(false); setS(null); api.get("/admin/stats").then((r) => setS(r.data)).catch(() => setError(true)); };
  useEffect(() => { load(); }, []);
  if (error) return <p className="text-sm text-destructive py-20 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;
  if (!s) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-up">
      <div><h1 className="font-display text-3xl font-bold">Admin Dashboard</h1><p className="text-muted-foreground mt-1">Steuerung des gesamten SaaS-Betriebs.</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Users} label="Nutzer" value={s.total_users} />
        <Card icon={Building2} label="Vermieter" value={s.landlords} />
        <Card icon={Users} label="Bewerber" value={s.applicants} />
        <Card icon={Building2} label="Aktive Objekte" value={s.active_properties} />
        <Card icon={FileText} label="Bewerbungen" value={s.total_applications} />
        <Card icon={CreditCard} label="Aktive Abos" value={s.active_subscriptions} />
        <Card icon={Clock} label="Im Trial" value={s.trialing_subscriptions} accent="bg-accent text-primary" />
        <Card icon={AlertTriangle} label="Zahlung fehlgeschlagen" value={s.past_due_subscriptions} accent="bg-destructive/15 text-destructive" />
        <Card icon={TrendingUp} label="Monatl. Umsatz (€)" value={s.monthly_revenue} accent="bg-success/15 text-success" />
        <Card icon={XCircle} label="Gekündigte Abos" value={s.cancelled_subscriptions} />
      </div>
      <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-3 max-w-sm">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <div><p className="text-sm text-muted-foreground">Offene Supportfälle</p><p className="font-mono text-2xl font-bold">{s.open_tickets}</p></div>
      </div>
    </div>
  );
}
