import { useEffect, useState } from "react";
import { Users, Droplet, ShieldCheck, AlertTriangle, Building2, CheckCircle2, XCircle, Ban } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card, Button, Badge, Spinner } from "../components/ui";
import { timeAgo } from "../lib/utils";

type Tab = "overview" | "donors" | "requests" | "verification" | "fraud" | "hospitals";

export function Admin() {
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [fraudReports, setFraudReports] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "verifier") return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, d, r, p, f, h] = await Promise.all([
        api.adminStats(),
        api.adminDonors(),
        api.adminRequests(),
        api.adminPendingVerification(),
        api.adminFraudReports(),
        api.adminHospitals(),
      ]);
      setStats(s);
      setDonors(d);
      setRequests(r);
      setPending(p);
      setFraudReports(f);
      setHospitals(h);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }

  async function verifyRequest(id: string, approved: boolean) {
    const notes = approved ? "Admin approved" : "Admin rejected";
    setBusy(id);
    try {
      await api.adminVerifyRequest(id, approved, notes);
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  async function banUser(id: string) {
    if (!confirm("Ban this user? This will set their reputation to -1000.")) return;
    setBusy(id);
    try {
      await api.adminBanUser(id);
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  if (user?.role !== "admin" && user?.role !== "verifier") {
    return <div className="p-10 text-center text-slate-400">Access denied. Admin only.</div>;
  }

  if (loading) return <Spinner />;

  return (
    <div className="px-4 py-4">
      <header className="mb-4 flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <img src="/uyir-logo.png" alt="UYIR" className="h-16 w-auto object-contain" />
          <h1 className="text-xl font-extrabold text-slate-800">Admin Dashboard</h1>
        </div>
        <Button size="sm" onClick={loadAll}>Refresh</Button>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total Donors" value={stats?.totalDonors} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Droplet} label="Total Requests" value={stats?.totalRequests} color="bg-red-50 text-red-600" />
        <StatCard icon={ShieldCheck} label="Pending Verification" value={stats?.pendingVerifications} color="bg-amber-50 text-amber-600" />
        <StatCard icon={Droplet} label="Active Requests" value={stats?.activeRequests} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={AlertTriangle} label="Fraud Reports" value={stats?.fraudReports} color="bg-rose-50 text-rose-600" />
        <StatCard icon={CheckCircle2} label="Lives Saved" value={stats?.livesSaved} color="bg-violet-50 text-violet-600" />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["overview", "donors", "requests", "verification", "fraud", "hospitals"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-uyir-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 font-bold text-slate-800">Recent Requests</h3>
            <div className="space-y-2">
              {requests.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{r.patientName} · {r.bloodGroup}</p>
                    <p className="text-xs text-slate-400">{r.hospitalName} · {timeAgo(r.createdAt)}</p>
                  </div>
                  <Badge className={r.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "donors" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">All Donors ({donors.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {donors.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{d.name} · {d.bloodGroup || "?"}</p>
                  <p className="text-xs text-slate-400">{d.mobile} · {d.district} · {d._count.responses} donations</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={d.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>{d.verified ? "Verified" : "Unverified"}</Badge>
                  <Badge className="bg-amber-50 text-amber-700">Rep: {d.reputationScore}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "requests" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">All Requests ({requests.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{r.patientName} · {r.bloodGroup}</p>
                  <p className="text-xs text-slate-400">{r.hospitalName} · {r.unitsRequired} units · {timeAgo(r.createdAt)}</p>
                </div>
                <Badge className={r.status === "verified" ? "bg-emerald-100 text-emerald-700" : r.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "verification" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">Pending Verification ({pending.length})</h3>
          {pending.length === 0 && <p className="text-sm text-slate-400">No pending verifications.</p>}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pending.map((r) => (
              <div key={r.id} className="rounded-lg bg-slate-50 p-3">
                <div className="mb-2">
                  <p className="text-sm font-semibold text-slate-700">{r.patientName} · {r.bloodGroup}</p>
                  <p className="text-xs text-slate-400">{r.hospitalName} · {r.unitsRequired} units · {r.verificationScore}% AI score</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-emerald-600" loading={busy === r.id} onClick={() => verifyRequest(r.id, true)}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" loading={busy === r.id} onClick={() => verifyRequest(r.id, false)}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "fraud" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">Fraud Reports ({fraudReports.length})</h3>
          {fraudReports.length === 0 && <p className="text-sm text-slate-400">No fraud reports.</p>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fraudReports.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{f.reportedUser?.name} · {f.reason}</p>
                  <p className="text-xs text-slate-400">{timeAgo(f.createdAt)} · {f.status}</p>
                </div>
                {f.status === "open" && (
                  <Button size="sm" variant="danger" loading={busy === f.reportedUserId} onClick={() => banUser(f.reportedUserId)}>
                    <Ban className="h-4 w-4" /> Ban
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "hospitals" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">Hospitals ({hospitals.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {hospitals.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{h.name}</p>
                  <p className="text-xs text-slate-400">{h.district} · {h.address}</p>
                </div>
                <Badge className={h.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>{h.verified ? "Verified" : "Unverified"}</Badge>
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
export default Admin;
