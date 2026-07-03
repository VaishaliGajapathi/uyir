import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import { BottomNav } from "./components/BottomNav";
import { LiveAlertBanner } from "./components/LiveAlertBanner";
import { Spinner } from "./components/ui";
import type { User } from "./lib/api";

const Onboarding = lazy(() => import("./pages/Onboarding"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Home = lazy(() => import("./pages/Home"));
const Requests = lazy(() => import("./pages/Requests"));
const NewRequest = lazy(() => import("./pages/NewRequest"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const Nearby = lazy(() => import("./pages/Nearby"));
const Impact = lazy(() => import("./pages/Impact"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const NgoAdmin = lazy(() => import("./pages/NgoAdmin"));
const BloodBankDashboard = lazy(() => import("./pages/BloodBankDashboard"));
const Terms = lazy(() => import("./pages/Terms"));
const HospitalLogin = lazy(() => import("./pages/HospitalLogin"));
const HospitalRegister = lazy(() => import("./pages/HospitalRegister"));
const HospitalDashboard = lazy(() => import("./pages/HospitalDashboard"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const DonateRequest = lazy(() => import("./pages/DonateRequest"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const RateUs = lazy(() => import("./pages/RateUs"));
const Ratings = lazy(() => import("./pages/Ratings"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignsPublic = lazy(() => import("./pages/CampaignsPublic"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

function dashboardPathForRole(user: User | null) {
  if (!user) return "/";
  if (user.role === "hospital") return "/hospital-dashboard";
  if (user.role === "administrator" || user.role === "volunteer" || user.role === "super_admin") return "/admin";
  if (user.role === "ngo") return "/ngoadmin";
  if (user.role === "blood_bank") return "/blood-bank-dashboard";
  return "/home";
}

function AppShell({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const showEndUserShell = user?.role !== "hospital" && user?.role !== "administrator" && user?.role !== "volunteer" && user?.role !== "ngo" && user?.role !== "blood_bank" && user?.role !== "super_admin";
  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      {showEndUserShell && <BottomNav />}
      <div className={`flex-1 w-full min-w-0 ${showEndUserShell ? "md:ml-20 pb-16 md:pb-0" : ""}`}>
        {showEndUserShell && <LiveAlertBanner />}
        {children}
      </div>
    </div>
  );
}

function Inner() {
  const { user, loading } = useApp();

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Spinner /></div>;

  const protectedElement = (element: ReactNode) => user ? <AppShell>{element}</AppShell> : <Navigate to="/" replace />;
  const defaultDashboard = dashboardPathForRole(user);

  return (
    <Suspense fallback={<div className="h-screen bg-slate-50" />}>
      <Routes>
        <Route path="/" element={user ? <Navigate to={defaultDashboard} replace /> : <Onboarding />} />
        <Route path="/adminlogin" element={<AdminLogin />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/hospital-login" element={<HospitalLogin />} />
        <Route path="/hospital-register" element={<HospitalRegister />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/donate-request" element={<DonateRequest />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/rate-us" element={<RateUs />} />
        <Route path="/requests" element={protectedElement(<Requests />)} />
        <Route path="/new-request" element={protectedElement(<NewRequest />)} />
        <Route path="/request" element={user ? <Navigate to="/requests" replace /> : <Navigate to="/" replace />} />
        <Route path="/request/:id" element={protectedElement(<RequestDetail />)} />
        <Route path="/nearby" element={protectedElement(<Nearby />)} />
        <Route path="/impact" element={protectedElement(<Impact />)} />
        <Route path="/profile" element={protectedElement(<Profile />)} />
        <Route path="/admin" element={protectedElement(<Admin />)} />
        <Route path="/ngoadmin" element={protectedElement(<NgoAdmin />)} />
        <Route path="/blood-bank-dashboard" element={protectedElement(<BloodBankDashboard />)} />
        <Route path="/hospital-dashboard" element={protectedElement(<HospitalDashboard />)} />
        <Route path="/ratings" element={protectedElement(<Ratings />)} />
        <Route path="/campaigns" element={protectedElement(<Campaigns />)} />
        <Route path="/campaigns-public" element={<CampaignsPublic />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/home" element={user && (user.role === "administrator" || user.role === "volunteer" || user.role === "hospital" || user.role === "ngo" || user.role === "blood_bank" || user.role === "super_admin") ? <Navigate to={defaultDashboard} replace /> : protectedElement(<Home />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <Inner />
      </AppProvider>
    </BrowserRouter>
  );
}
