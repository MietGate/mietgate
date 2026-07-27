import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash;
    const match = hash.match(/token=([^&]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    (async () => {
      if (!token) { navigate("/login", { replace: true }); return; }
      try {
        localStorage.setItem("mg_token", token);
        const { data: user } = await api.get("/auth/me");
        login(token, user);
        window.history.replaceState(null, "", "/");
        if (!user.phone) { navigate("/telefonnummer-ergaenzen", { replace: true }); return; }
        navigate(user.role === "applicant" ? "/bewerber" : user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      } catch {
        localStorage.removeItem("mg_token");
        navigate("/login", { replace: true });
      }
    })();
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Anmeldung wird abgeschlossen…</p>
      </div>
    </div>
  );
}
