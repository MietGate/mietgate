import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MarketingNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const dest = user ? (user.role === "applicant" ? "/bewerber" : user.role === "admin" ? "/admin" : "/dashboard") : "/login";
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/funktionen" className="text-muted-foreground hover:text-foreground transition-colors">Funktionen</Link>
          <Link to="/preise" className="text-muted-foreground hover:text-foreground transition-colors">Preise</Link>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button asChild size="sm"><Link to={dest} data-testid="nav-dashboard">Zum Dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login" data-testid="nav-login">Anmelden</Link></Button>
              <Button asChild size="sm"><Link to="/registrieren" data-testid="nav-register">Kostenlos starten</Link></Button>
            </>
          )}
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border px-6 py-4 space-y-3 bg-background">
          <Link to="/funktionen" className="block text-sm">Funktionen</Link>
          <Link to="/preise" className="block text-sm">Preise</Link>
          <Button asChild className="w-full"><Link to={user ? dest : "/registrieren"}>{user ? "Dashboard" : "Kostenlos starten"}</Link></Button>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-brand-dark text-white/70">
      <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <Logo textClass="text-white" className="h-8 bg-white rounded-md p-0.5" />
          <p className="mt-4 text-sm text-white/50 max-w-xs">Digitales Vermietungsmanagement für den deutschen Immobilienmarkt.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Produkt</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/funktionen" className="hover:text-white">Funktionen</Link></li>
            <li><Link to="/preise" className="hover:text-white">Preise</Link></li>
            <li><Link to="/registrieren" className="hover:text-white">Registrieren</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Rechtliches</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/impressum" className="hover:text-white">Impressum</Link></li>
            <li><Link to="/datenschutz" className="hover:text-white">Datenschutz</Link></li>
            <li><Link to="/agb" className="hover:text-white">AGB</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Kontakt</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/kontakt" className="hover:text-white">Support & Kontakt</Link></li>
            <li>kontakt@mietgate.de</li>
            <li className="text-white/40">EU-Hosting · DSGVO-konform</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © 2026 MietGate.de – Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
