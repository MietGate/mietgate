import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const KEY = "mg_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (value) => {
    localStorage.setItem(KEY, value);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] animate-fade-up" data-testid="cookie-consent">
      <div className="rounded-2xl border border-border bg-card shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-primary shrink-0"><Cookie className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold text-sm text-brand-dark">Wir respektieren Ihre Privatsphäre</p>
            <p className="text-sm text-muted-foreground mt-1">
              Wir verwenden nur technisch notwendige Cookies. Optionale Analyse-Cookies helfen uns, MietGate zu verbessern. Details in der{" "}
              <Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link>.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" className="flex-1" onClick={() => decide("all")} data-testid="cookie-accept-all">Alle akzeptieren</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => decide("essential")} data-testid="cookie-essential">Nur notwendige</Button>
        </div>
      </div>
    </div>
  );
}
