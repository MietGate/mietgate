import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import api from "@/lib/api";
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Bell, Menu, X,
  CreditCard, ShieldCheck, FileText, CalendarDays, Home, ChevronRight, Link2, Contact
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const landlordNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/objekte", label: "Objekte", icon: Building2 },
  { to: "/team", label: "Team", icon: Users },
  { to: "/abo", label: "Abo & Zahlungen", icon: CreditCard },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];

const applicantNav = [
  { to: "/bewerber", label: "Übersicht", icon: LayoutDashboard },
  { to: "/bewerber/dokumente", label: "Dokumente", icon: FileText },
  { to: "/bewerber/termine", label: "Termine", icon: CalendarDays },
  { to: "/einstellungen", label: "Profil", icon: Settings },
];

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/nutzer", label: "Nutzer", icon: Users },
  { to: "/admin/organisationen", label: "Organisationen", icon: Building2 },
  { to: "/admin/pakete", label: "Pakete & Aktionen", icon: CreditCard },
  { to: "/admin/partner", label: "Partner-Links", icon: Link2 },
  { to: "/admin/leads", label: "Leads & CRM", icon: Contact },
  { to: "/admin/support", label: "Support & Logs", icon: ShieldCheck },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];

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
        <button className="relative p-2 rounded-md hover:bg-secondary transition-colors" data-testid="notification-bell">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
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

  useEffect(() => {
    if (user?.role === "landlord" || (user?.role !== "admin" && user?.role !== "applicant" && user?.org_id)) {
      api.get("/me/entitlements").then((r) => setSupportsTeam(!!r.data.supports_team)).catch(() => setSupportsTeam(false));
    }
  }, [user]);

  const baseNav = user?.role === "admin" ? adminNav : user?.role === "applicant" ? applicantNav : landlordNav;
  const nav = baseNav.filter((n) => n.to !== "/team" || supportsTeam);

  const doLogout = async () => { await logout(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-[248px] bg-brand-dark text-white flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <img src="/mietgate-logo.png" alt="MietGate" className="h-8 bg-white rounded-md p-0.5" />
            <span className="font-display font-extrabold text-lg">MietGate</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to || (item.to !== "/dashboard" && item.to !== "/admin" && item.to !== "/bewerber" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]/g, "")}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <Home style={{ width: 18, height: 18 }} /> Zur Website
          </Link>
          <button onClick={doLogout} data-testid="logout-btn" className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut style={{ width: 18, height: 18 }} /> Abmelden
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="hidden sm:flex items-center text-sm text-muted-foreground">
              <span className="capitalize">{user?.role === "applicant" ? "Bewerber" : user?.role === "admin" ? "Administrator" : "Vermieter"}</span>
              <ChevronRight className="h-4 w-4 mx-1" />
              <span className="text-foreground font-medium">{nav.find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + "/"))?.label || "Übersicht"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-secondary transition-colors" data-testid="user-menu">
                  <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm">
                    {(user?.first_name?.[0] || user?.name?.[0] || "U").toUpperCase()}
                  </div>
                  <span className="hidden md:block text-sm font-medium max-w-[140px] truncate">{user?.name}</span>
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
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
