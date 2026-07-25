import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-background min-h-screen flex flex-col">
      <MarketingNav />
      <main className="flex-1 flex items-center justify-center px-6 py-24 text-center">
        <div>
          <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-5" />
          <h1 className="font-display text-4xl font-bold">Seite nicht gefunden</h1>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Die aufgerufene Seite existiert nicht oder wurde verschoben. Prüfen Sie die Adresse oder kehren Sie zur Startseite zurück.
          </p>
          <Button asChild className="mt-6"><Link to="/">Zur Startseite</Link></Button>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
