import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

const SUB_STATUSES = ["active", "cancelled", "inactive"];
const TYPE_LABELS = { private: "Privater Vermieter", makler: "Makler", hausverwaltung: "Hausverwaltung" };

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ plan_key: "none", status: "active", white_label_addon: false, note: "" });

  const load = () => {
    setError(false);
    Promise.all([api.get("/admin/organizations"), api.get("/admin/plans")])
      .then(([o, p]) => { setOrgs(o.data); setPlans(p.data); })
      .catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (o) => {
    setEditing(o);
    setForm({ plan_key: o.plan || "none", status: o.subscription_status || "active", white_label_addon: !!o.white_label_addon, note: "" });
  };

  const save = async () => {
    try {
      await api.post(`/admin/organizations/${editing.id}/subscription`, form);
      toast.success("Abo aktualisiert"); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!orgs) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return <p className="text-sm text-destructive py-10 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl font-bold">Organisationen</h1>
      <div className="rounded-2xl border border-border/70 bg-card shadow-soft overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Typ</TableHead><TableHead>Mitglieder</TableHead><TableHead>Objekte</TableHead><TableHead>Paket</TableHead><TableHead>White-Label</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell>{TYPE_LABELS[o.type] || o.type}</TableCell>
                <TableCell>{o.member_count}</TableCell>
                <TableCell>{o.property_count}</TableCell>
                <TableCell>{o.plan ? (plans.find((p) => p.key === o.plan)?.name || o.plan) : "—"}{o.subscription_status && o.subscription_status !== "active" ? ` (${o.subscription_status})` : ""}</TableCell>
                <TableCell>{o.white_label_addon ? <Badge>Gebucht</Badge> : "—"}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abo für {editing?.name} setzen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Für manuell abgeschlossene Deals (z.B. Banküberweisung), ohne dass der Kunde den Stripe-Checkout durchläuft.</p>
            <div><Label>Paket</Label>
              <Select value={form.plan_key} onValueChange={(v) => setForm({ ...form, plan_key: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Paket</SelectItem>
                  {plans.map((p) => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.plan_key !== "none" && (
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{SUB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.white_label_addon} onChange={(e) => setForm({ ...form, white_label_addon: e.target.checked })} /> White-Label Add-on aktiv</label>
            <div><Label>Notiz (intern, optional)</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1.5" placeholder="z.B. Banküberweisung 25.07." /></div>
          </div>
          <DialogFooter><Button onClick={save}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
