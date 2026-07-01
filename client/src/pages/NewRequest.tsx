import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, ShieldCheck, FileCheck2, Radio, CheckCircle2, Share2, MapPin, Camera } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Input, Select, Card, Badge, SearchableSelect } from "../components/ui";
import { VoiceButton } from "../components/VoiceButton";
import { HospitalAutocomplete } from "../components/HospitalAutocomplete";
import { BLOOD_GROUPS, COMPONENT_TYPES, EMERGENCY_LEVELS, TN_DISTRICTS } from "../lib/constants";
import { requestUrl, nativeShare, shareWhatsApp, shareFacebook } from "../lib/share";

type Phase = "form" | "documents" | "verifying" | "result";
const MIN_DOCUMENT_VERIFY_SCORE = 70;

export function NewRequest() {
  const nav = useNavigate();
  const { lang, user } = useApp();
  const [phase, setPhase] = useState<Phase>("form");
  const [districts, setDistricts] = useState<string[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [docResult, setDocResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [skipDocument, setSkipDocument] = useState(false);
  const [form, setForm] = useState<any>({
    patientFirstName: "", patientAge: null, patientGender: null, bloodGroup: "O+", componentType: "whole_blood", unitsRequired: 1,
    hospitalName: "", district: "",
    emergencyLevel: "orange", lat: null, lng: null,
    location: "", area: "", city: "", pincode: "",
  });

  useEffect(() => { api.districts().then(setDistricts).catch(() => {}); }, []);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function extractVoicePatientName(text: string) {
    const match = text.match(/(?:நோயாளியின்\s*பெயர்|பேஷன்(?:ட்)?\s*நேம்|patient\s*name|பெயர்|name)\s*(?:is|:|வந்து)?\s*([\u0B80-\u0BFFa-zA-Z]+(?:\s+[\u0B80-\u0BFFa-zA-Z]+){0,3})/i);
    if (!match) return undefined;
    return match[1].replace(/(?:\b(?:age|years?|old|blood|group|unit|units|required|need(?:ed|s)?)\b|வயது|ஏஜ்|இயர்ஸ்|ஓல்ட்|யூனிட்|தேவை).*$/i, "").trim() || undefined;
  }

  function extractVoiceAge(text: string) {
    const numeric = text.match(/\bage\s*(?:is\s*)?(\d{1,3})\b/i)
      || text.match(/\b(\d{1,3})\s*(?:years?\s*old|years?|age|இயர்ஸ்\s*ஓல்ட்|இயர்ஸ்|வருஷம்|வயசு|வயது)\b/i)
      || text.match(/(?:வயது|ஏஜ்|வயசு)\s*(?:வந்து\s*)?(\d{1,3})/i);
    return numeric ? Number(numeric[1]) : undefined;
  }

  function extractVoiceGender(text: string) {
    if (/\bfemale\b|\bwoman\b|\bgirl\b|\bபெண்\b|\bபெண்பா\b/i.test(text)) return "female";
    if (/\bmale\b|\bman\b|\bboy\b|\bஆண்\b|\bஆண்பா\b/i.test(text)) return "male";
    return undefined;
  }

  function extractVoiceBloodGroup(text: string) {
    const direct = text.match(/\b(AB|A|B|O)\s*([+-])\b/i);
    if (direct) return `${direct[1].toUpperCase()}${direct[2]}`;
    const spoken = text.match(/\b(AB|A|B|O)\s*(positive|negative|plus|minus)\b/i);
    if (spoken) return `${spoken[1].toUpperCase()}${/negative|minus/i.test(spoken[2]) ? "-" : "+"}`;
    const normalized = text.replace(/blood\s*group|பிளட்\s*குரூப்|இரத்த\s*வகை|ரத்த\s*வகை/gi, " ").replace(/\s+/g, " ").trim();
    const spokenTamil = [
      { regex: /(?:\bab\b|a\s*b|ஏ\s*பி|ஏபி|எபி)\s*(?:positive|plus|\+|பாசிடிவ்|ப்ளஸ்|பிளஸ்)/i, value: "AB+" },
      { regex: /(?:\bab\b|a\s*b|ஏ\s*பி|ஏபி|எபி)\s*(?:negative|minus|-|நெகட்டிவ்|மைனஸ்)/i, value: "AB-" },
      { regex: /(?:\ba\b|ஏ)\s*(?:positive|plus|\+|பாசிடிவ்|ப்ளஸ்|பிளஸ்)/i, value: "A+" },
      { regex: /(?:\ba\b|ஏ)\s*(?:negative|minus|-|நெகட்டிவ்|மைனஸ்)/i, value: "A-" },
      { regex: /(?:\bb\b|பி|பீ)\s*(?:positive|plus|\+|பாசிடிவ்|ப்ளஸ்|பிளஸ்)/i, value: "B+" },
      { regex: /(?:\bb\b|பி|பீ)\s*(?:negative|minus|-|நெகட்டிவ்|மைனஸ்)/i, value: "B-" },
      { regex: /(?:\bo\b|ஓ)\s*(?:positive|plus|\+|பாசிடிவ்|ப்ளஸ்|பிளஸ்)/i, value: "O+" },
      { regex: /(?:\bo\b|ஓ)\s*(?:negative|minus|-|நெகட்டிவ்|மைனஸ்)/i, value: "O-" },
    ];
    return spokenTamil.find((pattern) => pattern.regex.test(normalized))?.value;
  }

  function extractVoiceUnits(text: string) {
    const numeric = text.match(/(?:தேவை(?:யான)?|வேண்டும்|required|need(?:ed|s)?)\s*(?:யூனிட்(?:கள்)?|யூனிட்ஸ்?|units?|unit)?\s*(\d{1,2})/i)
      || text.match(/(?:யூனிட்(?:கள்)?|யூனிட்ஸ்?|units?|unit)\s*(\d{1,2})/i)
      || text.match(/(\d{1,2})\s*(?:யூனிட்(?:கள்)?|யூனிட்ஸ்?|units?|unit)/i);
    if (numeric) return Number(numeric[1]);
    const tamilNumbers: Record<string, number> = {
      "ஒன்று": 1, "ஒன்றே": 1, "ஒரு": 1,
      "இரண்டு": 2, "ரெண்டு": 2, "இரண்டே": 2,
      "மூன்று": 3, "மூன்றே": 3,
      "நான்கு": 4, "நான்கே": 4,
      "ஐந்து": 5, "ஐந்தே": 5,
      "ஆறு": 6, "ஆறே": 6,
      "ஏழு": 7, "ஏழே": 7,
      "எட்டு": 8, "எட்டே": 8,
      "ஒன்பது": 9, "ஒன்பதே": 9,
      "பத்து": 10, "பத்தே": 10,
    };
    return Object.entries(tamilNumbers).find(([word]) => text.includes(word))?.[1];
  }

  function extractVoiceComponentType(text: string) {
    if (/platelet|பிளேட்லெட்/i.test(text)) return "platelets";
    if (/plasma|பிளாஸ்மா/i.test(text)) return "plasma";
    if (/whole\s*blood|blood|பிளட்|ரத்தம்|இரத்தம்/i.test(text)) return "whole_blood";
    return undefined;
  }

  const missingRequiredFields = [
    !form.patientFirstName ? (lang === "ta" ? "நோயாளியின் பெயர்" : "Patient name") : null,
    !form.patientAge ? (lang === "ta" ? "நோயாளியின் வயது" : "Patient age") : null,
    !form.patientGender ? (lang === "ta" ? "நோயாளியின் பாலினம்" : "Patient gender") : null,
    !form.bloodGroup ? (lang === "ta" ? "இரத்த வகை" : "Blood group") : null,
    !form.hospitalName ? (lang === "ta" ? "மருத்துவமனை" : "Hospital") : null,
    !form.district ? (lang === "ta" ? "மாவட்டம்" : "District") : null,
  ].filter(Boolean);

  const documentAiUnavailable =
    Number(docResult?.score || 0) === 0 &&
    String(docResult?.notes || "").includes("Automatic document verification could not run");

  function handleBack() {
    if (phase === "documents") {
      setPhase("form");
      return;
    }
    if (phase === "verifying") {
      setPhase("documents");
      return;
    }
    if (phase === "result") {
      setPhase("documents");
      return;
    }
    nav(-1);
  }

  function applyVoice(text: string, parsed: any) {
    console.log("Voice transcription received:", { text, parsed });

    if (!parsed || Object.keys(parsed).length === 0) {
      // Silently handle empty parsing — no toast during transcription
      console.log("No parsed data from voice input");
      return;
    }

    const map: any = { ...parsed };
    if (map.unitsRequired) map.unitsRequired = Number(map.unitsRequired);
    if (!map.patientName) map.patientName = extractVoicePatientName(text);
    if (!map.patientAge) map.patientAge = extractVoiceAge(text);
    if (!map.patientGender) map.patientGender = extractVoiceGender(text);
    if (!map.bloodGroup) map.bloodGroup = extractVoiceBloodGroup(text);
    if (!map.componentType) map.componentType = extractVoiceComponentType(text);
    if (!map.unitsRequired) map.unitsRequired = extractVoiceUnits(text);

    // Map parsed fields to form fields
    const updates: any = {};
    if (map.patientName) updates.patientFirstName = map.patientName;
    if (map.patientAge) updates.patientAge = Number(map.patientAge);
    if (map.patientGender) updates.patientGender = map.patientGender;
    if (map.bloodGroup) updates.bloodGroup = map.bloodGroup;
    if (map.componentType) updates.componentType = map.componentType;
    if (map.unitsRequired) updates.unitsRequired = map.unitsRequired;
    if (map.hospitalName) updates.hospitalName = map.hospitalName;
    if (map.district) updates.district = map.district;
    if (map.emergencyLevel) updates.emergencyLevel = map.emergencyLevel;

    // Apply updates silently
    setForm((f: any) => ({ ...f, ...updates }));

    // Simple toast after form records are populated — ask user to check details
    const filledFields = Object.keys(updates).length;
    if (filledFields > 0) {
      alert(lang === "ta"
        ? `${filledFields} புலங்கள் குரல் உள்ளீட்டிலிருந்து நிரப்பப்பட்டுள்ளன. தயவுசெய்து விவரங்களை சரிபார்க்கவும்.`
        : `${filledFields} field(s) filled from voice input. Please check the details.`);
    }
  }

  async function captureLocation() {
    if (!('geolocation' in navigator)) {
      alert(lang === "ta" ? "உங்கள் உலாவி இடம் கண்டறியலை ஆதரிக்கவில்லை" : "Geolocation is not supported by your browser");
      return;
    }
    setCapturingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve, 
          (error) => {
            console.error("Geolocation error:", error);
            let errorMsg = error.message;
            if (error.code === 1) {
              errorMsg = lang === "ta" ? "இடம் அனுமதி மறுக்கப்பட்டது. உலாவி அமைப்புகளில் இடம் அனுமதியை இயக்கவும்." : "Location permission denied. Please enable location in browser settings.";
            } else if (error.code === 2) {
              errorMsg = lang === "ta" ? "இடம் கிடைக்கவில்லை" : "Location unavailable";
            } else if (error.code === 3) {
              errorMsg = lang === "ta" ? "இடம் கண்டறிய நேரம் முடிந்தது" : "Location request timeout";
            }
            reject(new Error(errorMsg));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      set("lat", lat);
      set("lng", lng);
      console.log("Location captured:", lat, lng);

      // Reverse geocoding to get address
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        console.log("Geocoded address:", addr);

        // Extract location details
        let location = addr.road || addr.street || addr.footway || addr.path || "";
        let area = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.township || "";
        let city = addr.city || addr.town || addr.locality || "";
        let district = addr.county || addr.state_district || "";
        let pincode = addr.postcode || "";

        // For Tamil Nadu, try to match district from our list
        const tnDistricts = districts;
        const matchedDistrict = tnDistricts.find((d: string) =>
          (district && district.toLowerCase().includes(d.toLowerCase())) ||
          (addr.display_name && addr.display_name.toLowerCase().includes(d.toLowerCase()))
        );
        if (matchedDistrict) {
          district = matchedDistrict;
        }

        // Fallback for city
        if (!city && addr.state) {
          city = addr.state;
        }

        // Set form fields
        if (location) set("location", location);
        if (area) set("area", area);
        if (city) set("city", city);
        if (district) set("district", district);
        if (pincode) set("pincode", pincode);

        console.log("Parsed location:", { location, area, city, district });
      }
    } catch (e: any) {
      console.error("Failed to capture location:", e);
      alert(e.message || (lang === "ta" ? "இடத்தைப் பெற முடியவில்லை" : "Failed to capture location"));
    } finally {
      setCapturingLocation(false);
    }
  }

  async function createRequest() {
    setErr(""); setBusy(true);
    try {
      const patientName = form.patientFirstName.trim();
      const payload = {
        ...form,
        patientName,
        unitsRequired: Number(form.unitsRequired),
        contactNumber: user?.mobile || "",
        contactPerson: user?.name || ""
      };
      const r = await api.createRequest(payload);
      setRequestId(r.id);
      setPhase("documents");
    } catch (e: any) {
      // Handle backend field errors gracefully
      if (e.message && typeof e.message === 'string') {
        try {
          const parsed = JSON.parse(e.message);
          if (parsed.fieldErrors && (parsed.fieldErrors.lat || parsed.fieldErrors.lng)) {
            setErr(lang === "ta"
              ? "தயவுசெய்து இடத்தைப் பெறவும் (Capture Location) பொத்தானை அழுத்தவும்."
              : "Please click the Capture Location button to set your location.");
            return;
          }
        } catch {
          // Not JSON, use original message
        }
      }
      setErr(e.message);
    } finally { setBusy(false); }
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

  async function capturePhoto() {
    if (!requestId) return;
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);

      const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
      setBusy(true);
      try {
        const res: any = await api.uploadDocument(requestId, base64, 'image/jpeg', 'requirement_slip');
        setDocResult(res.ai);
      } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
    } catch (e: any) {
      setErr(e.message);
      setShowCamera(false);
    }
  }

  async function runVerify() {
    if (!requestId) return;
    // Allow manual verification regardless of document score
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
      setBusy(false);
      nav(`/request/${requestId}`);
    } catch (e: any) { 
      setErr(e.message); 
      setBusy(false);
    }
  }

  function buildShareMessage(includeComponent = false) {
    if (!requestId) return "";
    const patientName = form.patientFirstName.trim();
    const componentLine = includeComponent ? `\nComponent: ${form.componentType.replace("_", " ")}\nUnits: ${form.unitsRequired}` : "";
    return `🩸 UYIR Blood Request - Verified Emergency\n\nPatient: ${patientName}\nBlood Group: ${form.bloodGroup}${componentLine}\nHospital: ${form.hospitalName}, ${form.district}\nContact: ${user?.mobile || ""}\n\n📱 Open UYIR: ${requestUrl(requestId, "accept")}\n\nPlease share with eligible donors. Every drop counts! 🙏\n\n#UYIR #TamilNadu #BloodDonation`;
  }

  async function shareToWhatsApp() {
    if (!requestId) return;
    const message = buildShareMessage(true);
    if (await nativeShare({ title: "UYIR Blood Request", text: message, url: requestUrl(requestId, "accept") })) return;
    shareWhatsApp(message);
  }

  async function shareToFacebook() {
    if (!requestId) return;
    const message = buildShareMessage();
    if (await nativeShare({ title: "UYIR Blood Request", text: message, url: requestUrl(requestId, "accept") })) return;
    shareFacebook(requestUrl(requestId, "accept"), message);
  }

  async function copyLink() {
    if (!requestId) return;
    const message = buildShareMessage(true);
    if (await nativeShare({ title: "UYIR Blood Request", text: message, url: requestUrl(requestId, "accept") })) return;
    try { await navigator.clipboard.writeText(message); } catch { /* noop */ }
    alert("Message copied! Share this with donors to help them navigate to the app and login.");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4">
      <header className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack}><ArrowLeft className="h-6 w-6 text-slate-700" /></button>
          <h1 className="text-lg font-bold text-slate-800">{lang === "ta" ? "இரத்த கோரிக்கை" : "New Blood Request"}</h1>
        </div>
        <VoiceButton
          mode="request"
          language={lang}
          onResult={applyVoice}
          hideLabel
          className="h-14 w-14 rounded-full bg-uyir-600 text-white shadow-lg hover:bg-uyir-700"
        />
      </header>

      <Steps phase={phase} verification={verification} lang={lang} />

      {phase === "form" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label={lang === "ta" ? "நோயாளியின் பெயர் *" : "Patient name *"} value={form.patientFirstName} onChange={(e) => set("patientFirstName", e.target.value)} />
            <Input label={lang === "ta" ? "நோயாளியின் வயது *" : "Patient age *"} type="number" value={form.patientAge || ""} onChange={(e) => set("patientAge", Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={lang === "ta" ? "நோயாளியின் பாலினம் *" : "Patient gender *"} value={form.patientGender || ""} onChange={(e) => set("patientGender", e.target.value)}>
              <option value="">{lang === "ta" ? "தேர்வு செய்யவும்" : "Select"}</option>
              <option value="male">{lang === "ta" ? "ஆண்" : "Male"}</option>
              <option value="female">{lang === "ta" ? "பெண்" : "Female"}</option>
              <option value="other">{lang === "ta" ? "மற்றவை" : "Other"}</option>
            </Select>
            <Select label={lang === "ta" ? "இரத்த வகை *" : "Blood group *"} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={lang === "ta" ? "கூறு" : "Component"} value={form.componentType} onChange={(e) => set("componentType", e.target.value)}>
              {COMPONENT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Input label={lang === "ta" ? "தேவையான யூனிட்கள்" : "Units required"} type="number" min={1} value={form.unitsRequired} onChange={(e) => set("unitsRequired", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{lang === "ta" ? "அவசராதி நிலை" : "Emergency level"}</label>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{lang === "ta" ? "இடம்" : "Location"}</label>
              <button
                type="button"
                onClick={captureLocation}
                disabled={capturingLocation}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:border-uyir-500 hover:bg-uyir-50 disabled:opacity-50"
              >
                {capturingLocation ? (
                  <span className="animate-spin">⏳</span>
                ) : form.lat && form.lng ? (
                  <>
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    {lang === "ta" ? "இடம் பெறப்பட்டது" : "Location captured"}
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {lang === "ta" ? "இடத்தைப் பெறுங்கள்" : "Capture location"}
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SearchableSelect
              label={lang === "ta" ? "மாவட்டம் *" : "District *"}
              options={TN_DISTRICTS}
              value={form.district}
              onChange={(v) => set("district", v)}
              placeholder={lang === "ta" ? "தேர்வு செய்யவும்" : "Select"}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{lang === "ta" ? "மருத்துவமனை *" : "Hospital *"}</label>
              <HospitalAutocomplete
                value={form.hospitalName}
                onChange={(val) => set("hospitalName", val)}
                district={form.district}
                userLocation={form.lat && form.lng ? { lat: form.lat, lng: form.lng } : null}
              />
            </div>
          </div>
          {form.lat && form.lng && (
            <>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  width="100%"
                  height="200"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.lng - 0.01}%2C${form.lat - 0.01}%2C${form.lng + 0.01}%2C${form.lat + 0.01}&layer=mapnik&marker=${form.lat}%2C${form.lng}`}
                  style={{ border: 0 }}
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Input label={lang === "ta" ? "இடம் (தெரு)" : "Location (Street)"} value={form.location} onChange={(e) => set("location", e.target.value)} />
                <Input label={lang === "ta" ? "பகுதி" : "Area"} value={form.area} onChange={(e) => set("area", e.target.value)} />
                <Input label={lang === "ta" ? "நகரம்" : "City"} value={form.city} onChange={(e) => set("city", e.target.value)} />
                <Input label={lang === "ta" ? "அஞ்சல் குறியீடு" : "Pincode"} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
              </div>
            </>
          )}
          {err && <p className="text-sm text-uyir-600">{err}</p>}
          {missingRequiredFields.length > 0 && (
            <p className="text-sm text-amber-700">
              {lang === "ta" ? "இன்னும் நிரப்ப வேண்டியது: " : "Still required: "}
              {missingRequiredFields.join(", ")}
            </p>
          )}
          <Button className="w-full" size="lg" loading={busy}
            disabled={
              !form.patientFirstName || 
              !form.patientAge || 
              !form.patientGender || 
              !form.bloodGroup || 
              !form.hospitalName || 
              !form.district
            }
            onClick={() => {
              console.log("Form values:", form);
              createRequest();
            }}>{lang === "ta" ? "சரிபார்ப்புக்குத் தொடரவும்" : "Continue to verification"}</Button>
        </div>
      )}

      {phase === "documents" && (
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="font-bold text-slate-800">{lang === "ta" ? "மருத்துவமனை ஆவணம் பதிவேற்றவும்" : "Upload hospital proof"}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {lang === "ta"
                ? "நோயாளியின் சமீபத்திய admission slip, prescription, admission நேரத்தில் கட்டிய hospital bill/receipt அல்லது doctor referral letter ஐ பதிவேற்றவும்."
                : "Upload the patient's recent admission slip, prescription, hospital bill/receipt paid during admission, or doctor referral letter. AI will check the patient name, date, hospital identity, and registration details."}
            </p>
            <label className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <input
                type="checkbox"
                checked={skipDocument}
                onChange={(e) => setSkipDocument(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-700">
                  {lang === "ta" ? "ஆவணம் இல்லாமல் தொடரவும் (கைமுறை சரிபார்ப்பு)" : "Continue without document (manual verification)"}
                </p>
                <p className="mt-1 text-slate-500">
                  {lang === "ta"
                    ? "நீங்கள் மருத்துவமனை ஆவணம் இல்லாமல் தொடரலாம். இந்த கோரிக்கை NGO அல்லது நிர்வாகியால் கைமுறையாக சரிபார்க்கப்படும்."
                    : "You can continue without uploading a document. This request will be manually verified by NGO or admin."}
                </p>
              </div>
            </label>
            <div className="mt-3 flex gap-3">
              <label className="flex-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 text-slate-500">
                <Upload className="h-7 w-7" />
                <span className="text-sm font-medium">{busy ? "Analysing…" : (lang === "ta" ? "ஆவணத்தை பதிவேற்றவும்" : "Upload file")}</span>
                <span className="px-4 text-center text-xs text-slate-400">
                  {lang === "ta"
                    ? "Admission slip / Prescription / Hospital receipt / Referral letter"
                    : "Admission slip / Prescription / Hospital receipt / Referral letter"}
                </span>
                <input type="file" accept=".pdf,image/jpeg,image/jpg,image/png" className="hidden" onChange={uploadDoc} />
              </label>
              <button type="button" onClick={capturePhoto} disabled={busy} className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <Camera className="h-7 w-7" />
                <span className="text-sm font-medium">{busy ? "Capturing…" : (lang === "ta" ? "புகைப்படம் எடுக்கவும்" : "Take photo")}</span>
              </button>
            </div>
            {docResult && (
              <div className={`mt-3 rounded-xl p-3 text-sm ${docResult.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                <p className="flex items-center gap-1.5 font-semibold"><FileCheck2 className="h-4 w-4" /> Document score: {docResult.score}%</p>
                <p className="mt-1 text-xs">{docResult.notes}</p>
              </div>
            )}
            {(!docResult || (!docResult.verified || Number(docResult.score || 0) < MIN_DOCUMENT_VERIFY_SCORE)) && !skipDocument && (
              <p className="mt-3 text-xs text-amber-700">
                {lang === "ta"
                  ? `ஆவணம் AI சரிபார்ப்பில் தோல்வியடைந்தது. இருப்பினும், கைமுறை சரிபார்ப்புக்குத் தொடரலாம்.`
                  : `Document AI verification failed. You can still continue for manual verification.`}
              </p>
            )}
            {documentAiUnavailable && (
              <p className="mt-3 text-xs text-amber-700">
                {lang === "ta"
                  ? "கீழே தொடரவும்; இந்த கோரிக்கை NGO / கைமுறை சரிபார்ப்புக்கு அனுப்பப்படும்."
                  : "Continue below to send this request for NGO/manual review."}
              </p>
            )}
          </Card>
          {err && <p className="text-sm text-uyir-600">{err}</p>}
          <Button
            className="w-full"
            size="lg"
            loading={busy}
            disabled={false}
            onClick={runVerify}
          >
            <ShieldCheck className="h-4 w-4" /> {skipDocument || !docResult || (!docResult?.verified || Number(docResult?.score || 0) < MIN_DOCUMENT_VERIFY_SCORE) ? (lang === "ta" ? "கைமுறை சரிபார்ப்புக்கு தொடரவும்" : "Continue to manual review") : (lang === "ta" ? "சரிபார்த்து தொடரவும்" : "Verify & Continue")}
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
            <p className="mt-3 font-bold text-slate-800">{verification.verified ? "Verified Emergency" : "Manual verification required"}</p>
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
              <CheckCircle2 className="h-4 w-4" /> Submit to Admin
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Steps({ phase, verification, lang }: { phase: Phase; verification: any; lang: string }) {
  const order = ["form", "documents", "result"];
  const idx = phase === "verifying" ? 2 : order.indexOf(phase === "result" ? "result" : phase);
  const labels = lang === "ta" ? ["விவரங்கள்", "ஆவணம்", "சரிபார்ப்பு", "பகிர்வு"] : ["Details", "Proof", "Verify", "Share"];
  // Share step (index 3) is only active when verification is successful
  const shareActive = phase === "result" && verification?.verified;
  return (
    <div className="mb-5 flex items-center justify-center gap-2">
      {labels.map((l, i) => {
        const isActive = i <= idx || (i === 3 && shareActive);
        const lineActive = isActive && (i < idx || (i === 2 && shareActive));
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isActive ? "bg-uyir-600 text-white" : "bg-slate-200 text-slate-400"}`}
            >
              {i + 1}
            </div>
            <span className={`text-xs font-medium ${isActive ? "text-slate-700" : "text-slate-400"}`}>{l}</span>
            {i < labels.length - 1 && <div className={`h-0.5 flex-1 ${lineActive ? "bg-uyir-600" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}
export default NewRequest;
