import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Search, Ban, CheckCircle2 } from "lucide-react";

const ROLE_LABELS = { landlord: "Vermieter", applicant: "Bewerber", admin: "Administrator" };

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState(false);

  const load = (query = "") => {
    setError(false);
    api.get(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`).then((r) => setUsers(r.data)).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  const toggle = async (u) => {
    if (!window.confirm(u.is_blocked ? `${u.name || u.email} entsperren?` : `${u.name || u.email} sperren? Der Nutzer kann sich danach nicht mehr einloggen.`)) return;
    try {
      await api.post(`/admin/users/${u.id}/${u.is_blocked ? "unblock" : "block"}`);
      toast.success(u.is_blocked ? "Entsperrt" : "Gesperrt"); load(q);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (error) return <p className="text-sm text-destructive py-20 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={() => load(q)}>Erneut versuchen</button></p>;
  if (!users) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div><h1 className="font-display text-3xl font-bold">Nutzerverwaltung</h1></div>
      <div className="flex gap-2 max-w-md">
        <Input placeholder="Name oder E-Mail suchen…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(q)} data-testid="user-search" />
        <Button onClick={() => load(q)}><Search className="h-4 w-4" /></Button>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>E-Mail</TableHead><TableHead>Rolle</TableHead><TableHead>Organisation</TableHead><TableHead>Paket</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} data-testid={`admin-user-${u.id}`}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant="secondary">{ROLE_LABELS[u.role] || u.role}</Badge></TableCell>
                <TableCell>{u.org_name || "—"}</TableCell>
                <TableCell className="capitalize">{u.plan || "—"}</TableCell>
                <TableCell>{u.is_blocked ? <Badge variant="destructive">Gesperrt</Badge> : <Badge className="bg-success text-success-foreground">Aktiv</Badge>}</TableCell>
                <TableCell>
                  {u.role !== "admin" && (
                    <Button size="sm" variant="ghost" onClick={() => toggle(u)} data-testid={`toggle-user-${u.id}`}>
                      {u.is_blocked ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
