import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin, Users, Loader2, ExternalLink } from "lucide-react";

export default function Properties() {
  const [props, setProps] = useState(null);
  const [error, setError] = useState(false);

  const load = () => { setError(false); api.get("/properties").then((r) => setProps(r.data)).catch(() => setError(true)); };
  useEffect(() => { load(); }, []);

  if (error) return <p className="text-sm text-destructive py-20 text-center">Daten konnten nicht geladen werden. <button className="underline" onClick={load}>Erneut versuchen</button></p>;
  if (!props) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Objekte</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Immobilien und Bewerbungslinks.</p>
        </div>
        <Button asChild data-testid="new-property-btn"><Link to="/objekte/neu"><Plus className="h-4 w-4 mr-1" /> Neues Objekt</Link></Button>
      </div>

      {props.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-display font-bold text-lg mt-4">Noch keine Objekte</h3>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">Erstellen Sie Ihr erstes Objekt, um einen Bewerbungslink zu generieren.</p>
          <Button asChild className="mt-6"><Link to="/objekte/neu">Objekt erstellen</Link></Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {props.map((p) => (
            <Link key={p.id} to={`/objekte/${p.id}`} data-testid={`property-card-${p.id}`}
              className="rounded-xl border border-border bg-card overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all">
              <div className="h-28 bg-brand-dark relative flex items-end p-4 gap-1.5 flex-wrap">
                <Building2 className="absolute top-4 right-4 h-6 w-6 text-white/20" />
                <Badge className={`${p.status === "active" ? "bg-success text-success-foreground" : "bg-white/20 text-white"}`}>
                  {p.status === "active" ? "Aktiv" : p.status === "rented" ? "Vermietet" : "Inaktiv"}
                </Badge>
                {!p.link_active && <Badge className="bg-amber-500 text-white">Link inaktiv</Badge>}
              </div>
              <div className="p-5">
                <h3 className="font-display font-bold truncate">{p.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" /> {[p.zip, p.city].filter(Boolean).join(" ") || "Kein Ort"}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> {p.application_count} Bewerbungen</span>
                  {p.link_active
                    ? <span className="font-mono text-xs bg-secondary px-2 py-1 rounded">/b/{p.application_code}</span>
                    : <span className="text-xs text-amber-600 font-medium">Link nicht aktiv</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
