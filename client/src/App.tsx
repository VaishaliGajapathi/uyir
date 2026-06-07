import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import { BottomNav } from "./components/BottomNav";
import { LiveAlertBanner } from "./components/LiveAlertBanner";
import { Spinner } from "./components/ui";

const Onboarding = lazy(() => import("./pages/Onboarding"));
const Home = lazy(() => import("./pages/Home"));
const Requests = lazy(() => import("./pages/Requests"));
const NewRequest = lazy(() => import("./pages/NewRequest"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const Nearby = lazy(() => import("./pages/Nearby"));
const Impact = lazy(() => import("./pages/Impact"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Terms = lazy(() => import("./pages/Terms"));
const HospitalLogin = lazy(() => import("./pages/HospitalLogin"));
const HospitalDashboard = lazy(() => import("./pages/HospitalDashboard"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const DonateRequest = lazy(() => import("./pages/DonateRequest"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const RateUs = lazy(() => import("./pages/RateUs"));
const Ratings = lazy(() => import("./pages/Ratings"));

function Inner() {
  const { user, loading } = useApp();
  
  // Request permissions on app load
  useEffect(() => {
    async function requestPermissions() {
      try {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        
        // Request location permission
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            () => console.log('Location permission granted'),
            (err) => console.log('Location permission denied:', err),
            { timeout: 10000 }
          );
        }
        
        // Request microphone permission (for voice input)
        if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            // Immediately close the stream since we just wanted permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
          } catch (err) {
            console.log('Microphone permission denied:', err);
          }
        }
      } catch (err) {
        console.log('Permission request error:', err);
      }
    }
    
    requestPermissions();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Spinner /></div>;
  return (
    <Suspense fallback={<div className="h-screen bg-slate-50" />}>
      <Routes>
        <Route path="/terms" element={<Terms />} />
        <Route path="/hospital-login" element={<HospitalLogin />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/donate-request" element={<DonateRequest />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/rate-us" element={<RateUs />} />
      </Routes>
      {!user ? (
        <Onboarding />
      ) : (
        <div className="min-h-screen bg-slate-50 flex">
          <BottomNav />
          <div className="flex-1 ml-20 md:ml-20 pb-16 md:pb-0">
            <LiveAlertBanner />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/new-request" element={<NewRequest />} />
              <Route path="/request" element={<Navigate to="/requests" replace />} />
              <Route path="/request/:id" element={<RequestDetail />} />
              <Route path="/nearby" element={<Nearby />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
              <Route path="/ratings" element={<Ratings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      )}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Inner />
      </AppProvider>
    </BrowserRouter>
  );
}
