import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { validateFile } from "@/lib/validateFile";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

function hexToHsl(hex) {
  if (!hex) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, ExternalLink, MapPin, Home, CheckCircle2, Upload, FileText, ShieldCheck, Sparkles, ArrowLeft, ArrowRight
} from "lucide-react";

const DOC_TYPES = ["SCHUFA", "Gehaltsnachweise", "Arbeitsvertrag", "Ausweis", "Aufenthaltstitel", "Mietschuldenfreiheitsbescheinigung", "Bürgschaft", "Sonstiges"];

export default function PublicApplication() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState(null); // null | "invalid" | "payment_locked"
  const [form, setForm] = useState({});
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { application_id }
  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState("SCHUFA");
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    axios.get(`${API}/public/property/${code}`).then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.status === 423 ? "payment_locked" : "invalid"));
  }, [code]);

  const draftKey = `mg_app_draft_${code}`;
  const DRAFT_TTL_DAYS = 14;
  const [hasDraft, setHasDraft] = useState(false);
  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch { /* storage unavailable */ } setHasDraft(false); };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const savedAt = draft.savedAt ? new Date(draft.savedAt) : null;
      if (savedAt && Date.now() - savedAt.getTime() > DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(draftKey);
        return;
      }
      const hasContent = draft.email || (draft.form && Object.keys(draft.form).length > 0) || draft.step > 0;
      if (!hasContent) return;
      if (draft.form) setForm(draft.form);
      if (draft.email) setEmail(draft.email);
      if (typeof draft.step === "number") setStep(draft.step);
      if (draft.consent) setConsent(draft.consent);
      setHasDraft(true);
      toast.info("Ihre vorherigen Eingaben wurden wiederhergestellt (lokal in diesem Browser gespeichert).");
    } catch { /* corrupted draft, ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (done) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ form, email, step, consent, savedAt: new Date().toISOString() }));
      if (email || Object.keys(form).length > 0) setHasDraft(true);
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, email, step, consent, code]);

  useEffect(() => {
    if (done) clearDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (error === "payment_locked") return <div className="min-h-screen flex items-center justify-center bg-background text-center p-6"><div><Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h1 className="font-display text-2xl font-bold">Bewerbung vorübergehend pausiert</h1><p className="text-muted-foreground mt-2 max-w-md">Dieser Bewerbungslink ist aktuell pausiert, da der Vermieter eine Zahlung aktualisieren muss. Ihre bisherigen Eingaben bleiben in diesem Browser gespeichert — bitte versuchen Sie es später erneut.</p></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-background text-center p-6"><div><Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h1 className="font-display text-2xl font-bold">Link nicht verfügbar</h1><p className="text-muted-foreground mt-2">Dieser Bewerbungslink ist ungültig oder wurde deaktiviert.</p></div></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const { property: p, fields } = data;
  const cfg = p.form_config || {};
  const activeFields = fields.filter((f) => cfg[f.key] && cfg[f.key] !== "disabled" && f.key !== "email");
  const categories = [...new Set(activeFields.map((f) => f.category))];
  const set = (k, v) => setForm({ ...form, [k]: v });

  // Funnel steps: Kontakt -> je Kategorie -> Bestätigung
  const stepsDef = [
    { key: "__email", title: "Kontakt" },
    ...categories.map((cat) => ({ key: cat, title: cat, fields: activeFields.filter((f) => f.category === cat) })),
    { key: "__consent", title: "Bestätigung" },
  ];
  const lastStep = stepsDef.length - 1;
  const current = stepsDef[Math.min(step, lastStep)];

  const validStep = () => {
    if (current.key === "__email") return !!(email && /\S+@\S+\.\S+/.test(email));
    if (current.key === "__consent") return consent;
    return (current.fields || []).every((f) => cfg[f.key] !== "required" || (form[f.key] !== undefined && form[f.key] !== ""));
  };
  const goNext = () => {
    if (!validStep()) { toast.error(current.key === "__email" ? "Bitte geben Sie eine gültige E-Mail-Adresse ein." : "Bitte füllen Sie die Pflichtfelder aus."); return; }
    setStep((s) => Math.min(s + 1, lastStep)); window.scrollTo(0, 0);
  };
  const goBack = () => { setStep((s) => Math.max(s - 1, 0)); window.scrollTo(0, 0); };
  const onFormSubmit = (e) => { e.preventDefault(); if (step < lastStep) { goNext(); return; } submit(e); };

  const renderField = (f) => {
    const required = cfg[f.key] === "required";
    const val = form[f.key] ?? "";
    const common = { id: f.key, required, "data-testid": `field-${f.key}` };
    return (
      <div key={f.key}>
        <Label htmlFor={f.key}>{f.label}{required && " *"}</Label>
        <div className="mt-1.5">
          {f.type === "textarea" ? (
            <Textarea {...common} rows={3} value={val} onChange={(e) => set(f.key, e.target.value)} />
          ) : f.type === "select" ? (
            <Select value={val} onValueChange={(v) => set(f.key, v)}>
              <SelectTrigger data-testid={`field-${f.key}`}><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
              <SelectContent>
                {f.options?.map((o) => <SelectItem key={o} value={o}>{f.option_labels?.[o] || o}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input {...common} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "tel" ? "tel" : f.type === "email" ? "email" : "text"}
              value={val} onChange={(e) => set(f.key, e.target.value)} />
          )}
        </div>
      </div>
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!consent) { toast.error("Bitte stimmen Sie der Datenverarbeitung zu."); return; }
    setSubmitting(true);
    const finalEmail = email || form.email;
    try {
      const { data: res } = await axios.post(`${API}/public/apply`, {
        code, email: finalEmail, consent, form_data: { ...form, email: finalEmail }, origin_url: window.location.origin,
      });
      setDone(res);
      try { localStorage.removeItem(draftKey); } catch { /* storage unavailable */ }
      toast.success("Bewerbung gesendet!");
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Fehler beim Senden");
    } finally { setSubmitting(false); }
  };

  const uploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !done) return;
    const err = validateFile(file, { maxMB: 15, extensions: ["pdf", "jpg", "jpeg", "png"] });
    if (err) { toast.error(err); if (fileRef.current) fileRef.current.value = ""; return; }
    const fd = new FormData();
    fd.append("code", code); fd.append("application_id", done.application_id); fd.append("doc_type", docType); fd.append("file", file);
    setUploading(true);
    try {
      await axios.post(`${API}/public/documents/upload`, fd);
      setUploads([...uploads, { type: docType, name: file.name }]);
      toast.success("Dokument hochgeladen");
    } catch (err) { toast.error(err.response?.data?.detail || "Upload fehlgeschlagen — bitte erneut versuchen"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const b = p.branding || {};
  const logoSrc = b.logo_url ? (b.logo_url.startsWith("/") ? `${BACKEND}${b.logo_url}` : b.logo_url) : null;
  const primaryHsl = hexToHsl(b.colors?.primary);
  const brandStyle = primaryHsl ? { "--primary": primaryHsl, "--ring": primaryHsl, "--brand-teal": primaryHsl } : {};

  return (
    <div className="min-h-screen bg-secondary/40" style={brandStyle}>
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          {logoSrc ? <img src={logoSrc} alt={b.org_name} className="h-8" /> : <Logo />}
          {b.org_name && <span className="text-sm text-muted-foreground">{b.org_name}</span>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {done ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center animate-fade-up">
            <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
            <h1 className="font-display text-2xl font-bold mt-5">Bewerbung erfolgreich gesendet!</h1>
            <p className="text-muted-foreground mt-2">Wir haben ein MietGate-Konto für Sie angelegt. Prüfen Sie Ihre E-Mails, um es zu aktivieren und den Status zu verfolgen.</p>

            {p.document_timing === "before" && (
              <div className="mt-8 text-left border-t border-border pt-6">
                <h2 className="font-display font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Dokumente hochladen</h2>
                <p className="text-sm text-muted-foreground mt-1">Vervollständigen Sie Ihre Bewerbung mit relevanten Dokumenten.</p>
                <div className="flex flex-wrap items-end gap-3 mt-4">
                  <div className="flex-1 min-w-[180px]">
                    <Label>Typ</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <input ref={fileRef} type="file" onChange={uploadDoc} className="hidden" accept=".pdf,.jpg,.jpeg,.png" disabled={uploading} data-testid="public-file-input" />
                  <Button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="public-upload-btn">
                    {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} {uploading ? "Wird hochgeladen…" : "Hochladen"}
                  </Button>
                </div>
                {uploads.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm mt-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> {u.type} – {u.name}</div>
                ))}
              </div>
            )}

            {p.document_timing !== "before" && (
              <div className="mt-8 text-left border-t border-border pt-6">
                <h2 className="font-display font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Dokumente später nachreichen</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sie können Dokumente jederzeit nachreichen: Aktivieren Sie zunächst Ihr Konto über den Link in der E-Mail, die wir Ihnen gerade geschickt haben. Loggen Sie sich anschließend ein und gehen Sie zu <b>„Meine Dokumente"</b>, um Unterlagen hochzuladen und mit dieser Bewerbung zu verknüpfen.
                </p>
              </div>
            )}

            <div className="mt-8 rounded-lg bg-accent/50 border border-accent p-4 text-left flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Tipp: SCHUFA-Auskunft</p>
                <p className="text-sm text-muted-foreground">{partners?.schufa_text || "Eine aktuelle Bonitätsauskunft kann Ihre Bewerbung unterstützen."}{" "}
                  {partners?.schufa_url ? (
                    <a href={partners.schufa_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium" data-testid="schufa-link">SCHUFA-Auskunft erhalten →</a>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-brand-dark text-white p-5 text-left" data-testid="premium-upsell">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="font-display font-bold">Verifiziertes Mieterprofil – schneller zur Wohnung</p>
              </div>
              <p className="text-sm text-white/70 mt-2">Erstellen Sie ein geprüftes Profil mit teilbarem Link und bewerben Sie sich mit einem Klick – auch außerhalb von MietGate. Vermieter sehen sofort, dass Ihre Angaben vollständig sind.</p>
              <div className="flex items-center gap-3 mt-4">
                <a href="/fuer-mieter" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity" data-testid="premium-upsell-cta">
                  Profil aktivieren – 4,99 €/Monat <ArrowRight className="h-4 w-4" />
                </a>
                <span className="text-xs text-white/50">Jederzeit kündbar</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Property header */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6 animate-fade-up">
              <div className="bg-brand-dark text-white p-6">
                <span className="text-xs uppercase tracking-wider text-primary font-semibold">Bewerbung</span>
                <h1 className="font-display text-2xl font-bold mt-1">{p.title}</h1>
                <p className="text-white/70 text-sm flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" /> {[p.district, p.city].filter(Boolean).join(", ") || "Lage auf Anfrage"}</p>
              </div>
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {p.rooms && <Stat label="Zimmer" value={p.rooms} />}
                {p.area && <Stat label="Wohnfläche" value={`${p.area} m²`} />}
                {p.warm_rent && <Stat label="Warmmiete" value={`${p.warm_rent} €`} />}
                {p.deposit && <Stat label="Kaution" value={`${p.deposit} €`} />}
              </div>
              {p.description && <div className="px-6 pb-6"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p></div>}
              {p.external_listing_url && (
                <div className="px-6 pb-6">
                  <Button variant="outline" asChild data-testid="external-listing"><a href={p.external_listing_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Wohnungsanzeige ansehen</a></Button>
                </div>
              )}
            </div>

            {/* Application funnel */}
            <form onSubmit={onFormSubmit} className="animate-fade-up">
              {/* Progress */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-foreground">{current.title}</span>
                  <span className="text-muted-foreground" data-testid="funnel-progress">Schritt {step + 1} von {stepsDef.length}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((step + 1) / stepsDef.length) * 100}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 min-h-[220px]">
                {current.key === "__email" && (
                  <div>
                    <h2 className="font-display font-bold text-lg mb-1">Ihre Kontaktdaten</h2>
                    <p className="text-sm text-muted-foreground mb-4">Wir legen ein Bewerberkonto an, damit Sie den Status verfolgen können.</p>
                    <Label htmlFor="app-email">E-Mail-Adresse *</Label>
                    <Input id="app-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="name@beispiel.de" data-testid="app-email" />
                  </div>
                )}

                {current.fields && (
                  <div>
                    <h2 className="font-display font-bold text-lg mb-4">{current.title}</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {current.fields.map(renderField)}
                    </div>
                  </div>
                )}

                {current.key === "__consent" && (
                  <div>
                    <h2 className="font-display font-bold text-lg mb-1">Ihre Angaben im Überblick</h2>
                    <p className="text-sm text-muted-foreground mb-4">Bitte prüfen Sie Ihre Angaben, bevor Sie die Bewerbung absenden.</p>
                    <div className="rounded-xl border border-border divide-y divide-border mb-6" data-testid="summary-review">
                      <div className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">E-Mail-Adresse</span>
                        <span className="font-medium text-right break-all">{email || form.email || "—"}</span>
                      </div>
                      {activeFields.filter((f) => form[f.key] !== undefined && form[f.key] !== "").map((f) => (
                        <div key={f.key} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="font-medium text-right break-words">{f.option_labels?.[form[f.key]] || String(form[f.key])}</span>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={consent} onCheckedChange={setConsent} className="mt-0.5" data-testid="consent-checkbox" />
                      <span className="text-sm text-muted-foreground">
                        Ich willige ein, dass meine personenbezogenen Daten zur Bearbeitung meiner Bewerbung verarbeitet und dem Vermieter bereitgestellt werden. Die <a href="/datenschutz" target="_blank" rel="noreferrer" className="text-primary hover:underline">Datenschutzerklärung</a> habe ich zur Kenntnis genommen. <ShieldCheck className="inline h-4 w-4 text-primary" />
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3 mt-5">
                <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0} data-testid="funnel-back">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
                </Button>
                {step < lastStep ? (
                  <Button type="button" onClick={goNext} data-testid="funnel-next">
                    Weiter <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" size="lg" disabled={submitting} data-testid="submit-application">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Bewerbung absenden
                  </Button>
                )}
              </div>
              {hasDraft && (
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Ihre Eingaben werden automatisch lokal in diesem Browser zwischengespeichert (max. {DRAFT_TTL_DAYS} Tage, kein gemeinsam genutztes Gerät empfohlen).{" "}
                  <button type="button" onClick={clearDraft} className="underline hover:text-foreground">Gespeicherte Eingaben jetzt löschen</button>
                </p>
              )}
              {b.show_powered_by !== false && <p className="text-center text-xs text-muted-foreground mt-5">Powered by <span className="font-semibold">MietGate</span></p>}
            </form>
          </>
        )}
      </main>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p><p className="font-mono font-bold text-lg mt-0.5">{value}</p></div>
);
