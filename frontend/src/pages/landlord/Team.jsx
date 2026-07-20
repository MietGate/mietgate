import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Loader2, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const ROLE_LABEL = { owner: "Owner", admin: "Admin", employee: "Mitarbeiter", assistant: "Assistent" };

export default function Team() {
  const [members, setMembers] = useState(null);
  const [supported, setSupported] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");

  const load = () => api.get("/organization/members").then((r) => setMembers(r.data)).catch(() => setMembers([]));
  useEffect(() => {
    load();
    api.get("/subscription").then((r) => setSupported(!!r.data.supports_team)).catch(() => setSupported(false));
  }, []);

  const invite = async () => {
    try { await api.post("/organization/members", { email, role }); toast.success("Mitglied hinzugefügt"); setOpen(false); setEmail(""); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async (id) => { await api.delete(`/organization/members/${id}`); toast.success("Entfernt"); load(); };

  if (!members) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl font-bold">Team</h1><p className="text-muted-foreground mt-1">Mitarbeiter und Rollen verwalten.</p></div>
        {supported && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="invite-member"><UserPlus className="h-4 w-4 mr-1" /> Mitglied einladen</Button></DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Mitglied einladen</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>E-Mail des Nutzers</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="kollege@firma.de" data-testid="member-email" /><p className="text-xs text-muted-foreground mt-1">Der Nutzer muss bereits ein MietGate-Konto haben.</p></div>
              <div><Label>Rolle</Label>
                <Select value={role} onValueChange={setRole}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="employee">Mitarbeiter</SelectItem><SelectItem value="assistant">Assistent</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={invite}>Hinzufügen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {!supported && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-accent/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-testid="team-upsell">
          <div>
            <h3 className="font-display font-bold flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Team-Funktion nicht verfügbar</h3>
            <p className="text-sm text-muted-foreground mt-1">Mitarbeiter & Rollen sind im Makler-/Hausverwaltungs-Paket enthalten. Upgraden Sie, um Ihr Team einzuladen.</p>
          </div>
          <Button asChild><Link to="/abo">Paket upgraden</Link></Button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-4" data-testid={`member-${m.id}`}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">{(m.name?.[0] || "?").toUpperCase()}</div>
              <div><p className="font-medium">{m.name}</p><p className="text-sm text-muted-foreground">{m.email}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={m.role === "owner" ? "default" : "secondary"}>{ROLE_LABEL[m.role]}</Badge>
              {m.role !== "owner" && <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
