import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { AuthCallback } from "@/pages/AuthCallback";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Pricing from "@/pages/Pricing";
import Features from "@/pages/Features";
import Contact from "@/pages/Contact";
import { Impressum, Datenschutz, AGB } from "@/pages/LegalPages";
import PublicApplication from "@/pages/PublicApplication";
import PaymentResult from "@/pages/PaymentResult";
import AuthReset from "@/pages/AuthReset";
import ForgotPassword from "@/pages/ForgotPassword";
import LandlordDashboard from "@/pages/landlord/Dashboard";
import Properties from "@/pages/landlord/Properties";
import PropertyForm from "@/pages/landlord/PropertyForm";
import PropertyDetail from "@/pages/landlord/PropertyDetail";
import Team from "@/pages/landlord/Team";
import Billing from "@/pages/landlord/Billing";
import Settings from "@/pages/Settings";
import ApplicantDashboard from "@/pages/applicant/ApplicantDashboard";
import ApplicantDocuments from "@/pages/applicant/ApplicantDocuments";
import ApplicantViewings from "@/pages/applicant/ApplicantViewings";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminOrganizations from "@/pages/admin/AdminOrganizations";
import AdminPlans from "@/pages/admin/AdminPlans";
import AdminSupport from "@/pages/admin/AdminSupport";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registrieren" element={<Register />} />
      <Route path="/passwort-vergessen" element={<ForgotPassword />} />
      <Route path="/aktivieren" element={<AuthReset />} />
      <Route path="/passwort-zuruecksetzen" element={<AuthReset />} />
      <Route path="/preise" element={<Pricing />} />
      <Route path="/funktionen" element={<Features />} />
      <Route path="/kontakt" element={<Contact />} />
      <Route path="/impressum" element={<Impressum />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
      <Route path="/agb" element={<AGB />} />
      <Route path="/b/:code" element={<PublicApplication />} />
      <Route path="/payment/success" element={<PaymentResult />} />
      <Route path="/payment/cancel" element={<PaymentResult />} />

      {/* Landlord */}
      <Route element={<ProtectedRoute roles={["landlord"]}><DashboardShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<LandlordDashboard />} />
        <Route path="/objekte" element={<Properties />} />
        <Route path="/objekte/neu" element={<PropertyForm />} />
        <Route path="/objekte/:id/bearbeiten" element={<PropertyForm />} />
        <Route path="/objekte/:id" element={<PropertyDetail />} />
        <Route path="/team" element={<Team />} />
        <Route path="/abo" element={<Billing />} />
      </Route>

      {/* Applicant */}
      <Route element={<ProtectedRoute roles={["applicant"]}><DashboardShell /></ProtectedRoute>}>
        <Route path="/bewerber" element={<ApplicantDashboard />} />
        <Route path="/bewerber/dokumente" element={<ApplicantDocuments />} />
        <Route path="/bewerber/termine" element={<ApplicantViewings />} />
      </Route>

      {/* Shared settings (landlord + applicant) */}
      <Route element={<ProtectedRoute roles={["landlord", "applicant"]}><DashboardShell /></ProtectedRoute>}>
        <Route path="/einstellungen" element={<Settings />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute roles={["admin"]}><DashboardShell /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/nutzer" element={<AdminUsers />} />
        <Route path="/admin/organisationen" element={<AdminOrganizations />} />
        <Route path="/admin/pakete" element={<AdminPlans />} />
        <Route path="/admin/support" element={<AdminSupport />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </div>
  );
}

export default App;
