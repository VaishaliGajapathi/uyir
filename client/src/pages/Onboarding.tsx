import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldCheck, MapPin, Calendar, Droplet } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Input } from "../components/ui";
import type { Lang } from "../lib/constants";
import { tr, t } from "../lib/constants";

const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

export function Onboarding() {
  const { login, lang, setLang } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState<"mobile" | "otp" | "password" | "location" | "details">("mobile");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("donor");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [consent, setConsent] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);
  
  // New noble cause fields
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [pincode, setPincode] = useState("");
  const [district, setDistrict] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

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

  async function sendOtp() {
    setErr(""); setLoading(true);
    try {
      const r = await api.requestOtp(mobile, name);
      setDevOtp(r.devOtp || "");
      setCode(r.devOtp || "");
      setUserExists(r.exists || false);
      setHasPassword(r.hasPassword || false);
      setExistingUser(r.user || null);
      
      if (r.exists && r.hasPassword) {
        setStep("password");
      } else if (r.exists && !r.hasPassword) {
        setStep("otp");
      } else {
        setStep("otp");
      }
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function getLocation() {
    setErr(""); setLoading(true);
    try {
      if (!('geolocation' in navigator)) {
        throw new Error("Location not supported on this device");
      }
      
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLat(latitude);
          setLng(longitude);
          
          // Reverse geocode to get pincode and district
          try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            setPincode(data.postcode || "");
            setDistrict(data.locality || data.city || data.principalSubdivision || "");
          } catch (e) {
            console.log("Reverse geocode failed, using location only");
          }
          
          setLoading(false);
          setStep("details");
        },
        (err) => {
          setErr("Location permission required for emergency matching. Please enable location access.");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  }

  async function handleLogin() {
    setErr(""); setLoading(true);
    try {
      const r = await api.login(mobile, password);
      login(r.token, r.user);
      await requestPermissions();
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function verify() {
    setErr(""); setLoading(true);
    try {
      const r = await api.verifyOtp({ mobile, code, name: userExists ? existingUser?.name : name, role: userExists ? existingUser?.role : role, language: lang, password: userExists ? undefined : password });
      login(r.token, r.user);
      await requestPermissions();
      
      // For new users, proceed to location step
      if (!userExists) {
        setStep("location");
      }
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function completeSignup() {
    setErr(""); setLoading(true);
    try {
      // Age validation: 18-65
      if (!dob) {
        throw new Error(lang === "ta" ? "பிறந்த தேதி தேவை" : "Date of birth required");
      }
      
      const age = new Date().getFullYear() - new Date(dob).getFullYear();
      if (age < 18 || age > 65) {
        throw new Error(lang === "ta" ? "இரத்த தானம்: 18-65 வயது மட்டுமே" : "Blood donation: 18-65 years only");
      }
      
      if (!bloodGroup) {
        throw new Error(lang === "ta" ? "இரத்த வகை தேவை" : "Blood group required");
      }
      
      // Update profile with noble cause fields
      await api.updateMe({
        dob: new Date(dob).toISOString(),
        bloodGroup,
        district,
        pincode,
        lat,
        lng,
      });
      
      setLoading(false);
      nav("/home");
    } catch (e: any) { setErr(e.message); setLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5 py-8 text-slate-800">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white px-5 py-6 text-slate-800 shadow-xl ring-1 ring-slate-200">
          <div className="mb-4 text-center">
            <img src="/uyir-logo.png" alt="UYIR" className="mx-auto h-36 w-auto object-contain" />
          </div>

          <div className="mb-3 flex gap-2">
            {(["ta", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${lang === l ? "bg-uyir-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {l === "ta" ? "தமிழ்" : "English"}
              </button>
            ))}
          </div>

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => { setMode("login"); setStep("mobile"); setErr(""); }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === "login" ? "bg-uyir-600 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {lang === "ta" ? "உள்நுழை" : "Login"}
            </button>
            <button
              onClick={() => { setMode("signup"); setStep("mobile"); setErr(""); }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === "signup" ? "bg-uyir-600 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {lang === "ta" ? "புதிய பதிவு" : "Sign up"}
            </button>
          </div>

          {step === "mobile" ? (
            mode === "login" ? (
              <div className="space-y-2">
                <Input
                  label={String(tr("mobileNumber", lang))}
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  value={mobile}
                  onChange={(e) => setMobile(String(e.target.value))}
                  maxLength={10}
                />
                <Button
                  className="w-full"
                  size="md"
                  loading={loading}
                  disabled={mobile.length < 10}
                  onClick={sendOtp}
                >
                  <Phone className="h-3 w-3" /> {lang === "ta" ? "தொடரவும்" : "Continue"}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input label={String(tr("mobileNumber", lang))} inputMode="numeric" placeholder="10-digit mobile" value={mobile}
                  onChange={(e) => setMobile(String(e.target.value))} maxLength={10} />
                <>
                  <Input label={String(tr("yourName", lang))} placeholder="Name" value={name} onChange={(e) => setName(String(e.target.value))} />
                  <div>
                    <span className="mb-1 block text-xs font-medium text-slate-600">{tr("iWantTo", lang)}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: "donor", t: tr("donateBlood", lang) }, { v: "requester", t: tr("requestBlood", lang) }].map((o) => (
                        <button key={o.v} onClick={() => setRole(o.v)}
                          className={`rounded-lg border py-2 text-xs font-semibold ${role === o.v ? "border-uyir-500 bg-uyir-50 text-uyir-700" : "border-slate-200 text-slate-500"}`}>
                          {o.t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" />
                    <div className="text-[10px] text-slate-600">
                      <p className="font-semibold text-slate-700">{tr("consentTitle", lang)}</p>
                      <p className="mt-0.5 leading-tight">{t.consentText[lang]}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); window.open('/terms', '_blank'); }}
                        className="mt-0.5 text-uyir-600 underline"
                      >
                        {lang === "ta" ? "முழு விதிமுறைகளைப் படிக்க" : "Read full terms"}
                      </button>
                    </div>
                  </label>
                </>
                <Button
                  className="w-full"
                  size="md"
                  loading={loading}
                  disabled={mobile.length < 10 || !name || !consent}
                  onClick={sendOtp}
                >
                  <Phone className="h-3 w-3" /> {tr("sendOtp", lang)}
                </Button>
              </div>
            )
          ) : step === "location" ? (
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="text-xl font-bold">{lang === "ta" ? "உங்கள் இடம்" : "Your Location"}</h2>
              <p className="text-sm text-slate-600">
                {lang === "ta" ? "2am அவசரத்தில் அருகில் உள்ள மருத்துவமனைக்கு மட்டும் அழைப்போம்" : "We'll only alert you for nearby hospitals during 2am emergencies"}
              </p>
              <Button
                className="w-full"
                size="md"
                loading={loading}
                onClick={getLocation}
              >
                <MapPin className="h-4 w-4" /> {lang === "ta" ? "இடத்தை பகிரவும்" : "Share Location"}
              </Button>
              <p className="text-xs text-slate-400">
                {lang === "ta" ? "நாங்கள் உங்கள் இடத்தை கண்காணிக்க மாட்டோம். அவசர பொருத்தத்திற்கு மட்டும்." : "We don't track your location. Only for emergency matching."}
              </p>
            </div>
          ) : step === "details" ? (
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "பிறந்த தேதி" : "Date of Birth"}
                </label>
                <input
                  type="date"
                  className="w-full p-3 border-2 border-slate-200 rounded-lg text-sm"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max="2008-12-31"
                  min="1960-01-01"
                />
                <p className="text-xs text-slate-400 mt-1">{lang === "ta" ? "18-65 வயது மட்டுமே இரத்த தானம் செய்யலாம்" : "18-65 years only for blood donation"}</p>
              </div>

              <div>
                <label className="block mb-2 text-xs font-medium text-slate-600">
                  {lang === "ta" ? "இரத்த வகை" : "Blood Group"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map(bg => (
                    <button
                      key={bg}
                      onClick={() => setBloodGroup(bg)}
                      className={`p-3 rounded-lg border-2 font-bold text-sm ${
                        bloodGroup === bg 
                          ? 'bg-uyir-600 text-white border-uyir-600' 
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-800">
                  <b>{lang === "ta" ? "உங்கள் இடம்:" : "Your Location:"}</b> {district} - {pincode}<br/>
                  <b>{lang === "ta" ? "குறிப்பு:" : "Note:"}</b> {lang === "ta" ? "எடை, Hb, உடல்நிலை மருத்துவமனையில் இலவசமாக சரிபார்க்கப்படும்" : "Weight, Hb, health checked free at hospital"}
                </p>
              </div>

              <Button
                className="w-full"
                size="md"
                loading={loading}
                disabled={!dob || !bloodGroup}
                onClick={completeSignup}
              >
                <Droplet className="h-4 w-4" /> {lang === "ta" ? "உயிர் காப்பாளர் ஆகுங்கள்" : "Become a Lifesaver"}
              </Button>
            </div>
          ) : step === "password" ? (
            <div className="space-y-2">
              <p className="text-center text-sm text-slate-600">{lang === "ta" ? "உங்கள் கடவுச்சொல்லை உள்ளிடவும்" : "Enter your password"}</p>
              <Input
                label={lang === "ta" ? "கடவுச்சொல்" : "Password"}
                type="password"
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(String(e.target.value))}
              />
              <Button
                className="w-full"
                size="md"
                loading={loading}
                disabled={password.length < 4}
                onClick={handleLogin}
              >
                <ShieldCheck className="h-3 w-3" /> {lang === "ta" ? "உள்நுழை" : "Login"}
              </Button>
              <button className="w-full text-xs text-slate-400" onClick={() => { setStep("mobile"); setPassword(""); }}>{tr("changeNumber", lang)}</button>
            </div>
          ) : (
            <div className="space-y-2">
              {userExists && existingUser && (
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-sm font-semibold text-emerald-700">Welcome back, {existingUser.name}!</p>
                  <p className="text-xs text-emerald-600">{existingUser.role === "donor" ? "Donor" : "Requester"}</p>
                </div>
              )}
              <Input label={String(tr("enterOtp", lang))} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(String(e.target.value))} />
              {!userExists && (
                <Input
                  label={lang === "ta" ? "கடவுச்சொல்லை அமைக்கவும் (முதல் முறை)" : "Set a password (first time)"}
                  type="password"
                  placeholder="••••"
                  value={password}
                  onChange={(e) => setPassword(String(e.target.value))}
                />
              )}
              {devOtp && <p className="rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-700">Demo OTP: <b>{devOtp}</b> (SMS gateway not wired for MVP)</p>}
              <Button className="w-full" size="md" loading={loading} disabled={code.length < 6 || (!userExists && password.length < 4)} onClick={verify}>
                <ShieldCheck className="h-3 w-3" /> {userExists ? "Login" : tr("verifyContinue", lang)}
              </Button>
              <button className="w-full text-xs text-slate-400" onClick={() => { setStep("mobile"); setUserExists(false); setExistingUser(null); setPassword(""); }}>{tr("changeNumber", lang)}</button>
            </div>
          )}
          {err && <p className="mt-2 text-center text-xs text-uyir-600">{err}</p>}
        </div>
        <p className="mt-5 text-center text-[10px] text-slate-400">
          Blood donation is voluntary & unpaid. Requesting payment results in a permanent ban.
        </p>
      </div>
    </div>
  );
}
export default Onboarding;
