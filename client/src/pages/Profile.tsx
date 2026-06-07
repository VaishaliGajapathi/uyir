import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Award, MessageCircle, Bug, Bell, User, Phone, Calendar, Droplet, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Input, Badge } from "../components/ui";
import { BLOOD_GROUPS, t } from "../lib/constants";

export function Profile() {
  const { user, logout, lang, setLang, refreshUser } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({ ...user });
  const [showNotificationWarning, setShowNotificationWarning] = useState(false);
  const [pendingNotificationToggle, setPendingNotificationToggle] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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
    setForm({ ...form, [key]: value });
    checkChanges();
  };

  async function save() {
    if (!confirmed) {
      alert(lang === "ta" 
        ? "தயவுசெய்து உங்கள் வயது 18-65, எடை 45kg மேல் என்பதை உறுதிப்படுத்தவும்."
        : "Please confirm you are 18-65 years old and above 45kg.");
      return;
    }
    setBusy(true);
    try {
      await api.updateMe(form);
      await refreshUser();
      setHasChanges(false);
      alert(lang === "ta" ? "சுயவிவரம் புதுப்பிக்கப்பட்டது!" : "Profile updated successfully!");
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
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
      </Card>

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
            {lang === "ta" ? "இரத்த வகை *" : "Blood Group *"}
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
          <p className="mt-1 text-[10px] text-slate-500">{lang === "ta" ? "தேவையானது" : "Required"}</p>
        </div>

        <div>
          <label className="mb-0.5 block text-sm font-medium text-slate-500">
            {lang === "ta" ? "மாவட்டம் *" : "District *"}
          </label>
          <select
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
            value={form.district || ""}
            onChange={(e) => handleFormChange("district", e.target.value)}
          >
            <option value="">{lang === "ta" ? "தேர்வு செய்யவும்" : "Select"}</option>
            {["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruppur", "Erode", "Trichy", "Namakkal", "Dindigul", "Tirunelveli", "Vellore", "Thanjavur", "Kancheepuram", "Krishnagiri", "Theni", "Virudhunagar", "Nilgiris"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-slate-500">{lang === "ta" ? "தேவையானது" : "Required"}</p>
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

        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <input 
            type="checkbox" 
            checked={confirmed} 
            onChange={(e) => setConfirmed(e.target.checked)} 
            className="mt-0.5 h-4 w-4" 
          />
          <div className="text-[10px] text-slate-600">
            <p className="font-semibold text-slate-700">
              {lang === "ta" ? "நான் 18-65 வயது, 45kg மேல் எடை, இன்று ஆரோக்கியமாக உள்ளேன்" : "I confirm I am 18-65 years, above 45kg, and feeling well today"}
            </p>
          </div>
        </label>

        {hasChanges && (
          <Button className="w-full py-0.5 text-[9px]" loading={busy} onClick={save}>
            {lang === "ta" ? "சேமி" : "Save"}
          </Button>
        )}
      </Card>

      <p className="mb-3 text-[10px] text-slate-500 text-center">
        {lang === "ta" ? "குறிப்பு: இறுதி தகுதி மருத்துவமனையில் மருத்துவரால் சரிபார்க்கப்படும். UYIR ஆரோக்கிய தரவை சேமிக்காது." : "Note: Final eligibility checked by doctor at hospital. UYIR does not store health data."}
      </p>

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
    </div>
  );
}
export default Profile;
