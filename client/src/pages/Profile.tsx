import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Award, MessageCircle, Bug, Bell, User, Phone, Calendar, Droplet, CheckCircle, AlertTriangle, Navigation, MapPin, X, Heart, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Input, Badge, Sheet } from "../components/ui";
import { BLOOD_GROUPS, t } from "../lib/constants";
import { DonationCertificate } from "../components/DonationCertificate";

const DISTRICTS = ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruppur", "Erode", "Trichy", "Namakkal", "Dindigul", "Tirunelveli", "Vellore", "Thanjavur", "Kancheepuram", "Krishnagiri", "Theni", "Virudhunagar", "Nilgiris"];

function getMissingDonorFields(user: any, form: any, lang: "ta" | "en") {
  if (user?.role !== "donor") return [];
  const fields: string[] = [];
  const name = String(form?.name ?? user?.name ?? "").trim();
  const bloodGroup = form?.bloodGroup ?? user?.bloodGroup;
  const district = form?.district ?? user?.district;
  const hasLocationCoords = (form?.lat ?? user?.lat) != null && (form?.lng ?? user?.lng) != null;
  const hasLocationPermission = Boolean(form?.locationEnabled ?? user?.locationEnabled);

  if (!name || name === "UYIR User") {
    fields.push(lang === "ta" ? "பெயர்" : "Name");
  }
  if (!bloodGroup) {
    fields.push(lang === "ta" ? "இரத்த வகை" : "Blood Group");
  }
  if (!district) {
    fields.push(lang === "ta" ? "மாவட்டம்" : "District");
  }
  if (!hasLocationPermission || !hasLocationCoords) {
    fields.push(lang === "ta" ? "GPS இடம்" : "GPS Location");
  }

  return fields;
}

