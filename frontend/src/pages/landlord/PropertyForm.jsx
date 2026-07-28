import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { validateFile } from "@/lib/validateFile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Save, AlertTriangle, ImagePlus, Trash2 } from "lucide-react";

const DOC_TYPES = ["Bonitätsauskunft", "Gehaltsnachweise", "Arbeitsvertrag", "Ausweis", "Aufenthaltstitel", "Mietschuldenfreiheitsbescheinigung", "Bürgschaft", "Sonstiges"];

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

/* Only `title` is required server-side, so every other field is flagged as optional. */
function FieldLabel({ children, required }) {
  return (
    <Label>
      {children}
      {required
        ? <span className="text-primary ml-0.5">*</span>
        : <span className="text-muted-foreground font-normal ml-1.5 text-xs">(optional)</span>}
    </Label>
  );
}

/* Numeric input with the unit shown inside the field, for values that must stay exact. */
function NumberField({ label, unit, value, onChange, ...rest }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative mt-1.5">
        <Input type="number" value={value} onChange={onChange} className={unit ? "pr-10" : ""} {...rest} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{unit}</span>}
      </div>
    </div>
  );
}

/* Slider for small, coarse ranges where dragging beats typing. */
function SliderField({ label, value, onValueChange, min, max, step, format }) {
  const current = value === "" || value == null ? null : Number(value);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-sm font-medium tabular-nums">{current == null ? "—" : format(current)}</span>
      </div>
      <Slider className="mt-3" min={min} max={max} step={step}
        value={[current ?? min]} onValueChange={([v]) => onValueChange(v)} />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
        <span>{format(min)}</span><span>{format(max)}+</span>
      </div>
    </div>
  );
}

