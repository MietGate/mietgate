import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api, { API } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Star, FileText, Download, Send, Loader2, User, X } from "lucide-react";

const COLUMNS = [
  { key: "neu", label: "Neu" }, { key: "pruefung", label: "Prüfung" },
  { key: "interessant", label: "Interessant" }, { key: "besichtigung", label: "Besichtigung" },
  { key: "favorit", label: "Favorit" }, { key: "zusage", label: "Zusage" },
  { key: "absage", label: "Absage" }, { key: "archiv", label: "Archiv" },
];

function scoreColor(s) {
  if (s >= 75) return "bg-success/15 text-success border-success/30";
  if (s >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

function ApplicationSheet({ appId, open, onClose, onChanged }) {
  const [app, setApp] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [notes, setNotes] = useState("");
  const token = localStorage.getItem("mg_token");

  const load = useCallback(async () => {
    if (!appId) return;
    const { data } = await api.get(`/applications/${appId}`);
    setApp(data); setNotes(data.internal_notes || "");
    const m = await api.get(`/messages?application_id=${appId}`);
    setMessages(m.data);
  }, [appId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  const saveMeta = async (patch) => {
    await api.patch(`/applications/${appId}`, patch);
    load(); onChanged?.();
  };
  const setStars = (n) => { setApp({ ...app, stars: n }); saveMeta({ stars: n }); };
  const changeStatus = async (s) => { await api.patch(`/applications/${appId}/status`, { status: s }); toast.success("Status aktualisiert"); load(); onChanged?.(); };
  const sendMsg = async () => {
    if (!msg.trim()) return;
    await api.post("/messages", { application_id: appId, body: msg });
    setMsg(""); const m = await api.get(`/messages?application_id=${appId}`); setMessages(m.data);
  };
  const requestDocs = async () => {
    const fd = new FormData(); fd.append("application_id", appId); fd.append("message", "Bitte laden Sie Ihre Dokumente hoch.");
    await api.post("/documents/request", fd); toast.success("Dokumente angefordert");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {!app ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <>
            <SheetHeader className="p-6 border-b border-border bg-secondary/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/15 text-primary flex items-center justify-center"><User className="h-5 w-5" /></div>
                  <div>
                    <SheetTitle className="text-left">{app.form_data?.vorname} {app.form_data?.nachname || app.applicant_email}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{app.applicant_email}</p>
                  </div>
                </div>
                <span className={`font-mono text-sm font-bold px-2.5 py-1 rounded-md border ${scoreColor(app.matching_score)}`}>{app.matching_score}/100</span>
              </div>
            </SheetHeader>

            <div className="p-6 space-y-6">
              <div>
                <Label2>Status</Label2>
                <Select value={app.status} onValueChange={changeStatus}>
                  <SelectTrigger className="mt-1.5" data-testid="app-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
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
                  {Object.entries(app.form_data || {}).filter(([, v]) => v !== "" && v != null).map(([k, v]) => (
                    <div key={k} className="rounded-md bg-secondary/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                      <p className="font-medium truncate">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between"><Label2>Dokumente ({app.documents?.length || 0})</Label2>
                  <button onClick={requestDocs} className="text-xs text-primary hover:underline" data-testid="request-docs">Anfordern</button></div>
                <div className="mt-2 space-y-2">
                  {(!app.documents || app.documents.length === 0) && <p className="text-sm text-muted-foreground">Keine Dokumente hochgeladen.</p>}
                  {app.documents?.map((d) => (
                    <a key={d.id} href={`${API}/documents/${d.id}/download?auth=${token}`} target="_blank" rel="noreferrer"
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors" data-testid={`doc-${d.id}`}>
                      <span className="flex items-center gap-2 truncate"><FileText className="h-4 w-4 text-primary" /> <span className="truncate">{d.doc_type}</span></span>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <Label2>Interne Notizen</Label2>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => saveMeta({ internal_notes: notes })} className="mt-1.5" rows={2} placeholder="Nur für Sie sichtbar" />
              </div>

              <div>
                <Label2>Nachrichten</Label2>
                <div className="mt-2 space-y-2 max-h-52 overflow-y-auto">
                  {messages.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Nachrichten.</p>}
                  {messages.map((m) => (
                    <div key={m.id} className={`text-sm rounded-lg px-3 py-2 max-w-[85%] ${m.sender_role === "landlord" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      {m.body}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Nachricht…" data-testid="msg-input"
                    onKeyDown={(e) => e.key === "Enter" && sendMsg()} />
                  <Button size="icon" onClick={sendMsg} data-testid="msg-send"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const Label2 = ({ children }) => <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>;

export function Pipeline({ propertyId }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get(`/applications?property_id=${propertyId}`);
    setApps(data); setLoading(false);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  const onDragEnd = async (result) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStatus = destination.droppableId;
    setApps((prev) => prev.map((a) => (a.id === draggableId ? { ...a, status: newStatus } : a)));
    try { await api.patch(`/applications/${draggableId}/status`, { status: newStatus }); }
    catch { toast.error("Statusänderung fehlgeschlagen"); load(); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (apps.length === 0) return <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">Noch keine Bewerbungen für dieses Objekt.</div>;

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll">
          {COLUMNS.map((col) => {
            const items = apps.filter((a) => a.status === col.key);
            return (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} data-testid={`kanban-column-${col.key}`}
                    className={`min-w-[280px] w-[280px] rounded-xl border border-border bg-secondary/40 p-3 ${snapshot.isDraggingOver ? "ring-2 ring-primary/40" : ""}`}>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="font-semibold text-sm">{col.label}</span>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[40px]">
                      {items.map((a, idx) => (
                        <Draggable draggableId={a.id} index={idx} key={a.id}>
                          {(prov) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              onClick={() => setActiveId(a.id)} data-testid={`app-card-${a.id}`}
                              className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm truncate">{a.form_data?.vorname} {a.form_data?.nachname || a.applicant_email?.split("@")[0]}</p>
                                <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${scoreColor(a.matching_score)}`}>{a.matching_score}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {a.stars > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{a.stars}</span>}
                                <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" />{a.document_count}</span>
                              </div>
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
      <ApplicationSheet appId={activeId} open={!!activeId} onClose={() => setActiveId(null)} onChanged={load} />
    </>
  );
}
