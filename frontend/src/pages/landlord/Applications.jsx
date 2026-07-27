import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Inbox, Loader2, Search, FileText, Star, Building2, ArrowUpDown } from "lucide-react";

/* Mirrors the pipeline columns so a status means the same thing everywhere. */
const STATUS = {
  neu: { label: "Neu", dot: "bg-slate-400" },
  pruefung: { label: "Prüfung", dot: "bg-blue-500" },
  interessant: { label: "Interessant", dot: "bg-violet-500" },
  besichtigung: { label: "Besichtigung", dot: "bg-primary" },
  favorit: { label: "Favorit", dot: "bg-amber-500" },
  zusage: { label: "Zusage", dot: "bg-success" },
  absage: { label: "Absage", dot: "bg-destructive" },
  archiv: { label: "Archiv", dot: "bg-muted-foreground" },
};

const SORTS = {
  newest: { label: "Neueste zuerst", fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  oldest: { label: "Älteste zuerst", fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  score: { label: "Bester Score", fn: (a, b) => (b.matching_score || 0) - (a.matching_score || 0) },
};

const applicantName = (a) => {
  const fd = a.form_data || {};
  return [fd.vorname, fd.nachname].filter(Boolean).join(" ") || a.applicant_email || "Unbekannt";
};

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [propFilter, setPropFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([api.get("/applications"), api.get("/properties")]);
      setApps(a.data);
      setProperties(p.data);
    } catch { toast.error("Bewerbungen konnten nicht geladen werden"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return apps
      .filter((a) => propFilter === "all" || a.property_id === propFilter)
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .filter((a) => !term || [applicantName(a), a.applicant_email, a.property_title]
        .some((v) => (v || "").toLowerCase().includes(term)))
      .sort(SORTS[sort].fn);
  }, [apps, q, propFilter, statusFilter, sort]);

  const counts = useMemo(() => {
    const base = apps.filter((a) => propFilter === "all" || a.property_id === propFilter);
    return {
      total: base.length,
      neu: base.filter((a) => a.status === "neu").length,
      besichtigung: base.filter((a) => a.status === "besichtigung").length,
      zusage: base.filter((a) => a.status === "zusage").length,
    };
  }, [apps, propFilter]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold">Bewerbungen</h1>
        <p className="text-muted-foreground mt-1">Alle Bewerbungen über alle Objekte hinweg.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Gesamt", counts.total, "text-foreground"],
          ["Neu", counts.neu, "text-primary"],
          ["In Besichtigung", counts.besichtigung, "text-foreground"],
          ["Zusagen", counts.zusage, "text-success"],
        ].map(([label, value, cls]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`font-mono text-2xl font-extrabold mt-1 ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bewerber oder Objekt suchen…"
            className="pl-8" data-testid="applications-search" />
        </div>
        <Select value={propFilter} onValueChange={setPropFilter}>
          <SelectTrigger className="w-[190px]" data-testid="applications-property"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Objekte</SelectItem>
            {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="applications-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(STATUS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[170px]" data-testid="applications-sort">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground" data-testid="applications-empty">
          <Inbox className="h-10 w-10 mx-auto mb-3" />
          <p className="font-medium text-foreground">
            {apps.length === 0 ? "Noch keine Bewerbungen" : "Keine Bewerbungen für diese Filter"}
          </p>
          <p className="text-sm mt-1">
            {apps.length === 0
              ? "Teilen Sie Ihren Bewerbungslink, damit Interessenten sich bewerben können."
              : "Passen Sie Suche oder Filter an."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden" data-testid="applications-list">
          {visible.map((a) => {
            const st = STATUS[a.status] || STATUS.neu;
            return (
              <Link key={a.id} to={`/objekte/${a.property_id}`} data-testid={`application-${a.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-secondary/40 transition-colors">
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{applicantName(a)}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.applicant_email}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[160px]">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{a.property_title || "—"}</span>
                </div>
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <span className={`h-2 w-2 rounded-full ${st.dot}`} />{st.label}
                </Badge>
                {a.matching_score != null && (
                  <span className="flex items-center gap-1 text-sm" title="Matching-Score">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="tabular-nums font-medium">{a.matching_score}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm text-muted-foreground" title="Dokumente">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{a.document_count ?? 0}</span>
                </span>
                <span className="text-xs text-muted-foreground w-[90px] text-right shrink-0">
                  {new Date(a.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" })}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