const WIZARD_STEPS = ["Basisdaten", "Wohnungsdaten", "Mietdaten", "Weitere Informationen", "Bilder", "Formular-Builder", "Zusammenfassung"];

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [step, setStep] = useState(0);
  const [imageFiles, setImageFiles] = useState([]); // { file, previewUrl } — uploaded only after the property exists
  const imageInputRef = useRef(null);
  const [warmRentTouched, setWarmRentTouched] = useState(false);
  const [form, setForm] = useState({
    title: "", internal_name: "", street: "", house_number: "", zip: "", city: "", district: "",
    area: "", rooms: "", bathrooms: "", floor: "", balcony: false, cellar: false, parking: false,
    cold_rent: "", extra_costs: "", warm_rent: "", deposit: "", earliest_move_in: "",
    description: "", internal_notes: "", external_listing_url: "", document_timing: "after",
    required_documents: [], status: "active", form_config: {},
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
        // A stored Warmmiete is the landlord's own figure — editing Kaltmiete later must not
        // silently recalculate over it.
        if (p.warm_rent != null && p.warm_rent !== "") setWarmRentTouched(true);
        setLoading(false);
      }).catch(() => { toast.error("Objekt nicht gefunden"); navigate("/objekte"); });
    }
  }, [id, isEdit, navigate]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const num = (v) => (v === "" || v == null ? null : Number(v));

  /* Warmmiete is Kaltmiete + Nebenkosten in practice, so we fill it in instead of making the
     landlord add it up. Once they type their own value we stop overwriting it. */
  const setRentPart = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    if (!warmRentTouched) {
      const cold = parseFloat(k === "cold_rent" ? e.target.value : form.cold_rent);
      const extra = parseFloat(k === "extra_costs" ? e.target.value : form.extra_costs);
      if (!Number.isNaN(cold)) {
        // Nebenkosten may legitimately be blank — a Kaltmiete alone is already a valid Warmmiete.
        next.warm_rent = String(Math.round((cold + (Number.isNaN(extra) ? 0 : extra)) * 100) / 100);
      }
    }
    setForm(next);
  };
  const setWarmRent = (e) => { setWarmRentTouched(true); setForm({ ...form, warm_rent: e.target.value }); };

  const addImages = (e) => {
    const picked = Array.from(e.target.files || []);
    const accepted = [];
    for (const file of picked) {
      const err = validateFile(file, { maxMB: 10, extensions: ["jpg", "jpeg", "png", "webp"] });
      if (err) toast.error(`${file.name}: ${err}`);
      else accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setImageFiles((prev) => [...prev, ...accepted]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };
  const removeImage = (idx) => setImageFiles((prev) => {
    URL.revokeObjectURL(prev[idx].previewUrl);
    return prev.filter((_, i) => i !== idx);
  });

  const toggleRequiredDoc = (t) => {
    const cur = form.required_documents || [];
    setForm({ ...form, required_documents: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] });
  };

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
      else {
        const { data } = await api.post("/properties", payload);
        // Images need the property id, so they can only go up once it exists. A failed image
        // must not discard the property the landlord just filled in — report and move on.
        let failed = 0;
        for (const { file } of imageFiles) {
          const fd = new FormData(); fd.append("file", file);
          try { await api.post(`/properties/${data.id}/images`, fd, { headers: { "Content-Type": "multipart/form-data" } }); }
          catch { failed += 1; }
        }
        if (failed) toast.warning(`Objekt erstellt — ${failed} Bild(er) konnten nicht hochgeladen werden. Sie können sie unter „Bilder" nachtragen.`);
        else toast.success("Objekt erstellt");
        navigate(`/objekte/${data.id}`);
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const categories = [...new Set(fields.map((f) => f.category))];

  const basisdatenSection = (
    <Section title="Basisdaten">
      <div className="grid gap-4">
        <div><FieldLabel required>Titel der Wohnung</FieldLabel><Input required value={form.title} onChange={set("title")} className="mt-1.5" data-testid="prop-title" placeholder="z.B. Helle 3-Zimmer-Altbauwohnung" /></div>
        <div><FieldLabel>Interne Bezeichnung</FieldLabel><Input value={form.internal_name} onChange={set("internal_name")} className="mt-1.5" placeholder="nur für Sie sichtbar" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><FieldLabel>Straße</FieldLabel><Input value={form.street} onChange={set("street")} className="mt-1.5" /></div>
          <div><FieldLabel>Hausnr.</FieldLabel><Input value={form.house_number} onChange={set("house_number")} className="mt-1.5" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><FieldLabel>PLZ</FieldLabel><Input value={form.zip} onChange={set("zip")} className="mt-1.5" /></div>
          <div><FieldLabel>Ort</FieldLabel><Input value={form.city} onChange={set("city")} className="mt-1.5" /></div>
          <div className="col-span-2 sm:col-span-1"><FieldLabel>Stadtteil</FieldLabel><Input value={form.district} onChange={set("district")} className="mt-1.5" /></div>
        </div>
      </div>
    </Section>
  );

  const wohnungsdatenSection = (
    <Section title="Wohnungsdaten">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
        <NumberField label="Wohnfläche" unit="m²" value={form.area} onChange={set("area")} min="0" />
        <div><FieldLabel>Etage</FieldLabel><Input value={form.floor} onChange={set("floor")} className="mt-1.5" placeholder="z.B. 2. OG" /></div>
        <SliderField label="Zimmer" value={form.rooms} min={1} max={8} step={0.5}
          onValueChange={(v) => setForm({ ...form, rooms: v })}
          format={(v) => `${v} Zi.`} />
        <SliderField label="Badezimmer" value={form.bathrooms} min={1} max={4} step={1}
          onValueChange={(v) => setForm({ ...form, bathrooms: v })}
          format={(v) => (v === 1 ? "1 Bad" : `${v} Bäder`)} />
      </div>
      <div className="flex flex-wrap gap-6 mt-5">
        {[["balcony", "Balkon/Terrasse"], ["cellar", "Keller"], ["parking", "Stellplatz"]].map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} /> {l}
          </label>
        ))}
      </div>
    </Section>
  );

  const mietdatenSection = (
    <Section title="Mietdaten">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* step="any" keeps cents enterable while letting the spinner arrows move in whole
            euros — at step="0.01" they crawled a cent at a time. */}
        <NumberField label="Kaltmiete" unit="€" value={form.cold_rent} onChange={setRentPart("cold_rent")} min="0" step="any" />
        <NumberField label="Nebenkosten" unit="€" value={form.extra_costs} onChange={setRentPart("extra_costs")} min="0" step="any" />
        <NumberField label="Warmmiete" unit="€" value={form.warm_rent} onChange={setWarmRent} min="0" step="any" />
        <NumberField label="Kaution" unit="€" value={form.deposit} onChange={set("deposit")} min="0" step="any" />
      </div>
      {!warmRentTouched && form.warm_rent !== "" && (
        <p className="text-xs text-muted-foreground mt-2">
          Warmmiete wird aus Kaltmiete + Nebenkosten berechnet. Sie können sie überschreiben.
        </p>
      )}
    </Section>
  );

  const weitereInfosSection = (
    <Section title="Weitere Informationen">
      <div className="grid gap-4">
        <div><FieldLabel>Frühester Einzugstermin</FieldLabel><Input type="date" value={form.earliest_move_in || ""} onChange={set("earliest_move_in")} className="mt-1.5" /></div>
        <div><FieldLabel>Beschreibung</FieldLabel><Textarea rows={4} value={form.description} onChange={set("description")} className="mt-1.5" placeholder="Öffentlich sichtbare Beschreibung" /></div>
        <div><FieldLabel>Interne Notizen</FieldLabel><Textarea rows={2} value={form.internal_notes} onChange={set("internal_notes")} className="mt-1.5" placeholder="nur für Sie sichtbar" /></div>
        <div><FieldLabel>Externer Inseratslink</FieldLabel><Input value={form.external_listing_url} onChange={set("external_listing_url")} className="mt-1.5" placeholder="https://www.immobilienscout24.de/..." /><p className="text-xs text-muted-foreground mt-1">Erscheint als Button „Wohnungsanzeige ansehen" auf der Bewerbungsseite.</p></div>
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <Label>Dokumente über MietGate</Label>
            {/* "Vor Besichtigung" is gone: demanding documents at that point is what the
                Orientierungshilfe Wohnungswirtschaft forbids, so offering it invited a
                setting no landlord should pick. Documents are requested per applicant. */}
            <Select value={form.document_timing === "none" ? "none" : "after"}
              onValueChange={(v) => setForm({ ...form, document_timing: v })}>
              <SelectTrigger className="mt-1.5" data-testid="doc-timing"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="after">Ja – Dokumente hier anfordern</SelectItem>
                <SelectItem value="none">Nein – Dokumente außerhalb von MietGate</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2 flex gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Sie fordern Dokumente pro Bewerber an, sobald es passt. Bonitäts- und
                Ausweisunterlagen schaltet MietGate erst ab der engeren Auswahl frei — vorher
                dürfen sie nicht verlangt werden.
              </span>
            </p>
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
        {form.document_timing !== "none" && (
          <div className="pt-2 border-t border-border">
            <Label>Voraussichtlich benötigte Dokumente</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Nur ein Hinweis für Bewerber, damit sie sich vorbereiten können — angefordert
              werden Dokumente später gezielt pro Bewerber.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              {DOC_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(form.required_documents || []).includes(t)}
                    onChange={() => toggleRequiredDoc(t)} data-testid={`req-doc-${t}`} />
                  {t}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );

  const bilderSection = (
    <Section title="Bilder">
      <p className="text-sm text-muted-foreground mb-4">
        Optional. Objekte mit Fotos bekommen deutlich mehr Bewerbungen. Das erste Bild wird
        automatisch zum Titelbild — Sie können das später jederzeit ändern.
      </p>
      <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={addImages} data-testid="wizard-image-input" />
      <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} data-testid="wizard-add-image">
        <ImagePlus className="h-4 w-4 mr-2" /> Bilder auswählen
      </Button>
      <p className="text-xs text-muted-foreground mt-2">JPG, PNG oder WEBP · max. 10 MB pro Bild.</p>
      {imageFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {imageFiles.map((img, i) => (
            <div key={img.previewUrl} className="relative group rounded-lg overflow-hidden border border-border aspect-[4/3] bg-secondary">
              <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute top-2 left-2 text-[11px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Titelbild</span>}
              <button type="button" onClick={() => removeImage(i)} data-testid={`wizard-del-image-${i}`}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  const formBuilderSection = (
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
  );

  // Edit mode: unchanged, everything on one page.
  if (isEdit) {
    return (
      <form onSubmit={submit} className="space-y-6 animate-fade-up max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-display text-3xl font-bold">Objekt bearbeiten</h1>
        </div>
        {basisdatenSection}
        {wohnungsdatenSection}
        {mietdatenSection}
        {weitereInfosSection}
        {formBuilderSection}
        <div className="flex justify-end gap-3 sticky bottom-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Abbrechen</Button>
          <Button type="submit" disabled={saving} data-testid="save-property">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern
          </Button>
        </div>
      </form>
    );
  }

  // Create mode: guided multi-step wizard.
  const lastStep = WIZARD_STEPS.length - 1;
  const canProceed = step !== 0 || form.title.trim().length > 0;
  const goNext = () => {
    if (!canProceed) { toast.error("Bitte geben Sie einen Titel für die Wohnung an."); return; }
    setStep((s) => Math.min(s + 1, lastStep));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const stepContent = [basisdatenSection, wohnungsdatenSection, mietdatenSection, weitereInfosSection, bilderSection, formBuilderSection, null][step];

  return (
    <form onSubmit={submit} className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-3xl font-bold">Neues Objekt</h1>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-foreground">{WIZARD_STEPS[step]}</span>
          <span className="text-muted-foreground" data-testid="property-wizard-progress">Schritt {step + 1} von {WIZARD_STEPS.length}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }} />
        </div>
      </div>

      {step < lastStep ? stepContent : (
        <Section title="Zusammenfassung">
          <p className="text-sm text-muted-foreground mb-4">Bitte prüfen Sie die Angaben, bevor Sie das Objekt speichern. Alle Details lassen sich später jederzeit unter „Bearbeiten" anpassen.</p>
          <div className="rounded-xl border border-border divide-y divide-border text-sm">
            <div className="flex items-start justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Titel</span><span className="font-medium text-right">{form.title || "—"}</span></div>
            <div className="flex items-start justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Adresse</span><span className="font-medium text-right">{[[form.street, form.house_number].filter(Boolean).join(" "), [form.zip, form.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}</span></div>
            <div className="flex items-start justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Wohnfläche / Zimmer</span><span className="font-medium text-right">{[form.area && `${form.area} m²`, form.rooms && `${form.rooms} Zi.`].filter(Boolean).join(" · ") || "—"}</span></div>
            <div className="flex items-start justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Kaltmiete</span><span className="font-medium text-right">{form.cold_rent ? `${form.cold_rent} €` : "—"}</span></div>
            <div className="flex items-start justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Bilder</span><span className="font-medium text-right">{imageFiles.length || "—"}</span></div>
            <div className="flex items-start justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Status</span><span className="font-medium text-right">{form.status === "active" ? "Aktiv" : form.status === "inactive" ? "Inaktiv" : "Vermietet"}</span></div>
          </div>
        </Section>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
        </Button>
        {step < lastStep ? (
          <Button type="button" onClick={goNext} data-testid="property-wizard-next">
            Weiter <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button type="submit" disabled={saving} data-testid="save-property">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Objekt erstellen
          </Button>
        )}
      </div>
    </form>
  );
}
