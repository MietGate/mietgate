import { useEffect, useMemo, useState, useCallback } from "react";
import api, { previewDocument, downloadDocument, formatApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Loader2, Search, Building2, Users, CheckCircle2, Clock, Eye, Download, Lock } from "lucide-react";

const DOC_TONES = [
  "bg-accent text-primary",
  "bg-[hsl(142,40%,93%)] text-[hsl(142,45%,26%)]",
  "bg-[hsl(38,70%,93%)] text-[hsl(32,55%,34%)]",
  "bg-[hsl(214,45%,93%)] text-[hsl(214,55%,32%)]",
];

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [propFilter, setPropFilter] = useState("all");
  const [releaseFilter, setReleaseFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([api.get("/documents/landlord"), api.get("/properties")]);
      setDocs(d.data);
      setProperties(p.data);
    } catch { toast.error("Dokumente konnten nicht geladen werden"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs
      .filter((d) => propFilter === "all" || d.property_id === propFilter)
      .filter((d) => releaseFilter === "all" || (releaseFilter === "released" ? d.released : !d.released))
      .filter((d) => !term || [d.applicant_name, d.applicant_email, d.property_title]
        .some((v) => (v || "").toLowerCase().includes(term)))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [docs, q, propFilter, releaseFilter]);

  const counts = useMemo(() => ({
    total: docs.length,
    released: docs.filter((d) => d.released).length,
    pending: docs.filter((d) => !d.released).length,
    applicants: new Set(docs.map((d) => d.application_id)).size,
  }), [docs]);

  const open = async (d) => {
    try { await previewDocument(d.id); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const save = async (d) => {
    try { await downloadDocument(d.id, d.original_filename); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold">Dokumente</h1>
        <p className="text-muted-foreground mt-1">Alle hochgeladenen Bewerber-Dokumente über alle Objekte hinweg.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Gesamt", value: counts.total, icon: FileText, tone: 0 },
          { label: "Freigegeben", value: counts.released, icon: CheckCircle2, tone: 1 },
          { label: "Ausstehend", value: counts.pending, icon: Clock, tone: 2 },
          { label: "Bewerber", value: counts.applicants, icon: Users, tone: 3 },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-border/70 bg-card shadow-soft p-4 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${DOC_TONES[tone]}`}><Icon style={{ width: 18, height: 18 }} /></div>
              <span className="font-mono text-2xl font-extrabold">{value}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bewerber oder Objekt suchen…"
            className="pl-8" data-testid="documents-search" />
        </div>
        <Select value={propFilter} onValueChange={setPropFilter}>
          <SelectTrigger className="w-[190px]" data-testid="documents-property"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Objekte</SelectItem>
            {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={releaseFilter} onValueChange={setReleaseFilter}>
          <SelectTrigger className="w-[170px]" data-testid="documents-release"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="released">Freigegeben</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/50 p-16 text-center text-muted-foreground" data-testid="documents-empty">
          <div className="h-14 w-14 rounded-2xl bg-accent text-primary flex items-center justify-center mx-auto mb-4"><FileText className="h-6 w-6" /></div>
          <p className="font-display font-bold text-lg text-foreground">
            {docs.length === 0 ? "Noch keine Dokumente" : "Keine Dokumente für diese Filter"}
          </p>
          <p className="text-sm mt-1.5 max-w-sm mx-auto">
            {docs.length === 0
              ? "Sobald Bewerber Dokumente hochladen, erscheinen sie hier."
              : "Passen Sie Suche oder Filter an."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card shadow-soft divide-y divide-border overflow-hidden" data-testid="documents-list">
          {visible.map((d) => (
            <div key={d.id} data-testid={`document-${d.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-secondary/40 transition-colors">
              <div className="min-w-[180px] flex-1">
                <p className="font-medium">{d.applicant_name}</p>
                <p className="text-xs text-muted-foreground truncate">{d.applicant_email}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[160px]">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{d.property_title || "—"}</span>
              </div>
              <Badge variant="secondary" className="gap-1.5 font-normal">{d.doc_type}</Badge>
              {d.released ? (
                <span className="flex items-center gap-1 text-xs text-success font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Freigegeben</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium" title={d.release_hint}><Lock className="h-3.5 w-3.5" /> {d.release_hint || "Noch nicht freigegeben"}</span>
              )}
              <span className="text-xs text-muted-foreground w-[90px] text-right shrink-0">
                {new Date(d.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" })}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" disabled={!d.released} onClick={() => open(d)} title="Ansehen" data-testid={`doc-view-${d.id}`}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" disabled={!d.released} onClick={() => save(d)} title="Herunterladen" data-testid={`doc-download-${d.id}`}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
