import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api, { previewDocument, downloadDocument, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatThread } from "@/components/ChatThread";
import { STATUS_COLUMNS, ACTIVE_COLUMNS, ACTIVE_STAGES, confirmStatusChange } from "@/lib/applicationStatus";
import { toast } from "sonner";
import { Star, FileText, Download, Loader2, User, CalendarPlus, Lock, Check, PartyPopper, Maximize2, Minimize2 } from "lucide-react";

const DOC_TYPES = ["BonitÃ¤tsauskunft", "Gehaltsnachweise", "Arbeitsvertrag", "Ausweis",
  "Aufenthaltstitel", "Mietschuldenfreiheitsbescheinigung", "BÃ¼rgschaft", "Sonstiges"];
/* Mirrors constants.DOC_RELEASE_STAGE â the stage an application must reach before these
   may be demanded. The backend enforces it; this only keeps the UI honest. */
const DOC_STAGE = {
  "BonitÃ¤tsauskunft": 4, "Gehaltsnachweise": 4, "Arbeitsvertrag": 4,
  "Mietschuldenfreiheitsbescheinigung": 4, "BÃ¼rgschaft": 4, "Ausweis": 5, "Aufenthaltstitel": 5,
};
const STAGE_ORDER = { neu: 0, pruefung: 1, interessant: 2, besichtigung: 3, favorit: 4, zusage: 5 };
const docRequestable = (type, status) =>
  (STAGE_ORDER[status] ?? -1) >= (DOC_STAGE[type] ?? 0);

let fieldsCache = null;
async function loadFieldDefs() {
  if (!fieldsCache) fieldsCache = api.get("/form-fields").then((r) => r.data.fields).catch(() => []);
  return fieldsCache;
}

