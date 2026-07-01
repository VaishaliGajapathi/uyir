import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button } from "../components/ui";
import type { Lang } from "../lib/constants";

function dashboardPathForRole(role?: string) {
  if (role === "hospital") return "/hospital-dashboard";
  if (role === "admin" || role === "verifier" || role === "super_admin") return "/admin";
  if (role === "ngo") return "/ngoadmin";
  if (role === "blood_bank") return "/blood-bank-dashboard";
  return "/home";
}

export default function AdminLogin() {
  const { login, lang, setLang } = useApp();
  const nav = useNavigate();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin() {
    setErr(""); setLoading(true);
    try {
      const r = await api.login(mobile, password);
      
      // Only allow admin roles to login via this page
      const allowedRoles = ["admin", "verifier", "ngo", "blood_bank", "hospital", "super_admin"];
      if (!allowedRoles.includes(r.user.role)) {
        setErr(lang === "ta" ? "இந்த பக்கம் நிர்வாகிகளுக்கு மட்டுமே. வழக்கமான உள்நுழைவைப் பயன்படுத்தவும்." : "This page is for admins only. Please use regular login.");
        setLoading(false);
        return;
      }
      
      login(r.token, r.user);
      nav(dashboardPathForRole(r.user.role));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-uyir-50 to-uyir-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-uyir-600 text-white">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {lang === "ta" ? "UYIR நிர்வாகி உள்நுழைவு" : "UYIR Admin Login"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {lang === "ta" ? "நிர்வாகிகள், சரிபார்ப்பாளர்கள், NGO நிர்வாகிகளுக்காக" : "For admins, verifiers, and NGO admins"}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          {/* Language Toggle */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">{lang === "ta" ? "மொழி" : "Language"}</span>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              {lang === "ta" ? "தமிழ்" : "English"}
              <div className={`h-4 w-7 rounded-full p-0.5 transition-colors ${lang === "ta" ? "bg-uyir-600" : "bg-slate-300"}`}>
                <div className={`h-3 w-3 rounded-full bg-white transition-transform ${lang === "ta" ? "translate-x-3" : "translate-x-0"}`} />
              </div>
            </button>
          </div>

          {err && (
            <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {err}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {lang === "ta" ? "மொபைல் எண்" : "Mobile Number"}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-uyir-500 focus:outline-none focus:ring-2 focus:ring-uyir-500/20"
                  placeholder="9000000001"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {lang === "ta" ? "கடவுச்சொல்" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-4 pr-10 text-sm focus:border-uyir-500 focus:outline-none focus:ring-2 focus:ring-uyir-500/20"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full"
              loading={loading}
              onClick={handleLogin}
              disabled={!mobile || mobile.length < 10 || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {lang === "ta" ? "உள்நுழைகிறது..." : "Signing in..."}
                </>
              ) : (
                lang === "ta" ? "உள்நுழை" : "Sign In"
              )}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => nav("/")}
              className="text-sm text-uyir-600 hover:text-uyir-700"
            >
              {lang === "ta" ? "← வழக்கமான உள்நுழைவுக்குச் செல்லவும்" : "← Back to regular login"}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          {lang === "ta" ? "© 2026 UYIR. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை." : "© 2026 UYIR. All rights reserved."}
        </div>
      </div>
    </div>
  );
}
