import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Check, Pencil, Save, RotateCcw, Loader2, X } from "lucide-react";

/* Placeholders are only substituted at copy time, so the stored snippet stays reusable
   across every property instead of being baked to one link. */
function fill(text, { link, objekt, ort }) {
  return (text || "")
    .replaceAll("{{link}}", link || "")
    .replaceAll("{{objekt}}", objekt || "")
    .replaceAll("{{ort}}", ort || "");
}

export function InseratTemplates({ property, appLink, onCopied }) {
  const [templates, setTemplates] = useState(null);
  const [customized, setCustomized] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const vars = { link: appLink, objekt: property?.title, ort: property?.city };

  const load = () => api.get("/inserat-vorlagen").then((r) => {
    setTemplates(r.data.templates);
    setCustomized(r.data.customized);
  }).catch(() => setTemplates([]));

  useEffect(() => { load(); }, []);

  const copy = async (t) => {
    const text = fill(t.text, vars);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(t.key);
      toast.success("Text kopiert — jetzt ins Inserat einfügen");
      setTimeout(() => setCopiedKey(null), 2000);
      onCopied?.();
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const startEdit = () => { setDraft(templates.map((t) => ({ ...t }))); setEditing(true); };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/inserat-vorlagen", { templates: draft });
      setTemplates(data.templates);
      setCustomized(true);
      setEditing(false);
      toast.success("Textbausteine gespeichert");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    if (!window.confirm("Ihre eigenen Textbausteine verwerfen und die Standardtexte wiederherstellen?")) return;
    try {
      const { data } = await api.delete("/inserat-vorlagen");
      setTemplates(data.templates);
      setCustomized(false);
      setEditing(false);
      toast.success("Standardtexte wiederhergestellt");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!templates) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-card shadow-soft p-6 max-w-2xl" data-testid="inserat-templates">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold">Textbausteine für Ihr Inserat</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Kopieren Sie einen kompletten Absatz inklusive Link und fügen Sie ihn in Ihre Anzeige ein.
          </p>
        </div>
        {!editing ? (
          <div className="flex items-center gap-2">
            {customized && (
              <Button variant="ghost" size="sm" onClick={reset} data-testid="reset-templates">
                <RotateCcw className="h-4 w-4 mr-1" /> Standard
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={startEdit} data-testid="edit-templates">
              <Pencil className="h-4 w-4 mr-1" /> Bearbeiten
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" /> Abbrechen</Button>
            <Button size="sm" onClick={save} disabled={saving} data-testid="save-templates">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Speichern
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Platzhalter: <code className="font-mono">{"{{link}}"}</code>,{" "}
            <code className="font-mono">{"{{objekt}}"}</code>,{" "}
            <code className="font-mono">{"{{ort}}"}</code> — sie werden beim Kopieren automatisch ersetzt.
            Die Texte gelten für alle Ihre Objekte.
          </p>
          {draft.map((t, i) => (
            <div key={t.key} className="rounded-lg border border-border p-4">
              <Input value={t.label} data-testid={`template-label-${i}`}
                onChange={(e) => setDraft(draft.map((d, j) => j === i ? { ...d, label: e.target.value } : d))} />
              <Textarea rows={4} className="mt-2 font-mono text-sm" value={t.text} data-testid={`template-text-${i}`}
                onChange={(e) => setDraft(draft.map((d, j) => j === i ? { ...d, text: e.target.value } : d))} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {templates.map((t) => (
            <div key={t.key} className="rounded-lg border border-border bg-secondary/40 p-4" data-testid={`template-${t.key}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.label}</span>
                <Button size="sm" variant={copiedKey === t.key ? "default" : "outline"}
                  onClick={() => copy(t)} data-testid={`copy-template-${t.key}`}>
                  {copiedKey === t.key ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copiedKey === t.key ? "Kopiert" : "Text kopieren"}
                </Button>
              </div>
              <p className="text-sm mt-2 whitespace-pre-line">{fill(t.text, vars)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
