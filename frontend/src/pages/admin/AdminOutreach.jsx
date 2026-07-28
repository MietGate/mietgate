import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Copy, Check, Save, RotateCcw, Megaphone } from "lucide-react";

const SITE = "https://www.mietgate.de";

export default function AdminOutreach() {
  const [templates, setTemplates] = useState(null);
  const [ort, setOrt] = useState("");
  const [absender, setAbsender] = useState("");
  const [busy, setBusy] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = () => api.get("/admin/outreach-templates").then((r) => setTemplates(r.data))
    .catch(() => toast.error("Vorlagen konnten nicht geladen werden"));
  useEffect(load, []);

  const setField = (key, patch) => setTemplates(templates.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  // Each template gets its own ?ref= so the admin funnel can tell which wording converts.
  const linkFor = (key) => `${SITE}/?ref=ka-${key}`;
  const filled = (t) => t.body
    .replaceAll("{{ort}}", ort.trim() || "Ihrer Stadt")
    .replaceAll("{{absender}}", absender.trim() || "Ihr Name")
    .replaceAll("{{link}}", linkFor(t.key));

  const copy = async (t) => {
    await navigator.clipboard.writeText(filled(t));
    setCopied(t.key);
    toast.success("Anschreiben kopiert");
    setTimeout(() => setCopied(null), 2000);
  };

  const save = async (t) => {
    setBusy(t.key);
    try {
      await api.put(`/admin/outreach-templates/${t.key}`, { name: t.name, body: t.body });
      toast.success("Vorlage gespeichert");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };

  const reset = async (t) => {
    setBusy(t.key);
    try { await api.delete(`/admin/outreach-templates/${t.key}`); toast.success("Auf Standard zurückgesetzt"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };

  if (!templates) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Anschreiben</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vorlagen für die Ansprache von Vermietern auf Kleinanzeigen. Jede Vorlage nutzt einen eigenen
          Link, damit Sie im Trichter sehen, welche Formulierung am besten konvertiert.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card shadow-soft p-5 grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Ort des Inserats</Label>
          <Input value={ort} onChange={(e) => setOrt(e.target.value)} className="mt-1.5" placeholder="z.B. Hamburg-Altona" data-testid="outreach-ort" />
        </div>
        <div>
          <Label>Ihr Name</Label>
          <Input value={absender} onChange={(e) => setAbsender(e.target.value)} className="mt-1.5" placeholder="z.B. Henry von MietGate" data-testid="outreach-absender" />
        </div>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Diese Angaben werden beim Kopieren automatisch eingesetzt — die Vorlage selbst bleibt unverändert.
        </p>
      </div>

      {templates.map((t) => (
        <div key={t.key} className="rounded-2xl border border-border/70 bg-card shadow-soft overflow-hidden" data-testid={`outreach-${t.key}`}>
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
            <h2 className="font-display font-bold flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> {t.name}</h2>
            <Button size="sm" onClick={() => copy(t)} data-testid={`copy-${t.key}`}>
              {copied === t.key ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />} Kopieren
            </Button>
          </div>
          <div className="p-5 space-y-3">
            <div className="rounded-lg bg-secondary/50 p-3 text-sm whitespace-pre-wrap" data-testid={`preview-${t.key}`}>
              {filled(t)}
            </div>
            <details>
              <summary className="text-sm text-muted-foreground cursor-pointer">Vorlage bearbeiten</summary>
              <div className="mt-3 space-y-3">
                <div><Label>Bezeichnung</Label><Input value={t.name} onChange={(e) => setField(t.key, { name: e.target.value })} className="mt-1.5" /></div>
                <div>
                  <Label>Text</Label>
                  <Textarea rows={9} value={t.body} onChange={(e) => setField(t.key, { body: e.target.value })} className="mt-1.5 font-mono text-sm" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Platzhalter: <code>{"{{ort}}"}</code>, <code>{"{{absender}}"}</code>, <code>{"{{link}}"}</code>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(t)} disabled={busy === t.key} data-testid={`save-${t.key}`}>
                    {busy === t.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reset(t)} disabled={busy === t.key}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Zurücksetzen
                  </Button>
                </div>
              </div>
            </details>
          </div>
        </div>
      ))}
    </div>
  );
}
