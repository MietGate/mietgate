import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Loader2, Users, Building2, FileText, CreditCard, TrendingUp, XCircle, LifeBuoy, Clock, AlertTriangle, MessageSquare, Link2, Zap } from "lucide-react";

const Card = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5" data-testid={`admin-stat-${label.toLowerCase().replace(/[^a-z]/g, "")}`}>
    <div className="flex items-center justify-between">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent || "bg-accent text-primary"}`}><Icon className="h-5 w-5" /></div>
      <span className="font-mono text-3xl font-extrabold">{value}</span>
    </div>
    <p className="text-sm text-muted-foreground mt-3">{label}</p>
  </div>
);

const RANGES = [{ days: 7, label: "7 Tage" }, { days: 30, label: "30 Tage" }, { days: 90, label: "90 Tage" }, { days: 0, label: "Gesamt" }];

// Same brand hue family (teal/gold/navy/green) as the dashboard's stat-card tones, so each
// funnel step reads as a distinct stage instead of one flat color from top to bottom.
const FUNNEL_BAR = ["bg-primary", "bg-[hsl(38,75%,50%)]", "bg-[hsl(214,55%,45%)]", "bg-success"];

function Funnel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/admin/funnel?days=${days}`).then((r) => setData(r.data)).catch(() => setData(false));
  }, [days]);

  const steps = (t) => [
    { label: "Registriert", value: t.registered },
    { label: "Objekt angelegt", value: t.with_property },
    { label: "Checkout gestartet", value: t.checkout_started },
    { label: "Bezahlt", value: t.paid },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5 space-y-4" data-testid="admin-funnel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg">Vermieter-Trichter</h2>
          <p className="text-sm text-muted-foreground">Von der Registrierung bis zur Zahlung.</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)} data-testid={`funnel-range-${r.days}`}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                days === r.days ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {data === false && <p className="text-sm text-destructive">Trichter konnte nicht geladen werden.</p>}
      {data === null && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {data && (
        <>
          <div className="space-y-2">
            {steps(data.total).map((st, i) => {
              const base = data.total.registered || 1;
              const pct = Math.round((st.value / base) * 100);
              return (
                <div key={st.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{st.label}</span>
                    <span className="text-muted-foreground"><span className="font-mono font-bold text-foreground">{st.value}</span> · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${FUNNEL_BAR[i % FUNNEL_BAR.length]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {data.by_source.length > 0 && (
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Nach Herkunft</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="pb-2 pr-4 font-medium">Quelle</th>
                      <th className="pb-2 px-2 font-medium text-right">Registriert</th>
                      <th className="pb-2 px-2 font-medium text-right">Objekt</th>
                      <th className="pb-2 px-2 font-medium text-right">Checkout</th>
                      <th className="pb-2 pl-2 font-medium text-right">Bezahlt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.by_source.map((r) => (
                      <tr key={r.source} data-testid={`funnel-source-${r.source}`}>
                        <td className="py-2 pr-4 font-medium">{r.source}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.registered}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.with_property}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.checkout_started}</td>
                        <td className="py-2 pl-2 text-right tabular-nums font-semibold text-success">{r.paid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Herkunft kommt aus dem <code>?ref=</code>-Parameter im Link. Ohne Parameter zählt „direkt".
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CampaignStats() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/admin/campaign-stats").then((r) => setCampaigns(r.data.campaigns)).catch((e) => {
      console.error("Campaign stats error:", e.response?.status, e.response?.data?.detail);
      setError(true);
    });
  }, []);

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5 space-y-4" data-testid="admin-campaign-stats">
      <div>
        <h2 className="font-display font-bold text-lg">Outreach-Kampagnen</h2>
        <p className="text-sm text-muted-foreground">Klicks auf Links mit ?ref= Parametern</p>
      </div>

      {error && <p className="text-sm text-destructive">Statistik konnte nicht geladen werden.</p>}
      {!campaigns && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {campaigns && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 pr-4 font-medium">Kampagne</th>
                <th className="pb-2 pl-2 font-medium text-right">Klicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.length === 0 ? (
                <tr><td colSpan="2" className="py-4 text-center text-muted-foreground text-xs">Noch keine Klicks</td></tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.ref} data-testid={`campaign-${camp.ref}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                        <code className="text-xs bg-secondary px-2 py-1 rounded">{camp.ref}</code>
                      </div>
                    </td>
                    <td className="py-3 pl-2 text-right tabular-nums font-semibold text-primary">{camp.clicks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LinkStats() {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/admin/link-stats").then((r) => setLinks(r.data.links)).catch(() => setError(true));
  }, []);

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5 space-y-4" data-testid="admin-link-stats">
      <div>
        <h2 className="font-display font-bold text-lg">Bewerbungslinks — Nachrichten-Klicks</h2>
        <p className="text-sm text-muted-foreground">Welche Links führen zu den meisten Anfragen?</p>
      </div>

      {error && <p className="text-sm text-destructive">Statistik konnte nicht geladen werden.</p>}
      {!links && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {links && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 pr-4 font-medium">Wohnung</th>
                <th className="pb-2 px-2 font-medium text-right">Bewerber</th>
                <th className="pb-2 pl-2 font-medium text-right">Nachrichten</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {links.length === 0 ? (
                <tr><td colSpan="3" className="py-4 text-center text-muted-foreground text-xs">Noch keine Daten</td></tr>
              ) : (
                links.map((link) => (
                  <tr key={link.property_id} data-testid={`link-stat-${link.application_code}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{link.title}</p>
                          <p className="text-xs text-muted-foreground">{link.city || "Ort unbekannt"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums font-semibold">{link.applicant_count}</td>
                    <td className="py-3 pl-2 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span className="font-semibold text-success">{link.message_count}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState(false);
  const load = () => { setError(false); setS(null); api.get("/admin/stats").then((r) => setS(r.data)).catch(() => setError(true)); };
  useEffect(() => { load(); }, []);
  if (error) return <p className="text-sm text-destructive py-20 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;
  if (!s) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-up">
      <div><h1 className="font-display text-3xl font-bold">Übersicht</h1><p className="text-muted-foreground mt-1">Steuerung des gesamten SaaS-Betriebs.</p></div>
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
      <Funnel />
      <CampaignStats />
      <LinkStats />
      <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5 flex items-center gap-3 max-w-sm">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <div><p className="text-sm text-muted-foreground">Offene Supportfälle</p><p className="font-mono text-2xl font-bold">{s.open_tickets}</p></div>
      </div>
    </div>
  );
}
