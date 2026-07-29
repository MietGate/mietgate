import { useCallback, useEffect, useRef, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send, Smile, Reply, Undo2, X } from "lucide-react";

/* A curated set beats pulling in an emoji-picker dependency for a handful of reactions,
   and keeps the bundle (and the CSP surface) unchanged. */
const EMOJIS = [
  "🙂", "👍", "🙏", "🎉", "👋", "😊", "😅", "🤝",
  "✅", "❌", "❓", "⏰", "📅", "📄", "🏠", "🔑",
];

const relTime = (iso) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  if (mins < 1440) return `vor ${Math.round(mins / 60)} Std.`;
  if (mins < 10080) return `vor ${Math.round(mins / 1440)} Tg.`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
};

/** Shared conversation view. `myRole` decides which side messages are drawn on. */
export function ChatThread({ applicationId, myRole, onSent, quickActions, testIdPrefix = "message" }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  /* `silent` skips the spinner: a background refresh must not blank out a thread the
     user is reading, which is what made sending feel slow. */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/messages?application_id=${applicationId}`);
      setMessages(data);
    } catch { if (!silent) toast.error("Nachrichten konnten nicht geladen werden"); }
    finally { if (!silent) setLoading(false); }
  }, [applicationId]);

  useEffect(() => { load(); setReplyTo(null); }, [load]);

  // Without this, a reply only showed up after a full page reload.
  useEffect(() => {
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const send = async () => {
    if (!body.trim()) return;
    const text = body.trim();
    const pendingReplyTo = replyTo;
    setSending(true);
    try {
      // The POST already returns the finished message, so the bubble can appear right away
      // instead of waiting on a full reload — that round-trip happens in the background.
      const { data } = await api.post("/messages", {
        application_id: applicationId, body: text, reply_to: pendingReplyTo?.id || null,
      });
      setMessages((m) => [...m, data]);
      setBody(""); setReplyTo(null);
      load(true);
      onSent?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSending(false); }
  };

  const retract = async (m) => {
    if (!window.confirm("Nachricht zurückziehen? Der Empfänger sieht dann nur noch, dass Sie sie zurückgezogen haben.")) return;
    try { await api.post(`/messages/${m.id}/retract`); await load(true); onSent?.(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const insertEmoji = (e) => {
    setBody((b) => b + e);
    setEmojiOpen(false);
    inputRef.current?.focus();
  };

  const quoted = (m) => messages.find((x) => x.id === m.reply_to);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0" data-testid={`${testIdPrefix}-thread`}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Noch keine Nachrichten.</p>
        ) : messages.map((m) => {
          const mine = m.sender_role === myRole;
          const q = m.reply_to ? quoted(m) : null;
          return (
            <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              {/* Actions sit outside the bubble so they never cover the text. */}
              {mine && !m.retracted && (
                <button onClick={() => retract(m)} title="Zurückziehen" data-testid={`retract-${m.id}`}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
              )}
              {!m.retracted && (
                <button onClick={() => { setReplyTo(m); inputRef.current?.focus(); }} title="Antworten"
                  data-testid={`reply-${m.id}`}
                  className={`opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-secondary text-muted-foreground ${mine ? "order-first" : "order-last"}`}>
                  <Reply className="h-3.5 w-3.5" />
                </button>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                m.retracted ? "bg-secondary/60 text-muted-foreground italic"
                  : mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {q && (
                  <div className={`mb-1.5 rounded-lg px-2.5 py-1.5 text-xs border-l-2 ${
                    mine ? "bg-primary-foreground/15 border-primary-foreground/40" : "bg-background/60 border-primary"}`}>
                    <p className="font-semibold truncate">{q.sender_name}</p>
                    <p className="truncate opacity-80">{q.retracted ? "Zurückgezogene Nachricht" : q.body}</p>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">
                  {m.retracted ? "Diese Nachricht wurde zurückgezogen." : m.body}
                </p>
                <p className={`text-[11px] mt-1 ${mine && !m.retracted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {m.sender_name} · {relTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 shrink-0">
        {quickActions}
        {replyTo && (
          <div className="flex items-start gap-2 rounded-md bg-secondary px-3 py-2 mb-2 text-xs" data-testid="reply-preview">
            <div className="min-w-0 flex-1 border-l-2 border-primary pl-2">
              <p className="font-semibold truncate">Antwort an {replyTo.sender_name}</p>
              <p className="truncate text-muted-foreground">{replyTo.body}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-2 -m-1.5 rounded hover:bg-background" aria-label="Antwort verwerfen">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {emojiOpen && (
          <div className="grid grid-cols-8 gap-1 rounded-md border border-border bg-card p-2 mb-2" data-testid="emoji-picker">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => insertEmoji(e)} className="text-lg rounded hover:bg-secondary py-1" aria-label={e}>
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Button variant="ghost" size="icon" onClick={() => setEmojiOpen((o) => !o)}
            aria-label="Emoji einfügen" data-testid="emoji-toggle">
            <Smile className="h-4 w-4" />
          </Button>
          <Textarea ref={inputRef} rows={2} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Nachricht schreiben…" data-testid={`${testIdPrefix}-input`}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="resize-none" />
          <Button onClick={send} disabled={sending || !body.trim()} data-testid={`${testIdPrefix}-send`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">Enter zum Senden · Umschalt + Enter für eine neue Zeile</p>
      </div>
    </div>
  );
}
