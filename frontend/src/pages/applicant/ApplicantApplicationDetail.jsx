import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FileText, MessageSquare, Building2, XCircle } from "lucide-react";

const STATUS_COLOR = { neu: "secondary", zusage: "default", absage: "destructive", favorit: "default", zurueckgezogen: "secondary" };

export default function ApplicantApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [fieldDefs, setFieldDefs] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const withdraw = async () => {
    if (!window.confirm("Bewerbung wirklich zurückziehen? Der Vermieter wird darüber informiert und Sie scheiden aus dem Auswahlverfahren aus.")) return;
    setWithdrawing(true);
    try {
      await api.post(`/my/applications/${id}/withdraw`);
      setApp((a) => ({ ...a, status: "zurueckgezogen", status_label: "Zurückgezogen" }));
      toast.success("Bewerbung zurückgezogen");
    } catch (e) { toast.error(e.response?.data?.detail || "Fehler beim Zurückziehen"); }
    finally { setWithdrawing(false); }
  };

  useEffect(() => {
    Promise.all([
      api.get("/my/applications"),
      api.get("/form-fields").catch(() => ({ data: { fields: [] } })),
      api.get("/documents").catch(() => ({ data: [] })),
    ])
      .then(([appsRes, fieldsRes, docsRes]) => {
        const found = appsRes.data.find((a) => a.id === id);
        if (!found) { toast.error("Bewerbung nicht gefunden"); navigate("/bewerber"); return; }
        setApp(found);
        setFieldDefs(fieldsRes.data.fields || []);
        setDocs((docsRes.data || []).filter((d) => d.application_id === id));
      })
      .catch(() => toast.error("Bewerbung konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!app) return null;

  // Same label/option resolution the landlord side uses, so the applicant sees their
  // answers exactly as they were phrased in the form — not raw keys and slugs.
  const entries = Object.entries(app.form_data || {}).filter(([, v]) => v !== "" && v != null);

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <Link to="/bewerber" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary shrink-0" /> {app.property_title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Beworben am {new Date(app.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <Badge variant={STATUS_COLOR[app.status] || "secondary"} data-testid="application-status">{app.status_label}</Badge>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display font-bold text-lg">Ihre Angaben</h2>
        <p className="text-sm text-muted-foreground mt-1">Diese Daten haben Sie mit Ihrer Bewerbung übermittelt.</p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4">Keine Angaben hinterlegt.</p>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 gap-2" data-testid="application-form-data">
            {entries.map(([k, v]) => {
              const def = fieldDefs.find((f) => f.key === k);
              const label = def?.label || k.replace(/_/g, " ");
              let display = String(v);
              if (def?.option_labels?.[v]) display = def.option_labels[v];
              else if (def?.type === "date" && /^\d{4}-\d{2}-\d{2}/.test(v)) display = new Date(v).toLocaleDateString("de-DE");
              return (
                <div key={k} className="rounded-md bg-secondary/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium break-words">{display}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <FileText className="h-4 w-4" /> Dokumente ({docs.length})
          </h2>
          <Button variant="outline" size="sm" asChild><Link to="/bewerber/dokumente">Dokumente verwalten</Link></Button>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">
            Noch keine Dokumente mit dieser Bewerbung verknüpft.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm rounded-md bg-secondary/50 px-3 py-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{d.original_name || d.doc_type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild data-testid="application-to-messages">
          <Link to={`/bewerber/nachrichten?application_id=${app.id}`}>
            <MessageSquare className="h-4 w-4 mr-2" /> Nachricht an den Vermieter
          </Link>
        </Button>
        {app.status !== "zurueckgezogen" && (
          <Button variant="outline" onClick={withdraw} disabled={withdrawing} data-testid="withdraw-application">
            {withdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
            Bewerbung zurückziehen
          </Button>
        )}
      </div>
      {app.status === "zurueckgezogen" && (
        <p className="text-sm text-muted-foreground">
          Sie haben diese Bewerbung zurückgezogen. Der Vermieter wurde informiert.
        </p>
      )}
    </div>
  );
}
