import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, Award, MapPin, Moon, Sun, ChevronDown, ChevronUp, User, Phone, Calendar, Droplet, MessageCircle, Bug, Activity, Wine, Cigarette, Heart, Sparkles, Upload, Trash2, FileText, CheckCircle, AlertCircle, Stethoscope, Bell, AlertTriangle } from "lucide-react";
import { api, DonorDocument } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Input, Select, Badge } from "../components/ui";
import { BLOOD_GROUPS, t } from "../lib/constants";

export function Profile() {
  const { user, logout, lang, setLang, refreshUser } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [healthTips, setHealthTips] = useState<any>(null);
  const [loadingTips, setLoadingTips] = useState(false);
  const [form, setForm] = useState<any>({ ...user });
  const [documents, setDocuments] = useState<DonorDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<"aadhar" | "driving_license" | "passport">("aadhar");
  const [documentNumber, setDocumentNumber] = useState("");
  const [showMedicalSection, setShowMedicalSection] = useState(false);
  const [activeCourseModule, setActiveCourseModule] = useState(0);
  const [showNotificationWarning, setShowNotificationWarning] = useState(false);
  const [pendingNotificationToggle, setPendingNotificationToggle] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Detect changes in form
  useEffect(() => {
    if (user) {
      const checkChanges = () => {
        const changed = 
          form.name !== user.name ||
          form.age !== user.age ||
          form.gender !== user.gender ||
          form.bloodGroup !== user.bloodGroup ||
          form.district !== user.district ||
          form.hemoglobinLevel !== user.hemoglobinLevel ||
          form.sleepHours !== user.sleepHours ||
          form.drinkingHabits !== user.drinkingHabits ||
          form.smokingHabits !== user.smokingHabits ||
          form.weight !== user.weight ||
          form.height !== user.height ||
          form.notificationsEnabled !== user.notificationsEnabled ||
          form.voiceEnabled !== user.voiceEnabled ||
          form.locationEnabled !== user.locationEnabled;
        setHasChanges(changed);
      };
      checkChanges();
    }
  }, [form, user]);

  async function save() {
    setBusy(true);
    try {
      await api.updateMe(form);
      await refreshUser();
      loadHealthTips();
      setHasChanges(false);
      alert("Profile updated successfully!");
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  function handleNotificationToggle(field: string, currentValue: boolean) {
    if (currentValue === true) {
      // User is trying to turn off - show warning
      setPendingNotificationToggle(field);
      setShowNotificationWarning(true);
    } else {
      // User is turning on - just do it
      setForm({ ...form, [field]: true });
    }
  }

  function confirmNotificationToggle() {
    if (pendingNotificationToggle) {
      setForm({ ...form, [pendingNotificationToggle]: false });
      setShowNotificationWarning(false);
      setPendingNotificationToggle(null);
    }
  }

  function cancelNotificationToggle() {
    setShowNotificationWarning(false);
    setPendingNotificationToggle(null);
  }

  async function loadHealthTips() {
    setLoadingTips(true);
    try {
      const tips = await api.getHealthTips();
      setHealthTips(tips);
    } catch (e: any) { console.error(e); } finally { setLoadingTips(false); }
  }

  useEffect(() => {
    if (user?.role === "donor") {
      loadHealthTips();
      loadDocuments();
    }
  }, [user]);

  async function loadDocuments() {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (e: any) { console.error(e); }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const fileUrl = base64; // In production, this would be uploaded to cloud storage
        await api.uploadDonorDocument({
          documentType: uploadType,
          fileUrl,
          documentNumber: documentNumber || undefined,
        });
        await loadDocuments();
        setShowUploadModal(false);
        setDocumentNumber("");
      };
      reader.readAsDataURL(file);
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  }

  async function handleDeleteDocument(id: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.deleteDocument(id);
      await loadDocuments();
    } catch (e: any) { alert(e.message); }
  }

  async function handleLogout() {
    // Request location permission
    if (navigator.geolocation) {
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              api.setLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
              resolve(true);
            },
            (err) => resolve(false),
            { timeout: 5000 }
          );
        });
      } catch (e) {}
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }

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
        <h1 className="text-lg font-extrabold text-slate-800">Profile</h1>
        <Button size="sm" variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4" /> Sign out</Button>
      </header>

      <Card className="mb-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-uyir-100 text-lg font-extrabold text-uyir-700">
            {user?.name?.[0] || "U"}
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.mobile}</p>
            <div className="mt-0.5 flex gap-1.5">
              <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${user?.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {user?.verified ? "Verified" : "Unverified"}
              </div>
              <div className="rounded-full bg-uyir-50 px-2 py-0.5 text-[10px] font-semibold text-uyir-700">{user?.role}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">Language</span>
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

      <Card className="mb-3 space-y-2 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-0.5 block text-sm font-medium text-slate-500">{t.profileAge[lang]}</label>
            <input
              type="number"
              className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
              value={form.age || ""}
              onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || null })}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-sm font-medium text-slate-500">{t.profileGender[lang]}</label>
            <select
              className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
              value={form.gender || ""}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">{t.profileSelect[lang]}</option>
              <option value="male">{t.profileMale[lang]}</option>
              <option value="female">{t.profileFemale[lang]}</option>
              <option value="other">{t.profileOther[lang]}</option>
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-sm font-medium text-slate-500">{t.profileBloodGroup[lang]}</label>
            <select
              className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
              value={form.bloodGroup || ""}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
            >
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-sm font-medium text-slate-500">{t.profileDistrict[lang]}</label>
            <select
              className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
              value={form.district || ""}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            >
              <option value="">{t.profileSelect[lang]}</option>
              {["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruppur", "Erode", "Trichy", "Namakkal", "Dindigul", "Tirunelveli", "Vellore", "Thanjavur", "Kancheepuram", "Krishnagiri", "Theni", "Virudhunagar", "Nilgiris"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowMedicalSection(!showMedicalSection)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm"
        >
          <div className="flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4 text-uyir-600" />
            <span className="font-semibold text-slate-800">Medical Information</span>
          </div>
          {showMedicalSection ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>
        {showMedicalSection && (
          <div className="grid grid-cols-2 gap-2 p-2 pt-2">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-500">{t.profileHemoglobin[lang]}</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                value={form.hemoglobinLevel || ""}
                onChange={(e) => setForm({ ...form, hemoglobinLevel: parseFloat(e.target.value) || null })}
                placeholder="g/dL"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-500">{t.profileSleepHours[lang]}</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                value={form.sleepHours || ""}
                onChange={(e) => setForm({ ...form, sleepHours: parseInt(e.target.value) || null })}
                placeholder="hrs"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-500">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                value={form.weight || ""}
                onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || null })}
                placeholder="kg"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-500">Height (cm)</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                value={form.height || ""}
                onChange={(e) => setForm({ ...form, height: parseFloat(e.target.value) || null })}
                placeholder="cm"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-500">{t.profileDrinking[lang]}</label>
              <select
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                value={form.drinkingHabits || ""}
                onChange={(e) => setForm({ ...form, drinkingHabits: e.target.value })}
              >
                <option value="">{t.profileSelect[lang]}</option>
                <option value="never">{t.profileNeverOption[lang]}</option>
                <option value="occasional">{t.profileOccasional[lang]}</option>
                <option value="regular">{t.profileRegular[lang]}</option>
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-500">{t.profileSmoking[lang]}</label>
              <select
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                value={form.smokingHabits || ""}
                onChange={(e) => setForm({ ...form, smokingHabits: e.target.value })}
              >
                <option value="">{t.profileSelect[lang]}</option>
                <option value="never">{t.profileNeverOption[lang]}</option>
                <option value="occasional">{t.profileOccasional[lang]}</option>
                <option value="regular">{t.profileRegular[lang]}</option>
              </select>
            </div>
          </div>
        )}

        {hasChanges && (
          <Button className="w-full py-0.5 text-[9px]" loading={busy} onClick={save}>
            Save Changes
          </Button>
        )}
      </Card>

      {user?.role === "donor" && healthTips && (
        <Card className="mb-4 bg-gradient-to-br from-uyir-50 to-emerald-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-uyir-600" />
              <h3 className="font-bold text-slate-800">{t.healthTipsTitle[lang]}</h3>
            </div>
            <div className={`rounded-full px-3 py-1 text-sm font-bold ${healthTips.eligibilityScore >= 70 ? "bg-emerald-500 text-white" : healthTips.eligibilityScore >= 50 ? "bg-amber-500 text-white" : "bg-rose-500 text-white"}`}>
              {healthTips.eligibilityScore}{t.eligiblePercent[lang]}
            </div>
          </div>
          <div className={`mb-3 rounded-lg p-3 text-sm ${healthTips.eligible ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            <p className="font-semibold">{healthTips.eligible ? t.eligibleForDonation[lang] : t.notEligible[lang]}</p>
            <p className="text-xs">{healthTips.eligibilityReason}</p>
          </div>

          {/* Course-style navigation */}
          <div className="mb-3 flex gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 0, label: "Health Tips", icon: Sparkles, color: "text-uyir-600" },
              { id: 1, label: "Predictions", icon: Activity, color: "text-blue-600" },
              { id: 2, label: "Recovery", icon: Moon, color: "text-purple-600" }
            ].map((module) => (
              <button
                key={module.id}
                onClick={() => setActiveCourseModule(module.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                  activeCourseModule === module.id
                    ? "bg-white shadow-md ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/50"
                }`}
              >
                <module.icon className={`h-4 w-4 ${activeCourseModule === module.id ? module.color : "text-slate-400"}`} />
                {module.label}
              </button>
            ))}
          </div>

          {/* Dynamic course content */}
          <div className="min-h-[140px] rounded-xl bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm border border-slate-100">
            {activeCourseModule === 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-uyir-600 to-emerald-600 bg-clip-text text-transparent">
                  <Sparkles className="h-5 w-5 text-uyir-600" />
                  Health Tips
                </div>
                <div className="grid gap-2">
                  {healthTips.tips.map((tip: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm border border-slate-100">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex-shrink-0">
                        {idx === 0 ? "💧" : idx === 1 ? "🥗" : "😴"}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeCourseModule === 1 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Health Predictions
                </div>
                <div className="grid gap-2">
                  {healthTips.predictions.map((pred: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm border border-slate-100">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 text-white flex-shrink-0">
                        {idx === 0 ? "📊" : "❤️"}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{pred}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeCourseModule === 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  <Moon className="h-5 w-5 text-purple-600" />
                  Post-Donation Recovery
                </div>
                <div className="grid gap-2">
                  {healthTips.postDonationTips.map((tip: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm border border-slate-100">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex-shrink-0">
                        {idx === 0 ? "🛋️" : idx === 1 ? "🥤" : "🏋️"}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </Card>
      )}

      {/* Notification Preferences */}
      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-uyir-600" />
          <h3 className="font-bold text-slate-800">Notification Preferences</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-700">Push Notifications</p>
              <p className="text-[10px] text-slate-500">Receive blood donation alerts</p>
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
              <p className="text-xs font-medium text-slate-700">Voice Access</p>
              <p className="text-[10px] text-slate-500">Enable voice input for requests</p>
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
              <p className="text-xs font-medium text-slate-700">Location / GPS</p>
              <p className="text-[10px] text-slate-500">Share location for nearby requests</p>
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
              <h3 className="font-bold">Important Warning</h3>
            </div>
            <p className="mb-4 text-sm text-slate-700">
              By disabling this feature, you may miss critical blood donation requests. <strong>Enabling notifications helps save lives.</strong> Are you sure you want to turn it off?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelNotificationToggle}
              >
                Keep Enabled
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={confirmNotificationToggle}
              >
                Turn Off
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Identity Documents</h3>
          <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400">No documents uploaded. Upload Aadhar, Driving License, or Passport for verification.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 capitalize">{doc.documentType.replace("_", " ")}</p>
                    {doc.documentNumber && <p className="text-xs text-slate-500">{doc.documentNumber}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {doc.verified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" /> Pending
                        </Badge>
                      )}
                      {doc.aiVerified && <span className="text-xs text-slate-400">AI Score: {doc.aiScore}%</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDeleteDocument(doc.id)} className="text-slate-400 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-bold text-slate-800">{t.badgesTitle[lang]}</h3>
        {user?.badges && user.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.badges.map((b: any) => (
              <Badge key={b.badgeName} className="bg-amber-50 text-amber-700">{b.badgeName}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{t.noBadges[lang]}</p>
        )}
      </Card>

      <Card className="space-y-2 p-4">
        <h3 className="mb-2 font-bold text-slate-800">Support</h3>
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

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="mb-4 font-bold text-slate-800">Upload Identity Document</h3>
            <div className="mb-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Document Type</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as any)}
                >
                  <option value="aadhar">Aadhar Card</option>
                  <option value="driving_license">Driving License</option>
                  <option value="passport">Passport</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Document Number (Optional)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Enter document number"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Upload File</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  disabled={uploading}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowUploadModal(false)} disabled={uploading}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
export default Profile;

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="text-sm text-slate-500">{label}</span>
      <span className="ml-auto text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
