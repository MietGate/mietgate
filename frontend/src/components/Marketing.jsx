import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Menu, X, Send, Loader2, Instagram, Facebook } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/newsletter", { email });
      setDone(true);
      toast.success("Danke! Wir halten Sie auf dem Laufenden.");
    } catch {
      toast.error("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
    } finally { setLoading(false); }
  };
  if (done) return <p className="text-sm text-white/70" data-testid="newsletter-done">✓ Sie sind eingetragen. Willkommen an Bord!</p>;
  return (
    <form onSubmit={submit} className="flex gap-2 max-w-sm" data-testid="newsletter-form">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="Ihre E-Mail" data-testid="newsletter-email"
        className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
      <Button type="submit" disabled={loading} variant="secondary" data-testid="newsletter-submit">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}

export function MarketingNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dest = user ? (user.role === "applicant" ? "/bewerber" : user.role === "admin" ? "/admin" : "/dashboard") : "/login";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b transition-shadow duration-300 ${scrolled ? "border-border/60 shadow-sm" : "border-transparent"}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <Link to="/fuer-vermieter" className="text-muted-foreground hover:text-foreground transition-colors">Für Vermieter</Link>
          <Link to="/fuer-mieter" className="text-muted-foreground hover:text-foreground transition-colors">Für Mieter</Link>
          <Link to="/funktionen" className="text-muted-foreground hover:text-foreground transition-colors">Funktionen</Link>
          <Link to="/preise" className="text-muted-foreground hover:text-foreground transition-colors">Preise</Link>
          <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
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
          <Link to="/fuer-vermieter" className="block text-sm">Für Vermieter</Link>
          <Link to="/fuer-mieter" className="block text-sm">Für Mieter</Link>
          <Link to="/funktionen" className="block text-sm">Funktionen</Link>
          <Link to="/preise" className="block text-sm">Preise</Link>
          <Link to="/faq" className="block text-sm">FAQ</Link>
          {user ? (
            <Button asChild className="w-full"><Link to={dest} data-testid="nav-mobile-dashboard">Dashboard</Link></Button>
          ) : (
            <div className="space-y-2 pt-1">
              <Button asChild variant="outline" className="w-full"><Link to="/login" data-testid="nav-mobile-login">Anmelden</Link></Button>
              <Button asChild className="w-full"><Link to="/registrieren" data-testid="nav-mobile-register">Kostenlos starten</Link></Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-brand-dark text-white/70">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 mb-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-white font-display text-xl font-semibold">Bleiben Sie auf dem Laufenden</h3>
            <p className="text-sm text-white/60 mt-1">Neuigkeiten, Produkt-Updates und Vermieter-Tipps – kein Spam.</p>
          </div>
          <NewsletterForm />
        </div>
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Logo textClass="text-white" className="h-8 bg-white rounded-md p-0.5" />
            <p className="mt-4 text-sm text-white/50 max-w-xs">Digitales Vermietungsmanagement für den deutschen Immobilienmarkt.</p>
            <div className="flex gap-3 mt-4">
              <a href="https://instagram.com/mietgate" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors" title="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://facebook.com/mietgate" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors" title="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Produkt</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/funktionen" className="hover:text-white">Funktionen</Link></li>
              <li><Link to="/preise" className="hover:text-white">Preise</Link></li>
              <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/registrieren" className="hover:text-white">Registrieren</Link></li>
              <li><Link to="/login" className="hover:text-white">Anmelden</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Rechtliches</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/impressum" className="hover:text-white">Impressum</Link></li>
              <li><Link to="/datenschutz" className="hover:text-white">Datenschutz</Link></li>
              <li><Link to="/agb" className="hover:text-white">AGB</Link></li>
              <li><Link to="/widerruf" className="hover:text-white">Widerruf</Link></li>
              <li><Link to="/cookies" className="hover:text-white">Cookies</Link></li>
              <li><button type="button" onClick={() => window.dispatchEvent(new Event("mg:open-cookie-settings"))} className="hover:text-white text-left">Cookie-Einstellungen</button></li>
              <li><Link to="/plattformregeln" className="hover:text-white">Plattformregeln</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Kontakt</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/kontakt" className="hover:text-white">Support & Kontakt</Link></li>
              <li>support@mietgate.de</li>
              <li className="text-white/40">EU-Hosting · DSGVO-konform</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © 2026 MietGate.de – Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
