import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChatThread } from "@/components/ChatThread";
import { ChatQuickActions } from "@/components/ChatQuickActions";
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

function Thread({ conversation, onSent }) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-5 py-3 shrink-0">
        <p className="font-semibold">{conversation.applicant_name}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
          {conversation.property_title && (
            <Link to={`/objekte/${conversation.property_id}`} className="flex items-center gap-1 hover:text-primary">
              <Building2 className="h-3.5 w-3.5" /> {conversation.property_title}
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ChatThread applicationId={conversation.application_id} myRole="landlord" onSent={onSent}
          quickActions={<ChatQuickActions conversation={conversation} onChanged={onSent} />} />
      </div>
    </div>
  );
}

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [q, setQ] = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      const { data } = await api.get("/conversations");
      setConversations(data);
    } catch { if (!silent) toast.error("Postfach konnte nicht geladen werden"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      [c.applicant_name, c.property_title, c.last_body].some((v) => (v || "").toLowerCase().includes(term)));
  }, [conversations, q]);

  const active = conversations.find((c) => c.application_id === activeId);
  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          Nachrichten
          {totalUnread > 0 && <Badge data-testid="inbox-unread">{totalUnread} ungelesen</Badge>}
        </h1>
        <p className="text-muted-foreground mt-1">Alle Unterhaltungen mit Bewerbern, über alle Objekte hinweg.</p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/50 p-16 text-center text-muted-foreground" data-testid="inbox-empty">
          <div className="h-14 w-14 rounded-2xl bg-accent text-primary flex items-center justify-center mx-auto mb-4"><Inbox className="h-6 w-6" /></div>
          <p className="font-display font-bold text-lg text-foreground">Noch keine Nachrichten</p>
          <p className="text-sm mt-1.5">Sobald Bewerber Ihnen schreiben, erscheinen die Unterhaltungen hier.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card shadow-soft overflow-hidden grid lg:grid-cols-[340px_1fr] h-[calc(100vh-260px)] min-h-[420px]">
          {/* Conversation list */}
          <div className={`border-r border-border flex flex-col min-h-0 ${active ? "hidden lg:flex" : "flex"}`}>
            <div className="p-3 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen…"
                  className="pl-8" data-testid="inbox-search" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0" data-testid="conversation-list">
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Keine Treffer</p>}
              {filtered.map((c) => (
                <button key={c.application_id} onClick={() => setActiveId(c.application_id)}
                  data-testid={`conversation-${c.application_id}`}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                    activeId === c.application_id ? "bg-accent/60" : "hover:bg-secondary/50"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${c.unread ? "font-bold" : "font-medium"}`}>{c.applicant_name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{relTime(c.last_at)}</span>
                  </div>
                  {c.property_title && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.property_title}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-xs truncate flex-1 ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>
                      {c.total === 0 ? (
                        <span className="italic">Noch keine Nachrichten – jetzt schreiben</span>
                      ) : (
                        <>
                          {c.last_sender_role === "landlord" && "Sie: "}
                          {c.last_body || <span className="italic">Nachricht zurückgezogen</span>}
                        </>
                      )}
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

          {/* Thread */}
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
                <p className="text-sm">Wählen Sie links eine Unterhaltung aus.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
