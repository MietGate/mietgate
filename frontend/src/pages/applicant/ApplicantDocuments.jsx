import { useEffect, useState, useRef } from "react";
import api, { formatApiError, previewDocument, downloadDocument } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { validateFile } from "@/lib/validateFile";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Trash2, Download, Link2, ShieldCheck, ExternalLink, Clock, Check, Eye } from "lucide-react";

const DOC_TYPES = ["Bonitätsauskunft", "Gehaltsnachweise", "Arbeitsvertrag", "Ausweis", "Aufenthaltstitel", "Mietschuldenfreiheitsbescheinigung", "Bürgschaft", "Sonstiges"];
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];

/* One of the three routes through the bonity step. */
function ChoiceButton({ active, onClick, icon: Icon, label, hint, testId }) {
  return (
    <button onClick={onClick} data-testid={testId}
      className={`text-left rounded-lg border p-3 transition-colors ${active ? "border-primary bg-accent/50" : "border-border hover:border-primary/40"}`}>
      <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <p className="font-medium text-sm mt-2">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </button>
  );
}

export default function ApplicantDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState(null);
  const [apps, setApps] = useState([]);
  const [docType, setDocType] = useState("Bonitätsauskunft");
  const [uploading, setUploading] = useState(false);
  const [attaching, setAttaching] = useState(null);
  const fileRef = useRef();
  const bonityFileRef = useRef();
  const requestFileRef = useRef();
  const requestedTypeRef = useRef(null);

  const [partners, setPartners] = useState(null);
  const [bonityRoute, setBonityRoute] = useState(null);   // null | "have" | "bonify"
  const [bonityConsent, setBonityConsent] = useState(false);
  // "Später hochladen" only hides the card for this visit — it comes back next time,
  // so nobody silently loses track of a document a landlord will ask for later.
  const [bonityDismissed, setBonityDismissed] = useState(false);

  const loadApps = () => api.get("/my/applications").then((r) => setApps(r.data)).catch(() => setApps([]));
  const load = () => Promise.all([
    api.get("/documents").then((r) => setDocs(r.data)).catch(() => setDocs([])),
    loadApps(),
  ]);
  useEffect(() => {
    load();
    api.get("/partners").then((r) => setPartners(r.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasSchufa = docs?.some((d) => d.doc_type === "Bonitätsauskunft");
  // "Später hochladen" is only offered when no landlord made the bonity report mandatory.
  const schufaRequired = apps.some((a) => (a.required_documents || []).includes("Bonitätsauskunft"));

  /* Applications where the landlord asked for specific documents. Anything still listed in
     missing_documents has no matching upload yet — that's the number the applicant cares about. */
  const openRequests = apps.filter((a) => (a.requested_documents || []).length > 0);

  const upload = async (e, forcedType) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const err = validateFile(file, { maxMB: 15, extensions: ALLOWED_EXT });
    if (err) { toast.error(err); input.value = ""; return; }
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("doc_type", forcedType || docType);
    try {
      const { data } = await api.post("/documents/upload", fd);
      // A document sitting unattached in the personal library never reaches the landlord
      // (no application_id -> no notification, invisible in the pipeline). With exactly one
      // application there's no ambiguity, so link it right away instead of relying on the
      // applicant to notice the separate "verknüpfen" icon afterwards.
      toast.success("Dokument hochgeladen");
      if (apps.length === 1) await attach(data.id, apps[0].id);
      else if (apps.length > 1) setAttaching(data.id);
      load();
    }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setUploading(false); input.value = ""; }
  };
  const del = async (id) => {
    if (!window.confirm("Dokument wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    try { await api.delete(`/documents/${id}`); toast.success("Gelöscht"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const preview = async (d) => {
    try { await previewDocument(d.id); }
    catch { toast.error("Vorschau fehlgeschlagen"); }
  };
  const download = async (d) => {
    try { await downloadDocument(d.id, d.original_filename); }
    catch { toast.error("Download fehlgeschlagen"); }
  };
  const attach = async (docId, applicationId) => {
    if (!applicationId) return;
    try { await api.post(`/documents/${docId}/attach`, new URLSearchParams({ application_id: applicationId })); toast.success("Mit Bewerbung verknüpft"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setAttaching(null); }
  };

  if (!docs) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div><h1 className="font-display text-3xl font-bold">Meine Dokumente</h1><p className="text-muted-foreground mt-1">Einmal hochladen, mit beliebigen Bewerbungen verknüpfen.</p></div>

      {/* What a landlord actually asked for comes first — without this the applicant had to
          guess which of the eight document types was meant. */}
      {openRequests.map((a) => {
        const requested = a.requested_documents || [];
        const missing = a.missing_documents || [];
        const done = requested.length - missing.length;
        return (
          <div key={a.id} className={`rounded-xl border p-6 ${missing.length ? "border-primary/40 bg-accent/30" : "border-success/40 bg-success/5"}`}
            data-testid={`doc-request-${a.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Angeforderte Dokumente · {a.property_title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {missing.length === 0
                    ? "Alle angeforderten Dokumente liegen vor. Vielen Dank!"
                    : `Noch ${missing.length} von ${requested.length} offen`}
                </p>
              </div>
              <span className="text-sm font-medium tabular-nums">{done}/{requested.length}</span>
            </div>
            <div className="mt-4 space-y-1.5">
              {requested.map((t) => {
                const open = missing.includes(t);
                return (
                  <div key={t} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
                    <span className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${
                      open ? "border-border" : "bg-success border-success text-success-foreground"}`}>
                      {!open && <Check className="h-3 w-3" />}
                    </span>
                    <span className={`flex-1 ${open ? "" : "text-muted-foreground line-through"}`}>{t}</span>
                    {open && (
                      <Button size="sm" variant="outline" disabled={uploading}
                        onClick={() => { requestedTypeRef.current = t; requestFileRef.current?.click(); }}
                        data-testid={`upload-requested-${t}`}>
                        <Upload className="h-3.5 w-3.5 mr-1" /> Hochladen
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* The type comes from a ref rather than state so the pick can't race a re-render. */}
      <input ref={requestFileRef} type="file" onChange={(e) => upload(e, requestedTypeRef.current)}
        className="hidden" accept=".pdf,.jpg,.jpeg,.png" data-testid="requested-file-input" />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm font-medium">Dokumententyp</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1.5" data-testid="doc-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <input ref={fileRef} type="file" onChange={upload} className="hidden" accept=".pdf,.jpg,.jpeg,.png" data-testid="file-input" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="upload-btn">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Hochladen
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">PDF, JPG oder PNG · max. 15 MB · sicher & verschlüsselt gespeichert.</p>
      </div>

      {/* Guided bonity step. Only shown while no SCHUFA document exists — afterwards it's
          just noise. The applicant picks their route instead of being pushed at a link. */}
      {!hasSchufa && !bonityDismissed && (
        <div className="rounded-xl border border-border bg-card p-6" data-testid="bonity-step">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><ShieldCheck className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="font-semibold">Bonitätsnachweis</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {schufaRequired
                  ? "Für eine Ihrer Bewerbungen ist eine Bonitätsauskunft erforderlich. Wie möchten Sie vorgehen?"
                  : "Optional. Vermieter dürfen eine Bonitätsauskunft erst nach der Besichtigung anfordern — Sie können sie aber schon jetzt vorbereiten."}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2 mt-5">
            <ChoiceButton active={bonityRoute === "have"} onClick={() => setBonityRoute("have")}
              icon={Upload} label="Ich habe bereits eine" hint="SCHUFA oder Bonitätsauskunft hochladen" testId="bonity-have" />
            <ChoiceButton active={bonityRoute === "bonify"} onClick={() => setBonityRoute("bonify")}
              icon={ShieldCheck} label="Kostenlos über bonify" hint="Auskunft in wenigen Minuten holen" testId="bonity-bonify" />
            {!schufaRequired && (
              <ChoiceButton active={false} onClick={() => setBonityDismissed(true)}
                icon={Clock} label="Später hochladen" hint="Sie können das jederzeit nachholen" testId="bonity-later" />
            )}
          </div>

          {bonityRoute === "bonify" && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-sm text-muted-foreground">{partners?.bonify_text}</p>
              <ol className="mt-4 space-y-2">
                {(partners?.bonify_steps || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-accent text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
              {partners?.bonify_url && (
                <Button className="mt-4" asChild data-testid="bonify-link">
                  <a href={partners.bonify_url} target="_blank" rel={partners.bonify_is_affiliate ? "noreferrer nofollow sponsored" : "noreferrer"}>
                    Zu bonify <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </Button>
              )}
              {partners?.bonify_is_affiliate && (
                <p className="text-[11px] text-muted-foreground mt-3">
                  Anzeige · Partnerangebot. MietGate erhält ggf. eine Vermittlungsprovision.
                </p>
              )}
            </div>
          )}

          {(bonityRoute === "have" || bonityRoute === "bonify") && (
            <div className="mt-5 pt-5 border-t border-border">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 shrink-0" checked={bonityConsent}
                  onChange={(e) => setBonityConsent(e.target.checked)} data-testid="bonity-consent" />
                <span className="text-muted-foreground">
                  Ich willige ein, dass MietGate meine Bonitätsauskunft speichert und sie dem Vermieter
                  erst ab der engeren Auswahl (Status „Favorit") zur Einsicht bereitstellt. Ich kann diese
                  Einwilligung jederzeit widerrufen, indem ich das Dokument hier lösche.
                </span>
              </label>
              <Button className="mt-4" disabled={!bonityConsent || uploading}
                onClick={() => { setDocType("Bonitätsauskunft"); bonityFileRef.current?.click(); }} data-testid="bonity-upload-btn">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Bonitätsauskunft hochladen
              </Button>
              <input ref={bonityFileRef} type="file" onChange={(e) => upload(e, "Bonitätsauskunft")} className="hidden" accept=".pdf,.jpg,.jpeg,.png" data-testid="bonity-file-input" />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {docs.length === 0 && <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">Noch keine Dokumente hochgeladen.</div>}
        {docs.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-card p-4" data-testid={`mydoc-${d.id}`}>
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => preview(d)} className="flex items-center gap-3 truncate text-left flex-1 min-w-0" data-testid={`mydoc-preview-${d.id}`}>
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="truncate">
                  <p className="font-medium truncate">{d.doc_type}</p>
                  <p className="text-sm text-muted-foreground truncate">{d.original_filename}</p>
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {apps.length > 0 && (
                  <button onClick={() => setAttaching(attaching === d.id ? null : d.id)} className="p-2 rounded-md hover:bg-secondary" title="Mit Bewerbung verknüpfen">
                    <Link2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => preview(d)} className="p-2 rounded-md hover:bg-secondary" title="Vorschau"><Eye className="h-4 w-4" /></button>
                <button onClick={() => download(d)} className="p-2 rounded-md hover:bg-secondary" title="Herunterladen"><Download className="h-4 w-4" /></button>
                <button onClick={() => del(d.id)} className="p-2 rounded-md hover:bg-secondary"><Trash2 className="h-4 w-4 text-destructive" /></button>
              </div>
            </div>
            {attaching === d.id && (
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Zu Bewerbung hinzufügen:</span>
                {apps.map((a) => (
                  <Button key={a.id} size="sm" variant="outline" onClick={() => attach(d.id, a.id)}>{a.property_title}</Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Shown once documents exist: the value of keeping them here only becomes obvious
          after the first upload, which is the moment to make the case. */}
      {docs.length > 0 && !user?.premium && (
        <div className="glass-dark hero-glow animate-float relative overflow-hidden rounded-2xl text-white p-7 shadow-soft-lg" data-testid="documents-premium-upsell">
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-premium/15 ring-1 ring-premium/30 text-premium flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg font-bold">Ihre Dokumente dauerhaft griffbereit</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-premium bg-premium/15 ring-1 ring-premium/30 px-2 py-0.5 rounded-full">Premium</span>
              </div>
              <p className="text-sm text-white/70 mt-2 leading-relaxed">
                Ihre Angaben und Dokumente werden einmal gespeichert und bei jeder weiteren Bewerbung
                auf MietGate automatisch übernommen — nichts wird erneut hochgeladen. Zusätzlich können
                Sie Ihr Profil auch Vermietern außerhalb von MietGate schicken und zeigen, dass Ihre
                Unterlagen bereits vollständig vorliegen.
              </p>
            </div>
          </div>
          <a href="/fuer-mieter" data-testid="documents-premium-cta"
            className="relative inline-flex items-center gap-1.5 rounded-lg bg-premium px-5 py-2.5 text-sm font-semibold text-premium-foreground shadow-md shadow-premium/20 hover:bg-premium/90 hover:shadow-premium/30 transition-all mt-5">
            Profil aktivieren – 4,99 €/Monat
          </a>
        </div>
      )}
    </div>
  );
}
