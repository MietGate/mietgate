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
      schufa_url: r.data.schufa_url || "",
      schufa_text: r.data.schufa_text || "",
      offers: r.data.offers || [],
    })).catch(() => setData({ schufa_url: "", schufa_text: "", offers: [] }));
  }, []);

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const setField = (k) => (e) => setData({ ...data, [k]: e.target.value });
  const setOffer = (i, k) => (e) => {
    const offers = [...data.offers];
    offers[i] = { ...offers[i], [k]: e.target.value };
    setData({ ...data, offers });
  };
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
          <p className="text-muted-foreground mt-1">SCHUFA-Auskunft und Partnerangebote für Bewerber verwalten.</p>
        </div>
        <Button onClick={save} disabled={saving} data-testid="save-partners-btn">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><h2 className="font-display font-bold text-lg">SCHUFA / Bonität</h2></div>
        <div><Label>SCHUFA-Link (Affiliate)</Label><Input value={data.schufa_url} onChange={setField("schufa_url")} placeholder="https://…" className="mt-1.5" data-testid="schufa-url-input" /></div>
        <div><Label>Hinweistext</Label><Input value={data.schufa_text} onChange={setField("schufa_text")} placeholder="Eine aktuelle Bonitätsauskunft…" className="mt-1.5" data-testid="schufa-text-input" /></div>
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
