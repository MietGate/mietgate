import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MessageSquare, Loader2, Send, Building2, Search, ArrowLeft, Inbox,
} from "lucide-react";

const relTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  if (mins < 1440) return `vor ${Math.round(mins / 60)} Std.`;
  if (mins < 10080) return `vor ${Math.round(mins / 1440)} Tg.`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
};

function Thread({ conversation, onSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  /* `silent` skips the spinner so a background refresh doesn't blank the open thread. */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/messages?application_id=${conversation.application_id}`);
      setMessages(data);
    } catch { if (!silent) toast.error("Nachrichten konnten nicht geladen werden"); }
    finally { if (!silent) setLoading(false); }
  }, [conversation.application_id]);

  useEffect(() => { load(); }, [load]);

  // Without this, a reply only showed up after a full page reload.
  useEffect(() => {
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.post("/messages", { application_id: conversation.application_id, body: body.trim() });
      setBody("");
      await load(true);
      onSent?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-5 py-3 shrink-0">
        <p className="font-semibold">{conversation.property_title || "Vermieter"}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0" data-testid="applicant-message-thread">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Noch keine Nachrichten. Schreiben Sie dem Vermieter, z.B. um eine Frage zur Bewerbung zu stellen.
          </p>
        ) : messages.map((m) => {
          const mine = m.sender_role === "applicant";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[11px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {m.sender_name} · {relTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Nachricht schreiben…" data-testid="applicant-message-input"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="resize-none" />
          <Button onClick={send} disabled={sending || !body.trim()} data-testid="applicant-message-send">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">Enter zum Senden · Umschalt + Enter für eine neue Zeile</p>
      </div>
    </div>
  );
}

export default function ApplicantMessages() {
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(searchParams.get("application_id"));
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const [appsRes, convRes] = await Promise.all([api.get("/my/applications"), api.get("/conversations")]);
      setApplications(appsRes.data);
      setConversations(convRes.data);
    } catch { toast.error("Nachrichten konnten nicht geladen werden"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Every application is a potential conversation, even before the first message is sent —
  // otherwise an applicant could never start a conversation, only reply to one the landlord began.
  const items = useMemo(() => {
    if (!applications) return null;
    const byApp = new Map(conversations.map((c) => [c.application_id, c]));
    return applications.map((a) => byApp.get(a.id) || {
      application_id: a.id, property_title: a.property_title,
      last_body: null, last_at: a.created_at, last_sender_role: null, total: 0, unread: 0,
    }).sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  }, [applications, conversations]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) => [c.property_title, c.last_body].some((v) => (v || "").toLowerCase().includes(term)));
  }, [items, q]);

  const active = items?.find((c) => c.application_id === activeId);
  const totalUnread = items?.reduce((s, c) => s + (c.unread || 0), 0) || 0;

  if (!items) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          Nachrichten
          {totalUnread > 0 && <Badge data-testid="applicant-inbox-unread">{totalUnread} ungelesen</Badge>}
        </h1>
        <p className="text-muted-foreground mt-1">Ihre Unterhaltungen mit Vermietern, pro Bewerbung.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground" data-testid="applicant-inbox-empty">
          <Inbox className="h-10 w-10 mx-auto mb-3" />
          <p className="font-medium text-foreground">Noch keine Bewerbungen</p>
          <p className="text-sm mt-1">Sobald Sie sich beworben haben, können Sie hier mit Vermietern schreiben.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden grid lg:grid-cols-[340px_1fr] h-[calc(100vh-260px)] min-h-[420px]">
          <div className={`border-r border-border flex flex-col min-h-0 ${active ? "hidden lg:flex" : "flex"}`}>
            <div className="p-3 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen…"
                  className="pl-8" data-testid="applicant-inbox-search" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0" data-testid="applicant-conversation-list">
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Keine Treffer</p>}
              {filtered.map((c) => (
                <button key={c.application_id} onClick={() => setActiveId(c.application_id)}
                  data-testid={`applicant-conversation-${c.application_id}`}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                    activeId === c.application_id ? "bg-accent/60" : "hover:bg-secondary/50"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate flex items-center gap-1.5 ${c.unread ? "font-bold" : "font-medium"}`}>
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {c.property_title || "Objekt"}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{relTime(c.last_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-xs truncate flex-1 ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>
                      {c.total === 0 ? "Noch keine Nachrichten – jetzt schreiben" : `${c.last_sender_role === "applicant" ? "Sie: " : ""}${c.last_body}`}
                    </p>
                    {c.unread > 0 && (
                      <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`min-h-0 ${active ? "flex flex-col" : "hidden lg:flex"}`}>
            {active ? (
              <>
                <button onClick={() => setActiveId(null)} className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground px-4 py-2 border-b border-border">
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </button>
                <div className="flex-1 min-h-0">
                  <Thread conversation={active} onSent={load} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <MessageSquare className="h-10 w-10 mb-3" />
                <p className="text-sm">Wählen Sie links eine Bewerbung aus.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