function scoreColor(s) {
  if (s >= 75) return "bg-success/15 text-success border-success/30";
  if (s >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

/* Picking the document types up front is the whole point: the applicant then sees exactly
   this list with a "still missing" count, instead of a vague "please upload something". */
function RequestDocsDialog({ open, onOpenChange, status, alreadyRequested, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setSelected([]); }, [open]);

  const toggle = (t) => setSelected((s) => s.includes(t) ? s.filter((x) => x !== t) : [...s, t]);
  const submit = async () => { setBusy(true); try { await onSubmit(selected); } finally { setBusy(false); } };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Welche Dokumente benötigen Sie?</DialogTitle></DialogHeader>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {DOC_TYPES.map((t) => {
            const requestable = docRequestable(t, status);
            const have = alreadyRequested.includes(t);
            return (
              <label key={t} data-testid={`req-doc-${t}`}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                  requestable && !have ? "border-border cursor-pointer hover:bg-secondary" : "border-dashed border-border opacity-60"}`}>
                {have ? (
                  <Check className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Checkbox checked={selected.includes(t)} disabled={!requestable}
                    onCheckedChange={() => requestable && toggle(t)} />
                )}
                <span className="flex-1">{t}</span>
                {have && <span className="text-xs text-muted-foreground">bereits angefordert</span>}
                {!have && !requestable && (
                  <span className="text-xs text-muted-foreground">
                    {DOC_STAGE[t] === 5 ? "ab Zusage" : "ab Favorit"}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Bonitäts- und Ausweisunterlagen lassen sich erst ab der engeren Auswahl anfordern —
          vorher ist das datenschutzrechtlich nicht zulässig.
        </p>
        <DialogFooter>
          <Button onClick={submit} disabled={selected.length === 0 || busy} data-testid="submit-doc-request">
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selected.length || ""} Dokument{selected.length === 1 ? "" : "e"} anfordern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationSheet({ appId, propertyId, otherActiveCount, open, onClose, onChanged }) {
  const [app, setApp] = useState(null);
  const [notes, setNotes] = useState("");
  const [viewings, setViewings] = useState([]);
  const [selViewing, setSelViewing] = useState("");
  const [fieldDefs, setFieldDefs] = useState([]);
  const [docRequestOpen, setDocRequestOpen] = useState(false);
  const [property, setProperty] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    if (!appId) return;
    const { data } = await api.get(`/applications/${appId}`);
    setApp(data); setNotes(data.internal_notes || "");
    if (propertyId) {
      const v = await api.get(`/viewings?property_id=${propertyId}`);
      setViewings(v.data);
      api.get(`/properties/${propertyId}`).then((r) => setProperty(r.data)).catch(() => {});
    }
  }, [appId, propertyId]);

  useEffect(() => { loadFieldDefs().then(setFieldDefs); }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  const saveMeta = async (patch) => {
    await api.patch(`/applications/${appId}`, patch);
    load(); onChanged?.();
  };
  const setStars = (n) => { setApp({ ...app, stars: n }); saveMeta({ stars: n }); };
  const changeStatus = async (s) => {
    const opts = confirmStatusChange(s, otherActiveCount);
    if (!opts) return;
    const { data } = await api.patch(`/applications/${appId}/status`, { status: s, ...opts });
    toast.success(data.rejected_others
      ? `Zusage erteilt · ${data.rejected_others} Absage(n) versendet`
      : "Status aktualisiert");
    load(); onChanged?.();
  };
  const requestDocs = async (docTypes) => {
    try {
      const { data } = await api.post("/documents/request", { application_id: appId, doc_types: docTypes });
      toast.success(`${docTypes.length} Dokument(e) angefordert`);
      setDocRequestOpen(false);
      if (data.blocked?.length) {
        toast.info(`Noch nicht anforderbar: ${data.blocked.join(", ")}`);
      }
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const inviteToViewing = async () => {
    if (!selViewing) return;
    await api.post(`/viewings/${selViewing}/invite`, { application_ids: [appId] });
    toast.success("Zur Besichtigung eingeladen"); setSelViewing(""); load(); onChanged?.();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      {/* The default panel is narrow enough that form answers and the chat get cramped;
          the wide mode gives them room without opening a separate page. */}
      <SheetContent className={`w-full overflow-y-auto p-0 transition-[max-width] ${expanded ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
        aria-describedby={undefined}>
        {!app ? <div className="flex justify-center py-20"><SheetTitle className="sr-only">Bewerbung</SheetTitle><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <>
            <SheetHeader className="p-6 border-b border-border bg-secondary/40">
              <SheetDescription className="sr-only">Details zur Bewerbung</SheetDescription>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/15 text-primary flex items-center justify-center"><User className="h-5 w-5" /></div>
                  <div>
                    <SheetTitle className="text-left">{getApplicantName(app)}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{app.applicant_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm font-bold px-2.5 py-1 rounded-md border ${scoreColor(app.matching_score)}`}
                    title="Automatische Einschätzung als Entscheidungshilfe (Einkommen im Verhältnis zur Miete, Haushaltsgröße vs. Zimmerzahl, Einzugstermin angegeben, Vollständigkeit der Dokumente). Ersetzt keine eigene Prüfung.">
                    {app.matching_score}/100
                  </span>
                  <button onClick={() => setExpanded((e) => !e)} data-testid="toggle-sheet-width"
                    title={expanded ? "Kleinere Ansicht" : "Großansicht"}
                    className="hidden sm:flex p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                    {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </SheetHeader>

            <div className="p-6 space-y-6">
              {/* After a Zusage the next real-world step is the handover, so the contact
                  details and the way to book it belong here rather than three clicks away. */}
              {app.status === "zusage" && (
                <div className="rounded-xl border-2 border-success/40 bg-success/5 p-4" data-testid="handover-block">
                  <div className="flex items-center gap-2">
                    <PartyPopper className="h-4.5 w-4.5 text-success" style={{ width: 18, height: 18 }} />
                    <p className="font-semibold text-sm">Ihr neuer Mieter — Übergabe planen</p>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Kontakt: </span>{app.applicant_email}
                      {app.form_data?.telefon && <> · {app.form_data.telefon}</>}</p>
                    <p>
                      <span className="text-muted-foreground">Objekt: </span>
                      {[property?.street, property?.house_number, property?.zip, property?.city].filter(Boolean).join(" ")
                        || <span className="text-amber-700 dark:text-amber-500">Keine Adresse hinterlegt — bitte im Objekt ergänzen</span>}
                    </p>
                  </div>
                  <Button size="sm" className="mt-3" data-testid="plan-handover"
                    onClick={() => { onClose(); setSearchParams({ tab: "viewings" }, { replace: true }); }}>
                    <CalendarPlus className="h-4 w-4 mr-1" /> Übergabetermin anlegen
                  </Button>
                </div>
              )}

              <div>
                <Label2>Status</Label2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_COLUMNS.map((c) => (
                    <button key={c.key} type="button" onClick={() => changeStatus(c.key)} data-testid={`status-btn-${c.key}`}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        app.status === c.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-card hover:bg-secondary text-muted-foreground"
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label2>Bewertung</Label2>
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setStars(n)} data-testid={`star-${n}`}>
                      <Star className={`h-6 w-6 ${n <= (app.stars || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label2>Angaben</Label2>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(app.form_data || {}).filter(([, v]) => v !== "" && v != null).map(([k, v]) => {
                    const def = fieldDefs.find((f) => f.key === k);
                    const label = def?.label || k.replace(/_/g, " ");
                    let display = String(v);
                    if (def?.option_labels?.[v]) display = def.option_labels[v];
                    else if (def?.type === "date" && /^\d{4}-\d{2}-\d{2}/.test(v)) display = new Date(v).toLocaleDateString("de-DE");
                    return (
                      <div key={k} className="rounded-md bg-secondary/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium truncate">{display}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between"><Label2>Dokumente ({app.documents?.length || 0})</Label2>
                  <button onClick={() => setDocRequestOpen(true)} className="text-xs text-primary hover:underline" data-testid="request-docs">Anfordern</button></div>
                {app.requested_documents?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5" data-testid="requested-docs-summary">
                    Angefordert: {app.requested_documents.join(", ")}
                  </p>
                )}
                <div className="mt-2 space-y-2">
                  {(!app.documents || app.documents.length === 0) && <p className="text-sm text-muted-foreground">Keine Dokumente hochgeladen.</p>}
                  {app.documents?.map((d) => (
                    /* Bonity and ID documents stay locked until the application reaches the
                       stage where they may lawfully be seen — the backend enforces this too. */
                    d.released === false ? (
                      <div key={d.id} className="w-full flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm" data-testid={`doc-locked-${d.id}`}>
                        <span className="flex items-center gap-2 truncate text-muted-foreground">
                          <Lock className="h-4 w-4 shrink-0" /> <span className="truncate">{d.doc_type}</span>
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{d.release_hint}</span>
                      </div>
                    ) : (
                      <div key={d.id} className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors" data-testid={`doc-${d.id}`}>
                        <button onClick={() => previewDocument(d.id).catch(() => toast.error("Vorschau fehlgeschlagen"))}
                          className="flex items-center gap-2 truncate flex-1 text-left" data-testid={`doc-preview-${d.id}`}>
                          <FileText className="h-4 w-4 text-primary shrink-0" /> <span className="truncate">{d.doc_type}</span>
                        </button>
                        <button onClick={() => downloadDocument(d.id, d.original_filename).catch(() => toast.error("Download fehlgeschlagen"))}
                          className="p-1 rounded hover:bg-background text-muted-foreground shrink-0 ml-2" title="Herunterladen" data-testid={`doc-download-${d.id}`}>
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div>
                <Label2>Zu Besichtigung einladen</Label2>
                <div className="flex gap-2 mt-1.5">
                  <Select value={selViewing} onValueChange={setSelViewing}>
                    <SelectTrigger data-testid="invite-viewing-select">
                      <SelectValue placeholder={viewings.length ? "Termin wählen" : "Keine Termine vorhanden"} />
                    </SelectTrigger>
                    <SelectContent>
                      {viewings.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.title} · {v.datetime ? new Date(v.datetime).toLocaleDateString("de-DE") : `${v.slots?.length || 0} Slots`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={inviteToViewing} disabled={!selViewing} data-testid="invite-to-viewing">
                    <CalendarPlus className="h-4 w-4 mr-1" /> Einladen
                  </Button>
                </div>
                {viewings.length === 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">Für dieses Objekt gibt es noch keinen Termin.</p>
                    <Button size="sm" variant="outline" className="mt-2" data-testid="create-viewing-inline"
                      onClick={() => { onClose(); setSearchParams({ tab: "viewings" }, { replace: true }); }}>
                      <CalendarPlus className="h-4 w-4 mr-1" /> Termin erstellen
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label2>Interne Notizen</Label2>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => saveMeta({ internal_notes: notes })} className="mt-1.5" rows={2} placeholder="Nur für Sie sichtbar" />
              </div>

              <div>
                <Label2>Nachrichten</Label2>
                {/* Same component as the inbox, so reply/retract/emoji behave identically
                    wherever the landlord happens to be talking to this applicant. */}
                <div className="mt-2 h-[420px] rounded-lg border border-border overflow-hidden">
                  <ChatThread applicationId={appId} myRole="landlord" onSent={onChanged}
                    testIdPrefix="sheet-message" />
                </div>
              </div>
            </div>

            <RequestDocsDialog open={docRequestOpen} onOpenChange={setDocRequestOpen}
              status={app.status} alreadyRequested={app.requested_documents || []}
              onSubmit={requestDocs} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const Label2 = ({ children }) => <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>;

/* Appointment state on the card itself — otherwise "Besichtigung" says nothing about
   whether a date exists or whether the applicant has confirmed it. */
const VIEWING_CHIP = {
  confirmed: { label: "bestätigt", cls: "bg-success/15 text-success border-success/30" },
  invited: { label: "ausstehend", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  reschedule_requested: { label: "Umbuchung", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  declined: { label: "abgesagt", cls: "bg-destructive/10 text-destructive border-destructive/20" },
};

function ViewingChip({ info }) {
  if (!info) return null;
  const chip = VIEWING_CHIP[info.status] || VIEWING_CHIP.invited;
  const when = info.when
    ? new Date(info.when).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "Termin offen";
  return (
    <div className={`mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${chip.cls}`}
      data-testid="card-viewing-chip">
      <CalendarPlus className="h-3 w-3 shrink-0" />
      <span className="truncate">{when}</span>
      <span className="ml-auto shrink-0">· {chip.label}</span>
    </div>
  );
}

const getApplicantName = (a) => [a.form_data?.vorname, a.form_data?.nachname].filter(Boolean).join(" ") || a.applicant_email;

const SORTERS = {
  new: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  score: (a, b) => (b.matching_score || 0) - (a.matching_score || 0),
  stars: (a, b) => (b.stars || 0) - (a.stars || 0),
};

export function Pipeline({ propertyId }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [viewingByApp, setViewingByApp] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [showArchive, setShowArchive] = useState(false);

  const load = useCallback(async () => {
    const [appsRes, viewRes] = await Promise.all([
      api.get(`/applications?property_id=${propertyId}`),
      api.get(`/viewings?property_id=${propertyId}`).catch(() => ({ data: [] })),
    ]);
    setApps(appsRes.data);
    // application_id -> the appointment that applicant is on, so the card in the
    // "Besichtigung" column can show when it is and whether it's still unconfirmed.
    const map = {};
    for (const v of viewRes.data) {
      for (const p of v.participants || []) {
        if (p.application_id) map[p.application_id] = { when: p.slot || v.datetime, status: p.status };
      }
    }
    setViewingByApp(map);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  // Deep-link from the "Bewerbungen" list: ?open=<applicationId> jumps straight to the
  // applicant's card instead of leaving them to find it again in the board.
  useEffect(() => {
    const open = searchParams.get("open");
    if (open) {
      setActiveId(open);
      const next = new URLSearchParams(searchParams); next.delete("open");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const otherActiveCount = (excludeId) =>
    apps.filter((a) => a.id !== excludeId && ACTIVE_STAGES.includes(a.status)).length;

  const onDragEnd = async (result) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId;
    const opts = confirmStatusChange(newStatus, otherActiveCount(draggableId));
    if (!opts) return;
    setApps((prev) => prev.map((a) => (a.id === draggableId ? { ...a, status: newStatus } : a)));
    try {
      const { data } = await api.patch(`/applications/${draggableId}/status`, { status: newStatus, ...opts });
      // A bulk rejection moved cards we don't know about locally — refetch instead of
      // leaving the board showing applicants who are no longer where they appear.
      if (data.rejected_others) { toast.success(`${data.rejected_others} Absage(n) versendet`); load(); }
    }
    catch { toast.error("Statusänderung fehlgeschlagen"); load(); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (apps.length === 0) return <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">Noch keine Bewerbungen für dieses Objekt.</div>;

  const q = search.trim().toLowerCase();
  const visible = q ? apps.filter((a) => getApplicantName(a)?.toLowerCase().includes(q) || a.applicant_email?.toLowerCase().includes(q)) : apps;
  const sortFn = SORTERS[sortBy] || SORTERS.new;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input placeholder="Suchen (Name, E-Mail)…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" data-testid="pipeline-search" />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-52" data-testid="pipeline-sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Neueste zuerst</SelectItem>
            <SelectItem value="score">Höchster Score zuerst</SelectItem>
            <SelectItem value="stars">Meiste Sterne zuerst</SelectItem>
          </SelectContent>
        </Select>
        {q && <span className="text-sm text-muted-foreground">{visible.length} von {apps.length}</span>}
      </div>

      {/* Mobile: compact sortable/filterable list instead of the multi-column kanban */}
      <div className="sm:hidden space-y-2">
        {visible.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Keine Treffer.</p>}
        {[...visible].sort(sortFn).map((a) => {
          const col = STATUS_COLUMNS.find((c) => c.key === a.status);
          return (
            <div key={a.id} onClick={() => setActiveId(a.id)} data-testid={`mobile-app-card-${a.id}`}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveId(a.id); } }}
              className="rounded-lg border border-border bg-card p-3 cursor-pointer active:bg-secondary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{getApplicantName(a)}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${col?.dot}`} /> {col?.label || a.status}
                  </span>
                </div>
                <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${scoreColor(a.matching_score)}`}>{a.matching_score}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                {a.stars > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{a.stars}</span>}
                <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" />{a.document_count}</span>
              </div>
              <ViewingChip info={viewingByApp[a.id]} />
            </div>
          );
        })}
      </div>

      {/* Desktop: drag-and-drop kanban */}
      <div className="mb-4 flex items-center justify-between">
        <div />
        <Button variant={showArchive ? "default" : "outline"} size="sm" onClick={() => setShowArchive(!showArchive)} data-testid="toggle-archive">
          {showArchive ? "Aktive anzeigen" : "Archiv anzeigen"}
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="hidden sm:flex gap-4 overflow-x-auto pb-4 kanban-scroll">
          {(showArchive ? [STATUS_COLUMNS.find((c) => c.key === "archiv")] : ACTIVE_COLUMNS).map((col) => {
            const items = visible.filter((a) => a.status === col.key).sort(sortFn);
            return (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} data-testid={`kanban-column-${col.key}`}
                    className={`min-w-[270px] w-[270px] rounded-xl border border-border bg-secondary/30 flex flex-col ${snapshot.isDraggingOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border sticky top-0 bg-secondary/60 backdrop-blur rounded-t-xl">
                      <span className="flex items-center gap-2 font-semibold text-sm"><span className={`h-2 w-2 rounded-full ${col.dot}`} />{col.label}</span>
                      <span className="text-xs font-semibold text-muted-foreground bg-card rounded-full px-2 py-0.5 min-w-[22px] text-center">{items.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[60px] p-2.5 flex-1">
                      {items.map((a, idx) => (
                        <Draggable draggableId={a.id} index={idx} key={a.id}>
                          {(prov) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              onClick={() => setActiveId(a.id)} data-testid={`app-card-${a.id}`}
                              className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm truncate">{getApplicantName(a)}</p>
                                <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${scoreColor(a.matching_score)}`}
                                  title="Automatische Einschätzung als Entscheidungshilfe, keine Garantie. Details beim Öffnen der Bewerbung.">{a.matching_score}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {a.stars > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{a.stars}</span>}
                                <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" />{a.document_count}</span>
                              </div>
                              <ViewingChip info={viewingByApp[a.id]} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
      <ApplicationSheet appId={activeId} propertyId={propertyId} otherActiveCount={otherActiveCount(activeId)}
        open={!!activeId} onClose={() => setActiveId(null)} onChanged={load} />
    </>
  );
}
