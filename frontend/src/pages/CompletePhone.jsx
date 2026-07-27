import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Phone } from "lucide-react";

export default function CompletePhone() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put("/me/profile", { phone });
      login(localStorage.getItem("mg_token"), data);
      navigate(user?.role === "applicant" ? "/bewerber" : user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center text-primary mb-4"><Phone className="h-5 w-5" /></div>
          <h1 className="font-display text-2xl font-bold">Fast geschafft</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">
            Bitte ergänzen Sie noch Ihre Telefonnummer, damit wir Sie bei Rückfragen erreichen können.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Telefonnummer</Label>
              <Input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5" placeholder="+49 151 23456789" data-testid="complete-phone-input" />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="complete-phone-submit">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Weiter
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
