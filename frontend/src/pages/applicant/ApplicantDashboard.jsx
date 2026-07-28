import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Inbox, FileText, PartyPopper, ExternalLink, Zap, Wifi, Truck, Sparkles, ShieldCheck, Crown, Check, Copy, Link2, Mail, Phone, UserCheck, X, Undo2, Clock } from "lucide-react";

const STATUS_COLOR = {
  neu: "secondary", zusage: "default", absage: "destructive", favorit: "default",
};

const OFFER_ICON = { Strom: Zap, Internet: Wifi, Umzug: Truck, Reinigung: Sparkles, Versicherung: ShieldCheck };

const PREMIUM_PERKS = [
  "Angaben & Dokumente einmal hinterlegen, nie wieder neu hochladen",
  "Automatisch übernommen bei jeder weiteren MietGate-Bewerbung",
  "Profil-Link auch für Vermieter außerhalb von MietGate",
  "Zeigen Sie: Ihre Unterlagen liegen bereits vollständig vor",
];

function PremiumCard() {
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [withdrawalConsent, setWithdrawalConsent] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelScheduled, setCancelScheduled] = useState(false);

  const buyPremium = async () => {
    if (!withdrawalConsent) return;
    setLoading(true);
    try {
      const { data } = await api.post("/premium/checkout", { origin_url: window.location.origin, withdrawal_consent: withdrawalConsent });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
      setLoading(false);
    }
  };

  const manageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post("/premium/billing-portal", { origin_url: window.location.origin });
      window.location.href = data.portal_url;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
      setPortalLoading(false);
    }
  };

  const cancelPremium = async () => {
    if (!window.confirm("Bewerber-Premium wirklich kündigen? Ihr Profil-Link bleibt bis zum Ende der aktuellen Abrechnungsperiode aktiv.")) return;
    setCanceling(true);
    try {
      await api.post("/premium/cancel");
      toast.success("Kündigung vorgemerkt. Premium bleibt bis zum Ende der Abrechnungsperiode aktiv.");
      setCancelScheduled(true);
      refresh?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setCanceling(false);
    }
  };

  if (user?.premium) {
    return (
      <div className="rounded-2xl border-2 border-premium/40 bg-premium/10 p-6" data-testid="premium-active-banner">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-premium text-premium-foreground flex items-center justify-center shrink-0 shadow-md shadow-premium/30"><Crown className="h-5 w-5" /></div>
            <div>
              <h2 className="font-display text-xl font-bold">Premium aktiv 👑</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {cancelScheduled ? "Gekündigt — bleibt bis zum Periodenende aktiv." : "Ihre Angaben sind gespeichert und werden bei jeder weiteren MietGate-Bewerbung automatisch übernommen."}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" disabled={portalLoading} onClick={manageBilling} data-testid="premium-manage-billing">
              {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Zahlungsmethode verwalten"}
            </Button>
            {!cancelScheduled && (
              <Button size="sm" variant="ghost" disabled={canceling} onClick={cancelPremium} data-testid="premium-cancel">
                {canceling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Kündigen"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-dark hero-glow relative overflow-hidden rounded-2xl text-white p-7 shadow-soft-lg" data-testid="premium-upsell">
      <div className="relative flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-premium/15 ring-1 ring-premium/30 text-premium flex items-center justify-center">
          <Crown className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-lg font-bold">Ihr Profil, einmal ausgefüllt</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-premium bg-premium/15 ring-1 ring-premium/30 px-2 py-0.5 rounded-full">Premium</span>
          </div>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            Ihre Angaben und Dokumente werden einmal gespeichert und bei jeder weiteren Bewerbung auf
            MietGate automatisch übernommen — nichts wird erneut hochgeladen. Zusätzlich können Sie Ihr
            Profil auch Vermietern außerhalb von MietGate schicken und zeigen, dass Ihre Unterlagen
            bereits vollständig vorliegen.
          </p>
        </div>
      </div>

      <div className="relative grid sm:grid-cols-2 gap-3 mt-5">
        {PREMIUM_PERKS.map((p, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm text-white/80">
            <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3 w-3" />
            </div>
            {p}
          </div>
        ))}
      </div>

      <div className="relative flex flex-wrap items-center gap-4 mt-6 pt-5 border-t border-white/10">
        <Button onClick={buyPremium} disabled={loading || !withdrawalConsent} data-testid="buy-premium-btn"
          className="bg-premium hover:bg-premium/90 text-premium-foreground shadow-md shadow-premium/20 hover:shadow-premium/30 transition-all">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />} Profil aktivieren – 4,99 €/Monat
        </Button>
        <p className="text-[11px] text-white/50">Preis inkl. MwSt. Monatlich kündbar.</p>
      </div>

      <label className="relative flex items-start gap-2 mt-4 text-xs text-white/60 cursor-pointer" data-testid="premium-withdrawal-consent-label">
        <Checkbox checked={withdrawalConsent} onCheckedChange={setWithdrawalConsent} className="mt-0.5" data-testid="premium-withdrawal-consent-checkbox" />
        <span>
          Ich stimme zu, dass die Leistung sofort beginnt, und nehme zur Kenntnis, dass ich dadurch mein{" "}
          <Link to="/widerruf" target="_blank" rel="noreferrer" className="underline hover:text-white">Widerrufsrecht</Link> mit vollständiger Vertragserfüllung verliere.
        </span>
      </label>
    </div>
  );
}

function ProfileLinkCard() {
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/my/profile-link").then((r) => setLink(r.data.url)).catch(() => {});
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Profil-Link kopiert");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!link) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6" data-testid="profile-link-card">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center text-primary shrink-0"><Link2 className="h-5 w-5" /></div>
        <div>
          <h2 className="font-display text-xl font-bold">Ihr Profil-Link</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Schicken Sie diesen Link bei Wohnungsanfragen mit. Vermieter sehen, welche Dokumente vorliegen — Sie entscheiden bei jeder Anfrage selbst, ob Sie diese freigeben.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <input readOnly value={link} className="flex-1 min-w-0 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground" data-testid="profile-link-input" />
        <Button onClick={copy} variant="outline" data-testid="copy-profile-link">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function InquiriesList() {
  const [inquiries, setInquiries] = useState(null);
  const [responding, setResponding] = useState(null);

  const load = () => api.get("/my/profile-inquiries").then((r) => setInquiries(r.data)).catch(() => setInquiries([]));
  useEffect(() => { load(); }, []);

  const respond = async (id, action) => {
    setResponding(id);
    try {
      await api.post(`/my/profile-inquiries/${id}/respond`, { action });
      toast.success(action === "grant" ? "Dokumente freigegeben" : "Anfrage abgelehnt");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setResponding(null);
    }
  };

  const revoke = async (id) => {
    setResponding(id);
    try {
      await api.post(`/my/profile-inquiries/${id}/revoke`);
      toast.success("Freigabe widerrufen — der Link funktioniert nicht mehr.");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setResponding(null);
    }
  };

  if (!inquiries || inquiries.length === 0) return null;
  const pending = inquiries.filter((i) => i.status === "pending");
  const resolved = inquiries.filter((i) => i.status !== "pending");
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("de-DE") : null);

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6" data-testid="inquiries-card">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center text-primary shrink-0"><UserCheck className="h-5 w-5" /></div>
        <h2 className="font-display text-xl font-bold">Anfragen von Vermietern</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-3">
        Eine Freigabe umfasst genau die Dokumente, die Sie zu diesem Zeitpunkt hinterlegt haben,
        gilt 14 Tage und lässt sich jederzeit widerrufen.
      </p>
      <div className="mt-5 space-y-3">
        {pending.map((i) => (
          <div key={i.id} className="rounded-xl border border-border bg-secondary/30 p-4" data-testid={`inquiry-${i.id}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                {i.property_label && <p className="font-semibold text-sm">{i.property_label}</p>}
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  {i.contact_email ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />} {i.contact_email || i.contact_phone}
                </p>
                {i.message && <p className="text-sm mt-2">{i.message}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" disabled={responding === i.id} onClick={() => respond(i.id, "grant")} data-testid={`grant-${i.id}`}>
                  {responding === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />} Dokumente freigeben
                </Button>
                <Button size="sm" variant="outline" disabled={responding === i.id} onClick={() => respond(i.id, "decline")} data-testid={`decline-${i.id}`}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {resolved.slice(0, 5).map((i) => {
          const expired = i.status === "granted" && !i.share_active;
          const label = i.share_active ? `Freigegeben bis ${fmtDate(i.share_expires_at)}`
            : expired ? "Abgelaufen" : i.status === "revoked" ? "Widerrufen" : "Abgelehnt";
          return (
            <div key={i.id} className={`rounded-xl border border-border/60 p-4 ${i.share_active ? "" : "opacity-70"}`} data-testid={`inquiry-${i.id}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm text-muted-foreground">{i.property_label || (i.contact_email || i.contact_phone)}</p>
                  {i.share_active && i.share_url && (
                    <>
                      <a href={i.share_url} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">Freigabe-Link ansehen</a>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" /> {i.shared_document_count} Dokument{i.shared_document_count === 1 ? "" : "e"} · läuft am {fmtDate(i.share_expires_at)} automatisch ab
                      </p>
                    </>
                  )}
                  {expired && <p className="text-xs text-muted-foreground mt-1">Der Link ist abgelaufen und funktioniert nicht mehr.</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={i.share_active ? "default" : "secondary"}>{label}</Badge>
                  {i.share_active ? (
                    <Button size="sm" variant="outline" disabled={responding === i.id} onClick={() => revoke(i.id)} data-testid={`revoke-${i.id}`}>
                      {responding === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><X className="h-3.5 w-3.5 mr-1" /> Widerrufen</>}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={responding === i.id} onClick={() => respond(i.id, "grant")} data-testid={`regrant-${i.id}`}>
                      {responding === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Undo2 className="h-3.5 w-3.5 mr-1" /> Erneut freigeben</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

      {user?.premium && (
        <div className="grid md:grid-cols-2 gap-6">
          <ProfileLinkCard />
          <InquiriesList />
        </div>
      )}

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
                    className="rounded-2xl border border-border/70 bg-card shadow-soft p-4 hover:-translate-y-0.5 hover:shadow-md transition-all group">
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
            <Link key={a.id} to={`/bewerber/bewerbung/${a.id}`} data-testid={`my-app-${a.id}`}
              className="rounded-2xl border border-border/70 bg-card shadow-soft p-5 flex flex-wrap items-center justify-between gap-3 hover:border-primary/40 hover:bg-secondary/30 transition-colors">
              <div>
                <h3 className="font-semibold">{a.property_title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {a.document_count} Dokumente</span>
                  <span>Beworben am {new Date(a.created_at).toLocaleDateString("de-DE")}</span>
                </div>
              </div>
              <Badge variant={STATUS_COLOR[a.status] || "secondary"}>{a.status_label}</Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Below the applications on purpose: the upsell used to push the applicant's own
          running applications — the reason they came here — below the fold. */}
      <PremiumCard />
    </div>
  );
}
