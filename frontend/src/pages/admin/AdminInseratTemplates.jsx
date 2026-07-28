import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

/* Global defaults every landlord sees until they save their own snippets in
   Objekt → Bewerbungslink. Overrides there are per-org and untouched by this page. */
export default function AdminInseratTemplates() {
  const [templates, setTemplates] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/inserat-vorlagen")
      .then((r) => setTemplates(r.data.templates))
      .catch(() => setTemplates([]));
  }, []);

  if (!templates) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const setField = (i, k) => (e) => setTemplates(templates.map((t, j) => j === i ? { ...t, [k]: e.target.value } : t));
  const add = () => setTemplates([...templates, { key: `vorlage-${Date.now()}`, label: "Neue Vorlage", text: "" }]);
  const remove = (i) => setTemplates(templates.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/inserat-vorlagen", { templates });
      setTemplates(data.templates);
      toast.success("Vorlagen gespeichert");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-up" data-testid="admin-inserat-templates-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Inserats-Textbausteine</h1>
          <p className="text-muted-foreground mt-1">
            Standardtexte, die Vermieter im Bewerbungslink-Tab kopieren können.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={add} data-testid="add-template-btn"><Plus className="h-4 w-4 mr-1" /> Vorlage</Button>
          <Button onClick={save} disabled={saving} data-testid="save-templates-btn">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Platzhalter: <code className="font-mono">{"{{link}}"}</code>,{" "}
        <code className="font-mono">{"{{objekt}}"}</code>,{" "}
        <code className="font-mono">{"{{ort}}"}</code> — werden beim Kopieren automatisch ersetzt.
        Vermieter, die eigene Texte gespeichert haben, sehen diese Änderungen nicht.
      </p>

      <div className="space-y-4 max-w-3xl">
        {templates.length === 0 && <p className="text-sm text-muted-foreground">Keine Vorlagen. Beim Speichern ohne Vorlagen greifen die eingebauten Standardtexte.</p>}
        {templates.map((t, i) => (
          <div key={t.key || i} className="rounded-2xl border border-border/70 bg-card shadow-soft p-5" data-testid={`admin-template-${i}`}>
            <div><Label>Bezeichnung</Label><Input value={t.label} onChange={setField(i, "label")} className="mt-1.5" data-testid={`admin-template-label-${i}`} /></div>
            <div className="mt-3"><Label>Text</Label><Textarea rows={5} value={t.text} onChange={setField(i, "text")} className="mt-1.5 font-mono text-sm" data-testid={`admin-template-text-${i}`} /></div>
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(i)} data-testid={`remove-template-${i}`}>
                <Trash2 className="h-4 w-4 mr-1" /> Entfernen
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
