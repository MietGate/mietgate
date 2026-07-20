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
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    const role = localStorage.getItem("mg_oauth_role") || "landlord";
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId, role });
        login(data.token, data.user);
        localStorage.removeItem("mg_oauth_role");
        window.history.replaceState(null, "", "/");
        navigate(data.user.role === "applicant" ? "/bewerber" : data.user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      } catch {
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
