import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplet, HeartHandshake, ChevronRight, Quote, ToggleLeft, ToggleRight } from "lucide-react";
import { NotificationBell } from "../components/NotificationBell";
import { api, type BloodRequest } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card } from "../components/ui";
import { emergencyMeta, timeAgo } from "../lib/utils";
import { t } from "../lib/constants";

function getMissingDonorFields(user: any, lang: "ta" | "en") {
  const fields: string[] = [];
  if (!user?.name || user.name.trim() === "" || user.name === "UYIR User") {
    fields.push(lang === "ta" ? "பெயர்" : "Name");
  }
  if (!user?.bloodGroup) {
    fields.push(lang === "ta" ? "இரத்த வகை" : "Blood Group");
  }
  if (!user?.district) {
    fields.push(lang === "ta" ? "மாவட்டம்" : "District");
  }
  if (!user?.locationEnabled || user?.lat == null || user?.lng == null) {
    fields.push(lang === "ta" ? "GPS இடம்" : "GPS Location");
  }
  return fields;
}

export function Home() {
  const { user, lang } = useApp();
  const nav = useNavigate();
  const [nearby, setNearby] = useState<BloodRequest[]>([]);
  const [myRequests, setMyRequests] = useState<BloodRequest[]>([]);
  const [available, setAvailable] = useState(user?.notificationsEnabled ?? true);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (user?.district) params.district = user.district;
    api.listRequests(params).then((r) => setNearby(r.slice(0, 4))).catch(() => {});
    api.myRequests().then((r) => setMyRequests(r.slice(0, 5))).catch(() => {});
  }, [user?.district]);

  async function toggleAvailability() {
    const newValue = !available;
    setAvailable(newValue);
    try {
      await api.updateMe({ notificationsEnabled: newValue });
    } catch (e: any) {
      console.error("Failed to update availability:", e);
      setAvailable(!newValue);
    }
  }

  function openDonateBlood() {
    const missing = getMissingDonorFields(user, lang);
    if (missing.length > 0) {
      alert(
        lang === "ta"
          ? `ரத்ததான அறிவிப்புகளை பெற முன் இந்த விவரங்களை நிரப்பவும்: ${missing.join(", ")}`
          : `Please complete these details before entering donor alerts: ${missing.join(", ")}`
      );
      nav("/profile?completeDonor=1");
      return;
    }
    nav("/nearby");
  }

  return (
    <div className="space-y-5 px-4 py-4">
      <Card className="bg-gradient-to-r from-uyir-100 to-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Quote className="mt-1 h-5 w-5 flex-shrink-0 text-uyir-600" />
          <div>
            <p className={`text-sm font-semibold text-slate-800 ${lang === "ta" ? "ta" : ""}`}>
              {t.thirukkural[lang][0]}
            </p>
            <p className={`text-sm font-semibold text-slate-800 ${lang === "ta" ? "ta" : ""}`}>
              {t.thirukkural[lang][1]}
            </p>
            <p className="mt-1 text-xs text-slate-500">- Thirukkural</p>
          </div>
        </div>
      </Card>
      <header className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <img src="/uyir-logo.png" alt="Life Saver" className="h-10 w-auto object-contain" />
          <div>
            <p className="text-xs text-slate-500">{lang === "ta" ? "வணக்கம்" : "Hi"}, {user?.name?.split(" ")[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-uyir-50 text-lg font-bold text-uyir-700">
            {user?.bloodGroup || "?"}
          </div>
        </div>
      </header>

      {user?.role === "donor" && (
        <Card className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            {available ? <ToggleRight className="h-6 w-6 text-uyir-600" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
            <div>
              <p className="text-sm font-semibold text-slate-800">{lang === "ta" ? "இரத்தம் தானம் செய்ய தயாராக உள்ளேன்" : "I'm available to donate"}</p>
              <p className="text-xs text-slate-500">{lang === "ta" ? "அருகிலுள்ள அவசரங்களுக்கு அறிவிப்பு பெறுங்கள்" : "Get alerts for nearby emergencies"}</p>
            </div>
          </div>
          <button
            onClick={toggleAvailability}
            className={`h-6 w-11 rounded-full p-1 transition-colors ${available ? "bg-uyir-600" : "bg-slate-300"}`}
          >
            <div className={`h-4 w-4 rounded-full bg-white transition-transform ${available ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => nav("/new-request")}
          className="flex flex-col items-start gap-2 rounded-2xl bg-uyir-600 p-4 text-left text-white shadow-lg shadow-uyir-600/30 active:scale-[0.98] transition">
          <Droplet className="h-7 w-7" fill="white" />
          <span className="text-lg font-bold leading-tight">{lang === "ta" ? "இரத்தம் தேவை" : "Need Blood"}</span>
          <span className="text-xs text-white/80">{lang === "ta" ? "சரிபார்க்கப்பட்ட கோரிக்கை உருவாக்கு" : "Create verified request"}</span>
        </button>
        <button onClick={openDonateBlood}
          className="flex flex-col items-start gap-2 rounded-2xl bg-uyir-600 p-4 text-left text-white shadow-lg shadow-uyir-600/30 active:scale-[0.98] transition">
          <HeartHandshake className="h-7 w-7" />
          <span className="text-lg font-bold leading-tight">{lang === "ta" ? "இரத்தம் தானம்" : "Donate Blood"}</span>
          <span className="text-xs text-white/80">{lang === "ta" ? "யாருக்கு தேவை என்று பார்" : "See who needs you"}</span>
        </button>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">{lang === "ta" ? "எனது கோரிக்கைகள்" : "My Requests"}</h2>
          <button onClick={() => nav("/requests?mine=true")} className="flex items-center text-sm font-medium text-uyir-600">
            {lang === "ta" ? "அனைத்தும்" : "All"} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {myRequests.length === 0 && <p className="rounded-xl bg-white py-8 text-center text-sm text-slate-400">{lang === "ta" ? "நீங்கள் எந்த கோரிக்கையும் உருவாக்கவில்லை" : "You haven't created any requests yet."}</p>}
          {myRequests.map((r) => {
            const em = emergencyMeta[r.emergencyLevel] || emergencyMeta.orange;
            const statusLabels: Record<string, { en: string; ta: string }> = {
              pending_verification: { en: "Pending", ta: "நிலுவை" },
              verified: { en: "Verified", ta: "சரிபார்க்கப்பட்டது" },
              alert_sent: { en: "Alert Sent", ta: "அறிவிப்பு அனுப்பப்பட்டது" },
              donor_accepted: { en: "Donor Found", ta: "தானவாளர் கிடைத்தார்" },
              completed: { en: "Completed", ta: "முடிந்தது" },
              life_saved: { en: "Life Saved", ta: "உயிர் காக்கப்பட்டது" },
              rejected: { en: "Rejected", ta: "நிராகரிக்கப்பட்டது" },
            };
            const st = statusLabels[r.status] || { en: r.status, ta: r.status };
            return (
              <Card key={r.id} className="flex items-center gap-3 p-3">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => nav(`/request/${r.id}`)}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-uyir-50 text-lg font-extrabold text-uyir-700">{r.bloodGroup}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{r.hospitalName}</p>
                    <p className="truncate text-xs text-slate-500">{r.unitsRequired} unit(s) · {r.componentType.replace("_", " ")} · {r.district}</p>
                    <p className="text-[11px] text-slate-400">{timeAgo(r.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${em.color}`}>{em.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{lang === "ta" ? st.ta : st.en}</span>
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">{lang === "ta" ? "அருகிலுள்ள அவசரங்கள்" : "Nearby Emergencies"}</h2>
          <button onClick={() => nav("/requests")} className="flex items-center text-sm font-medium text-uyir-600">
            {lang === "ta" ? "அனைத்தும்" : "All"} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {nearby.length === 0 && <p className="rounded-xl bg-white py-8 text-center text-sm text-slate-400">{lang === "ta" ? "அருகில் செயலில் உள்ள கோரிக்கைகள் இல்லை" : "No active requests nearby."}</p>}
          {nearby.map((r) => {
            const em = emergencyMeta[r.emergencyLevel] || emergencyMeta.orange;
            return (
              <Card key={r.id} className="flex items-center gap-3 p-3" >
                <button className="flex w-full items-center gap-3 text-left" onClick={() => nav(`/request/${r.id}`)}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-uyir-50 text-lg font-extrabold text-uyir-700">{r.bloodGroup}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{r.hospitalName}</p>
                    <p className="truncate text-xs text-slate-500">{r.unitsRequired} unit(s) · {r.componentType.replace("_", " ")} · {r.district}</p>
                    <p className="text-[11px] text-slate-400">{timeAgo(r.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${em.color}`}>{em.label}</span>
                </button>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export default Home;
