import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button } from "../components/ui";
import type { Lang } from "../lib/constants";
import { initMsg91Widget } from "../lib/msg91Widget";

function dashboardPathForRole(role?: string) {
  if (role === "hospital_approver") return "/hospital-dashboard";
  if (role === "admin" || role === "verifier") return "/admin";
  return "/home";
}

export function Onboarding() {
  const { login, lang, setLang } = useApp();
  const nav = useNavigate();
  const [view, setView] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showLegalInfo, setShowLegalInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [widgetStep, setWidgetStep] = useState<"idle" | "sending" | "verifying" | "done">("idle");
  const [widgetToken, setWidgetToken] = useState("");

  // Listen for MSG91 widget events
  useEffect(() => {
    const onSuccess = (e: any) => {
      const token = e?.detail?.accessToken || e?.detail?.token || e?.detail?.["access-token"] || "";
      if (token) {
        setWidgetToken(token);
        setWidgetStep("done");
      } else {
        setErr("OTP verified but no access token received.");
        setWidgetStep("idle");
      }
    };
    const onFailure = (e: any) => {
      setErr(e?.detail?.message || "OTP verification failed.");
      setWidgetStep("idle");
      setLoading(false);
    };
    window.addEventListener("msg91:otp:success", onSuccess);
    window.addEventListener("msg91:otp:failure", onFailure);
    return () => {
      window.removeEventListener("msg91:otp:success", onSuccess);
      window.removeEventListener("msg91:otp:failure", onFailure);
    };
  }, []);

  async function handleLogin() {
    setErr(""); setLoading(true);
    try {
      const r = await api.login(mobile, password);
      login(r.token, r.user);
      nav(dashboardPathForRole(r.user.role));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  function handleSignup() {
    setErr("");
    if (mobile.length < 10 || !name || !password || !consent) {
      setErr(lang === "ta" ? "அனைத்து தகவல்களையும் உள்ளிடவும்" : "Please fill all fields");
      return;
    }
    setWidgetStep("sending");
    setLoading(true);
    initMsg91Widget(
      mobile,
      (data) => {
        setWidgetToken(data.accessToken);
        setWidgetStep("done");
      },
      (error) => {
        setErr(error);
        setWidgetStep("idle");
        setLoading(false);
      },
      "signup"
    );
  }

  async function verifyWidgetSignup() {
    if (!widgetToken) { setErr("OTP not verified yet."); return; }
    setErr(""); setLoading(true);
    try {
      const r = await api.widgetVerify({
        mobile,
        accessToken: widgetToken,
        name,
        role: "donor",
        language: lang,
        password,
      });
      login(r.token, r.user);
      nav(dashboardPathForRole(r.user.role));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  function handleForgot() {
    setErr("");
    if (mobile.length < 10) {
      setErr(lang === "ta" ? "செல்லுபடியாகும் மொபைல் எண்ணை உள்ளிடவும்" : "Please enter a valid mobile number");
      return;
    }
    setWidgetStep("sending");
    setLoading(true);
    setView("reset");
    initMsg91Widget(
      mobile,
      (data) => {
        setWidgetToken(data.accessToken);
        setWidgetStep("done");
      },
      (error) => {
        setErr(error);
        setWidgetStep("idle");
        setLoading(false);
      },
      "forgot"
    );
  }

  async function handleWidgetReset() {
    if (!widgetToken) { setErr("OTP not verified yet."); return; }
    setErr(""); setLoading(true);
    try {
      const r = await api.widgetReset({ mobile, accessToken: widgetToken, password });
      setView("login");
      setPassword("");
      setWidgetToken("");
      setWidgetStep("idle");
      alert(r.message);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5 py-8 text-slate-800">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white px-5 py-6 text-slate-800 shadow-xl ring-1 ring-slate-200">
          <div className="mb-4 text-center">
            <img src="/uyir-logo.png" alt="UYIR" className="mx-auto h-24 w-auto object-contain" />
          </div>

          {/* Language Toggle */}
          <div className="mb-4 flex gap-2">
            {(["ta", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${lang === l ? "bg-uyir-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {l === "ta" ? "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" : "English"}
              </button>
            ))}
          </div>

          {/* Login View */}
          {view === "login" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "\u0B89\u0BB3\u0BCD\u0BA8\u0BC1\u0BB4\u0BC8" : "Sign In"}</h2>

              {/* Phone Number */}
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "\u0BAE\u0BCA\u0BAA\u0BC8\u0BB2\u0BCD \u0B8E\u0BA3\u0BCD" : "Phone Number"}
                </label>
                <div className="flex">
                  <div className="flex items-center gap-1 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3">
                    <span className="text-lg">🇮🇳</span>
                    <span className="text-sm font-semibold text-slate-600">+91</span>
                  </div>
                  <input
                    type="tel" inputMode="numeric" placeholder="98765 43210" maxLength={10}
                    value={mobile} onChange={(e) => setMobile(String(e.target.value))}
                    className="flex-1 rounded-r-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "\u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8 \u0B89\u0BB3\u0BCD\u0BB3\u0BBF\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD" : "Enter your password"}
                    value={password} onChange={(e) => setPassword(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-uyir-500"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button onClick={() => { setView("forgot"); setErr(""); setPassword(""); setWidgetStep("idle"); setWidgetToken(""); }}
                  className="text-xs text-uyir-600 hover:underline">
                  {lang === "ta" ? "\u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD \u0BAE\u0BB1\u0B82\u0BA4\u0BC1\u0BB5\u0BBF\u0B9F\u0BCD\u0B9F\u0BC0\u0BB0\u0BCD\u0B95\u0BB3\u0BBE?" : "Forgot password?"}
                </button>
              </div>

              <Button className="w-full" size="md" loading={loading}
                disabled={mobile.length < 10 || password.length < 4}
                onClick={handleLogin}>
                <ShieldCheck className="h-4 w-4" /> {lang === "ta" ? "\u0B89\u0BB3\u0BCD\u0BA8\u0BC1\u0BB4\u0BC8" : "Sign In"}
              </Button>

              <div className="text-center text-sm">
                <span className="text-slate-500">{lang === "ta" ? "\u0B95\u0BA3\u0B95\u0BCD\u0B95\u0BC1 \u0B87\u0BB2\u0BCD\u0BB2\u0BC8\u0BAF\u0BBE?" : "Don't have an account?"} </span>
                <button onClick={() => { setView("signup"); setErr(""); setWidgetStep("idle"); setWidgetToken(""); }}
                  className="font-semibold text-uyir-600 hover:underline">
                  {lang === "ta" ? "\u0BAA\u0BA4\u0BBF\u0BB5\u0BC1 \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD" : "Sign up"}
                </button>
              </div>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}

          {/* Signup View */}
          {view === "signup" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "\u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0BAA\u0BA4\u0BBF\u0BB5\u0BC1" : "Sign Up"}</h2>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "\u0BAA\u0BC6\u0BAF\u0BB0\u0BCD" : "Name"}</label>
                <input type="text" placeholder={lang === "ta" ? "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAA\u0BC6\u0BAF\u0BB0\u0BCD" : "Your name"}
                  value={name} onChange={(e) => setName(String(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500" />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "\u0BAE\u0BCA\u0BAA\u0BC8\u0BB2\u0BCD \u0B8E\u0BA3\u0BCD" : "Phone Number"}</label>
                <div className="flex">
                  <div className="flex items-center gap-1 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3">
                    <span className="text-lg">🇮🇳</span>
                    <span className="text-sm font-semibold text-slate-600">+91</span>
                  </div>
                  <input type="tel" inputMode="numeric" placeholder="98765 43210" maxLength={10}
                    value={mobile} onChange={(e) => setMobile(String(e.target.value))}
                    className="flex-1 rounded-r-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500" />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "\u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD" : "Password"}</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "\u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8 \u0B89\u0BB3\u0BCD\u0BB3\u0BBF\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD" : "Enter your password"}
                    value={password} onChange={(e) => setPassword(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-uyir-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Ethical Consent */}
              <div className="flex items-start gap-2">
                <input type="checkbox" id="consent" checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-uyir-600 focus:ring-uyir-500" />
                <div className="flex-1">
                  <label htmlFor="consent" className="text-xs text-slate-600">
                    {lang === "ta"
                      ? "\u0BA8\u0BBE\u0BA9\u0BCD \u0B87\u0BA8\u0BCD\u0BA4 \u0B87\u0BB0\u0BA4\u0BCD\u0BA4 \u0BA4\u0BBE\u0BA9\u0BA4\u0BC8 \u0B87\u0BB2\u0BB5\u0B9A\u0BCD\u0B9A\u0BAE\u0BBE\u0B95 \u0B95\u0BCA\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB1\u0BC7\u0BA9\u0BCD, \u0BAA\u0BA3\u0BA4\u0BCD\u0BA4\u0BBF\u0BB1\u0BCD\u0B95\u0BBE\u0B95 \u0B87\u0BB2\u0BCD\u0BB2. \u0B87\u0BA4\u0BC1 \u0B92\u0BB0\u0BC1 \u0BA8\u0BB2\u0BCD\u0BB2 \u0BA8\u0BCB\u0B95\u0BCD\u0B95\u0BA4\u0BCD\u0BA4\u0BBF\u0BB1\u0BCD\u0B95\u0BBE\u0B95 \u0BAE\u0B9F\u0BCD\u0B9F\u0BC1\u0BAE\u0BC7."
                      : "I pledge to donate blood voluntarily without any monetary compensation. This is for a noble cause to save lives."}
                  </label>
                  <button type="button" onClick={() => setShowLegalInfo(true)}
                    className="ml-1 text-xs font-semibold text-uyir-600 hover:underline">
                    {lang === "ta" ? "\u0BAE\u0BC7\u0BB2\u0BC1\u0BAE\u0BCD \u0BAA\u0B9F\u0BBF\u0B95\u0BCD\u0B95" : "Read more"}
                  </button>
                </div>
              </div>

              {/* Widget status */}
              {widgetStep === "sending" && (
                <div className="rounded-md bg-blue-50 px-3 py-2 text-center">
                  <p className="text-xs text-blue-700 flex items-center justify-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {lang === "ta" ? "OTP \u0BB5\u0BBF\u0B9C\u0B9F\u0BCD\u0B9F\u0BC8 \u0BA4\u0BBF\u0BB1\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1..." : "Opening OTP widget..."}
                  </p>
                </div>
              )}

              {widgetStep === "done" && (
                <div className="rounded-md bg-green-50 px-3 py-2 text-center">
                  <p className="text-xs text-green-700">
                    {lang === "ta" ? "\u0B92\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F\u0BBF \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1!" : "OTP verified!"}
                  </p>
                </div>
              )}

              <Button className="w-full" size="md" loading={loading}
                disabled={mobile.length < 10 || !name || !password || !consent || widgetStep === "sending"}
                onClick={widgetStep === "done" ? verifyWidgetSignup : handleSignup}>
                <Phone className="h-4 w-4" />
                {widgetStep === "done"
                  ? (lang === "ta" ? "\u0BAA\u0BA4\u0BBF\u0BB5\u0BC1 \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD" : "Complete Signup")
                  : (lang === "ta" ? "OTP \u0BAA\u0BC6\u0BB1\u0BC1" : "Get OTP")}
              </Button>

              <div className="text-center text-sm">
                <span className="text-slate-500">{lang === "ta" ? "\u0BAE\u0BC1\u0BA9\u0BCD\u0BA9\u0BBE\u0BB5\u0BBF\u0BA4\u0BAE\u0BCD \u0BAA\u0BA4\u0BBF\u0BB5\u0BC1?" : "Already have an account?"} </span>
                <button onClick={() => { setView("login"); setErr(""); setWidgetStep("idle"); setWidgetToken(""); }}
                  className="font-semibold text-uyir-600 hover:underline">
                  {lang === "ta" ? "\u0B89\u0BB3\u0BCD\u0BA8\u0BC1\u0BB4\u0BC8" : "Sign in"}
                </button>
              </div>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}

          {/* Forgot Password View */}
          {view === "forgot" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "\u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD \u0BAE\u0BB1\u0B82\u0BA4\u0BC1\u0BB5\u0BBF\u0B9F\u0BCD\u0B9F\u0BC0\u0BB0\u0BCD\u0B95\u0BB3\u0BBE?" : "Forgot Password?"}</h2>
              <p className="text-center text-sm text-slate-500">
                {lang === "ta" ? "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAE\u0BCA\u0BAA\u0BC8\u0BB2\u0BCD \u0B8E\u0BA3\u0BCD\u0BA3\u0BC8 \u0B89\u0BB3\u0BCD\u0BB3\u0BBF\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD, OTP \u0B85\u0BA9\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0BB5\u0BCB\u0BAE\u0BCD" : "Enter your mobile number to receive OTP"}
              </p>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "\u0BAE\u0BCA\u0BAA\u0BC8\u0BB2\u0BCD \u0B8E\u0BA3\u0BCD" : "Phone Number"}</label>
                <div className="flex">
                  <div className="flex items-center gap-1 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3">
                    <span className="text-lg">🇮🇳</span>
                    <span className="text-sm font-semibold text-slate-600">+91</span>
                  </div>
                  <input type="tel" inputMode="numeric" placeholder="98765 43210" maxLength={10}
                    value={mobile} onChange={(e) => setMobile(String(e.target.value))}
                    className="flex-1 rounded-r-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500" />
                </div>
              </div>

              <Button className="w-full" size="md" loading={loading}
                disabled={mobile.length < 10}
                onClick={handleForgot}>
                <Phone className="h-4 w-4" /> {lang === "ta" ? "OTP \u0BAA\u0BC6\u0BB1\u0BC1" : "Get OTP"}
              </Button>

              <button onClick={() => { setView("login"); setErr(""); setWidgetStep("idle"); setWidgetToken(""); }}
                className="w-full text-xs text-slate-400">
                {lang === "ta" ? "\u0BA4\u0BBF\u0BB0\u0BC1\u0BAE\u0BCD\u0BAA\u0BC1" : "Back to Login"}
              </button>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}

          {/* Reset Password View */}
          {view === "reset" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "\u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD" : "Set New Password"}</h2>
              <p className="text-center text-sm text-slate-500">
                {lang === "ta" ? "OTP \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8 \u0B89\u0BB3\u0BCD\u0BB3\u0BBF\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD" : "OTP verified. Enter your new password"}
              </p>

              {widgetStep === "sending" && (
                <div className="rounded-md bg-blue-50 px-3 py-2 text-center">
                  <p className="text-xs text-blue-700 flex items-center justify-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {lang === "ta" ? "OTP \u0BB5\u0BBF\u0B9C\u0B9F\u0BCD\u0B9F\u0BC8 \u0BA4\u0BBF\u0BB1\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1..." : "Opening OTP widget..."}
                  </p>
                </div>
              )}

              {widgetStep === "done" && (
                <div className="rounded-md bg-green-50 px-3 py-2 text-center">
                  <p className="text-xs text-green-700">
                    {lang === "ta" ? "\u0B92\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F\u0BBF \u0B9A\u0BB0\u0BBF\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1!" : "OTP verified!"}
                  </p>
                </div>
              )}

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "\u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD" : "New Password"}</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "\u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD\u0BB2\u0BC8 \u0B89\u0BB3\u0BCD\u0BB3\u0BBF\u0B9F\u0BB5\u0BC1\u0BAE\u0BCD" : "Enter new password"}
                    value={password} onChange={(e) => setPassword(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-uyir-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button className="w-full" size="md" loading={loading}
                disabled={widgetStep !== "done" || password.length < 4}
                onClick={handleWidgetReset}>
                <ShieldCheck className="h-4 w-4" /> {lang === "ta" ? "\u0B95\u0B9F\u0BB5\u0BC1\u0B9A\u0BCD\u0B9A\u0BCA\u0BB2\u0BCD \u0BAE\u0BBE\u0BB1\u0BCD\u0BB1\u0BC1" : "Reset Password"}
              </Button>

              <button onClick={() => { setView("login"); setErr(""); setWidgetStep("idle"); setWidgetToken(""); setPassword(""); }}
                className="w-full text-xs text-slate-400">
                {lang === "ta" ? "\u0BA4\u0BBF\u0BB0\u0BC1\u0BAE\u0BCD\u0BAA\u0BC1" : "Back to Login"}
              </button>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Legal Modal */}
      {showLegalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="mb-4 text-lg font-bold text-slate-800">
                {lang === "ta" ? "\u0B87\u0BB0\u0BA4\u0BCD\u0BA4 \u0BB5\u0BBF\u0BB1\u0BCD\u0BAA\u0BA9\u0BC8 - \u0B9A\u0B9F\u0BCD\u0B9F \u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8" : "Blood Selling - Legal Warning"}
              </h3>
              <button onClick={() => setShowLegalInfo(false)}
                className="mb-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p className="font-semibold text-red-600">
                {lang === "ta" ? "\u26A0\uFE0F \u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B9A\u0B9F\u0BCD\u0B9F \u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8" : "\u26A0\uFE0F Important Legal Warning"}
              </p>
              <p>
                {lang === "ta"
                  ? "\u0B87\u0BA8\u0BCD\u0BA4\u0BBF\u0BAF\u0BBE\u0BB5\u0BBF\u0BB2\u0BCD, \u0B87\u0BB0\u0BA4\u0BCD\u0BA4\u0BC8 \u0BAA\u0BA3\u0BA4\u0BCD\u0BA4\u0BBF\u0BB1\u0BCD\u0B95\u0BBE\u0B95 \u0BB5\u0BBF\u0BB1\u0BCD\u0BAA\u0BA9\u0BC8 \u0B9A\u0BC6\u0BAF\u0BCD\u0BB5\u0BA4\u0BC1 \u0B95\u0BC1\u0BB1\u0BCD\u0BB1\u0BAE\u0BCD \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BA4\u0BA3\u0BCD\u0B9F\u0BA9\u0BC8\u0B95\u0BCD\u0B95\u0BC1\u0BB0\u0BBF\u0BAF \u0B9A\u0BC6\u0BAF\u0BB2\u0BCD."
                  : "In India, selling blood for money is a criminal offense punishable by law."}
              </p>
              <p className="font-semibold text-slate-700">
                {lang === "ta"
                  ? "\u0B87\u0BA4\u0BC1 \u0B92\u0BB0\u0BC1 \u0B87\u0BB2\u0BB5\u0B9A\u0BCD\u0B9A\u0BAE\u0BBE\u0BA9 \u0BAA\u0BA3\u0BCD\u0BAA\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BAE\u0BCD \u0BAE\u0B9F\u0BCD\u0B9F\u0BC1\u0BAE\u0BC7 \u0B87\u0BB2\u0BB5\u0B9A\u0BCD\u0B9A\u0BAE\u0BBE\u0B95 \u0BA4\u0BBE\u0BA9\u0BAE\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0B95\u0BBF\u0BB1\u0BA4\u0BC1."
                  : "This is a completely voluntary service and should be done only as a donation."}
              </p>
              <p>
                {lang === "ta"
                  ? "\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B87\u0BB0\u0BA4\u0BCD\u0BA4\u0BC8 \u0BA4\u0BBE\u0BA9\u0BAE\u0BCD \u0BA4\u0BC7\u0BB5\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0BB5\u0BC6\u0BA3\u0BCD\u0B9F\u0BBF\u0B9A\u0BCD\u0B9A\u0BAE\u0BCD \u0BAE\u0BC2\u0BB2\u0BAE\u0BCD \u0BAE\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1\u0BB5\u0BBF\u0B9F\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD."
                  : "Your voluntary donation will help save lives."}
              </p>
            </div>
            <button onClick={() => setShowLegalInfo(false)}
              className="mt-4 w-full rounded-lg bg-uyir-600 py-2 text-sm font-semibold text-white hover:bg-uyir-700">
              {lang === "ta" ? "\u0BA4\u0BC6\u0BB0\u0BBF\u0BA8\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BCB\u0BB1\u0BC7\u0BA9\u0BCD" : "I Understand"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Onboarding;
