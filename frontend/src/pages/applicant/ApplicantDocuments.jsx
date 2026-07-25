import { useEffect, useState, useRef } from "react";
import api, { API, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Trash2, Download } from "lucide-react";

const DOC_TYPES = ["SCHUFA", "Gehaltsnachweise", "Arbeitsvertrag", "Ausweis", "Aufenthaltstitel", "Mietschuldenfreiheitsbescheinigung", "Bürgschaft", "Sonstiges"];

export default function ApplicantDocuments() {
  const [docs, setDocs] = useState(null);
  const [docType, setDocType] = useState("SCHUFA");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const token = localStorage.getItem("mg_token");

  const load = () => api.get("/documents").then((r) => setDocs(r.data)).catch(() => setDocs([]));
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("doc_type", docType);
    try { await api.post("/documents/upload", fd); toast.success("Dokument hochgeladen"); load(); }
    catch { toast.error("Upload fehlgeschlagen"); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const del = async (id) => {
    if (!window.confirm("Dokument wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    try { await api.delete(`/documents/${id}`); toast.success("Gelöscht"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!docs) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div><h1 className="font-display text-3xl font-bold">Meine Dokumente</h1><p className="text-muted-foreground mt-1">Einmal hochladen, für alle Bewerbungen nutzen.</p></div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm font-medium">Dokumententyp</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1.5" data-testid="doc-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <input ref={fileRef} type="file" onChange={upload} className="hidden" accept=".pdf,.jpg,.jpeg,.png" data-testid="file-input" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="upload-btn">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Hochladen
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">PDF, JPG oder PNG · max. 15 MB · sicher & verschlüsselt gespeichert.</p>
      </div>

      <div className="space-y-2">
        {docs.length === 0 && <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">Noch keine Dokumente hochgeladen.</div>}
        {docs.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between" data-testid={`mydoc-${d.id}`}>
            <div className="flex items-center gap-3 truncate">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="truncate"><p className="font-medium truncate">{d.doc_type}</p><p className="text-sm text-muted-foreground truncate">{d.original_filename}</p></div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href={`${API}/documents/${d.id}/download?auth=${token}`} target="_blank" rel="noreferrer" className="p-2 rounded-md hover:bg-secondary"><Download className="h-4 w-4" /></a>
              <button onClick={() => del(d.id)} className="p-2 rounded-md hover:bg-secondary"><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
