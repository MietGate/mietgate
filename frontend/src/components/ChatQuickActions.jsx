import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarPlus, Star } from "lucide-react";
import { STATUS_COLUMNS, confirmStatusChange } from "@/lib/applicationStatus";

/* The inbox is where a landlord actually talks to applicants, so the three decisions that
   follow from a conversation belong here — otherwise each one means leaving the thread,
   finding the applicant on the board, and losing the context you just built up. */
export function ChatQuickActions({ conversation, onChanged }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [openPanel, setOpenPanel] = useState(null); // null | "status" | "stars"

  const appId = conversation.application_id;

  const inviteToViewing = () => {
    // Straight to appointment creation with this applicant already ticked.
    navigate(`/objekte/${conversation.property_id}?tab=viewings&invite=${appId}`);
  };

  const changeStatus = async (status) => {
    // The inbox has no board to count against; the backend only mass-rejects on request,
    // so declining here simply leaves the other applicants untouched.
    const opts = confirmStatusChange(status, 0);
    if (!opts) return;
    setBusy(true);
    try {
      await api.patch(`/applications/${appId}/status`, { status, ...opts });
      toast.success("Status aktualisiert");
      setOpenPanel(null);
      onChanged?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const setStars = async (stars) => {
    setBusy(true);
    try {
      await api.patch(`/applications/${appId}`, { stars });
      toast.success("Bewertung gespeichert");
      setOpenPanel(null);
      onChanged?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="mb-2" data-testid="chat-quick-actions">
      <div className="grid grid-cols-3 gap-1.5">
        <Button size="sm" variant="outline" onClick={inviteToViewing} data-testid="qa-invite"
          className="h-auto min-h-9 py-1.5 px-1.5 whitespace-normal leading-tight text-center">
          <CalendarPlus className="h-3.5 w-3.5 mr-1 shrink-0" /> Zu Besichtigung einladen
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpenPanel(openPanel === "status" ? null : "status")}
          data-testid="qa-status" className="h-auto min-h-9 py-1.5 px-1.5 whitespace-normal leading-tight text-center">
          Phase ändern
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpenPanel(openPanel === "stars" ? null : "stars")}
          data-testid="qa-stars" className="h-auto min-h-9 py-1.5 px-1.5 whitespace-normal leading-tight text-center">
          <Star className="h-3.5 w-3.5 mr-1 shrink-0" /> Bewerten
        </Button>
      </div>

      {openPanel === "status" && (
        <div className="mt-2">
          <Select onValueChange={changeStatus} disabled={busy}>
            <SelectTrigger data-testid="qa-status-select"><SelectValue placeholder="Neue Phase wählen" /></SelectTrigger>
            <SelectContent>
              {STATUS_COLUMNS.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {openPanel === "stars" && (
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} disabled={busy} data-testid={`qa-star-${n}`}
              aria-label={`${n} Sterne`}>
              <Star className="h-6 w-6 text-muted-foreground hover:fill-amber-400 hover:text-amber-400 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
