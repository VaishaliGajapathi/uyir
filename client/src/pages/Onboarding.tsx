import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button } from "../components/ui";
import type { Lang } from "../lib/constants";

function dashboardPathForRole(role?: string) {
  if (role === "hospital_approver") return "/hospital-dashboard";
  if (role === "admin" || role === "verifier") return "/admin";
  return "/home";
}

export default function Onboarding() {
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
  const [otpStep, setOtpStep] = useState<"idle" | "sent" | "verified">("idle");
  const [otpCode, setOtpCode] = useState("");

  async function handleLogin() {
    setErr(""); setLoading(true);
    try {
      const r = await api.login(mobile, password);
      login(r.token, r.user);
      nav(dashboardPathForRole(r.user.role));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function handleSignup() {
    setErr("");
    if (mobile.length < 10 || !name || !password || !consent) {
      setErr(lang === "ta" ? "அனைத்து தகவல்களையும் உள்ளிடவும்" : "Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const r = await api.requestOtp(mobile, name);
      if (r.exists && r.hasPassword) {
        setErr(lang === "ta" ? "இந்த எண்ணு உளாத பதிவு செய்கிறது. உள்நுழை செய்க." : "This number is already registered. Please sign in.");
        return;
      }
      setOtpStep("sent");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function verifySignup() {
    if (!otpCode || otpCode.length < 6) { setErr("Please enter the 6-digit OTP."); return; }
    setErr(""); setLoading(true);
    try {
      const r = await api.verifyOtp({ mobile, code: otpCode, name, role: "donor", language: lang, password });
      login(r.token, r.user);
      nav(dashboardPathForRole(r.user.role));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function handleForgot() {
    setErr("");
    if (mobile.length < 10) {
      setErr(lang === "ta" ? "செல்லுபடியாகும் மொபைல் எண்ணை உள்ளிடவும்" : "Please enter a valid mobile number");
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(mobile);
      setOtpStep("sent");
      setView("reset");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function handleReset() {
    if (!otpCode || otpCode.length < 6) { setErr("Please enter the 6-digit OTP."); return; }
    setErr(""); setLoading(true);
    try {
      const r = await api.resetPassword(mobile, otpCode, password);
      setView("login");
      setPassword("");
      setOtpCode("");
      setOtpStep("idle");
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
                {l === "ta" ? "தமிழ்" : "English"}
              </button>
            ))}
          </div>

          {/* Login View */}
          {view === "login" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "உள்நுழை" : "Sign In"}</h2>

              {/* Phone Number */}
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "மொபைல் எண்" : "Phone Number"}
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
                  {lang === "ta" ? "கடவுச்சொல்" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "உங்கள் கடவுச்சொல்லை உள்ளிடவும்" : "Enter your password"}
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
                <button onClick={() => { setView("forgot"); setErr(""); setPassword(""); setOtpStep("idle"); setOtpCode(""); }}
                  className="text-xs text-uyir-600 hover:underline">
                  {lang === "ta" ? "கடவுச்சொல் மறந்துவிட்டீர்களா?" : "Forgot password?"}
                </button>
              </div>

              <Button className="w-full" size="md" loading={loading}
                disabled={mobile.length < 10 || password.length < 4}
                onClick={handleLogin}>
                <ShieldCheck className="h-4 w-4" /> {lang === "ta" ? "உள்நுழை" : "Sign In"}
              </Button>

              <div className="text-center text-sm">
                <span className="text-slate-500">{lang === "ta" ? "கணக்கு இல்லையா?" : "Don't have an account?"} </span>
                <button onClick={() => { setView("signup"); setErr(""); setOtpStep("idle"); setOtpCode(""); }}
                  className="font-semibold text-uyir-600 hover:underline">
                  {lang === "ta" ? "பதிவு செய்யவும்" : "Sign up"}
                </button>
              </div>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}

          {/* Signup View */}
          {view === "signup" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "புதிய பதிவு" : "Sign Up"}</h2>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "பெயர்" : "Name"}</label>
                <input type="text" placeholder={lang === "ta" ? "உங்கள் பெயர்" : "Your name"}
                  value={name} onChange={(e) => setName(String(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500" />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "மொபைல் எண்" : "Phone Number"}</label>
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
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "கடவுச்சொல்" : "Password"}</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "கடவுச்சொல்லை உள்ளிடவும்" : "Enter your password"}
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
                      ? "நான் இந்த இரத்த தானதை இலவசமாக கொடுக்கிறேன், பணத்திற்காக இல்ல. இது ஒரு நல்ல நோக்கத்திற்காக மட்டுமே."
                      : "I pledge to donate blood voluntarily without any monetary compensation. This is for a noble cause to save lives."}
                  </label>
                  <button type="button" onClick={() => setShowLegalInfo(true)}
                    className="ml-1 text-xs font-semibold text-uyir-600 hover:underline">
                    {lang === "ta" ? "மேலும் படிக்க" : "Read more"}
                  </button>
                </div>
              </div>

              {/* OTP Status */}
              {otpStep === "sent" && (
                <div className="rounded-md bg-blue-50 px-3 py-2 text-center">
                  <p className="text-xs text-blue-700">
                    {lang === "ta" ? "OTP உங்கள் மொபைலுக்கு அனுப்பப்பட்டது." : "OTP sent to your mobile."}
                  </p>
                </div>
              )}

              {/* OTP Input */}
              {otpStep === "sent" && (
                <div>
                  <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "OTP எண்" : "OTP Code"}</label>
                  <input type="tel" inputMode="numeric" placeholder="123456" maxLength={6}
                    value={otpCode} onChange={(e) => setOtpCode(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500" />
                </div>
              )}

              <Button className="w-full" size="md" loading={loading}
                disabled={mobile.length < 10 || !name || !password || !consent || (otpStep === "sent" && otpCode.length < 6)}
                onClick={otpStep === "sent" ? verifySignup : handleSignup}>
                <Phone className="h-4 w-4" />
                {otpStep === "sent"
                  ? (lang === "ta" ? "பதிவு செய்யவும்" : "Complete Signup")
                  : (lang === "ta" ? "OTP பெறு" : "Get OTP")}
              </Button>

              <div className="text-center text-sm">
                <span className="text-slate-500">{lang === "ta" ? "முன்னாள் பதிவு?" : "Already have an account?"} </span>
                <button onClick={() => { setView("login"); setErr(""); setOtpStep("idle"); setOtpCode(""); }}
                  className="font-semibold text-uyir-600 hover:underline">
                  {lang === "ta" ? "உள்நுழை" : "Sign in"}
                </button>
              </div>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}

          {/* Forgot Password View */}
          {view === "forgot" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "கடவுச்சொல் மறந்துவிட்டீர்களா?" : "Forgot Password?"}</h2>
              <p className="text-center text-sm text-slate-500">
                {lang === "ta" ? "உங்கள் மொபைல் எண்ணை உள்ளிடவும், OTP அனுப்புவோம்" : "Enter your mobile number to receive OTP"}
              </p>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "மொபைல் எண்" : "Phone Number"}</label>
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
                <Phone className="h-4 w-4" /> {lang === "ta" ? "OTP பெறு" : "Get OTP"}
              </Button>

              <button onClick={() => { setView("login"); setErr(""); setOtpStep("idle"); setOtpCode(""); }}
                className="w-full text-xs text-slate-400">
                {lang === "ta" ? "திரும்பு" : "Back to Login"}
              </button>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}

          {/* Reset Password View */}
          {view === "reset" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "புதிய கடவுச்சொல்" : "Set New Password"}</h2>
              <p className="text-center text-sm text-slate-500">
                {lang === "ta" ? "OTP மற்றும் புதிய கடவுச்சொல்லை உள்ளிடவும்" : "Enter OTP and your new password"}
              </p>

              {otpStep === "sent" && (
                <div className="rounded-md bg-blue-50 px-3 py-2 text-center">
                  <p className="text-xs text-blue-700">
                    {lang === "ta" ? "OTP உங்கள் மொபைலுக்கு அனுப்பப்பட்டது." : "OTP sent to your mobile."}
                  </p>
                </div>
              )}

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "OTP எண்" : "OTP Code"}</label>
                <input type="tel" inputMode="numeric" placeholder="123456" maxLength={6}
                  value={otpCode} onChange={(e) => setOtpCode(String(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500" />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">{lang === "ta" ? "புதிய கடவுச்சொல்" : "New Password"}</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "புதிய கடவுச்சொல்லை உள்ளிடவும்" : "Enter new password"}
                    value={password} onChange={(e) => setPassword(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-uyir-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button className="w-full" size="md" loading={loading}
                disabled={otpCode.length < 6 || password.length < 4}
                onClick={handleReset}>
                <ShieldCheck className="h-4 w-4" /> {lang === "ta" ? "கடவுச்சொல் மாற்று" : "Reset Password"}
              </Button>

              <button onClick={() => { setView("login"); setErr(""); setOtpStep("idle"); setOtpCode(""); setPassword(""); }}
                className="w-full text-xs text-slate-400">
                {lang === "ta" ? "திரும்பு" : "Back to Login"}
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
                {lang === "ta" ? "இரத்த் விற்பனை - சட்ட எச்சரிக்கை" : "Blood Selling - Legal Warning"}
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
                {lang === "ta" ? "⚠️ முக்கிய சட்ட எச்சரிக்கை" : "⚠️ Important Legal Warning"}
              </p>
              <p>
                {lang === "ta"
                  ? "இந்தியாவில், இரத்தை பணத்திற்காக விற்பனை செய்வது குற்றம் மற்றும் தண்டனைக்குரிய செயல்."
                  : "In India, selling blood for money is a criminal offense punishable by law."}
              </p>
              <p>
                {lang === "ta"
                  ? "இந்திய தண்டனை சட்டம் 1860, பிரிவு 370: மனித வணிகம் (கிட்னி, இரத்த், உறுப்புகள்) தடை செய்யப்பட்டுள்ளது."
                  : "Indian Penal Code 1860, Section 370: Human trafficking (kidney, blood, organs) is prohibited."}
              </p>
              <p>
                {lang === "ta"
                  ? "National Blood Transfusion Council (NBTC) & National AIDS Control Organization (NACO): இரத்த் விற்பனைக்கு தடை விதிக்கப்பட்டுள்ளது."
                  : "National Blood Transfusion Council (NBTC) & National AIDS Control Organization (NACO): Blood selling is banned."}
              </p>
              <p className="font-semibold text-green-600">
                {lang === "ta" ? "✅ சட்டபூர்வமான மாற்று:" : "✅ Legal Alternative:"}
              </p>
              <p>
                {lang === "ta"
                  ? "• இரத்த் தானம் - இலவசமாக வழங்குவது மட்டுமே சட்டபூர்வமானது"
                  : "• Blood donation - Only voluntary donation is legal"}
              </p>
              <p>
                {lang === "ta"
                  ? "• தன்னார்வ இரத்த் தானம் - உயிர்களை காப்பாற்ற உதவும்"
                  : "• Voluntary donation helps save lives"}
              </p>
              <p className="text-xs text-slate-400">
                {lang === "ta" ? "இதை படித்ததற்கு நன்றி." : "Thank you for reading."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
