import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Mail } from "lucide-react";

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState(null);
  const [saving, setSaving] = useState(null);

  const load = () => {
    api.get("/admin/email-templates").then((r) => setTemplates(r.data)).catch(() => toast.error("Vorlagen konnten nicht geladen werden"));
  };
  useEffect(load, []);

  const setField = (i, k, v) => setTemplates(templates.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));

  const save = async (t) => {
    setSaving(t.key);
    try {
      await api.put(`/admin/email-templates/${t.key}`, { subject: t.subject, title: t.title, body_html: t.body_html });
      toast.success("Vorlage gespeichert");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(null); }
  };

  if (!templates) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">E-Mail-Vorlagen</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Diese Vorlagen sind der globale Standard für alle Organisationen. White-Label-Kunden können sie in ihren Einstellungen individuell überschreiben.
        </p>
      </div>

      {templates.map((t, i) => (
        <details key={t.key} className="rounded-xl border border-border bg-card overflow-hidden group" data-testid={`template-${t.key}`}>
          <summary className="px-5 py-4 cursor-pointer font-medium flex items-center gap-2 list-none">
            <Mail className="h-4 w-4 text-primary shrink-0" /> {t.name}
          </summary>
          <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
            <div><Label>Betreff</Label><Input value={t.subject} onChange={(e) => setField(i, "subject", e.target.value)} className="mt-1.5" /></div>
            <div><Label>Überschrift im E-Mail-Text</Label><Input value={t.title} onChange={(e) => setField(i, "title", e.target.value)} className="mt-1.5" /></div>
            <div>
              <Label>Inhalt (HTML)</Label>
              <Textarea rows={6} value={t.body_html} onChange={(e) => setField(i, "body_html", e.target.value)} className="mt-1.5 font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1.5">
                Platzhalter: {t.placeholders?.map((p) => `{{${p}}}`).join(", ")}
              </p>
            </div>
            <Button onClick={() => save(t)} disabled={saving === t.key} data-testid={`save-template-${t.key}`}>
              {saving === t.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Speichern
            </Button>
          </div>
        </details>
      ))}
    </div>
  );
}
