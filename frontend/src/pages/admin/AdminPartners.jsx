import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, Link2 } from "lucide-react";

const EMPTY_OFFER = { category: "", name: "", url: "", description: "" };

export default function AdminPartners() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/partners").then((r) => setData({
      bonify_url: r.data.bonify_url || "",
      bonify_text: r.data.bonify_text || "",
      bonify_steps: r.data.bonify_steps?.length ? r.data.bonify_steps : ["", "", ""],
      bonify_is_affiliate: !!r.data.bonify_is_affiliate,
      offers: r.data.offers || [],
    })).catch(() => setData({ bonify_url: "", bonify_text: "", bonify_steps: ["", "", ""], bonify_is_affiliate: false, offers: [] }));
  }, []);

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const setField = (k) => (e) => setData({ ...data, [k]: e.target.value });
  const setOffer = (i, k) => (e) => {
    const offers = [...data.offers];
    offers[i] = { ...offers[i], [k]: e.target.value };
    setData({ ...data, offers });
  };
  const setStep = (i) => (e) => {
    const bonify_steps = [...data.bonify_steps];
    bonify_steps[i] = e.target.value;
    setData({ ...data, bonify_steps });
  };
  const addStep = () => setData({ ...data, bonify_steps: [...data.bonify_steps, ""] });
  const removeStep = (i) => setData({ ...data, bonify_steps: data.bonify_steps.filter((_, idx) => idx !== i) });
  const addOffer = () => setData({ ...data, offers: [...data.offers, { ...EMPTY_OFFER }] });
  const removeOffer = (i) => setData({ ...data, offers: data.offers.filter((_, idx) => idx !== i) });

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/partners", data);
      toast.success("Partner-Links gespeichert");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-8 animate-fade-up" data-testid="admin-partners-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Partner & Affiliate-Links</h1>
          <p className="text-muted-foreground mt-1">Bonitätsauskunft und Partnerangebote für Bewerber verwalten.</p>
        </div>
        <Button onClick={save} disabled={saving} data-testid="save-partners-btn">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><h2 className="font-display font-bold text-lg">Bonitätsauskunft (bonify)</h2></div>
        <p className="text-sm text-muted-foreground">
          Wird Bewerbern auf „Meine Dokumente" als kostenlose Alternative zur SCHUFA angeboten.
          Leere Felder fallen auf die eingebauten Standardwerte zurück.
        </p>
        <div><Label>Link zur Bonitätsauskunft</Label><Input value={data.bonify_url} onChange={setField("bonify_url")} placeholder="https://www.bonify.de/…" className="mt-1.5" data-testid="bonify-url-input" /></div>
        <div><Label>Hinweistext</Label><Input value={data.bonify_text} onChange={setField("bonify_text")} placeholder="bonify stellt eine Bonitätsauskunft für Mieter kostenlos aus…" className="mt-1.5" data-testid="bonify-text-input" /></div>
        <div>
          <Label>Schritte für den Bewerber</Label>
          <div className="space-y-2 mt-1.5">
            {data.bonify_steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-6 w-6 shrink-0 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <Input value={s} onChange={setStep(i)} placeholder={`Schritt ${i + 1}`} data-testid={`bonify-step-${i}`} />
                {data.bonify_steps.length > 1 && (
                  <button onClick={() => removeStep(i)} className="p-2 rounded-md hover:bg-secondary" title="Schritt entfernen"><Trash2 className="h-4 w-4 text-destructive" /></button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={addStep} data-testid="add-bonify-step"><Plus className="h-4 w-4 mr-1" /> Schritt hinzufügen</Button>
        </div>
        {/* Only disclose advertising when there really is a commission — bonify's tenant
            report is free, so a partner agreement may well not exist. */}
        <label className="flex items-start gap-2 text-sm pt-2 border-t border-border">
          <input type="checkbox" className="mt-1" checked={data.bonify_is_affiliate}
            onChange={(e) => setData({ ...data, bonify_is_affiliate: e.target.checked })} data-testid="bonify-affiliate-toggle" />
          <span>Der Link ist ein Partnerlink mit Provision — Werbekennzeichnung („Anzeige") beim Bewerber anzeigen.</span>
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Partnerangebote</h2>
          <Button variant="outline" size="sm" onClick={addOffer} data-testid="add-offer-btn"><Plus className="h-4 w-4 mr-1" /> Angebot hinzufügen</Button>
        </div>
        {data.offers.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Angebote. Fügen Sie ein Partnerangebot hinzu.</p>}
        {data.offers.map((o, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5" data-testid={`offer-row-${i}`}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Kategorie</Label><Input value={o.category} onChange={setOffer(i, "category")} placeholder="Strom / Internet / Umzug…" className="mt-1.5" data-testid={`offer-category-${i}`} /></div>
              <div><Label>Name</Label><Input value={o.name} onChange={setOffer(i, "name")} placeholder="Anbietername" className="mt-1.5" data-testid={`offer-name-${i}`} /></div>
              <div className="sm:col-span-2"><Label>URL (Affiliate-Link)</Label><Input value={o.url} onChange={setOffer(i, "url")} placeholder="https://…" className="mt-1.5" data-testid={`offer-url-${i}`} /></div>
              <div className="sm:col-span-2"><Label>Beschreibung</Label><Input value={o.description} onChange={setOffer(i, "description")} placeholder="Kurzbeschreibung" className="mt-1.5" data-testid={`offer-desc-${i}`} /></div>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeOffer(i)} data-testid={`remove-offer-${i}`}><Trash2 className="h-4 w-4 mr-1" /> Entfernen</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
