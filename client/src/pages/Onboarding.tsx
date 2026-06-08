import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button } from "../components/ui";
import type { Lang } from "../lib/constants";

function dashboardPathForRole(role?: string) {
  if (role === "hospital_approver") return "/hospital-dashboard";
  if (role === "admin" || role === "verifier") return "/admin";
  return "/home";
}

export function Onboarding() {
  const { login, lang, setLang } = useApp();
  const nav = useNavigate();
  const [view, setView] = useState<"login" | "signup" | "otp" | "forgot" | "reset">("login");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showLegalInfo, setShowLegalInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [devOtp, setDevOtp] = useState("");

  async function handleLogin() {
    setErr(""); setLoading(true);
    try {
      const r = await api.login(mobile, password);
      login(r.token, r.user);
      nav(dashboardPathForRole(r.user.role));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function handleSignup() {
    setErr(""); setLoading(true);
    try {
      const r = await api.requestOtp(mobile, name);
      setDevOtp(r.devOtp || "");
      setCode(r.devOtp || "");
      setView("otp");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function verifyOtp() {
    setErr(""); setLoading(true);
    try {
      const r = await api.verifyOtp({ mobile, code, name, role: "donor", language: lang, password });
      login(r.token, r.user);
      nav(dashboardPathForRole(r.user.role));
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    setErr(""); setLoading(true);
    try {
      const r = await api.forgotPassword(mobile);
      setDevOtp(r.devOtp || "");
      setCode(r.devOtp || "");
      setView("reset");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function handleResetPassword() {
    setErr(""); setLoading(true);
    try {
      const r = await api.resetPassword(mobile, code, password);
      setView("login");
      setPassword("");
      setCode("");
      setDevOtp("");
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
              
              {/* Phone Number with India Code */}
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
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(String(e.target.value))}
                    maxLength={10}
                    className="flex-1 rounded-r-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500"
                  />
                </div>
              </div>

              {/* Password with Eye Toggle */}
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "கடவுச்சொல்" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "உங்கள் கடவுச்சொல்லை உள்ளிடவும்" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-uyir-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button onClick={() => { setView("forgot"); setErr(""); }} className="text-xs text-uyir-600 hover:underline">
                  {lang === "ta" ? "கடவுச்சொல் மறந்துவிட்டீர்களா?" : "Forgot password?"}
                </button>
              </div>

              {/* Sign In Button */}
              <Button
                className="w-full"
                size="md"
                loading={loading}
                disabled={mobile.length < 10 || password.length < 4}
                onClick={handleLogin}
              >
                <ShieldCheck className="h-4 w-4" /> {lang === "ta" ? "உள்நுழை" : "Sign In"}
              </Button>

              {/* Don't have account */}
              <div className="text-center text-sm">
                <span className="text-slate-500">{lang === "ta" ? "கணக்கு இல்லையா?" : "Don't have an account?"} </span>
                <button onClick={() => { setView("signup"); setErr(""); }} className="font-semibold text-uyir-600 hover:underline">
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
              
              {/* Name */}
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "பெயர்" : "Name"}
                </label>
                <input
                  type="text"
                  placeholder={lang === "ta" ? "உங்கள் பெயர்" : "Your name"}
                  value={name}
                  onChange={(e) => setName(String(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500"
                />
              </div>

              {/* Phone Number with India Code */}
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
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(String(e.target.value))}
                    maxLength={10}
                    className="flex-1 rounded-r-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500"
                  />
                </div>
              </div>

              {/* Password with Eye Toggle */}
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "கடவுச்சொல்" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "கடவுச்சொல்லை உள்ளிடவும்" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-uyir-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Ethical Consent Checkbox */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-uyir-600 focus:ring-uyir-500"
                />
                <div className="flex-1">
                  <label htmlFor="consent" className="text-xs text-slate-600">
                    {lang === "ta" 
                      ? "நான் இந்த இரத்த தானத்தை இலவசமாக கொடுக்கிறேன், பணத்திற்காக இல்லை. இது ஒரு நல்ல நோக்கத்திற்காக மட்டுமே." 
                      : "I pledge to donate blood voluntarily without any monetary compensation. This is for a noble cause to save lives."}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLegalInfo(true)}
                    className="ml-1 text-xs font-semibold text-uyir-600 hover:underline"
                  >
                    {lang === "ta" ? "மேலும் படிக்க" : "Read more"}
                  </button>
                </div>
              </div>

              {/* Get OTP Button */}
              <Button
                className="w-full"
                size="md"
                loading={loading}
                disabled={mobile.length < 10 || !name || !password || !consent}
                onClick={handleSignup}
              >
                <Phone className="h-4 w-4" /> {lang === "ta" ? "OTP பெறு" : "Get OTP"}
              </Button>

              {/* Already have account */}
              <div className="text-center text-sm">
                <span className="text-slate-500">{lang === "ta" ? "ஏற்கனவே கணக்கு உள்ளதா?" : "Already have an account?"} </span>
                <button onClick={() => { setView("login"); setErr(""); }} className="font-semibold text-uyir-600 hover:underline">
                  {lang === "ta" ? "உள்நுழை" : "Sign in"}
                </button>
              </div>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}

          {/* OTP View */}
          {view === "otp" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-center">{lang === "ta" ? "OTP உள்ளிடவும்" : "Enter OTP"}</h2>
              <p className="text-center text-sm text-slate-500">
                {lang === "ta" ? "உங்கள் மொபைலுக்கு அனுப்பப்பட்ட 6-இலக்க OTP" : "Enter the 6-digit OTP sent to your mobile"}
              </p>
              
              {devOtp && (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-center">
                  <p className="text-xs text-amber-700">
                    {lang === "ta" ? "டெமோ OTP:" : "Demo OTP:"} <b className="text-lg">{devOtp}</b>
                  </p>
                  <p className="text-[10px] text-amber-600">
                    {lang === "ta" ? "(SMS கேட்வே இணைக்கப்படவில்லை)" : "(SMS gateway not connected)"}
                  </p>
                </div>
              )}
              
              <input
                type="number"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(String(e.target.value))}
                maxLength={6}
                className="w-full rounded-lg border border-slate-300 p-3 text-center text-lg tracking-widest outline-none focus:border-uyir-500"
              />

              <Button
                className="w-full"
                size="md"
                loading={loading}
                disabled={code.length !== 6}
                onClick={verifyOtp}
              >
                <ShieldCheck className="h-4 w-4" /> {lang === "ta" ? "சரிபார்க்கவும்" : "Verify"}
              </Button>

              <button onClick={() => { setView("signup"); setErr(""); }} className="w-full text-xs text-slate-400">
                {lang === "ta" ? "மாற்றவும்" : "Change"}
              </button>

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
              
              {/* Phone Number with India Code */}
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
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(String(e.target.value))}
                    maxLength={10}
                    className="flex-1 rounded-r-lg border border-slate-300 p-3 text-sm outline-none focus:border-uyir-500"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                size="md"
                loading={loading}
                disabled={mobile.length < 10}
                onClick={handleForgotPassword}
              >
                <Phone className="h-4 w-4" /> {lang === "ta" ? "OTP பெறு" : "Get OTP"}
              </Button>

              <button onClick={() => { setView("login"); setErr(""); }} className="w-full text-xs text-slate-400">
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
              
              {devOtp && (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-center">
                  <p className="text-xs text-amber-700">
                    {lang === "ta" ? "டெமோ OTP:" : "Demo OTP:"} <b className="text-lg">{devOtp}</b>
                  </p>
                </div>
              )}
              
              <input
                type="number"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(String(e.target.value))}
                maxLength={6}
                className="w-full rounded-lg border border-slate-300 p-3 text-center text-lg tracking-widest outline-none focus:border-uyir-500"
              />

              {/* Password with Eye Toggle */}
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "புதிய கடவுச்சொல்" : "New Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={lang === "ta" ? "புதிய கடவுச்சொல்லை உள்ளிடவும்" : "Enter new password"}
                    value={password}
                    onChange={(e) => setPassword(String(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-uyir-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                className="w-full"
                size="md"
                loading={loading}
                disabled={code.length !== 6 || password.length < 4}
                onClick={handleResetPassword}
              >
                <ShieldCheck className="h-4 w-4" /> {lang === "ta" ? "கடவுச்சொல் மாற்று" : "Reset Password"}
              </Button>

              <button onClick={() => { setView("login"); setErr(""); }} className="w-full text-xs text-slate-400">
                {lang === "ta" ? "திரும்பு" : "Back to Login"}
              </button>

              {err && <p className="text-center text-xs text-red-500">{err}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Legal Information Modal */}
      {showLegalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="mb-4 text-lg font-bold text-slate-800">
                {lang === "ta" ? "இரத்த விற்பனை - சட்ட எச்சரிக்கை" : "Blood Selling - Legal Warning"}
              </h3>
              <button
                onClick={() => setShowLegalInfo(false)}
                className="mb-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
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
                  ? "இந்தியாவில், இரத்தத்தை பணத்திற்காக விற்பனை செய்வது குற்றம் மற்றும் தண்டனைக்குரிய செயல். இது பல்வேறு சட்டங்களின் கீழ் குற்றமாகக் கருதப்படுகிறது:"
                  : "In India, selling blood for money is a criminal offense punishable by law. This is considered a crime under various laws:"}
              </p>

              <ul className="ml-4 list-disc space-y-2">
                <li>
                  <strong>{lang === "ta" ? "இந்திய தண்டனைச் சட்டம் (IPC) - பிரிவு 420:" : "Indian Penal Code (IPC) - Section 420:"}</strong>
                  {lang === "ta" ? " மோசடி மற்றும் நம்பிக்கையை துரோகமாக பயன்படுத்துதல் - 7 ஆண்டுகள் வரை சிறைத்தண்டனை" : " Cheating and dishonestly inducing delivery of property - Up to 7 years imprisonment"}
                </li>
                <li>
                  <strong>{lang === "ta" ? "இந்திய தண்டனைச் சட்டம் (IPC) - பிரிவு 406:" : "Indian Penal Code (IPC) - Section 406:"}</strong>
                  {lang === "ta" ? " நம்பிக்கையை மீறுதல் - 3 ஆண்டுகள் வரை சிறைத்தண்டனை" : " Criminal breach of trust - Up to 3 years imprisonment"}
                </li>
                <li>
                  <strong>{lang === "ta" ? "மருத்துவ சட்டங்கள்:" : "Medical Laws:"}</strong>
                  {lang === "ta" ? " மருத்துவ சட்டங்களை மீறுதல் - கடுமையான தண்டனை மற்றும் உரிமம் ரத்து" : " Violation of medical laws - Severe penalties and license cancellation"}
                </li>
                <li>
                  <strong>{lang === "ta" ? "மனித உறுப்பு சட்டம் (THOA):" : "Human Organ Act (THOA):"}</strong>
                  {lang === "ta" ? " மனித உறுப்புகளை வணிக நோக்கத்திற்காக பயன்படுத்துதல் - 10 ஆண்டுகள் வரை சிறைத்தண்டனை மற்றும் ரூ.1 லட்சம் வரை அபராதம்" : " Commercial use of human organs - Up to 10 years imprisonment and fine up to ₹1 lakh"}
                </li>
              </ul>

              <p className="font-semibold text-red-600">
                {lang === "ta" ? "தண்டனைகள்:" : "Penalties:"}
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>{lang === "ta" ? "சிறைத்தண்டனை (3 முதல் 10 ஆண்டுகள்)" : "Imprisonment (3 to 10 years)"}</li>
                <li>{lang === "ta" ? "கடுமையான நிதி அபராதம்" : "Heavy monetary fines"}</li>
                <li>{lang === "ta" ? "மருத்துவ உரிமம் ரத்து" : "Medical license cancellation"}</li>
                <li>{lang === "ta" ? "குற்றவியல் பதிவு" : "Criminal record"}</li>
              </ul>

              <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                {lang === "ta" 
                  ? "UYIR தளம் இரத்த தானத்தை ஊக்குவிக்கிறது, வணிக நோக்கத்திற்காக அல்ல. எந்தவொரு பணப் பரிவர்த்தனையும் கண்டறியப்பட்டால், அது உடனடியாக காவல்துறையிடம் புகாரளிக்கப்படும்."
                  : "UYIR platform promotes voluntary blood donation, not commercial blood selling. Any monetary transaction detected will be immediately reported to police authorities."}
              </p>

              <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-semibold mb-2">
                  {lang === "ta" ? "🔵 UYIR தளத்தின் பங்கு:" : "🔵 UYIR Platform Role:"}
                </p>
                <p className="mb-2">
                  {lang === "ta" 
                    ? "UYIR இரத்த தானம் தேவைப்படுபவர்களையும் தானம் கொடுப்பவர்களையும் இணைக்கும் ஒரு தளம் மட்டுமே. UYIR எந்தவொரு பரிவர்த்தனையிலும் நேரடியாக ஈடுபடுவதில்லை."
                    : "UYIR is only a platform to connect blood donors and requestors. UYIR does not directly participate in any transactions."}
                </p>
                <p className="font-semibold mb-1">
                  {lang === "ta" ? "பொறுப்பு மறுப்பு:" : "Disclaimer:"}
                </p>
                <p className="mb-2">
                  {lang === "ta" 
                    ? "UYIR தளம் தானம் தேவைப்படுபவர்களுக்கும் தானம் கொடுப்பவர்களுக்கும் இடையே நடக்கும் எந்தவொரு செயல்பாட்டிற்கும் பொறுப்பேற்காது. ஏதேனும் மோசடி அல்லது சந்தேகத்திற்கிடமான செயல்பாடுகளைக் கண்டறிந்தால், உடனடியாக ஆதரவு குழுவைத் தொடர்பு கொள்ளவும்."
                    : "UYIR platform is not responsible for any activities between donors and requestors. If you detect any fraudulent or suspicious activities, please contact the support team immediately."}
                </p>
                <p className="font-semibold">
                  {lang === "ta" ? "ஆதரவு தொடர்பு:" : "Support Contact:"}
                </p>
                <p>
                  {lang === "ta" ? "மோசடி செயல்களைப் புகாரளிக்க: support@uyir.org" : "Report fraudulent activities: support@uyir.org"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLegalInfo(false)}
              className="mt-4 w-full rounded-lg bg-uyir-600 py-2 text-sm font-semibold text-white hover:bg-uyir-700"
            >
              {lang === "ta" ? "புரிந்தது" : "I Understand"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default Onboarding;
