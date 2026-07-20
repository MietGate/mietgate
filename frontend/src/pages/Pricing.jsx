import { useNavigate } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";
import { PricingSection } from "@/components/PricingSection";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const onSelect = async (plan, interval) => {
    if (plan.key === "enterprise") { navigate("/kontakt"); return; }
    if (!user) { navigate("/registrieren"); return; }
    if (user.role !== "landlord") { toast.error("Nur Vermieter können ein Paket buchen."); return; }
    try {
      const { data } = await api.post("/payments/checkout", { plan_key: plan.key, interval, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <MarketingNav />
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">Preise, die mitwachsen</h1>
          <p className="text-muted-foreground mt-4 text-lg">Wählen Sie das Paket, das zu Ihrem Portfolio passt.</p>
        </div>
        <PricingSection onSelect={onSelect} ctaLabel={user?.role === "landlord" ? "Jetzt buchen" : "Auswählen"} />
      </section>
      <MarketingFooter />
    </div>
  );
}