export function Profile() {
  const { user, logout, lang, setLang, refreshUser } = useApp();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({ ...user });
  const [showNotificationWarning, setShowNotificationWarning] = useState(false);
  const [pendingNotificationToggle, setPendingNotificationToggle] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [donations, setDonations] = useState<any[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const isDonorSetup = searchParams.get("completeDonor") === "1";
  const missingDonorFields = getMissingDonorFields(user, form, lang);

  // Fetch donation history
  useEffect(() => {
    if (!user) return;
    setLoadingDonations(true);
    api.myAlerts()
      .then((responses) => {
        const completed = (responses || []).filter((r: any) => r.status === "completed");
        setDonations(completed);
      })
      .catch(() => setDonations([]))
      .finally(() => setLoadingDonations(false));
  }, [user]);

  const hasDonations = donations.length > 0;
  const latestDonation = hasDonations ? donations[0] : null;

  // Detect changes in form
  const checkChanges = () => {
    if (!user) return false;
    const changed =
      form.name !== user.name ||
      form.bloodGroup !== user.bloodGroup ||
      form.district !== user.district ||
      form.lastDonationDate !== user.lastDonationDate ||
      form.notificationsEnabled !== user.notificationsEnabled ||
      form.voiceEnabled !== user.voiceEnabled ||
      form.locationEnabled !== user.locationEnabled;
    setHasChanges(changed);
    return changed;
  };

  const handleFormChange = (key: string, value: any) => {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    if (!user) return;
    const changed =
      newForm.name !== user.name ||
      newForm.bloodGroup !== user.bloodGroup ||
      newForm.district !== user.district ||
      newForm.gender !== user.gender ||
      newForm.age !== user.age ||
      newForm.isPlateletDonor !== user.isPlateletDonor ||
      newForm.lastDonationDate !== user.lastDonationDate ||
      newForm.notificationsEnabled !== user.notificationsEnabled ||
      newForm.voiceEnabled !== user.voiceEnabled ||
      newForm.locationEnabled !== user.locationEnabled;
    setHasChanges(changed);
  };

  async function save() {
    if (user?.role === "donor" && missingDonorFields.length > 0) {
      alert(
        lang === "ta"
          ? `இந்த விவரங்கள் அவசியம்: ${missingDonorFields.join(", ")}`
          : `These details are required: ${missingDonorFields.join(", ")}`
      );
      return;
    }
    setBusy(true);
    try {
      await api.updateMe(form);
      await refreshUser();
      setHasChanges(false);
      alert(lang === "ta" ? "சுயவிவரம் புதுப்பிக்கப்பட்டது!" : "Profile updated successfully!");
      if (isDonorSetup) {
        nav("/nearby");
      }
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function captureDonorLocation() {
    if (!("geolocation" in navigator)) {
      alert(lang === "ta" ? "உங்கள் உலாவி இடம் கண்டறியலை ஆதரிக்கவில்லை" : "Geolocation is not supported by your browser");
      return;
    }

    setCapturingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      let district = "";
      let taluk = "";
      let pincode = "";

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        const addr = data?.address || {};
        const rawDistrict = addr.county || addr.state_district || addr.city_district || addr.city || addr.town || "";
        const rawText = [rawDistrict, data?.display_name, addr.state, addr.county, addr.city, addr.town].filter(Boolean).join(" ");
        const matchedDistrict = DISTRICTS.find((item) => rawText.toLowerCase().includes(item.toLowerCase()));
        district = matchedDistrict || "";
        taluk = addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || "";
        pincode = addr.postcode || "";
      } catch {
        district = form.district || user?.district || "";
      }

      await api.setLocation(lat, lng, {
        district: district || undefined,
        taluk: taluk || undefined,
        pincode: pincode || undefined,
      });
      await refreshUser();
      setForm((prev: any) => ({
        ...prev,
        lat,
        lng,
        shareLocation: true,
        locationEnabled: true,
        district: district || prev.district || user?.district || "",
        taluk: taluk || prev.taluk || user?.taluk || "",
        pincode: pincode || prev.pincode || user?.pincode || "",
      }));
      setHasChanges(true);
      alert(
        lang === "ta"
          ? district
            ? `இருப்பிடம் பதிவு செய்யப்பட்டது. மாவட்டம்: ${district}`
            : "இருப்பிடம் பதிவு செய்யப்பட்டது."
          : district
            ? `Location captured. District: ${district}`
            : "Location captured successfully."
      );
    } catch (e: any) {
      const message = e?.code === 1
        ? (lang === "ta" ? "இடம் அனுமதி மறுக்கப்பட்டது. உலாவி அமைப்புகளில் GPS அனுமதியை இயக்கவும்." : "Location permission denied. Please enable GPS permission in browser settings.")
        : e?.message || (lang === "ta" ? "இருப்பிடத்தைப் பெற முடியவில்லை" : "Failed to capture location");
      alert(message);
    } finally {
      setCapturingLocation(false);
    }
  }

  function handleNotificationToggle(field: string, currentValue: boolean) {
    if (currentValue === true) {
      setPendingNotificationToggle(field);
      setShowNotificationWarning(true);
    } else {
      handleFormChange(field, true);
    }
  }

  function confirmNotificationToggle() {
    if (pendingNotificationToggle) {
      handleFormChange(pendingNotificationToggle, false);
      setShowNotificationWarning(false);
      setPendingNotificationToggle(null);
    }
  }

  function cancelNotificationToggle() {
    setShowNotificationWarning(false);
    setPendingNotificationToggle(null);
  }

  async function handleLogout() {
    logout();
  }

  function contactSupport() {
    const message = `Hi UYIR Support, I need help with my account.\n\nName: ${user?.name}\nMobile: ${user?.mobile}\nRole: ${user?.role}`;
    const url = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function reportBug() {
    const subject = "UYIR Bug Report";
    const body = `Describe the bug:\n\nSteps to reproduce:\n1.\n2.\n3.\n\nExpected behavior:\n\nActual behavior:\n\nDevice/Browser info:`;
    window.location.href = `mailto:support@uyir.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="px-4 py-4">
      <header className="mb-3 flex items-center justify-between py-2">
        <h1 className="text-lg font-extrabold text-slate-800">{lang === "ta" ? "சுயவிவரம்" : "Profile"}</h1>
        <Button size="sm" variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4" /> {lang === "ta" ? "வெளியேறு" : "Sign out"}</Button>
      </header>

      <Card className="mb-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-uyir-100 text-lg font-extrabold text-uyir-700">
            {user?.name?.[0] || "U"}
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.mobile}</p>
            <div className="mt-0.5 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-semibold text-emerald-700">{lang === "ta" ? "சரிபார்க்கப்பட்டது" : "Verified"}</span>
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setCertificateOpen(true)}>
          <Award className="h-4 w-4" /> {lang === "ta" ? "தானதானம் சான்றிதழ் பார்க்க" : "View Donation Certificate"}
        </Button>
      </Card>

      {isDonorSetup && (
        <Card className="mb-3 border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-bold text-amber-900">
            {lang === "ta" ? "ரத்ததான அறிவிப்புகளுக்கு முன் இந்த விவரங்களை நிரப்பவும்" : "Complete these details before receiving donor alerts"}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {missingDonorFields.length > 0
              ? (lang === "ta"
                  ? `பூர்த்தி செய்ய வேண்டியது: ${missingDonorFields.join(", ")}`
                  : `Still required: ${missingDonorFields.join(", ")}`)
              : (lang === "ta"
                  ? "விவரங்கள் நிரம்பியுள்ளன. கீழே உறுதிப்படுத்தி சேமிக்கவும்."
                  : "Required details are filled. Confirm below and save.")}
          </p>
          <Button className="mt-3 w-full" variant="outline" loading={capturingLocation} onClick={captureDonorLocation}>
            <Navigation className="h-4 w-4" /> {lang === "ta" ? "தற்போதைய GPS இருப்பிடத்தைப் பதிவு செய்" : "Capture current GPS location"}
          </Button>
          <p className="mt-2 text-[11px] text-amber-900">
            {form.lat != null && form.lng != null
              ? (lang === "ta"
                  ? `GPS பதிவு செய்யப்பட்டது${form.district ? ` · ${form.district}` : ""}`
                  : `GPS captured${form.district ? ` · ${form.district}` : ""}`)
              : (lang === "ta"
                  ? "ரியல்-டைம் ரத்ததான அறிவிப்புகளுக்கு GPS அவசியம்."
                  : "GPS is mandatory for real-time donor alerts.")}
          </p>
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{lang === "ta" ? "மொழி" : "Language"}</span>
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

      <Card className="mb-3 space-y-3 p-3">
        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">{lang === "ta" ? "பெயர்" : "Name"}</label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
            value={form.name || ""}
            onChange={(e) => handleFormChange("name", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">{lang === "ta" ? "மொபைல்" : "Phone"}</label>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-800">{user?.mobile}</span>
            <CheckCircle className="h-3 w-3 text-emerald-600" />
          </div>
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">
            {lang === "ta" ? "இரத்த வகை" : "Blood Group"}{user?.role === "donor" ? " *" : ""}
          </label>
          <select
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
            value={form.bloodGroup || ""}
            onChange={(e) => handleFormChange("bloodGroup", e.target.value)}
          >
            <option value="">{lang === "ta" ? "தேர்வு செய்யவும்" : "Select"}</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
          {user?.role === "donor" && <p className="mt-1 text-[10px] text-slate-500">{lang === "ta" ? "தேவையானது" : "Required"}</p>}
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">
            {lang === "ta" ? "மாவட்டம்" : "District"}{user?.role === "donor" ? " *" : ""}
          </label>
          <select
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
            value={form.district || ""}
            onChange={(e) => handleFormChange("district", e.target.value)}
          >
            <option value="">{lang === "ta" ? "தேர்வு செய்யவும்" : "Select"}</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {user?.role === "donor" && <p className="mt-1 text-[10px] text-slate-500">{lang === "ta" ? "தேவையானது" : "Required"}</p>}
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">
            {lang === "ta" ? "GPS / தற்போதைய இருப்பிடம்" : "GPS / Current Location"}{user?.role === "donor" ? " *" : ""}
          </label>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {form.lat != null && form.lng != null ? (
              <div className="space-y-1">
                <p className="flex items-center gap-1"><MapPin className="h-4 w-4 text-uyir-600" /> {lang === "ta" ? "இருப்பிடம் பதிவு செய்யப்பட்டது" : "Location captured"}</p>
                <p className="text-xs text-slate-500">{form.district || user?.district || "—"}{form.taluk ? ` · ${form.taluk}` : ""}{form.pincode ? ` · ${form.pincode}` : ""}</p>
              </div>
            ) : (
              <p className="text-xs text-rose-600">{lang === "ta" ? "GPS பதிவு செய்யப்படவில்லை. மேலே உள்ள பொத்தானை அழுத்தவும்." : "GPS location not captured yet. Use the button above."}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">
            {lang === "ta" ? "கடைசி இரத்ததானம் தேதி" : "Last Donation Date"}
          </label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
            value={form.lastDonationDate ? new Date(form.lastDonationDate).toISOString().split('T')[0] : ""}
            onChange={(e) => handleFormChange("lastDonationDate", e.target.value || null)}
          />
          <p className="mt-1 text-[10px] text-slate-500">{lang === "ta" ? "தானம் செய்யவில்லை என்றால் விட்டுவிடவும்" : "Leave blank if never donated"}</p>
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">
            {lang === "ta" ? "வயது" : "Age"}
          </label>
          <input
            type="number"
            min="18"
            max="100"
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
            value={form.age ?? ""}
            onChange={(e) => handleFormChange("age", e.target.value ? parseInt(e.target.value) : null)}
          />
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">
            {lang === "ta" ? "பாலினம்" : "Gender"}
          </label>
          <select
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
            value={form.gender || ""}
            onChange={(e) => handleFormChange("gender", e.target.value || null)}
          >
            <option value="">{lang === "ta" ? "தேர்வு செய்யவும்" : "Select"}</option>
            <option value="male">{lang === "ta" ? "ஆண்" : "Male"}</option>
            <option value="female">{lang === "ta" ? "பெண்" : "Female"}</option>
          </select>
        </div>

        {user?.role === "donor" && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">{lang === "ta" ? "ப்ளேட்லெட் தானர்" : "Platelet Donor"}</p>
              <p className="text-[10px] text-slate-500">{lang === "ta" ? "ப்ளேட்லெட் தானத்திற்கு தயார்" : "Available for platelet donation"}</p>
            </div>
            <button
              onClick={() => handleFormChange("isPlateletDonor", !form.isPlateletDonor)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.isPlateletDonor ? 'bg-uyir-600' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                form.isPlateletDonor ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}

        {(hasChanges || isDonorSetup) && (
          <Button className="w-full py-0.5 text-[9px]" loading={busy} onClick={save}>
            {lang === "ta" ? "சேமி" : "Save"}
          </Button>
        )}
      </Card>

      {/* Notification Preferences */}
      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-uyir-600" />
          <h3 className="font-bold text-slate-800">{lang === "ta" ? "அறிவிப்பு விருப்பங்கள்" : "Notification Preferences"}</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-700">{lang === "ta" ? "புஷ் அறிவிப்புகள்" : "Push Notifications"}</p>
              <p className="text-[10px] text-slate-500">{lang === "ta" ? "அவசர நேரத்தில் அருகிலுள்ள கோரிக்கைகளுக்கு அறிவிப்பு" : "Time-sensitive alerts for emergencies near you"}</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('notificationsEnabled', form.notificationsEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.notificationsEnabled ? 'bg-uyir-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  form.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-700">{lang === "ta" ? "குரல் வழி" : "Voice Access"}</p>
              <p className="text-[10px] text-slate-500">{lang === "ta" ? "கோரிக்கைகளுக்கு குரல் உள்ளீடு" : "Enable voice input for requests"}</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('voiceEnabled', form.voiceEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.voiceEnabled ? 'bg-uyir-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  form.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-700">{lang === "ta" ? "இருப்பிடம் / GPS" : "Location / GPS"}</p>
              <p className="text-[10px] text-slate-500">{lang === "ta" ? "அறிவிப்பு செயலில் இருக்கும்போது மட்டும் பயன்படுத்தப்படும்" : "Used only when alert is active to find donors near hospital"}</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('locationEnabled', form.locationEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                form.locationEnabled ? 'bg-uyir-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  form.locationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Warning Modal */}
      {showNotificationWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-bold">{lang === "ta" ? "முக்கிய எச்சரிக்கை" : "Important Warning"}</h3>
            </div>
            <p className="mb-4 text-sm text-slate-700">
              {lang === "ta" 
                ? "இதை முடக்குவதால், நீங்கள் முக்கிய இரத்ததானம் கோரிக்கைகளை தவறவிடலாம். அறிவிப்புகளை இயக்குவது உயிர்களை காப்பாற்ற உதவுகிறது."
                : "By disabling this feature, you may miss critical blood donation requests. Enabling notifications helps save lives."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelNotificationToggle}
              >
                {lang === "ta" ? "இயக்கவும்" : "Keep Enabled"}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={confirmNotificationToggle}
              >
                {lang === "ta" ? "முடக்கு" : "Turn Off"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="space-y-2 p-4">
        <h3 className="mb-2 font-bold text-slate-800">{lang === "ta" ? "ஆதரவு" : "Support"}</h3>
        <div className="flex items-center justify-center gap-4 py-2 text-xs text-slate-600">
          <a href="tel:+919940874198" className="flex items-center gap-1 hover:text-uyir-600 transition">
            +91 9940874198
          </a>
          <span className="text-slate-300">|</span>
          <a href="mailto:support@uyirngo.in" className="flex items-center gap-1 hover:text-uyir-600 transition">
            support@uyirngo.in
          </a>
        </div>
        <Button variant="outline" className="w-full" onClick={() => nav("/impact")}>
          <TrendingUp className="h-4 w-4" /> {lang === "ta" ? "தாக்கம்" : "My Impact"}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => nav("/rate-us")}>
          <Award className="h-4 w-4" /> {lang === "ta" ? "எங்களை மதிப்பிடுங்கள்" : "Rate Us"}
        </Button>
        <Button variant="outline" className="w-full" onClick={contactSupport}>
          <MessageCircle className="h-4 w-4" /> {t.contactSupport[lang]} (WhatsApp)
        </Button>
        <Button variant="outline" className="w-full" onClick={reportBug}>
          <Bug className="h-4 w-4" /> {t.reportBug[lang]}
        </Button>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> {t.signOut[lang]}
      </Button>

      <Sheet open={certificateOpen} onClose={() => setCertificateOpen(false)}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{lang === "ta" ? "தானதானம் சான்றிதழ்" : "Donation Certificate"}</h3>
          <button onClick={() => setCertificateOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <DonationCertificate
          donorName={user?.name || "Donor"}
          bloodGroup={user?.bloodGroup || "Unknown"}
          donationDate={hasDonations ? latestDonation?.completedAt || new Date().toISOString() : new Date().toISOString()}
          hospitalName={hasDonations ? latestDonation?.hospitalName || (lang === "ta" ? "UYIR இரத்த வங்கி" : "UYIR Blood Bank") : (lang === "ta" ? "UYIR இரத்த வங்கி" : "UYIR Blood Bank")}
          district={user?.district || "Tamil Nadu"}
          certificateId={hasDonations ? `UYIR-${latestDonation?.id?.slice(-6) || user?.id?.slice(-6) || "TEST"}` : `UYIR-TEMPLATE-${user?.id?.slice(-6) || "TEST"}`}
          hasDonated={hasDonations}
          onClose={() => setCertificateOpen(false)}
          downloadable={hasDonations}
          nonDonorMessage={lang === "ta" ? "நீங்கள் இன்னும் இரத்ததானம் செய்யவில்லை. சான்றிதழை பதிவிறக்க, முதலில் இரத்ததானம் செய்யுங்கள்." : "You haven't donated yet. Donate blood to earn and download your certificate."}
        />
      </Sheet>
    </div>
  );
}
export default Profile;
