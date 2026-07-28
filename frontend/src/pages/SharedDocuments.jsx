import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Loader2, FileText, Download, Mail, Home, Clock } from "lucide-react";

export default function SharedDocuments() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`${API}/public/shared/${token}`).then((r) => setData(r.data)).catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center p-6">
        <div><Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold">Freigabe nicht verfügbar</h1>
          <p className="text-muted-foreground mt-2">Dieser Link ist ungültig, abgelaufen oder wurde vom Bewerber widerrufen.</p>
          <p className="text-muted-foreground text-sm mt-2">Bitten Sie den Bewerber bei Bedarf um eine neue Freigabe.</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center"><Link to="/"><Logo /></Link></div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="font-display text-2xl font-bold">Freigegebene Dokumente von {data.display_name}</h1>
          <p className="text-muted-foreground text-sm mt-1">Diese Dokumente wurden Ihnen persönlich freigegeben.</p>
          {data.expires_at && (
            <p className="text-muted-foreground text-sm mt-3 flex items-center gap-1.5" data-testid="share-expiry">
              <Clock className="h-4 w-4 shrink-0" />
              Gültig bis {new Date(data.expires_at).toLocaleDateString("de-DE")} — danach ist der Link automatisch nicht mehr abrufbar.
            </p>
          )}

          <div className="mt-6 space-y-2">
            {data.documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Dokumente hinterlegt.</p>
            ) : data.documents.map((d) => (
              <a key={d.id} href={`${API}/public/shared/${token}/documents/${d.id}/download`} target="_blank" rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 hover:bg-secondary transition-colors" data-testid={`shared-doc-${d.id}`}>
                <div className="flex items-center gap-3 truncate">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-sm truncate">{d.doc_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.original_filename}</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>

          {data.applicant_email && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">Für Rückfragen erreichen Sie {data.display_name} direkt:</p>
              <a href={`mailto:${data.applicant_email}`} className="inline-flex items-center gap-2 mt-2 text-primary font-medium hover:underline" data-testid="applicant-email">
                <Mail className="h-4 w-4" /> {data.applicant_email}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
