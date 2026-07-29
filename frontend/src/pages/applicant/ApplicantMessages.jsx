import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChatThread } from "@/components/ChatThread";
import { toast } from "sonner";
import {
  MessageSquare, Loader2, Building2, Search, ArrowLeft, Inbox,
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

function Thread({ conversation, onSent, onBack }) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-2.5 shrink-0 flex items-center justify-between gap-3">
        <p className="font-semibold truncate">{conversation.property_title || "Vermieter"}</p>
        {onBack && (
          <button onClick={onBack} className="lg:hidden shrink-0 p-2.5 -m-1 rounded-md hover:bg-secondary text-muted-foreground"
            aria-label="Zurück zur Übersicht" data-testid="applicant-thread-back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ChatThread applicationId={conversation.application_id} myRole="applicant"
          onSent={onSent} testIdPrefix="applicant-message" />
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
  const { setHeaderHidden } = useOutletContext() || {};

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

  // The chat needs the screen on mobile, so the global header (menu/search/bell) steps
  // aside while a conversation is open — otherwise it stacks on top of the thread's own
  // back button and name for no reason.
  useEffect(() => {
    setHeaderHidden?.(!!active);
    return () => setHeaderHidden?.(false);
  }, [active, setHeaderHidden]);

  if (!items) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="lg:space-y-6 animate-fade-up">
      {/* Hidden on mobile entirely — the sidebar nav already shows "Nachrichten" as active, so
          repeating it as a page title just eats screen space on small viewports. */}
      <div className="hidden lg:block">
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          Nachrichten
          {totalUnread > 0 && <Badge data-testid="applicant-inbox-unread">{totalUnread} ungelesen</Badge>}
        </h1>
        <p className="text-muted-foreground mt-1">Ihre Unterhaltungen mit Vermietern, pro Bewerbung.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/50 p-16 text-center text-muted-foreground" data-testid="applicant-inbox-empty">
          <div className="h-14 w-14 rounded-2xl bg-accent text-primary flex items-center justify-center mx-auto mb-4"><Inbox className="h-6 w-6" /></div>
          <p className="font-display font-bold text-lg text-foreground">Noch keine Bewerbungen</p>
          <p className="text-sm mt-1.5">Sobald Sie sich beworben haben, können Sie hier mit Vermietern schreiben.</p>
        </div>
      ) : (
        <div className={`${active ? "" : "-mx-4 mt-4"} lg:mx-0 lg:mt-0 rounded-none lg:rounded-2xl border-0 lg:border border-border/70 bg-card shadow-none lg:shadow-soft overflow-hidden grid lg:grid-cols-[340px_1fr] ${active ? "h-[100dvh]" : "h-[calc(100dvh-116px)]"} lg:h-[calc(100vh-260px)] min-h-[420px]`}>
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
              <div className="flex-1 min-h-0">
                <Thread conversation={active} onSent={load} onBack={() => setActiveId(null)} />
              </div>
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
