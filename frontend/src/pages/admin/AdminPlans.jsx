import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

const EMPTY_PLAN = {
  key: "", name: "", price_monthly: 0, price_yearly: 0, max_properties: 1,
  features: [], is_active: true, sort_order: 99, supports_team: false,
  monthly_lookup: "", yearly_lookup: "",
};

export default function AdminPlans() {
  const [plans, setPlans] = useState(null);
  const [promos, setPromos] = useState([]);
  const [promoOpen, setPromoOpen] = useState(false);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [newPlan, setNewPlan] = useState(EMPTY_PLAN);
  const [promo, setPromo] = useState({ name: "", plan_key: "all", start: "", end: "", discount_percent: "", fixed_price: "" });
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    api.get("/admin/plans").then((r) => setPlans(r.data)).catch(() => setError(true));
    api.get("/admin/promotions").then((r) => setPromos(r.data)).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  const setPlanField = (i, k, v) => setPlans(plans.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  const savePlan = async (p) => {
    try {
      await api.put(`/admin/plans/${p.key}`, {
        key: p.key, name: p.name, price_monthly: Number(p.price_monthly), price_yearly: Number(p.price_yearly),
        max_properties: Number(p.max_properties),
        features: typeof p.features === "string" ? p.features.split("\n").map((s) => s.trim()).filter(Boolean) : (p.features || []),
        is_active: p.is_active, supports_team: p.supports_team,
        sort_order: p.sort_order, monthly_lookup: p.monthly_lookup, yearly_lookup: p.yearly_lookup,
      });
      toast.success("Paket gespeichert");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const createPlan = async () => {
    try {
      await api.put(`/admin/plans/${newPlan.key}`, {
        ...newPlan,
        price_monthly: Number(newPlan.price_monthly), price_yearly: Number(newPlan.price_yearly),
        max_properties: Number(newPlan.max_properties),
        features: typeof newPlan.features === "string" ? newPlan.features.split("\n").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success("Paket erstellt"); setNewPlanOpen(false); setNewPlan(EMPTY_PLAN); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const createPromo = async () => {
    try {
      await api.post("/admin/promotions", {
        name: promo.name, plan_key: promo.plan_key, start: new Date(promo.start).toISOString(), end: new Date(promo.end).toISOString(),
        discount_percent: promo.discount_percent ? Number(promo.discount_percent) : null,
        fixed_price: promo.fixed_price ? Number(promo.fixed_price) : null, active: true, show_on_landing: true,
      });
      toast.success("Aktion erstellt"); setPromoOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const delPromo = async (id) => {
    if (!window.confirm("Aktion wirklich löschen?")) return;
    try { await api.delete(`/admin/promotions/${id}`); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (error) return <p className="text-sm text-destructive py-20 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;
  if (!plans) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl">
      <div><h1 className="font-display text-3xl font-bold">Pakete & Aktionen</h1></div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg">Pakete</h2>
            <p className="text-xs text-amber-600 mt-1 max-w-md">⚠ Preise hier ändern nur die Anzeige. Der tatsächliche Stripe-Preis (Lookup-Key) ändert sich dadurch NICHT — für eine echte Preisänderung müssen Sie einen neuen Stripe-Preis anlegen und den Lookup-Key hier eintragen.</p>
          </div>
          <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
            <DialogTrigger asChild><Button variant="outline" data-testid="new-plan"><Plus className="h-4 w-4 mr-1" /> Neues Paket</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Neues Paket</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Key (eindeutig, z.B. "profi")</Label><Input value={newPlan.key} onChange={(e) => setNewPlan({ ...newPlan, key: e.target.value })} className="mt-1.5" /></div>
                <div><Label>Name</Label><Input value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} className="mt-1.5" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Monatlich €</Label><Input type="number" value={newPlan.price_monthly} onChange={(e) => setNewPlan({ ...newPlan, price_monthly: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>Jährlich €</Label><Input type="number" value={newPlan.price_yearly} onChange={(e) => setNewPlan({ ...newPlan, price_yearly: e.target.value })} className="mt-1.5" /></div>
                </div>
                <div><Label>Max. Objekte</Label><Input type="number" value={newPlan.max_properties} onChange={(e) => setNewPlan({ ...newPlan, max_properties: e.target.value })} className="mt-1.5" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Stripe Lookup-Key monatlich</Label><Input value={newPlan.monthly_lookup} onChange={(e) => setNewPlan({ ...newPlan, monthly_lookup: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>Stripe Lookup-Key jährlich</Label><Input value={newPlan.yearly_lookup} onChange={(e) => setNewPlan({ ...newPlan, yearly_lookup: e.target.value })} className="mt-1.5" /></div>
                </div>
                <div><Label>Features (eine Zeile pro Punkt)</Label><Textarea rows={4} value={newPlan.features} onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })} className="mt-1.5" /></div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newPlan.supports_team} onChange={(e) => setNewPlan({ ...newPlan, supports_team: e.target.checked })} /> Team-Funktion</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newPlan.is_active} onChange={(e) => setNewPlan({ ...newPlan, is_active: e.target.checked })} /> Aktiv (öffentlich sichtbar)</label>
                </div>
              </div>
              <DialogFooter><Button onClick={createPlan} disabled={!newPlan.key || !newPlan.name}>Erstellen</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {plans.map((p, i) => (
          <div key={p.key} className="rounded-xl border border-border bg-card p-5" data-testid={`admin-plan-${p.key}`}>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40"><Label>Name</Label><Input value={p.name} onChange={(e) => setPlanField(i, "name", e.target.value)} className="mt-1.5" /></div>
              <div className="w-28"><Label>Monatlich €</Label><Input type="number" value={p.price_monthly} onChange={(e) => setPlanField(i, "price_monthly", e.target.value)} className="mt-1.5" /></div>
              <div className="w-28"><Label>Jährlich €</Label><Input type="number" value={p.price_yearly} onChange={(e) => setPlanField(i, "price_yearly", e.target.value)} className="mt-1.5" /></div>
              <div className="w-24"><Label>Max. Objekte</Label><Input type="number" value={p.max_properties} onChange={(e) => setPlanField(i, "max_properties", e.target.value)} className="mt-1.5" /></div>
              <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={!!p.supports_team} onChange={(e) => setPlanField(i, "supports_team", e.target.checked)} /> Team-Funktion</label>
              <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={p.is_active !== false} onChange={(e) => setPlanField(i, "is_active", e.target.checked)} /> Aktiv</label>
              <Button onClick={() => savePlan(p)} data-testid={`save-plan-${p.key}`}><Save className="h-4 w-4 mr-1" /> Speichern</Button>
            </div>
            <div className="mt-3">
              <Label>Features (eine Zeile pro Punkt, öffentlich sichtbar auf Preis-/Abo-Seite)</Label>
              <Textarea rows={3} value={Array.isArray(p.features) ? p.features.join("\n") : (p.features || "")}
                onChange={(e) => setPlanField(i, "features", e.target.value)} className="mt-1.5" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Rabattaktionen</h2>
          <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
            <DialogTrigger asChild><Button data-testid="new-promo"><Plus className="h-4 w-4 mr-1" /> Aktion erstellen</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Neue Aktion</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={promo.name} onChange={(e) => setPromo({ ...promo, name: e.target.value })} className="mt-1.5" placeholder="z.B. Launch-Angebot" data-testid="promo-name" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start</Label><Input type="date" value={promo.start} onChange={(e) => setPromo({ ...promo, start: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>Ende</Label><Input type="date" value={promo.end} onChange={(e) => setPromo({ ...promo, end: e.target.value })} className="mt-1.5" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Rabatt %</Label><Input type="number" value={promo.discount_percent} onChange={(e) => setPromo({ ...promo, discount_percent: e.target.value })} className="mt-1.5" /></div>
                  <div><Label>oder Festpreis €</Label><Input type="number" value={promo.fixed_price} onChange={(e) => setPromo({ ...promo, fixed_price: e.target.value })} className="mt-1.5" /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={createPromo}>Erstellen</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {promos.length === 0 ? <p className="text-sm text-muted-foreground">Keine Aktionen.</p> : (
          <div className="space-y-2">
            {promos.map((pr) => (
              <div key={pr.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{pr.name} <Badge variant="secondary" className="ml-2">{pr.plan_key}</Badge></p>
                  <p className="text-sm text-muted-foreground">{pr.discount_percent ? `−${pr.discount_percent}%` : `${pr.fixed_price} €`} · {new Date(pr.start).toLocaleDateString("de-DE")} – {new Date(pr.end).toLocaleDateString("de-DE")}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => delPromo(pr.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
