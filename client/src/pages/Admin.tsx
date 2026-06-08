import { useEffect, useMemo, useState } from "react";
import { Users, Droplet, ShieldCheck, AlertTriangle, Building2, CheckCircle2, XCircle, Ban } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card, Button, Badge, Spinner } from "../components/ui";
import { timeAgo } from "../lib/utils";

type Tab = "overview" | "donors" | "requests" | "verification" | "fraud" | "hospitals" | "admins";

export function Admin() {
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [fraudReports, setFraudReports] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", mobile: "", role: "admin", password: "" });
  const statusCounts = useMemo(() => requests.reduce((acc: Record<string, number>, request: any) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {}), [requests]);
  const requestStatusEntries = useMemo(() => Object.entries(statusCounts) as Array<[string, number]>, [statusCounts]);

  function formatAddress(person?: any) {
    return [person?.taluk, person?.district, person?.pincode].filter(Boolean).join(", ") || "Not available";
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

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "verifier") return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, d, r, p, f, h, a] = await Promise.all([
        api.adminStats(),
        api.adminDonors(),
        api.adminRequests(),
        api.adminPendingVerification(),
        api.adminFraudReports(),
        api.adminHospitals(),
        api.adminGetAdmins(),
      ]);
      setStats(s);
      setDonors(d);
      setRequests(r);
      setPending(p);
      setFraudReports(f);
      setHospitals(h);
      setAdmins(a);
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

  async function rejectRequest(id: string) {
    const notes = prompt("Reason for cancellation / rejection:", "Admin rejected request");
    if (!notes) return;
    setBusy(`${id}:reject`);
    try {
      await api.adminRejectRequest(id, notes);
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  async function closeRequest(id: string) {
    if (!confirm("Close this request?")) return;
    setBusy(`${id}:close`);
    try {
      await api.adminCloseRequest(id);
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

  async function createAdmin() {
    if (!adminForm.name || !adminForm.mobile || !adminForm.role) {
      alert("Please fill all required fields");
      return;
    }
    setBusy("createAdmin");
    try {
      await api.adminCreateAdmin(adminForm);
      setShowAdminForm(false);
      setAdminForm({ name: "", mobile: "", role: "admin", password: "" });
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
          <img src="/uyir-logo.png" alt="Life Saver" className="h-14 w-auto object-contain" />
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
        {(["overview", "donors", "requests", "verification", "fraud", "hospitals", "admins"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-uyir-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">Request Status Summary</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["pending_verification", "Waiting for verification"],
                ["verified", "Accepted / verified"],
                ["donor_accepted", "Donor accepted"],
                ["closed", "Closed"],
              ].map(([key, label]) => (
                <div key={key} className="rounded-lg bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-800">{statusCounts[key] || 0}</p>
                </div>
              ))}
            </div>
          </Card>
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
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {requestStatusEntries.map(([status, count]) => (
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
                  </div>
                  <Badge className={statusClass(r.status)}>{r.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-white p-3 text-xs">
                    <p className="font-bold text-slate-700">Requester</p>
                    <p className="mt-1 text-slate-700">Name: {r.createdBy?.name || r.contactPerson}</p>
                    <p className="text-slate-500">Phone: {r.createdBy?.mobile || r.contactNumber}</p>
                    <p className="text-slate-500">Address: {formatAddress(r.createdBy)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-xs">
                    <p className="font-bold text-slate-700">Donor details</p>
                    {r.responses?.length ? r.responses.slice(0, 3).map((response: any) => (
                      <div key={response.id} className="mt-2 rounded-md bg-slate-50 px-2 py-2">
                        <p className="font-medium text-slate-700">{response.donor?.name || "Donor"} · {response.status}</p>
                        <p className="text-slate-500">Phone: {response.donor?.mobile || "N/A"}</p>
                        <p className="text-slate-500">Address: {formatAddress(response.donor)}</p>
                      </div>
                    )) : <p className="mt-1 text-slate-400">No donor assigned yet.</p>}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {r.status === "pending_verification" && (
                    <Button size="sm" className="bg-emerald-600" loading={busy === r.id} onClick={() => verifyRequest(r.id, true)}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                  )}
                  {!['rejected', 'closed'].includes(r.status) && (
                    <Button size="sm" variant="outline" loading={busy === `${r.id}:reject`} onClick={() => rejectRequest(r.id)}>
                      <XCircle className="h-4 w-4" /> Cancel
                    </Button>
                  )}
                  {!['closed', 'completed'].includes(r.status) && (
                    <Button size="sm" variant="outline" loading={busy === `${r.id}:close`} onClick={() => closeRequest(r.id)}>
                      Close
                    </Button>
                  )}
                </div>
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

      {tab === "admins" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Admin Users ({admins.length})</h3>
            <Button size="sm" onClick={() => setShowAdminForm(true)}>+ Add Admin</Button>
          </div>
          {showAdminForm && (
            <div className="mb-4 rounded-lg bg-slate-50 p-3">
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Mobile"
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.mobile}
                  onChange={(e) => setAdminForm({ ...adminForm, mobile: e.target.value })}
                />
                <select
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="verifier">Verifier</option>
                </select>
                <input
                  type="password"
                  placeholder="Password (optional)"
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={busy === "createAdmin"} onClick={createAdmin}>Create</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdminForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.mobile} · {a.role} · {timeAgo(a.createdAt)}</p>
                </div>
                <Badge className={a.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}>{a.role}</Badge>
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
