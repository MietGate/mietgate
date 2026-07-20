import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";

const STATE_OPTS = [
  { v: "required", l: "Pflicht" },
  { v: "optional", l: "Optional" },
  { v: "disabled", l: "Aus" },
];

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display font-bold text-lg mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({
    title: "", internal_name: "", street: "", house_number: "", zip: "", city: "", district: "",
    area: "", rooms: "", bathrooms: "", floor: "", balcony: false, cellar: false, parking: false,
    cold_rent: "", extra_costs: "", warm_rent: "", deposit: "", earliest_move_in: "",
    description: "", internal_notes: "", external_listing_url: "", document_timing: "before",
    status: "active", form_config: {},
  });

  useEffect(() => {
    api.get("/form-fields").then((r) => {
      setFields(r.data.fields);
      if (!isEdit) setForm((f) => ({ ...f, form_config: r.data.default_config }));
    });
    if (isEdit) {
      api.get(`/properties/${id}`).then((r) => {
        const p = r.data;
        setForm({ ...p, area: p.area ?? "", rooms: p.rooms ?? "", bathrooms: p.bathrooms ?? "",
          cold_rent: p.cold_rent ?? "", extra_costs: p.extra_costs ?? "", warm_rent: p.warm_rent ?? "", deposit: p.deposit ?? "" });
        setLoading(false);
      }).catch(() => { toast.error("Objekt nicht gefunden"); navigate("/objekte"); });
    }
  }, [id, isEdit, navigate]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const num = (v) => (v === "" || v == null ? null : Number(v));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      area: num(form.area), rooms: num(form.rooms), bathrooms: num(form.bathrooms),
      cold_rent: num(form.cold_rent), extra_costs: num(form.extra_costs),
      warm_rent: num(form.warm_rent), deposit: num(form.deposit),
    };
    try {
      if (isEdit) { await api.put(`/properties/${id}`, payload); toast.success("Objekt gespeichert"); navigate(`/objekte/${id}`); }
      else { const { data } = await api.post("/properties", payload); toast.success("Objekt erstellt"); navigate(`/objekte/${data.id}`); }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const categories = [...new Set(fields.map((f) => f.category))];

  return (
    <form onSubmit={submit} className="space-y-6 animate-fade-up max-w-3xl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-3xl font-bold">{isEdit ? "Objekt bearbeiten" : "Neues Objekt"}</h1>
      </div>

      <Section title="Basisdaten">
        <div className="grid gap-4">
          <div><Label>Titel der Wohnung *</Label><Input required value={form.title} onChange={set("title")} className="mt-1.5" data-testid="prop-title" placeholder="z.B. Helle 3-Zimmer-Altbauwohnung" /></div>
          <div><Label>Interne Bezeichnung</Label><Input value={form.internal_name} onChange={set("internal_name")} className="mt-1.5" placeholder="nur für Sie sichtbar" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label>Straße</Label><Input value={form.street} onChange={set("street")} className="mt-1.5" /></div>
            <div><Label>Hausnr.</Label><Input value={form.house_number} onChange={set("house_number")} className="mt-1.5" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>PLZ</Label><Input value={form.zip} onChange={set("zip")} className="mt-1.5" /></div>
            <div><Label>Ort</Label><Input value={form.city} onChange={set("city")} className="mt-1.5" /></div>
            <div><Label>Stadtteil</Label><Input value={form.district} onChange={set("district")} className="mt-1.5" /></div>
          </div>
        </div>
      </Section>

      <Section title="Wohnungsdaten">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label>Wohnfläche (m²)</Label><Input type="number" value={form.area} onChange={set("area")} className="mt-1.5" /></div>
          <div><Label>Zimmer</Label><Input type="number" step="0.5" value={form.rooms} onChange={set("rooms")} className="mt-1.5" /></div>
          <div><Label>Badezimmer</Label><Input type="number" value={form.bathrooms} onChange={set("bathrooms")} className="mt-1.5" /></div>
          <div><Label>Etage</Label><Input value={form.floor} onChange={set("floor")} className="mt-1.5" /></div>
        </div>
        <div className="flex flex-wrap gap-6 mt-5">
          {[["balcony", "Balkon/Terrasse"], ["cellar", "Keller"], ["parking", "Stellplatz"]].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} /> {l}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Mietdaten">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label>Kaltmiete (€)</Label><Input type="number" value={form.cold_rent} onChange={set("cold_rent")} className="mt-1.5" /></div>
          <div><Label>Nebenkosten (€)</Label><Input type="number" value={form.extra_costs} onChange={set("extra_costs")} className="mt-1.5" /></div>
          <div><Label>Warmmiete (€)</Label><Input type="number" value={form.warm_rent} onChange={set("warm_rent")} className="mt-1.5" /></div>
          <div><Label>Kaution (€)</Label><Input type="number" value={form.deposit} onChange={set("deposit")} className="mt-1.5" /></div>
        </div>
      </Section>

      <Section title="Weitere Informationen">
        <div className="grid gap-4">
          <div><Label>Frühester Einzugstermin</Label><Input type="date" value={form.earliest_move_in || ""} onChange={set("earliest_move_in")} className="mt-1.5" /></div>
          <div><Label>Beschreibung</Label><Textarea rows={4} value={form.description} onChange={set("description")} className="mt-1.5" placeholder="Öffentlich sichtbare Beschreibung" /></div>
          <div><Label>Interne Notizen</Label><Textarea rows={2} value={form.internal_notes} onChange={set("internal_notes")} className="mt-1.5" placeholder="nur für Sie sichtbar" /></div>
          <div><Label>Externer Inseratslink</Label><Input value={form.external_listing_url} onChange={set("external_listing_url")} className="mt-1.5" placeholder="https://www.immobilienscout24.de/..." /><p className="text-xs text-muted-foreground mt-1">Erscheint als Button „Wohnungsanzeige ansehen" auf der Bewerbungsseite.</p></div>
        </div>
      </Section>

      <Section title="Dokumente & Status">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Wann Dokumente benötigt?</Label>
            <Select value={form.document_timing} onValueChange={(v) => setForm({ ...form, document_timing: v })}>
              <SelectTrigger className="mt-1.5" data-testid="doc-timing"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Vor Besichtigung</SelectItem>
                <SelectItem value="after">Nach Besichtigung</SelectItem>
                <SelectItem value="none">Keine Dokumente über MietGate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
                <SelectItem value="rented">Vermietet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Bewerbungsformular-Builder">
        <p className="text-sm text-muted-foreground mb-4">Legen Sie fest, welche Angaben Bewerber machen müssen.</p>
        <div className="space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
              <div className="space-y-2">
                {fields.filter((f) => f.category === cat).map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-sm">{f.label}</span>
                    <div className="flex rounded-md border border-border overflow-hidden shrink-0" data-testid={`field-${f.key}`}>
                      {STATE_OPTS.map((o) => (
                        <button key={o.v} type="button"
                          onClick={() => setForm({ ...form, form_config: { ...form.form_config, [f.key]: o.v } })}
                          className={`px-2.5 py-1 text-xs font-medium transition-colors ${form.form_config[f.key] === o.v ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary text-muted-foreground"}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex justify-end gap-3 sticky bottom-4">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>Abbrechen</Button>
        <Button type="submit" disabled={saving} data-testid="save-property">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern
        </Button>
      </div>
    </form>
  );
}
