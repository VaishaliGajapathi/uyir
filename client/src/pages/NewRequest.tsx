import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, ShieldCheck, FileCheck2, Sparkles, Radio, CheckCircle2, Share2 } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Input, Select, Card, Badge } from "../components/ui";
import { VoiceButton } from "../components/VoiceButton";
import { HospitalAutocomplete } from "../components/HospitalAutocomplete";
import { BLOOD_GROUPS, COMPONENT_TYPES, EMERGENCY_LEVELS } from "../lib/constants";

type Phase = "form" | "documents" | "verifying" | "result";

export function NewRequest() {
  const nav = useNavigate();
  const { lang } = useApp();
  const [phase, setPhase] = useState<Phase>("form");
  const [districts, setDistricts] = useState<string[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [docResult, setDocResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<any>({
    patientName: "", bloodGroup: "O+", componentType: "whole_blood", unitsRequired: 1,
    hospitalName: "", district: "", contactPerson: "", contactNumber: "",
    doctorReference: "", emergencyLevel: "orange",
  });

  useEffect(() => { api.districts().then(setDistricts).catch(() => {}); }, []);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function applyVoice(_text: string, parsed: any) {
    if (!parsed) return;
    const map: any = { ...parsed };
    if (map.unitsRequired) map.unitsRequired = Number(map.unitsRequired);
    setForm((f: any) => ({ ...f, ...Object.fromEntries(Object.entries(map).filter(([, v]) => v != null)) }));
  }

  async function createRequest() {
    setErr(""); setBusy(true);
    try {
      const r = await api.createRequest({ ...form, unitsRequired: Number(form.unitsRequired) });
      setRequestId(r.id);
      setPhase("documents");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function uploadDoc(e: any) {
    const file = e.target.files?.[0];
    if (!file || !requestId) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = String(reader.result).split(",")[1];
        const res: any = await api.uploadDocument(requestId, base64, file.type, "requirement_slip");
        setDocResult(res.ai);
      } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
    };
    reader.readAsDataURL(file);
  }

  async function runVerify() {
    if (!requestId) return;
    setPhase("verifying"); setBusy(true);
    try {
      const res: any = await api.verifyRequest(requestId);
      setVerification(res.verification);
      setPhase("result");
    } catch (e: any) { setErr(e.message); setPhase("documents"); } finally { setBusy(false); }
  }

  async function sendAlerts() {
    if (!requestId) return;
    setBusy(true);
    try {
      const res = await api.alertRequest(requestId);
      alert(`Alerted ${res.alerted} eligible donors within ${res.radiusKm === 9999 ? "all Tamil Nadu" : res.radiusKm + " km"}. The system will automatically expand the search radius if no donor accepts within 30 minutes.`);
      nav(`/request/${requestId}`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  function shareToWhatsApp() {
    if (!requestId) return;
    const message = `🩸 UYIR Blood Request - Verified Emergency\n\nPatient: ${form.patientName}\nBlood Group: ${form.bloodGroup}\nComponent: ${form.componentType.replace("_", " ")}\nUnits: ${form.unitsRequired}\nHospital: ${form.hospitalName}, ${form.district}\nContact: ${form.contactNumber}\n\nPlease share with eligible donors. Every drop counts! 🙏\n\n#UYIR #TamilNadu #BloodDonation`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function shareToFacebook() {
    if (!requestId) return;
    const message = `🩸 UYIR Blood Request - Verified Emergency\n\nPatient: ${form.patientName}\nBlood Group: ${form.bloodGroup}\nHospital: ${form.hospitalName}, ${form.district}\nContact: ${form.contactNumber}\n\nPlease share with eligible donors. Every drop counts! 🙏\n\n#UYIR #TamilNadu #BloodDonation`;
    const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function copyLink() {
    if (!requestId) return;
    const shareLink = `${window.location.origin}/request/${requestId}`;
    navigator.clipboard.writeText(shareLink);
    alert("Link copied! Share this link with donors to help them navigate to the app and login.");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => nav(-1)}><ArrowLeft className="h-6 w-6 text-slate-700" /></button>
        <h1 className="text-lg font-bold text-slate-800">{lang === "ta" ? "இரத்த கோரிக்கை" : "New Blood Request"}</h1>
      </header>

      <Steps phase={phase} />

      {phase === "form" && (
        <div className="space-y-3">
          <Card className="space-y-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-violet-700"><Sparkles className="h-4 w-4" /> {lang === "ta" ? "தமிழில் பேசி நிரப்பவும்" : "Fill by speaking (Tamil/English)"}</p>
            <VoiceButton mode="request" language={lang} className="w-full"
              label={lang === "ta" ? "பேசுங்கள்: எங்களுக்கு 3 யூனிட் B+ தேவை" : "Speak your request"}
              onResult={applyVoice} />
          </Card>

          <Input label="Patient name *" value={form.patientName} onChange={(e) => set("patientName", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Patient age *" type="number" value={form.patientAge || ""} onChange={(e) => set("patientAge", Number(e.target.value))} />
            <Select label="Patient gender *" value={form.patientGender || ""} onChange={(e) => set("patientGender", e.target.value)}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Blood group *" value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </Select>
            <Select label="Component" value={form.componentType} onChange={(e) => set("componentType", e.target.value)}>
              {COMPONENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Units required" type="number" min={1} value={form.unitsRequired} onChange={(e) => set("unitsRequired", e.target.value)} />
            <Select label="District *" value={form.district} onChange={(e) => set("district", e.target.value)}>
              <option value="">Select</option>
              {districts.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hospital *" value={form.hospitalName} onChange={(e) => set("hospitalName", e.target.value)} />
            <Input label="Referred doctor name" value={form.doctorReference} onChange={(e) => set("doctorReference", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact person *" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
            <Input label="Contact number *" inputMode="numeric" value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Emergency level</label>
            <div className="grid grid-cols-3 gap-2">
              {EMERGENCY_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set("emergencyLevel", l.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-center text-sm font-semibold transition ${
                    form.emergencyLevel === l.value
                      ? "border-uyir-600 bg-uyir-50 text-uyir-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          {err && <p className="text-sm text-uyir-600">{err}</p>}
          <Button className="w-full" size="lg" loading={busy}
            disabled={!form.patientName || !form.patientAge || !form.patientGender || !form.bloodGroup || !form.hospitalName || !form.district || !form.contactPerson || form.contactNumber.length < 10}
            onClick={createRequest}>Continue to verification</Button>
        </div>
      )}

      {phase === "documents" && (
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="font-bold text-slate-800">Upload hospital proof</h3>
            <p className="mt-1 text-sm text-slate-500">A requirement slip or prescription. AI (Gemini Vision) checks authenticity before alerts go out.</p>
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 text-slate-500">
              <Upload className="h-7 w-7" />
              <span className="text-sm font-medium">{busy ? "Analysing…" : "Tap to upload image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={uploadDoc} />
            </label>
            {docResult && (
              <div className={`mt-3 rounded-xl p-3 text-sm ${docResult.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                <p className="flex items-center gap-1.5 font-semibold"><FileCheck2 className="h-4 w-4" /> Document score: {docResult.score}%</p>
                <p className="mt-1 text-xs">{docResult.notes}</p>
              </div>
            )}
          </Card>
          {err && <p className="text-sm text-uyir-600">{err}</p>}
          <Button className="w-full" size="lg" loading={busy} onClick={runVerify}>
            <ShieldCheck className="h-4 w-4" /> Verify & Continue
          </Button>
        </div>
      )}

      {phase === "verifying" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-5 h-16 w-16">
            <span className="absolute inset-0 animate-ping2 rounded-full bg-uyir-200" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-uyir-600"><ShieldCheck className="h-8 w-8 text-white" /></span>
          </div>
          <p className="font-semibold text-slate-700">AI verification agent running…</p>
          <p className="text-sm text-slate-400">Checking fields, hospital, document & duplicates</p>
        </div>
      )}

      {phase === "result" && verification && (
        <div className="space-y-3">
          <Card className="p-5 text-center">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-extrabold ${verification.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {verification.score}%
            </div>
            <p className="mt-3 font-bold text-slate-800">{verification.verified ? "Verified Emergency" : "Needs human review"}</p>
            <p className="mt-1 text-sm text-slate-500">{verification.notes}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {Object.entries(verification.checks).map(([k, v]) => (
                <Badge key={k} className={v ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}>
                  {v ? "✓" : "○"} {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Share this request</p>
            <div className="flex gap-3">
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={shareToWhatsApp}
                disabled={!verification.verified}
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.417-.074-.128-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={shareToFacebook}
                disabled={!verification.verified}
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={copyLink}
                disabled={!verification.verified}
              >
                <Share2 className="h-6 w-6" />
              </button>
            </div>
            {!verification.verified && (
              <p className="mt-2 text-xs text-slate-400">Share buttons will be enabled after admin verification</p>
            )}
          </Card>

          {verification.verified ? (
            <Button className="w-full" size="lg" loading={busy} onClick={sendAlerts}>
              <Radio className="h-4 w-4" /> Send AI alerts to donors (5 km)
            </Button>
          ) : (
            <Button variant="outline" className="w-full" size="lg" onClick={() => nav(`/request/${requestId}`)}>
              <CheckCircle2 className="h-4 w-4" /> Submit for NGO verification
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Steps({ phase }: { phase: Phase }) {
  const order = ["form", "documents", "result"];
  const idx = phase === "verifying" ? 2 : order.indexOf(phase === "result" ? "result" : phase);
  const labels = ["Details", "Proof", "Verify"];
  return (
    <div className="mb-5 flex items-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= idx ? "bg-uyir-600 text-white" : "bg-slate-200 text-slate-400"}`}>{i + 1}</div>
          <span className={`text-xs font-medium ${i <= idx ? "text-slate-700" : "text-slate-400"}`}>{l}</span>
          {i < labels.length - 1 && <div className={`h-0.5 flex-1 ${i < idx ? "bg-uyir-600" : "bg-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}
export default NewRequest;
