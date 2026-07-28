import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import api from "@/lib/api";
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Bell, Menu, X,
  CreditCard, ShieldCheck, FileText, CalendarDays, Home, ChevronRight, Link2, Contact, Search,
  Inbox, MessageSquare, Mail, Megaphone, ClipboardList, LifeBuoy
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// Ordered along the landlord's actual workflow: overview → incoming → conversation → scheduling → objects.
// `badge` names a counter from GET /badges — see routes_message.sidebar_badges.
const landlordNav = [
  { to: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { to: "/bewerbungen", label: "Bewerbungen", icon: Inbox, badge: "applications" },
  { to: "/nachrichten", label: "Nachrichten", icon: MessageSquare, badge: "messages" },
  { to: "/kalender", label: "Kalender", icon: CalendarDays, badge: "calendar" },
  { to: "/objekte", label: "Objekte", icon: Building2 },
  { to: "/team", label: "Team", icon: Users },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];

const applicantNav = [
  { to: "/bewerber", label: "Übersicht", icon: LayoutDashboard },
  { to: "/bewerber/nachrichten", label: "Nachrichten", icon: MessageSquare, badge: "messages" },
  { to: "/bewerber/dokumente", label: "Dokumente", icon: FileText, badge: "documents" },
  { to: "/bewerber/termine", label: "Termine", icon: CalendarDays, badge: "viewings" },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];

const adminNav = [
  { to: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { to: "/admin/nutzer", label: "Nutzer", icon: Users },
  { to: "/admin/organisationen", label: "Organisationen", icon: Building2 },
  { to: "/admin/pakete", label: "Pakete & Aktionen", icon: CreditCard },
  { to: "/admin/partner", label: "Partner-Links", icon: Link2 },
  { to: "/admin/leads", label: "Leads & CRM", icon: Contact },
  { to: "/admin/anschreiben", label: "Anschreiben", icon: Megaphone },
  { to: "/admin/inserat-vorlagen", label: "Inserats-Texte", icon: ClipboardList },
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { to: "/admin/email-vorlagen", label: "E-Mail-Vorlagen", icon: FileText },
  { to: "/admin/support", label: "Support & Logs", icon: ShieldCheck },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];

const SEARCH_CONFIG = {
  landlord: { endpoint: "/search", placeholder: "Objekte, Bewerber suchen…" },
  admin: { endpoint: "/admin/search", placeholder: "Nutzer, Organisationen, Leads suchen…" },
  applicant: { endpoint: "/search", placeholder: "Meine Bewerbungen suchen…" },
};

function HeaderSearch({ role }) {
  const navigate = useNavigate();
  const cfg = SEARCH_CONFIG[role];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setGroups(null); return; }
    const t = setTimeout(() => {
      api.get(`${cfg.endpoint}?q=${encodeURIComponent(q.trim())}`).then((r) => setGroups(r.data.groups)).catch(() => setGroups(null));
    }, 250);
    return () => clearTimeout(t);
  }, [q, cfg.endpoint]);

  const goTo = (path) => {
    setOpen(false); setMobileOpen(false); setQ(""); setGroups(null);
    navigate(path);
  };

  const hasResults = groups && groups.length > 0;

  const renderGroups = (itemClass) => groups?.map((g) => (
    <div key={g.key} className="py-1.5 border-t border-border first:border-t-0">
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
      {g.items.map((item) => (
        <button key={item.id} onMouseDown={() => goTo(item.link)} onClick={() => goTo(item.link)} className={itemClass}>{item.label}</button>
      ))}
    </div>
  ));

  const dropdown = open && q.trim().length >= 2 && (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-30 max-h-80 overflow-y-auto" data-testid="search-results">
      {!hasResults && <div className="px-3 py-4 text-sm text-muted-foreground text-center">Keine Treffer</div>}
      {renderGroups("w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors")}
    </div>
  );

  return (
    <>
      {/* Desktop: persistent input */}
      <div className="hidden md:block relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
          placeholder={cfg.placeholder} data-testid="header-search"
          className="w-full pl-10 pr-3 py-2.5 text-base rounded-md border border-border bg-secondary/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors" />
        {dropdown}
      </div>

      {/* Mobile: icon that expands to a full-width overlay */}
      <button className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors" onClick={() => setMobileOpen(true)} data-testid="mobile-search-open">
        <Search className="h-5 w-5 text-muted-foreground" />
      </button>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col">
          <div className="h-16 border-b border-border flex items-center gap-2 px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)}
              placeholder={cfg.placeholder} data-testid="mobile-search-input"
              className="flex-1 text-sm bg-transparent focus:outline-none" />
            <button onClick={() => { setMobileOpen(false); setQ(""); setGroups(null); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {q.trim().length >= 2 && !hasResults && <div className="px-4 py-6 text-sm text-muted-foreground text-center">Keine Treffer</div>}
            {renderGroups("w-full text-left px-4 py-3 text-sm border-b border-border hover:bg-secondary")}
          </div>
        </div>
      )}
    </>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const load = async () => {
    try {
      const [n, c] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count"),
      ]);
      setItems(n.data.slice(0, 12));
      setCount(c.data.count);
    } catch {}
  };
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);
  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const openNotification = async (n) => {
    if (!n.read) { try { await api.post(`/notifications/${n.id}/read`); load(); } catch {} }
    if (n.link) navigate(n.link);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2.5 rounded-md hover:bg-secondary transition-colors" data-testid="notification-bell">
          <Bell className="h-6 w-6 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold h-5 min-w-5 px-1 rounded-full flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel>Benachrichtigungen</DropdownMenuLabel>
          {count > 0 && <button onClick={markAll} className="text-xs text-primary hover:underline">Alle gelesen</button>}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 && <div className="px-3 py-6 text-sm text-muted-foreground text-center">Keine Benachrichtigungen</div>}
        {items.map((n) => (
          <button key={n.id} onClick={() => openNotification(n)}
            className={`w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 transition-colors ${n.link ? "cursor-pointer hover:bg-secondary" : "cursor-default"} ${!n.read ? "bg-accent/40" : ""}`}>
            <div className="font-medium text-foreground">{n.title}</div>
            <div className="text-muted-foreground text-xs mt-0.5">{n.body}</div>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [supportsTeam, setSupportsTeam] = useState(true);
  const [badges, setBadges] = useState({});
  // A page (currently only the Pipeline board) can opt out of the default max-width via
  // useOutletContext — it's still bounded by this flex column, not the raw viewport, so it
  // correctly stops short of the sidebar instead of running underneath it.
  const [fullWidth, setFullWidth] = useState(false);

  useEffect(() => {
    if (user?.role === "landlord" || (user?.role !== "admin" && user?.role !== "applicant" && user?.org_id)) {
      api.get("/me/entitlements").then((r) => setSupportsTeam(!!r.data.supports_team)).catch(() => setSupportsTeam(false));
    }
  }, [user]);

  // Refetched on every navigation so a count clears as soon as the user deals with it —
  // plus a poll, since reading a chat or opening an application doesn't always change the
  // route (e.g. clicking between conversations on /nachrichten stays on the same path).
  useEffect(() => {
    if (!user || user.role === "admin") return;
    api.get("/badges").then((r) => setBadges(r.data)).catch(() => {});
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user || user.role === "admin") return;
    const i = setInterval(() => {
      api.get("/badges").then((r) => setBadges(r.data)).catch(() => {});
    }, 20000);
    return () => clearInterval(i);
  }, [user]);

  const baseNav = user?.role === "admin" ? adminNav : user?.role === "applicant" ? applicantNav : landlordNav;
  const nav = baseNav.filter((n) => n.to !== "/team" || supportsTeam);

  const doLogout = async () => { await logout(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      {/* lg:sticky + lg:h-screen (not lg:static) pins the sidebar to the viewport height on
          desktop — with plain `static` its box stretched to match the main column's full
          (often scrollable, taller-than-viewport) height, pushing "Hilfe & Support" and
          "Zur Website"/"Abmelden" below the fold on any page longer than one screen. */}
      <aside className={`fixed lg:sticky lg:top-0 inset-y-0 lg:inset-y-auto left-0 z-40 w-[248px] h-screen bg-brand-dark text-white flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-16 flex items-center justify-center px-3 border-b border-white/10">
          <Link to="/" className="flex items-center justify-center w-full">
            <img src="/mietgate-logo-wide.png" alt="MietGate" className="h-10 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 flex flex-col p-3 overflow-y-auto">
          <div className="space-y-1">
            {nav.map((item) => {
              const active = location.pathname === item.to || (item.to !== "/dashboard" && item.to !== "/admin" && item.to !== "/bewerber" && location.pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                  data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]/g, "")}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                  <Icon className="h-4.5 w-4.5" style={{ width: 20, height: 20 }} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && badges[item.badge] > 0 && (
                    <span data-testid={`nav-badge-${item.badge}`}
                      className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center tabular-nums ${
                        active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}>
                      {badges[item.badge] > 99 ? "99+" : badges[item.badge]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          {/* Pushed to the bottom of the nav column via mt-auto, so it sits right above the
              divider instead of trailing directly after the workflow items above it. */}
          {user?.role !== "admin" && (
            <Link to="/hilfe" onClick={() => setOpen(false)} data-testid="nav-hilfe"
              className={`mt-auto flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors ${
                location.pathname === "/hilfe" ? "bg-primary text-primary-foreground" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
              <LifeBuoy style={{ width: 20, height: 20 }} />
              Hilfe & Support
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-base text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <Home style={{ width: 20, height: 20 }} /> Zur Website
          </Link>
          <button onClick={doLogout} data-testid="logout-btn" className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-base text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut style={{ width: 20, height: 20 }} /> Abmelden
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center gap-4 px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button className="lg:hidden p-2" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="hidden sm:flex items-center text-sm text-muted-foreground truncate">
              <span className="capitalize">{user?.role === "applicant" ? "Bewerber" : user?.role === "admin" ? "Administrator" : "Vermieter"}</span>
              <ChevronRight className="h-4 w-4 mx-1 shrink-0" />
              <span className="text-foreground font-medium truncate">{baseNav.find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + "/"))?.label || "Übersicht"}</span>
            </div>
          </div>
          {/* Search sits centred in the header, the position users know from Pipedrive & co.
              HeaderSearch renders the desktop input and the mobile icon itself, so mount it once. */}
          {SEARCH_CONFIG[user?.role] && (
            <div className="flex justify-center md:flex-1 md:max-w-4xl">
              <HeaderSearch role={user.role} />
            </div>
          )}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 rounded-md hover:bg-secondary transition-colors" data-testid="user-menu">
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-base">
                    {(user?.first_name?.[0] || user?.name?.[0] || "U").toUpperCase()}
                  </div>
                  <span className="hidden md:block text-base font-medium max-w-[160px] truncate">{user?.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/einstellungen")}>
                  <Settings className="h-4 w-4 mr-2" /> Einstellungen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={doLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className={`flex-1 p-4 lg:p-8 w-full mx-auto ${fullWidth ? "max-w-none" : "max-w-[1400px]"}`}>
          <Outlet context={{ setFullWidth }} />
        </main>
      </div>
    </div>
  );
}
