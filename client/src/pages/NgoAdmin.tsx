import { useEffect, useMemo, useState } from "react";
import { Users, Droplet, Building2, ShieldCheck, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card, Button, Badge, Spinner } from "../components/ui";
import { timeAgo } from "../lib/utils";

type Tab = "overview" | "requests" | "hospitals";

export function NgoAdmin() {
  const { user, lang } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    return requests.reduce((acc: Record<string, number>, request: any) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const districtCounts = useMemo(() => {
    const h = hospitals.reduce((acc: Record<string, number>, h: any) => {
      acc[h.district] = (acc[h.district] || 0) + 1;
      return acc;
    }, {});
    const r = requests.reduce((acc: Record<string, number>, req: any) => {
      acc[req.district] = (acc[req.district] || 0) + 1;
      return acc;
    }, {});
    return { hospitals: h, requests: r };
  }, [hospitals, requests]);

  useEffect(() => {
    if (user?.role !== "ngo_admin") return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, r, h] = await Promise.all([
        api.ngoStats(),
        api.ngoRequests(),
        api.ngoHospitals(),
      ]);
      setStats(s);
      setRequests(r);
      setHospitals(h);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyHospital(id: string) {
    setBusy(id);
    try {
      await api.ngoVerifyHospital(id);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  function statusClass(status: string) {
    if (status === "pending_verification") return "bg-amber-100 text-amber-700";
    if (status === "verified") return "bg-emerald-100 text-emerald-700";
    if (status === "donor_accepted") return "bg-violet-100 text-violet-700";
    if (status === "closed") return "bg-slate-300 text-slate-700";
    if (status === "rejected") return "bg-rose-100 text-rose-700";
    if (status === "completed") return "bg-blue-100 text-blue-700";
    return "bg-slate-200 text-slate-500";
  }

  if (user?.role !== "ngo_admin") {
    return (
      <div className="p-10 text-center text-slate-400">
        {lang === "ta" ? "அணுகல் மறுக்கப்பட்டது. NGO நிர்வாகி மட்டும்." : "Access denied. NGO admin only."}
      </div>
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="px-4 py-4">
      <header className="mb-4 flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <img src="/uyir-logo.png" alt="Life Saver" className="h-14 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">
              {lang === "ta" ? "NGO நிர்வாக மையம்" : "NGO Admin Dashboard"}
            </h1>
            <p className="text-xs text-slate-500">
              {user?.ngoName || "NGO"} · {stats?.district || user?.district || "District"}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={loadAll}>Refresh</Button>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard icon={Droplet} label={lang === "ta" ? "மொத்த கோரிக்கைகள்" : "Total Requests"} value={stats?.totalRequests} color="bg-red-50 text-red-600" />
        <StatCard icon={Users} label={lang === "ta" ? "தானம் செய்தோர்" : "Donations"} value={stats?.completedDonations} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Building2} label={lang === "ta" ? "மருத்துவமனைகள்" : "Hospitals"} value={stats?.totalHospitals} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={ShieldCheck} label={lang === "ta" ? "சரிபார்ப்பு காத்திருப்பு" : "Pending Verification"} value={stats?.pendingVerifications} color="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label={lang === "ta" ? "செயலில் உள்ள கோரிக்கைகள்" : "Active Requests"} value={stats?.activeRequests} color="bg-violet-50 text-violet-600" />
        <StatCard icon={Users} label={lang === "ta" ? "மொத்த பயனர்கள்" : "Total Users"} value={stats?.totalUsers} color="bg-slate-50 text-slate-600" />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["overview", "requests", "hospitals"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t ? "bg-uyir-600 text-white" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            {t === "overview" ? (lang === "ta" ? "மேலோட்டம்" : "Overview")
              : t === "requests" ? (lang === "ta" ? "கோரிக்கைகள்" : "Requests")
              : (lang === "ta" ? "மருத்துவமனைகள்" : "Hospitals")}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">
              {lang === "ta" ? "கோரிக்கை நிலை சுருக்கம்" : "Request Status Summary"}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["pending_verification", lang === "ta" ? "சரிபார்ப்பு காத்திருப்பு" : "Waiting for verification"],
                ["verified", lang === "ta" ? "சரிபார்க்கப்பட்டது" : "Accepted / verified"],
                ["donor_accepted", lang === "ta" ? "தானம் செய்பவர் ஏற்றுக்கொண்டார்" : "Donor accepted"],
                ["closed", lang === "ta" ? "மூடப்பட்டது" : "Closed"],
                ["rejected", lang === "ta" ? "நிராகரிக்கப்பட்டது" : "Rejected"],
                ["completed", lang === "ta" ? "நிறைவு" : "Completed"],
              ].map(([key, label]) => (
                <div key={key} className="rounded-lg bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-800">{statusCounts[key] || 0}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">
              {lang === "ta" ? "மாவட்டத்தின்படி மருத்துவமனைகள்" : "Hospitals by District"}
            </h3>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(Object.entries(districtCounts.hospitals) as [string, number][]).map(([district, count]) => (
              <div key={district} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{district}</span>
                <Badge className="bg-emerald-100 text-emerald-700">{count}</Badge>
              </div>
            ))}
          </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">
              {lang === "ta" ? "மாவட்டத்தின்படி கோரிக்கைகள்" : "Requests by District"}
            </h3>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(Object.entries(districtCounts.requests) as [string, number][]).map(([district, count]) => (
              <div key={district} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{district}</span>
                <Badge className="bg-red-100 text-red-700">{count}</Badge>
              </div>
            ))}
          </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 font-bold text-slate-800">
              {lang === "ta" ? "சமீபத்திய கோரிக்கைகள்" : "Recent Requests"}
            </h3>
            <div className="space-y-2">
              {requests.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{r.patientName} · {r.bloodGroup}</p>
                    <p className="text-xs text-slate-400">{r.hospitalName} · {r.district} · {timeAgo(r.createdAt)}</p>
                  </div>
                  <Badge className={r.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "requests" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">
            {lang === "ta" ? "அனைத்து கோரிக்கைகள்" : "All Requests"} ({requests.length})
          </h3>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => (
              <span key={status} className={`rounded-full px-3 py-1 font-semibold ${statusClass(status)}`}>
                {status.replace(/_/g, " ")}: {count}
              </span>
            ))}
          </div>
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{r.patientName} · {r.bloodGroup} · {r.unitsRequired} unit(s)</p>
                    <p className="text-xs text-slate-400">{r.hospitalName} · {r.district} · {timeAgo(r.createdAt)}</p>
                    <p className="text-xs text-slate-400">Contact: {r.contactPerson} · {r.contactNumber}</p>
                  </div>
                  <Badge className={statusClass(r.status)}>{r.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="rounded-lg bg-white p-3 text-xs">
                  <p className="font-bold text-slate-700">{lang === "ta" ? "கோரிக்கை விவரங்கள்" : "Request Details"}</p>
                  <p className="mt-1 text-slate-700">{lang === "ta" ? "நோயாளி" : "Patient"}: {r.patientName} · {r.patientAge}y · {r.patientGender}</p>
                  <p className="text-slate-500">{lang === "ta" ? "தொகுப்பு" : "Component"}: {r.componentType}</p>
                  <p className="text-slate-500">{lang === "ta" ? "அவசரம்" : "Emergency"}: {r.emergencyLevel}</p>
                  <p className="text-slate-500">{lang === "ta" ? "தொடர்பு" : "Contact"}: {r.contactPerson} · {r.contactNumber}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "hospitals" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">
            {lang === "ta" ? "அனைத்து மருத்துவமனைகள்" : "All Hospitals"} ({hospitals.length})
          </h3>
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {hospitals.map((h) => (
              <div key={h.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{h.name}</p>
                    <p className="text-xs text-slate-400">{h.district} · {h.address}</p>
                    <p className="text-xs text-slate-400">Phone: {h.phone}</p>
                  </div>
                  <Badge className={h.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>
                    {h.verified ? (lang === "ta" ? "சரிபார்க்கப்பட்டது" : "Verified") : (lang === "ta" ? "சரிபார்ப்பு காத்திருப்பு" : "Unverified")}
                  </Badge>
                </div>
                {!h.verified && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="bg-emerald-600" loading={busy === h.id} onClick={() => verifyHospital(h.id)}>
                      <CheckCircle2 className="h-4 w-4" /> {lang === "ta" ? "சரிபார்க்க" : "Verify"}
                    </Button>
                  </div>
                )}
                {h.lat && h.lng && (
                  <p className="mt-2 text-xs text-slate-400">
                    <MapPin className="inline h-3 w-3" /> {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value?: number; color: string }) {
  return (
    <Card className={`flex flex-col items-center gap-1 p-3 ${color}`}>
      <Icon className="h-5 w-5" />
      <span className="text-xl font-extrabold text-slate-800">{value ?? "—"}</span>
      <span className="text-[11px] text-slate-600">{label}</span>
    </Card>
  );
}

export default NgoAdmin;
