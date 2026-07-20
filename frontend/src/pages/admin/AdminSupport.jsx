import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/admin/support-tickets"), api.get("/admin/activities")]).then(([t, a]) => {
      setTickets(t.data); setActivities(a.data); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-4xl">
      <h1 className="font-display text-3xl font-bold">Support & Logs</h1>
      <Tabs defaultValue="tickets">
        <TabsList><TabsTrigger value="tickets">Kontaktanfragen</TabsTrigger><TabsTrigger value="logs">Audit Logs</TabsTrigger></TabsList>
        <TabsContent value="tickets" className="mt-6 space-y-2">
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">Keine Anfragen.</p>}
          {tickets.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between"><p className="font-medium">{t.name} · <span className="text-muted-foreground">{t.email}</span></p><Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge></div>
              <p className="text-sm text-muted-foreground mt-1">{t.message}</p>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="logs" className="mt-6 space-y-1">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
              <Badge variant="outline" className="font-mono text-xs">{a.action}</Badge>
              <span className="text-muted-foreground">{a.entity}</span>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("de-DE")}</span>
            </div>
          ))}
          {activities.length === 0 && <p className="text-sm text-muted-foreground">Keine Aktivitäten.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
