import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, ExternalLink, MapPin, Home, CheckCircle2, Upload, FileText, ShieldCheck, Sparkles
} from "lucide-react";

const DOC_TYPES = ["SCHUFA", "Gehaltsnachweise", "Arbeitsvertrag", "Ausweis", "Aufenthaltstitel", "Mietschuldenfreiheitsbescheinigung", "Bürgschaft", "Sonstiges"];

export default function PublicApplication() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({});
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { application_id }
  const [docType, setDocType] = useState("SCHUFA");
  const [uploads, setUploads] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    axios.get(`${API}/public/property/${code}`).then((r) => setData(r.data)).catch(() => setError(true));
  }, [code]);

  if (error) return <div className="min-h-screen flex items-center justify-center bg-background text-center p-6"><div><Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h1 className="font-display text-2xl font-bold">Link nicht verfügbar</h1><p className="text-muted-foreground mt-2">Dieser Bewerbungslink ist ungültig oder wurde deaktiviert.</p></div></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const { property: p, fields } = data;
  const cfg = p.form_config || {};
  const activeFields = fields.filter((f) => cfg[f.key] && cfg[f.key] !== "disabled");
  const categories = [...new Set(activeFields.map((f) => f.category))];
  const set = (k, v) => setForm({ ...form, [k]: v });

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
        code, email: finalEmail, consent, form_data: { ...form, email: finalEmail },
      });
      setDone(res);
      toast.success("Bewerbung gesendet!");
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Fehler beim Senden");
    } finally { setSubmitting(false); }
  };

  const uploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !done) return;
    const fd = new FormData();
    fd.append("code", code); fd.append("application_id", done.application_id); fd.append("doc_type", docType); fd.append("file", file);
    try {
      await axios.post(`${API}/public/documents/upload`, fd);
      setUploads([...uploads, { type: docType, name: file.name }]);
      toast.success("Dokument hochgeladen");
    } catch { toast.error("Upload fehlgeschlagen"); }
    finally { if (fileRef.current) fileRef.current.value = ""; }
  };

  const b = p.branding || {};

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          {b.logo_url ? <img src={b.logo_url} alt={b.org_name} className="h-8" /> : <Logo />}
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
                  <input ref={fileRef} type="file" onChange={uploadDoc} className="hidden" accept=".pdf,.jpg,.jpeg,.png" data-testid="public-file-input" />
                  <Button onClick={() => fileRef.current?.click()} data-testid="public-upload-btn"><Upload className="h-4 w-4 mr-1" /> Hochladen</Button>
                </div>
                {uploads.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm mt-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> {u.type} – {u.name}</div>
                ))}
              </div>
            )}

            <div className="mt-8 rounded-lg bg-accent/50 border border-accent p-4 text-left flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Tipp: SCHUFA-Auskunft</p>
                <p className="text-sm text-muted-foreground">Eine aktuelle Bonitätsauskunft kann Ihre Bewerbung unterstützen. <button className="text-primary hover:underline" onClick={() => toast.info("Weiterleitung zum Partner (Demo)")}>SCHUFA-Auskunft erhalten</button></p>
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

            {/* Application form */}
            <form onSubmit={submit} className="space-y-6 animate-fade-up">
              <div className="rounded-2xl border border-border bg-card p-6">
                <Label htmlFor="app-email">Ihre E-Mail-Adresse *</Label>
                <Input id="app-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="name@beispiel.de" data-testid="app-email" />
                <p className="text-xs text-muted-foreground mt-1">Für Ihr Bewerberkonto und die Statusverfolgung.</p>
              </div>

              {categories.map((cat) => (
                <div key={cat} className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-display font-bold text-lg mb-4">{cat}</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {activeFields.filter((f) => f.category === cat).map(renderField)}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-border bg-card p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={consent} onCheckedChange={setConsent} className="mt-0.5" data-testid="consent-checkbox" />
                  <span className="text-sm text-muted-foreground">
                    Ich willige ein, dass meine personenbezogenen Daten zur Bearbeitung meiner Bewerbung verarbeitet und dem Vermieter bereitgestellt werden. Die Datenschutzerklärung habe ich zur Kenntnis genommen. <ShieldCheck className="inline h-4 w-4 text-primary" />
                  </span>
                </label>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting} data-testid="submit-application">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Bewerbung absenden
              </Button>
              {b.show_powered_by !== false && <p className="text-center text-xs text-muted-foreground">Powered by <span className="font-semibold">MietGate</span></p>}
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
