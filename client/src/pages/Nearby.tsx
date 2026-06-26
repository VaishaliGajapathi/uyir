import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radar, MapPin, Clock, Check, X, Navigation, Droplet, Award } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Spinner, Sheet, Badge } from "../components/ui";
import { emergencyMeta } from "../lib/utils";
import { DonationCertificate } from "../components/DonationCertificate";

type RadarItem = {
  id: string;
  request: any;
  status: string;
  matchScore: number | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  responseId?: string;
  completedAt?: string;
  source: "alert" | "request";
};

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

export function Nearby() {
  const { user, refreshUser } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const [alerts, requests] = await Promise.all([api.myAlerts(), api.listRequests()]);
      const normalizedAlerts: RadarItem[] = alerts.map((a: any): RadarItem => ({
        id: a.id,
        request: a.request,
        status: a.status,
        matchScore: a.matchScore ?? null,
        distanceKm: a.distanceKm ?? null,
        etaMinutes: a.etaMinutes ?? null,
        responseId: a.id,
        completedAt: a.completedAt,
        source: "alert",
      })).filter((a: RadarItem) => a.request);

      const alertedRequestIds = new Set(normalizedAlerts.map((a) => a.request?.id).filter(Boolean));
      const normalizedRequests: RadarItem[] = requests
        .filter((r: any) => r?.id && !alertedRequestIds.has(r.id))
        .filter((r: any) => !["completed", "closed", "life_saved"].includes(String(r.status || "")))
        .map((r: any): RadarItem => ({
          id: `request-${r.id}`,
          request: r,
          status: r.status,
          matchScore: null,
          distanceKm: null,
          etaMinutes: null,
          source: "request",
        }));

      const emergencyRank: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
      const combined = [...normalizedAlerts, ...normalizedRequests].sort((a, b) => {
        const aBloodMatch = a.request?.bloodGroup === user?.bloodGroup ? 1 : 0;
        const bBloodMatch = b.request?.bloodGroup === user?.bloodGroup ? 1 : 0;
        if (aBloodMatch !== bBloodMatch) return bBloodMatch - aBloodMatch;

        const aSameTaluk = user?.taluk && a.request?.taluk && a.request.taluk === user.taluk ? 1 : 0;
        const bSameTaluk = user?.taluk && b.request?.taluk && b.request.taluk === user.taluk ? 1 : 0;
        if (aSameTaluk !== bSameTaluk) return bSameTaluk - aSameTaluk;

        const aSameDistrict = user?.district && a.request?.district === user.district ? 1 : 0;
        const bSameDistrict = user?.district && b.request?.district === user.district ? 1 : 0;
        if (aSameDistrict !== bSameDistrict) return bSameDistrict - aSameDistrict;

        const aIsAlert = a.source === "alert" ? 1 : 0;
        const bIsAlert = b.source === "alert" ? 1 : 0;
        if (aIsAlert !== bIsAlert) return bIsAlert - aIsAlert;

        const aDistance = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const bDistance = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        if (aDistance !== bDistance) return aDistance - bDistance;

        const aEmergency = emergencyRank[a.request?.emergencyLevel] ?? 99;
        const bEmergency = emergencyRank[b.request?.emergencyLevel] ?? 99;
        if (aEmergency !== bEmergency) return aEmergency - bEmergency;

        return new Date(b.request?.createdAt || 0).getTime() - new Date(a.request?.createdAt || 0).getTime();
      });

      setItems(combined);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const missing = getMissingDonorFields(user, user?.language === "en" ? "en" : "ta");
    if (missing.length > 0) {
      alert(
        user?.language === "en"
          ? `Please complete these donor details first: ${missing.join(", ")}`
          : `முதலில் இந்த தானதாரர் விவரங்களை நிரப்பவும்: ${missing.join(", ")}`
      );
      nav("/profile?completeDonor=1", { replace: true });
      return;
    }
    load();
  }, [user?.id, user?.name, user?.bloodGroup, user?.district]);

  async function enableLocation() {
    if (!navigator.geolocation) return alert("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await api.setLocation(pos.coords.latitude, pos.coords.longitude); await refreshUser(); alert("Location enabled for emergencies."); },
      () => alert("Location permission denied")
    );
  }

  async function act(id: string, fn: () => Promise<any>) {
    setBusy(id);
    try { await fn(); await load(); } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  function showCertificate(item: any) {
    setCertificateData({
      donorName: user?.name || "Donor",
      bloodGroup: user?.bloodGroup || "Unknown",
      donationDate: item.completedAt || new Date().toISOString(),
      hospitalName: item.request.hospitalName,
      district: item.request.district,
      certificateId: `UYIR-${item.id.slice(-8)}`,
    });
    setCertificateOpen(true);
  }

  const active = items.filter((a) => a.source === "request" ? !["completed", "closed", "life_saved"].includes(a.request?.status || a.status) : !["declined", "completed"].includes(a.status));
  const done = items.filter((a) => a.source === "alert" && a.status === "completed");

  return (
    <div className="px-4 py-4">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Radar className="h-6 w-6 text-uyir-600" />
          <h1 className="text-xl font-extrabold text-slate-800">Blood Radar</h1>
        </div>
        <span className="text-xs text-slate-400">{active.length} nearby</span>
      </header>

      {!user?.shareLocation && (
        <Card className="mb-4 flex items-center gap-3 bg-uyir-50 p-3 ring-uyir-100">
          <Navigation className="h-5 w-5 text-uyir-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Enable location alerts</p>
            <p className="text-xs text-slate-500">Get alerts for emergencies near you. Opt-in & private.</p>
          </div>
          <Button size="sm" onClick={enableLocation}>Enable</Button>
        </Card>
      )}

      {loading ? <Spinner /> : active.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center">
          <Radar className="mx-auto mb-3 h-10 w-10 animate-pulse text-slate-300" />
          <p className="font-medium text-slate-500">No nearby requests for you right now</p>
          <p className="text-sm text-slate-400">We&apos;ll show {user?.bloodGroup || "your blood group"} first, then all blood groups in your area and district.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Card className="bg-slate-50 p-3 text-xs text-slate-500">
            Showing <span className="font-bold text-slate-700">{user?.bloodGroup || "your blood group"}</span> requests first, followed by all blood groups in your area and district.
          </Card>
          {active.map((a) => {
            const r = a.request;
            const em = emergencyMeta[r.emergencyLevel] || emergencyMeta.orange;
            const isBloodMatch = r?.bloodGroup === user?.bloodGroup;
            const isSameTaluk = Boolean(user?.taluk && r?.taluk && user.taluk === r.taluk);
            return (
              <Card key={a.id} className={`overflow-hidden ring-2 ${em.ring} ring-opacity-40`}>
                <div className={`flex items-center justify-between px-4 py-1.5 text-xs font-bold ${em.color}`}>
                  <span>URGENT · {em.label}</span>
                  <span className="font-semibold">{a.distanceKm != null ? `${a.distanceKm} km` : a.matchScore != null ? `match ${a.matchScore}` : "live alert"}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-uyir-50 text-xl font-extrabold text-uyir-700">{r?.bloodGroup || "?"}</div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap gap-2">
                        <Badge className={isBloodMatch ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{isBloodMatch ? "Your blood group" : "Other blood group"}</Badge>
                        <Badge className={isSameTaluk ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}>{isSameTaluk ? `${r?.taluk || "Your area"}` : `${r?.district || "Your district"}`}</Badge>
                        {a.source === "alert" && <Badge className="bg-red-100 text-red-700">Live alert</Badge>}
                      </div>
                      <p className="font-bold text-slate-800">{r?.unitsRequired || 0} unit(s) · {r?.componentType?.replace("_", " ").replace("whole blood", "blood") || "blood"}</p>
                      <p className="flex items-center gap-1 truncate text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" /> {r?.hospitalName || "Unknown"}, {r?.district || "Unknown"}</p>
                      <div className="mt-0.5 flex gap-3 text-[11px] text-slate-400">
                        {a.distanceKm != null && <span>{a.distanceKm} km away</span>}
                        {a.etaMinutes != null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{a.etaMinutes} min</span>}
                      </div>
                    </div>
                  </div>

                  {a.status === "alerted" && a.responseId && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button loading={busy === a.id} onClick={() => act(a.id, () => api.acceptResponse(a.responseId))}><Check className="h-4 w-4" /> Accept</Button>
                      <Button variant="outline" loading={busy === a.id} onClick={() => act(a.id, () => api.declineResponse(a.responseId))}><X className="h-4 w-4" /> Decline</Button>
                    </div>
                  )}
                  {a.status === "accepted" && a.responseId && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <span>You accepted · contact {r?.contactPerson || "hospital"}</span>
                        <a href={`tel:${r?.contactNumber || ""}`} className="font-bold underline">Call</a>
                      </div>
                      <Button className="w-full" loading={busy === a.id} onClick={() => act(a.id, async () => { const res = await api.completeResponse(a.responseId); if (res.newBadge) alert(`Donation complete! New badge: ${res.newBadge}`); })}>
                        <Droplet className="h-4 w-4" /> Mark donation complete
                      </Button>
                    </div>
                  )}
                  {a.source === "request" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => nav(`/request/${r.id}`)}>View request</Button>
                      <Button loading={busy === a.id} onClick={() => act(a.id, () => api.acceptRequestAsDonor(r.id))}><Check className="h-4 w-4" /> I can donate</Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-center text-sm text-emerald-600">{done.length} donation(s) completed. Thank you for saving lives. 🩸</p>
          <div className="space-y-2">
            {done.map((d) => (
              <Card key={d.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{d.request?.patientName || "Unknown"} · {d.request?.bloodGroup || "Unknown"}</p>
                    <p className="text-xs text-slate-400">{d.request?.hospitalName || "Unknown"} · {new Date(d.completedAt).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => showCertificate(d)}>
                    <Award className="h-4 w-4" /> Certificate
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Sheet open={certificateOpen} onClose={() => setCertificateOpen(false)}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Your Donation Certificate</h3>
          <button onClick={() => setCertificateOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        {certificateData && (
          <DonationCertificate
            donorName={certificateData.donorName}
            bloodGroup={certificateData.bloodGroup}
            donationDate={certificateData.donationDate}
            hospitalName={certificateData.hospitalName}
            district={certificateData.district}
            certificateId={certificateData.certificateId}
            onClose={() => setCertificateOpen(false)}
          />
        )}
      </Sheet>
    </div>
  );
}
export default Nearby;
