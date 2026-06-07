import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Input } from "../components/ui";
import type { Lang } from "../lib/constants";
import { tr, t } from "../lib/constants";

export function Onboarding() {
  const { login, lang, setLang } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("donor");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [consent, setConsent] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [existingUser, setExistingUser] = useState<any>(null);

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
      setDevOtp(r.devOtp);
      setCode(r.devOtp); // prefilled for demo
      setUserExists(r.exists || false);
      setExistingUser(r.user || null);

      // If user exists, login directly without OTP
      if (r.exists && r.user) {
        const loginResult = await api.login(mobile);
        login(loginResult.token, loginResult.user);
        await requestPermissions();
        return;
      }

      // New user - send OTP
      setStep("otp");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function verify() {
    setErr(""); setLoading(true);
    try {
      const r = await api.verifyOtp({ mobile, code, name: userExists ? existingUser?.name : name, role: userExists ? existingUser?.role : role, language: lang });
      login(r.token, r.user);
      await requestPermissions();
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
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

          {step === "mobile" ? (
            <div className="space-y-2">
              <Input label={tr("mobileNumber", lang)} inputMode="numeric" placeholder="10-digit mobile" value={mobile}
                onChange={(e) => setMobile(String(e.target.value))} maxLength={10} />
              {!userExists && (
                <>
                  <Input label={tr("yourName", lang)} placeholder="Name" value={name} onChange={(e) => setName(String(e.target.value))} />
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
              )}
              <Button className="w-full" size="md" loading={loading} disabled={mobile.length < 10 || (!userExists && (!name || !consent))}
                onClick={sendOtp}><Phone className="h-3 w-3" /> {userExists ? "Login" : tr("sendOtp", lang)}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {userExists && existingUser && (
                <div className="rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-sm font-semibold text-emerald-700">Welcome back, {existingUser.name}!</p>
                  <p className="text-xs text-emerald-600">{existingUser.role === "donor" ? "Donor" : "Requester"}</p>
                </div>
              )}
              <Input label={tr("enterOtp", lang)} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(String(e.target.value))} />
              {devOtp && <p className="rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-700">Demo OTP: <b>{devOtp}</b> (SMS gateway not wired for MVP)</p>}
              <Button className="w-full" size="md" loading={loading} disabled={code.length < 6} onClick={verify}>
                <ShieldCheck className="h-3 w-3" /> {userExists ? "Login" : tr("verifyContinue", lang)}
              </Button>
              <button className="w-full text-xs text-slate-400" onClick={() => { setStep("mobile"); setUserExists(false); setExistingUser(null); }}>{tr("changeNumber", lang)}</button>
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
