import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Loader2, Lock, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const ROLE_LABEL = { owner: "Owner", admin: "Admin", employee: "Mitarbeiter", assistant: "Assistent" };

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState(null);
  const [invites, setInvites] = useState([]);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");

  const load = () => {
    setError(false);
    api.get("/organization/members").then((r) => setMembers(r.data)).catch(() => setError(true));
    api.get("/organization/invites").then((r) => setInvites(r.data)).catch(() => {});
    api.get("/subscription").then((r) => setSupported(!!r.data.supports_team)).catch(() => setSupported(false));
  };
  useEffect(() => { load(); }, []);

  const myRole = members?.find((m) => m.user_id === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  const invite = async () => {
    try {
      const { data } = await api.post("/organization/members", { email, role, origin_url: window.location.origin });
      toast.success(data.pending ? "Einladung per E-Mail versendet" : "Mitglied hinzugefügt");
      setOpen(false); setEmail(""); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const cancelInvite = async (id) => {
    try { await api.delete(`/organization/invites/${id}`); toast.success("Einladung storniert"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async (id, isSelf) => {
    const msg = isSelf ? "Sich selbst wirklich aus dem Team entfernen? Sie verlieren sofort den Zugriff auf diese Organisation." : "Dieses Mitglied wirklich entfernen? Der Zugriff wird sofort entzogen.";
    if (!window.confirm(msg)) return;
    try { await api.delete(`/organization/members/${id}`); toast.success("Entfernt"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const changeRole = async (id, newRole) => {
    try { await api.patch(`/organization/members/${id}`, { role: newRole }); toast.success("Rolle geändert"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (error) return <p className="text-sm text-destructive py-20 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;
  if (!members) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl font-bold">Team</h1><p className="text-muted-foreground mt-1">Mitarbeiter und Rollen verwalten.</p></div>
        {supported && canManage && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="invite-member"><UserPlus className="h-4 w-4 mr-1" /> Mitglied einladen</Button></DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Mitglied einladen</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>E-Mail des Nutzers</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="kollege@firma.de" data-testid="member-email" /><p className="text-xs text-muted-foreground mt-1">Hat die Person noch kein MietGate-Konto, senden wir automatisch eine Einladung per E-Mail zur Registrierung.</p></div>
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
              {m.role !== "owner" && canManage ? (
                <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                  <SelectTrigger className="w-36 h-8" data-testid={`role-select-${m.id}`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="employee">Mitarbeiter</SelectItem><SelectItem value="assistant">Assistent</SelectItem></SelectContent>
                </Select>
              ) : (
                <Badge variant={m.role === "owner" ? "default" : "secondary"}>{ROLE_LABEL[m.role]}</Badge>
              )}
              {m.role !== "owner" && canManage && <Button variant="ghost" size="icon" onClick={() => remove(m.id, m.user_id === user?.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Ausstehende Einladungen</h2>
          <div className="rounded-xl border border-dashed border-border bg-card divide-y divide-border">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4" data-testid={`invite-${inv.id}`}>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent text-primary flex items-center justify-center"><Mail className="h-4 w-4" /></div>
                  <div><p className="font-medium">{inv.email}</p><p className="text-sm text-muted-foreground">Wartet auf Registrierung — Rolle: {ROLE_LABEL[inv.role] || inv.role}</p></div>
                </div>
                {canManage && <Button variant="ghost" size="icon" onClick={() => cancelInvite(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
