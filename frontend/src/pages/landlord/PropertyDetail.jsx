import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Viewings } from "@/components/Viewings";
import { PropertyImages } from "@/components/PropertyImages";
import { PricingSection } from "@/components/PricingSection";
import { InseratTemplates } from "@/components/InseratTemplates";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Copy, RefreshCw, ExternalLink, Loader2, MapPin, Link2, Check, Lock, CreditCard, Zap, Trash2, Users, Gift
} from "lucide-react";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prop, setProp] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [choosingPlan, setChoosingPlan] = useState(false);
  const [addonCheckingOut, setAddonCheckingOut] = useState(false);
  const [addonConsent, setAddonConsent] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = () => api.get(`/properties/${id}`).then((r) => setProp(r.data)).catch(() => { toast.error("Objekt nicht gefunden"); navigate("/objekte"); });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* The URL is the single source of truth for the active tab, so deep links from elsewhere
     (onboarding, the handover block) still switch tabs after the landlord has clicked around.
     Bewerber/Pipeline lives on /bewerbungen now, not as a tab here. */
  const tab = prop ? (searchParams.get("tab") || "link") : null;

  if (!prop) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const setTab = (v) => {
    const next = new URLSearchParams(searchParams); next.set("tab", v);
    setSearchParams(next, { replace: true });
  };

  const appLink = `${window.location.origin}/b/${prop.application_code}`;
  const copy = () => { navigator.clipboard.writeText(appLink); setCopied(true); toast.success("Link kopiert"); setTimeout(() => setCopied(false), 2000); };
  const deactivate = async () => { const { data } = await api.post(`/properties/${id}/link/toggle`); setProp({ ...prop, link_active: data.link_active }); };
  const regen = async () => { const { data } = await api.post(`/properties/${id}/link/regenerate`); setProp({ ...prop, application_code: data.application_code }); toast.success("Neuer Link generiert"); };

  const activate = async () => {
    setActivating(true);
    try {
      const { data } = await api.post(`/properties/${id}/link/activate`, {});
      if (data.activated) { setProp(data.property); toast.success("Bewerbungslink aktiviert"); }
      else if (data.needs_payment) { setPlanPickerOpen(true); }
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setActivating(false); }
  };

  const choosePlan = async (plan, interval, withdrawalConsent) => {
    if (plan.key === "enterprise" || plan.key === "whitelabel") {
      toast.info("Bitte kontaktieren Sie uns unter support@mietgate.de"); return;
    }
    if (choosingPlan) return;
    setChoosingPlan(true);
    try {
      const { data } = await api.post(`/properties/${id}/link/activate`, {
        plan_key: plan.key, interval, origin_url: window.location.origin, withdrawal_consent: !!withdrawalConsent,
      });
      if (data.checkout_url) { window.location.href = data.checkout_url; return; }
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    setChoosingPlan(false);
  };

  const deleteProperty = async () => {
    if (!window.confirm(`"${prop.title}" wirklich unwiderruflich löschen? Alle Bewerbungen, Dokumente, Termine und Bilder zu diesem Objekt werden ebenfalls gelöscht. Dies kann nicht rückgängig gemacht werden.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/properties/${id}`);
      toast.success("Objekt gelöscht");
      navigate("/objekte");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setDeleting(false); }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post("/subscription/billing-portal", { origin_url: window.location.origin });
      window.location.href = data.portal_url;
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setPortalLoading(false); }
  };

  const bookAddon = async () => {
    if (!addonConsent) { toast.error("Bitte stimmen Sie den Bedingungen zu"); return; }
    setAddonCheckingOut(true);
    try {
      const { data } = await api.post(`/properties/${id}/addon/checkout`, {
        origin_url: window.location.origin, withdrawal_consent: true,
      });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setAddonCheckingOut(false); }
  };

  const paymentLocked = !!prop.link_deactivated_by_payment;

  const Row = ({ label, value }) => value != null && value !== "" ? (
    <div className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span>
    </div>
  ) : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/objekte")} className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="font-display text-2xl font-bold">{prop.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[prop.street, prop.house_number, prop.zip, prop.city].filter(Boolean).join(" ") || "Keine Adresse"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Bewerber-Pipeline lebt jetzt zentral unter Bewerbungen, nicht mehr als Tab hier —
              dieser Link filtert sie direkt auf dieses Objekt. */}
          <Button asChild data-testid="view-applicants-link">
            <Link to={`/bewerbungen?view=kanban&property=${id}`}>
              <Users className="h-4 w-4 mr-1.5" /> Bewerber ansehen ({prop.application_count})
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="edit-property"><Link to={`/objekte/${id}/bearbeiten`}><Pencil className="h-4 w-4 mr-1" /> Bearbeiten</Link></Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={deleteProperty} disabled={deleting} data-testid="delete-property-btn">
            {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />} Löschen
          </Button>
        </div>
      </div>

      {paymentLocked && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex flex-wrap items-center justify-between gap-3" data-testid="payment-locked-banner">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-sm">Zugriff eingeschränkt — Zahlung fehlgeschlagen</p>
              <p className="text-sm text-muted-foreground">Ihr Bewerbungslink wurde deaktiviert. Ihre Bewerberdaten bleiben erhalten, sind aber gesperrt, bis die Zahlung aktualisiert ist.</p>
            </div>
          </div>
          <Button onClick={openBillingPortal} disabled={portalLoading} data-testid="update-payment-btn">
            {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />} Zahlungsmethode aktualisieren
          </Button>
        </div>
      )}

      <Tabs key={prop.id} value={tab} onValueChange={setTab}>
        <TabsList className="w-full h-auto justify-start gap-1 p-1.5">
          <TabsTrigger value="link" data-testid="tab-link" className="px-5 py-2 text-base">Bewerbungslink</TabsTrigger>
          <TabsTrigger value="viewings" data-testid="tab-viewings" className="px-5 py-2 text-base">Besichtigungen</TabsTrigger>
          <TabsTrigger value="images" data-testid="tab-images" className="px-5 py-2 text-base">Bilder</TabsTrigger>
          <TabsTrigger value="addons" data-testid="tab-addons" className="px-5 py-2 text-base">Add-ons</TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-overview" className="px-5 py-2 text-base">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="mt-6">
          {prop.link_active ? (
            <>
              <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6 max-w-2xl">
                <div className="flex items-center gap-2 mb-2"><Link2 className="h-5 w-5 text-primary" /><h2 className="font-display font-bold text-lg">Ihr Bewerbungslink</h2></div>
                <p className="text-sm text-muted-foreground mb-4">Teilen Sie diesen Link auf ImmoScout, Kleinanzeigen, Social Media oder Ihrer Website. Keine Adresse sichtbar, sicher & teilbar.</p>
                <div className="flex gap-2">
                  <div className="flex-1 font-mono text-sm bg-secondary rounded-md px-4 py-3 truncate flex items-center" data-testid="app-link">{appLink}</div>
                  <Button onClick={copy} data-testid="copy-link">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-5 border-t border-border">
                  <label className="flex items-center gap-3 text-sm">
                    <Switch checked={prop.link_active} onCheckedChange={deactivate} data-testid="toggle-link" />
                    Link {prop.link_active ? "aktiv" : "deaktiviert"}
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground"><b className="font-mono">{prop.application_count}</b> Bewerbungen</span>
                    <Button variant="outline" size="sm" onClick={regen} data-testid="regen-link"><RefreshCw className="h-4 w-4 mr-1" /> Neu generieren</Button>
                  </div>
                </div>
                <div className="mt-5 pt-5 border-t border-border">
                  <Button variant="ghost" size="sm" asChild><a href={appLink} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Bewerbungsseite ansehen</a></Button>
                </div>
              </div>
              {/* Copying a snippet is the only observable signal that the link made it into
                  a listing, so it also completes the matching onboarding step. */}
              <InseratTemplates property={prop} appLink={appLink}
                onCopied={() => api.post("/onboarding/flag", { key: "inserat_kopiert" }).catch(() => {})} />
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card p-8 max-w-2xl text-center" data-testid="link-activate-panel">
              <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
              <h2 className="font-display font-bold text-lg">Bewerbungslink aktivieren</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                {paymentLocked
                  ? "Der Link wurde wegen einer fehlgeschlagenen Zahlung deaktiviert — aktualisieren Sie oben Ihre Zahlungsmethode, um ihn wieder freizuschalten."
                  : "Objekt anlegen und bearbeiten ist kostenlos. Erst wenn Sie den Bewerbungslink veröffentlichen, wählen Sie ein Paket — mit 3 Tagen kostenlosem Test."}
              </p>
              {!paymentLocked && (
                <Button onClick={activate} disabled={activating} data-testid="activate-link-btn">
                  {activating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />} Bewerbungslink aktivieren
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="viewings" className="mt-6"><Viewings propertyId={id} property={prop} /></TabsContent>

        <TabsContent value="images" className="mt-6"><PropertyImages property={prop} onChanged={load} /></TabsContent>

        <TabsContent value="addons" className="mt-6">
          <div className="max-w-2xl">
            {prop.addon_bewerberauswahl_booked ? (
              <div className="rounded-2xl border border-green-500/40 bg-green-500/5 p-6">
                <div className="flex items-center gap-3 mb-2"><Check className="h-5 w-5 text-green-600" /><h3 className="font-display font-bold text-lg">Bewerberauswahl-Addon aktiv</h3></div>
                <p className="text-sm text-muted-foreground">Das Addon wurde erfolgreich gebucht. Unser Team wird sich in Kürze bei Ihnen melden.</p>
                {prop.addon_bewerberauswahl_booking_date && (
                  <p className="text-xs text-muted-foreground mt-3">Gebucht am {new Date(prop.addon_bewerberauswahl_booking_date).toLocaleDateString("de-DE")}</p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6">
                <div className="flex items-center gap-3 mb-2"><Gift className="h-5 w-5 text-primary" /><h3 className="font-display font-bold text-lg">Bewerberauswahl & Terminvergabe</h3></div>
                <p className="text-sm text-muted-foreground mb-4">
                  Lassen Sie uns die Bewerberauswahl übernehmen. Wir verwalten die Bewerbungen, wählen die besten aus und vergeben Besichtigungstermine mit den Bewerbern. Sie führen nur noch die Besichtigungen durch.
                </p>
                <ul className="text-sm space-y-2 mb-6">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Bewerbungen sichten & auswählen</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Termine mit Bewerbern abstimmen</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Sie führen nur Besichtigungen durch</li>
                </ul>
                <div className="bg-secondary rounded-lg p-4 mb-6">
                  <p className="text-lg font-bold">49 € <span className="text-sm font-normal text-muted-foreground">einmalig</span></p>
                  <p className="text-xs text-muted-foreground mt-1">+ Besichtigungstermine auf Anfrage</p>
                </div>
                <label className="flex items-start gap-3 text-sm mb-6 cursor-pointer">
                  <input type="checkbox" checked={addonConsent} onChange={(e) => setAddonConsent(e.target.checked)} className="mt-1" />
                  <span className="text-muted-foreground">
                    Ich bestätige, dass die Leistung sofort nach Zahlung beginnt und ich mein <strong>Widerrufsrecht</strong> damit verliere.
                  </span>
                </label>
                <Button onClick={bookAddon} disabled={!addonConsent || addonCheckingOut} className="w-full">
                  {addonCheckingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
                  Addon jetzt buchen
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
            <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6">
              <h3 className="font-display font-bold mb-3">Wohnung</h3>
              <Row label="Wohnfläche" value={prop.area && `${prop.area} m²`} />
              <Row label="Zimmer" value={prop.rooms} />
              <Row label="Badezimmer" value={prop.bathrooms} />
              <Row label="Etage" value={prop.floor} />
              <Row label="Balkon/Terrasse" value={prop.balcony ? "Ja" : null} />
              <Row label="Keller" value={prop.cellar ? "Ja" : null} />
              <Row label="Stellplatz" value={prop.parking ? "Ja" : null} />
            </div>
            <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6">
              <h3 className="font-display font-bold mb-3">Miete</h3>
              <Row label="Kaltmiete" value={prop.cold_rent && `${prop.cold_rent} €`} />
              <Row label="Nebenkosten" value={prop.extra_costs && `${prop.extra_costs} €`} />
              <Row label="Warmmiete" value={prop.warm_rent && `${prop.warm_rent} €`} />
              <Row label="Kaution" value={prop.deposit && `${prop.deposit} €`} />
              <Row label="Frühester Einzug" value={prop.earliest_move_in} />
            </div>
            {prop.description && (
              <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-6 md:col-span-2">
                <h3 className="font-display font-bold mb-2">Beschreibung</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prop.description}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={planPickerOpen} onOpenChange={setPlanPickerOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paket wählen — 3 Tage kostenlos testen</DialogTitle>
            <p className="text-sm text-muted-foreground">Ihre Zahlungsmethode wird hinterlegt, aber erst nach 3 Tagen belastet. Jederzeit vorher kündbar.</p>
          </DialogHeader>
          <PricingSection onSelect={choosePlan} ctaLabel="Trial starten" disabled={choosingPlan} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
