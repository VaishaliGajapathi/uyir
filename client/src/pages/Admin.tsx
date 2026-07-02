import { useEffect, useMemo, useState } from "react";
import { Users, Droplet, ShieldCheck, AlertTriangle, Building2, CheckCircle2, XCircle, Ban, Search, Download, ChevronDown, ChevronUp, User, Activity, BarChart3, Layers, Heart, Snowflake, Eye, KeyRound, Network } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card, Button, Badge, Spinner, SearchableSelect } from "../components/ui";
import { timeAgo } from "../lib/utils";
import { BLOOD_GROUPS, TN_DISTRICTS } from "../lib/constants";

type Tab = "overview" | "donors" | "requests" | "verification" | "fraud" | "hospitals" | "ngos" | "admins" | "activity" | "inventory" | "pipeline" | "analytics" | "hierarchy" | "profile";

export function Admin() {
  const { user, lang } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [fraudReports, setFraudReports] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [ngos, setNgos] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", mobile: "", email: "", role: "administrator", password: "", district: "", ngoName: "", ngoId: "", designation: "", ngoAddress: "", ngoRegistrationNumber: "", ngoPhone: "", ngoEmail: "" });
  const [profileForm, setProfileForm] = useState({ name: "", email: "", designation: "", district: "" });
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [ngoOrganizations, setNgoOrganizations] = useState<any[]>([]);
  const [viewedPassword, setViewedPassword] = useState<string | null>(null);
  const [viewingPasswordFor, setViewingPasswordFor] = useState<string | null>(null);
  const [donorBloodFilter, setDonorBloodFilter] = useState("");
  const [donorDistrictFilter, setDonorDistrictFilter] = useState("");
  const [donorSearch, setDonorSearch] = useState("");
  const [expandedDonorId, setExpandedDonorId] = useState<string | null>(null);
  const [donorPage, setDonorPage] = useState(1);
  const [donorSortBy, setDonorSortBy] = useState("createdAt");
  const [donorSortOrder, setDonorSortOrder] = useState<"asc" | "desc">("desc");
  const [donorHistory, setDonorHistory] = useState<any[]>([]);
  const [showDonorHistory, setShowDonorHistory] = useState<string | null>(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState<string | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [bloodInventory, setBloodInventory] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [roleHierarchy, setRoleHierarchy] = useState<any>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const DONORS_PER_PAGE = 20;
  const statusCounts = useMemo(() => requests.reduce((acc: Record<string, number>, request: any) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {}), [requests]);
  const requestStatusEntries = useMemo(() => Object.entries(statusCounts) as Array<[string, number]>, [statusCounts]);
  const filteredRequests = useMemo(() => {
    if (!requestStatusFilter) return requests;
    return requests.filter((r) => r.status === requestStatusFilter);
  }, [requests, requestStatusFilter]);

  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    donors.forEach((d) => { if (d.district) set.add(d.district); });
    return Array.from(set).sort();
  }, [donors]);

  const filteredDonors = useMemo(() => {
    const search = donorSearch.trim().toLowerCase();
    return donors.filter((d) => {
      const matchSearch = !search || d.name?.toLowerCase().includes(search) || d.mobile?.includes(search);
      const matchBlood = !donorBloodFilter || d.bloodGroup === donorBloodFilter;
      const matchDistrict = !donorDistrictFilter || d.district === donorDistrictFilter;
      return matchSearch && matchBlood && matchDistrict;
    });
  }, [donors, donorSearch, donorBloodFilter, donorDistrictFilter]);

  const totalDonorPages = Math.ceil(filteredDonors.length / DONORS_PER_PAGE) || 1;
  const paginatedDonors = useMemo(() => {
    const start = (donorPage - 1) * DONORS_PER_PAGE;
    return filteredDonors.slice(start, start + DONORS_PER_PAGE);
  }, [filteredDonors, donorPage]);

  useEffect(() => {
    setDonorPage(1);
  }, [donorSearch, donorBloodFilter, donorDistrictFilter]);

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
    if (user?.role !== "administrator" && user?.role !== "volunteer" && user?.role !== "super_admin") return;
    loadAll();
  }, [user]);

  useEffect(() => {
    api.districts().then(setDistricts).catch(() => {});
  }, []);

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
      // Filter NGO admins from admins list
      setNgos(a.filter((u: any) => u.role === "ngo"));
      // Load NGO organizations for parent-child selection
      try {
        const ngoOrgs = await api.adminGetNgos();
        setNgoOrganizations(ngoOrgs);
      } catch {}
      // Load CRM data
      try {
        const [act, inv, pipe, ana, hier] = await Promise.all([
          api.adminActivity(30),
          api.adminBloodInventory(),
          api.adminRequestPipeline(),
          api.adminAnalytics(),
          api.adminRoleHierarchy(),
        ]);
        setActivity(act);
        setBloodInventory(inv);
        setPipeline(pipe);
        setAnalytics(ana);
        setRoleHierarchy(hier);
      } catch {}
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

  async function verifyHospital(id: string) {
    if (!confirm("Verify this hospital?")) return;
    setBusy(`hosp:${id}`);
    try {
      await api.adminVerifyHospital(id);
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  async function rejectHospital(id: string) {
    if (!confirm("Reject this hospital?")) return;
    setBusy(`hosp-reject:${id}`);
    try {
      await api.adminRejectHospital(id);
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  async function actionFraud(id: string) {
    if (!confirm("Mark this fraud report as actioned?")) return;
    setBusy(`fraud:${id}`);
    try {
      await api.adminVerifyRequest(id, true, "Fraud report actioned");
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  async function dismissFraud(id: string) {
    if (!confirm("Dismiss this fraud report?")) return;
    setBusy(`fraud-dismiss:${id}`);
    try {
      await api.adminDismissFraud(id);
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  function exportDonorsToCSV() {
    const headers = ["Name", "Mobile", "Blood Group", "District", "Taluk", "Pincode", "Gender", "Age", "Verified", "Available", "Platelet", "Donations", "Reputation", "Last Donation"];
    const rows = filteredDonors.map((d) => [
      d.name, d.mobile, d.bloodGroup || "", d.district || "", d.taluk || "", d.pincode || "",
      d.gender || "", d.age ?? "", d.verified ? "Yes" : "No", d.isAvailable ? "Yes" : "No",
      d.isPlateletDonor ? "Yes" : "No", d.donationCount ?? 0, d.reputationScore ?? 0,
      d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uyir-donors-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function createAdmin() {
    if (!adminForm.name || !adminForm.mobile || !adminForm.role) {
      alert("Please fill all required fields");
      return;
    }
    if (adminForm.role === "ngo" && (!adminForm.ngoName || !adminForm.district)) {
      alert("Please provide NGO name and district for NGO admin");
      return;
    }
    setBusy("createAdmin");
    try {
      await api.adminCreateAdmin(adminForm);
      setShowAdminForm(false);
      setAdminForm({ name: "", mobile: "", email: "", role: "administrator", password: "", district: "", ngoName: "", ngoId: "", designation: "", ngoAddress: "", ngoRegistrationNumber: "", ngoPhone: "", ngoEmail: "" });
      await loadAll();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  function exportRequestsCSV() {
    const headers = ["Patient", "Blood Group", "Units", "Hospital", "District", "Status", "Emergency", "Created"];
    const rows = requests.map((r) => [
      r.patientName, r.bloodGroup, r.unitsRequired, r.hospitalName, r.district, r.status, r.emergencyLevel, new Date(r.createdAt).toLocaleString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uyir-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportHospitalsCSV() {
    const headers = ["Name", "District", "Address", "Phone", "Verified", "Created"];
    const rows = hospitals.map((h) => [
      h.name, h.district, h.address || "", h.phone || "", h.verified ? "Yes" : "No", new Date(h.createdAt).toLocaleString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uyir-hospitals-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadDonorHistory(id: string) {
    setBusy(`history-${id}`);
    try {
      const h = await api.adminDonorHistory(id);
      setDonorHistory(h);
      setShowDonorHistory(id);
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  function toggleDonorSort(field: string) {
    if (donorSortBy === field) {
      setDonorSortOrder(donorSortOrder === "asc" ? "desc" : "asc");
    } else {
      setDonorSortBy(field);
      setDonorSortOrder("desc");
    }
  }

  const sortedDonors = useMemo(() => {
    const sorted = [...filteredDonors];
    const field = donorSortBy as any;
    sorted.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      if (field === "name") { aVal = aVal?.toLowerCase() || ""; bVal = bVal?.toLowerCase() || ""; }
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      if (aVal < bVal) return donorSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return donorSortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredDonors, donorSortBy, donorSortOrder]);

  async function approveNgo(id: string) {
    setBusy(`approve-${id}`);
    try {
      await api.adminApproveNgo(id);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function rejectNgo(id: string) {
    setBusy(`reject-${id}`);
    try {
      await api.adminRejectNgo(id);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (user?.role !== "administrator" && user?.role !== "volunteer" && user?.role !== "super_admin") {
    return <div className="p-10 text-center text-slate-400">Access denied. Admin only.</div>;
  }

  if (loading) return <Spinner />;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <img src="/uyir-logo.png" alt="UYIR" className="h-10 w-auto object-contain mb-2" />
          <h2 className="text-lg font-bold text-slate-800">Hi, {user?.name?.split(" ")[0] || "Admin"}</h2>
          <p className="text-xs text-slate-500 capitalize">{user?.role?.replace(/_/g, " ")} Dashboard</p>
        </div>

        {/* Quick Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Quick search..."
              className="w-full rounded-md border border-slate-200 pl-8 pr-2 py-1.5 text-sm"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setDonorSearch(e.target.value);
                if (e.target.value && tab !== "donors") setTab("donors");
              }}
            />
          </div>
        </div>

        <nav className="p-2 space-y-1">
          {/* Dashboard Section */}
          <p className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Dashboard</p>
          {([
            { id: "overview", label: "Overview", icon: Users },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "activity", label: "Activity Feed", icon: Activity },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id as Tab)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-uyir-50 text-uyir-700" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}

          {/* Operations Section */}
          <p className="px-3 py-1 mt-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Operations</p>
          {([
            { id: "donors", label: "Donors", icon: Droplet },
            { id: "requests", label: "Requests", icon: ShieldCheck },
            { id: "verification", label: "Verification", icon: CheckCircle2 },
            { id: "fraud", label: "Fraud Reports", icon: AlertTriangle },
            { id: "hospitals", label: "Hospitals", icon: Building2 },
            { id: "ngos", label: "NGOs", icon: Building2 },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id as Tab)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-uyir-50 text-uyir-700" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}

          {/* Blood Bank CRM Section */}
          <p className="px-3 py-1 mt-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Blood Bank CRM</p>
          {([
            { id: "inventory", label: "Blood Inventory", icon: Heart },
            { id: "pipeline", label: "Request Pipeline", icon: Layers },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id as Tab)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-uyir-50 text-uyir-700" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}

          {/* Admin Section */}
          <p className="px-3 py-1 mt-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Administration</p>
          {([
            { id: "admins", label: "User Management", icon: ShieldCheck },
            { id: "hierarchy", label: "Role Hierarchy", icon: Network },
            { id: "profile", label: "My Profile", icon: User },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id as Tab)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-uyir-50 text-uyir-700" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </nav>

        {/* Recent Activity Mini Feed */}
        {activity.length > 0 && (
          <div className="p-3 border-t border-slate-100">
            <p className="mb-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Recent Activity</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {activity.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-start gap-1.5 text-xs">
                  <Activity className="h-3 w-3 mt-0.5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-slate-600 truncate">{a.userName || "System"}: {a.action}</p>
                    <p className="text-slate-400 text-[10px]">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 mt-auto">
          <Button size="sm" variant="outline" className="w-full" onClick={loadAll}>Refresh</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">



      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Users} label="Total Donors" value={stats?.totalDonors} color="bg-blue-50 text-blue-600" />
            <StatCard icon={Droplet} label="Total Requests" value={stats?.totalRequests} color="bg-red-50 text-red-600" />
            <StatCard icon={ShieldCheck} label="Pending Verification" value={stats?.pendingVerifications} color="bg-amber-50 text-amber-600" />
            <StatCard icon={Droplet} label="Active Requests" value={stats?.activeRequests} color="bg-emerald-50 text-emerald-600" />
            <StatCard icon={AlertTriangle} label="Fraud Reports" value={stats?.fraudReports} color="bg-rose-50 text-rose-600" />
            <StatCard icon={CheckCircle2} label="Lives Saved" value={stats?.livesSaved} color="bg-violet-50 text-violet-600" />
          </div>
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
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-slate-800">Donor Database</h3>
            <span className="text-xs text-slate-400">({filteredDonors.length} of {donors.length})</span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportDonorsToCSV}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or mobile..."
                value={donorSearch}
                onChange={(e) => setDonorSearch(e.target.value)}
                className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-2 text-sm outline-none focus:border-uyir-400"
              />
            </div>
            <select
              value={donorBloodFilter}
              onChange={(e) => setDonorBloodFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-uyir-400"
            >
              <option value="">All Blood Groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <select
              value={donorDistrictFilter}
              onChange={(e) => setDonorDistrictFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-uyir-400"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => { setDonorSearch(""); setDonorBloodFilter(""); setDonorDistrictFilter(""); }}>
              Reset
            </Button>
          </div>

          {/* Excel-like Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 sticky top-0">
                <tr>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold cursor-pointer hover:bg-slate-200" onClick={() => toggleDonorSort("name")}>Name {donorSortBy === "name" && (donorSortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Mobile</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Blood</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">District</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Taluk</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Pincode</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Gender</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Age</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Verified</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Available</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold">Platelet</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold cursor-pointer hover:bg-slate-200" onClick={() => toggleDonorSort("donationCount")}>Donations {donorSortBy === "donationCount" && (donorSortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold cursor-pointer hover:bg-slate-200" onClick={() => toggleDonorSort("reputationScore")}>Rep {donorSortBy === "reputationScore" && (donorSortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="whitespace-nowrap border-b border-r border-slate-200 px-3 py-2 font-semibold cursor-pointer hover:bg-slate-200" onClick={() => toggleDonorSort("lastDonationDate")}>Last Donation {donorSortBy === "lastDonationDate" && (donorSortOrder === "asc" ? "↑" : "↓")}</th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDonors.slice((donorPage - 1) * DONORS_PER_PAGE, donorPage * DONORS_PER_PAGE).map((d) => (
                  <>
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedDonorId(expandedDonorId === d.id ? null : d.id)}>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 font-medium text-slate-800">
                      <div className="flex items-center gap-1">
                        {expandedDonorId === d.id ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
                        {d.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.mobile}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2">
                      <Badge className="bg-rose-50 text-rose-700">{d.bloodGroup || "?"}</Badge>
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.district || "—"}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.taluk || "—"}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.pincode || "—"}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.gender || "—"}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.age ?? "—"}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2">
                      <Badge className={d.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>
                        {d.verified ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2">
                      <Badge className={d.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>
                        {d.isAvailable ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2">
                      <Badge className={d.isPlateletDonor ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"}>
                        {d.isPlateletDonor ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.donationCount ?? 0}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">{d.reputationScore ?? 0}</td>
                    <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-600">
                      {d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto" onClick={(e) => { e.stopPropagation(); banUser(d.id); }}>
                          <Ban className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto" loading={busy === `history-${d.id}`} onClick={(e) => { e.stopPropagation(); loadDonorHistory(d.id); }}>
                          <Activity className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedDonorId === d.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={15} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-slate-500">Full Name:</span> <span className="font-medium">{d.name}</span></div>
                          <div><span className="text-slate-500">Mobile:</span> <span className="font-medium">{d.mobile}</span></div>
                          <div><span className="text-slate-500">Blood Group:</span> <span className="font-medium">{d.bloodGroup || "—"}</span></div>
                          <div><span className="text-slate-500">Gender:</span> <span className="font-medium">{d.gender || "—"}</span></div>
                          <div><span className="text-slate-500">Age:</span> <span className="font-medium">{d.age ?? "—"}</span></div>
                          <div><span className="text-slate-500">DOB:</span> <span className="font-medium">{d.dob ? new Date(d.dob).toLocaleDateString() : "—"}</span></div>
                          <div><span className="text-slate-500">District:</span> <span className="font-medium">{d.district || "—"}</span></div>
                          <div><span className="text-slate-500">Taluk:</span> <span className="font-medium">{d.taluk || "—"}</span></div>
                          <div><span className="text-slate-500">Pincode:</span> <span className="font-medium">{d.pincode || "—"}</span></div>
                          <div><span className="text-slate-500">Lat/Lng:</span> <span className="font-medium">{d.lat ?? "—"}, {d.lng ?? "—"}</span></div>
                          <div><span className="text-slate-500">Verified:</span> <span className="font-medium">{d.verified ? "Yes" : "No"}</span></div>
                          <div><span className="text-slate-500">Available:</span> <span className="font-medium">{d.isAvailable ? "Yes" : "No"}</span></div>
                          <div><span className="text-slate-500">Platelet Donor:</span> <span className="font-medium">{d.isPlateletDonor ? "Yes" : "No"}</span></div>
                          <div><span className="text-slate-500">Notifications:</span> <span className="font-medium">{d.notificationsEnabled ? "On" : "Off"}</span></div>
                          <div><span className="text-slate-500">Voice:</span> <span className="font-medium">{d.voiceEnabled ? "On" : "Off"}</span></div>
                          <div><span className="text-slate-500">Location:</span> <span className="font-medium">{d.shareLocation ? "On" : "Off"}</span></div>
                          <div><span className="text-slate-500">Donation Count:</span> <span className="font-medium">{d.donationCount ?? 0}</span></div>
                          <div><span className="text-slate-500">Reputation:</span> <span className="font-medium">{d.reputationScore ?? 0}</span></div>
                          <div><span className="text-slate-500">Last Donation:</span> <span className="font-medium">{d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : "—"}</span></div>
                          <div><span className="text-slate-500">Joined:</span> <span className="font-medium">{d.createdAt ? timeAgo(d.createdAt) : "—"}</span></div>
                          <div className="col-span-2"><span className="text-slate-500">User ID:</span> <span className="font-mono text-[10px]">{d.id}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                ))}
                {sortedDonors.length === 0 && (
                  <tr><td colSpan={15} className="px-3 py-8 text-center text-slate-400">No donors on this page.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalDonorPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Page {donorPage} of {totalDonorPages} ({filteredDonors.length} total)</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={donorPage === 1} onClick={() => setDonorPage(donorPage - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={donorPage === totalDonorPages} onClick={() => setDonorPage(donorPage + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "requests" && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-800">
                All Requests {requestStatusFilter ? `(filtered: ${filteredRequests.length})` : `(${requests.length})`}
              </h3>
              <Button size="sm" variant="outline" onClick={exportRequestsCSV}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            {requestStatusFilter && (
              <Button size="sm" variant="outline" onClick={() => setRequestStatusFilter(null)}>
                Clear Filter
              </Button>
            )}
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {requestStatusEntries.map(([status, count]) => (
              <button
                key={status}
                onClick={() => setRequestStatusFilter(requestStatusFilter === status ? null : status)}
                className={`rounded-full px-3 py-1 font-semibold cursor-pointer transition-colors ${
                  requestStatusFilter === status
                    ? "ring-2 ring-uyir-600 ring-offset-2"
                    : "hover:opacity-80"
                } ${statusClass(status)}`}
              >
                {status.replace(/_/g, " ")}: {count}
              </button>
            ))}
          </div>
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {filteredRequests.map((r) => (
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
                    <p className="font-bold text-slate-700">Requestor</p>
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
                  <p className="text-xs text-slate-400">{r.hospitalName} · {r.district} · {r.unitsRequired} units</p>
                  <p className="text-xs text-slate-500 mt-1">
                    AI Score: <Badge className={r.verificationScore >= 70 ? "bg-emerald-100 text-emerald-700" : r.verificationScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>{r.verificationScore ?? 0}%</Badge>
                    {r.verificationNotes && <span className="ml-2">{r.verificationNotes.slice(0, 80)}...</span>}
                  </p>
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
              <div key={f.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{f.reportedUser?.name || f.reporter?.name || "Unknown"} · {f.reason}</p>
                    <p className="text-xs text-slate-400">{timeAgo(f.createdAt)} · Status: {f.status}</p>
                    {f.notes && <p className="text-xs text-slate-500 mt-1">Note: {f.notes}</p>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {f.status === "open" && (
                    <>
                      <Button size="sm" className="bg-emerald-600" loading={busy === `fraud:${f.id}`} onClick={() => actionFraud(f.id)}>
                        <CheckCircle2 className="h-3 w-3" /> Actioned
                      </Button>
                      <Button size="sm" variant="outline" loading={busy === `fraud-dismiss:${f.id}`} onClick={() => dismissFraud(f.id)}>
                        <XCircle className="h-3 w-3" /> Dismiss
                      </Button>
                      <Button size="sm" variant="danger" loading={busy === f.reportedUserId} onClick={() => banUser(f.reportedUserId)}>
                        <Ban className="h-3 w-3" /> Ban User
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "hospitals" && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="font-bold text-slate-800">Hospitals ({hospitals.length})</h3>
            <Button size="sm" variant="outline" onClick={exportHospitalsCSV}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {hospitals.map((h) => (
              <div key={h.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{h.hospitalName || h.name}</p>
                    <p className="text-xs text-slate-400">{h.district} · {h.address || h.hospitalRegistrationId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={h.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>{h.verified ? "Verified" : "Unverified"}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  {!h.verified && (
                    <Button size="sm" className="bg-emerald-600" loading={busy === `hosp:${h.id}`} onClick={() => verifyHospital(h.id)}>
                      <CheckCircle2 className="h-3 w-3" /> Verify
                    </Button>
                  )}
                  {h.verified && (
                    <Button size="sm" variant="outline" loading={busy === `hosp-reject:${h.id}`} onClick={() => rejectHospital(h.id)}>
                      <XCircle className="h-3 w-3" /> Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "ngos" && (
        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">NGO Admins & Activities ({ngos.length})</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {ngos.length === 0 && <p className="text-sm text-slate-400">No NGO admins found.</p>}
            {ngos.map((n) => (
              <div key={n.id} className="rounded-lg bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-700">{n.name}</p>
                      <Badge className={n.ngoStatus === "approved" ? "bg-emerald-100 text-emerald-700" : n.ngoStatus === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}>
                        {n.ngoStatus || "Pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">{n.mobile} · {n.district || "No district"}</p>
                    {n.ngoName && <p className="text-xs font-medium text-slate-600">NGO: {n.ngoName}</p>}
                    {n.ngoAddress && <p className="text-xs text-slate-500">📍 {n.ngoAddress}</p>}
                    {n.ngoRegistrationNumber && <p className="text-xs text-slate-500">📋 Reg: {n.ngoRegistrationNumber}</p>}
                    {n.ngoPhone && <p className="text-xs text-slate-500">📞 {n.ngoPhone}</p>}
                    {n.ngoEmail && <p className="text-xs text-slate-500">✉️ {n.ngoEmail}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-violet-100 text-violet-700">NGO Admin</Badge>
                    <Badge className={n.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}>
                      {n.verified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-white p-2 text-center">
                  <div>
                    <p className="text-xs text-slate-500">{lang === "ta" ? "கோரிக்கைகள்" : "Requests"}</p>
                    <p className="text-sm font-bold text-slate-800">{n.requestsProcessed || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{lang === "ta" ? "மருத்துவமனைகள்" : "Hospitals"}</p>
                    <p className="text-sm font-bold text-slate-800">{n.hospitalsVerified || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{lang === "ta" ? "தானங்கள்" : "Donations"}</p>
                    <p className="text-sm font-bold text-slate-800">{n.donationsFacilitated || 0}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" loading={busy === n.id} onClick={() => banUser(n.id)}>
                    <Ban className="h-3 w-3" /> Ban
                  </Button>
                  {n.ngoStatus === "pending" && (
                    <>
                      <Button size="sm" className="bg-emerald-600" loading={busy === `approve-${n.id}`} onClick={() => approveNgo(n.id)}>
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" loading={busy === `reject-${n.id}`} onClick={() => rejectNgo(n.id)}>
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "admins" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Admin Users ({admins.length})</h3>
            {user?.role === "super_admin" && (
              <Button size="sm" onClick={() => setShowAdminForm(true)}>+ Add Admin</Button>
            )}
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
                <input
                  type="email"
                  placeholder="Email (optional)"
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Designation (e.g., UYIR Admin, Hospital Admin)"
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.designation}
                  onChange={(e) => setAdminForm({ ...adminForm, designation: e.target.value })}
                />
                <select
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.role}
                  onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value, ngoId: "", ngoName: "" })}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="administrator">Administrator</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="ngo">NGO</option>
                  <option value="blood_bank">Blood Bank</option>
                  <option value="hospital">Hospital</option>
                </select>
                <input
                  type="password"
                  placeholder="Password (optional)"
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />
                {adminForm.role === "ngo" && (
                  <>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Select existing NGO or create new</label>
                      <select
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                        value={adminForm.ngoId}
                        onChange={(e) => {
                          if (e.target.value === "__new__") {
                            setAdminForm({ ...adminForm, ngoId: "", ngoName: "" });
                          } else {
                            const ngo = ngoOrganizations.find((n: any) => n.id === e.target.value);
                            setAdminForm({ ...adminForm, ngoId: e.target.value, ngoName: ngo?.name || "", district: ngo?.district || adminForm.district });
                          }
                        }}
                      >
                        <option value="__new__">+ Create new NGO</option>
                        {ngoOrganizations.length > 0 && <option value="">-- Select existing NGO --</option>}
                        {ngoOrganizations.map((n: any) => (
                          <option key={n.id} value={n.id}>{n.name} ({n.district})</option>
                        ))}
                      </select>
                    </div>
                    {!adminForm.ngoId && (
                      <>
                        <input
                          type="text"
                          placeholder="NGO Name *"
                          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          value={adminForm.ngoName}
                          onChange={(e) => setAdminForm({ ...adminForm, ngoName: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="NGO Address"
                          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          value={adminForm.ngoAddress}
                          onChange={(e) => setAdminForm({ ...adminForm, ngoAddress: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="NGO Registration Number"
                          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          value={adminForm.ngoRegistrationNumber}
                          onChange={(e) => setAdminForm({ ...adminForm, ngoRegistrationNumber: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="NGO Phone"
                          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          value={adminForm.ngoPhone}
                          onChange={(e) => setAdminForm({ ...adminForm, ngoPhone: e.target.value })}
                        />
                        <input
                          type="email"
                          placeholder="NGO Email"
                          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          value={adminForm.ngoEmail}
                          onChange={(e) => setAdminForm({ ...adminForm, ngoEmail: e.target.value })}
                        />
                      </>
                    )}
                    {adminForm.ngoId && (
                      <div className="col-span-2 text-xs text-slate-500 bg-emerald-50 rounded p-2">
                        Linking to existing NGO: <strong>{ngoOrganizations.find((n: any) => n.id === adminForm.ngoId)?.name}</strong>
                      </div>
                    )}
                    <SearchableSelect
                      options={TN_DISTRICTS}
                      value={adminForm.district}
                      onChange={(v) => setAdminForm({ ...adminForm, district: v })}
                      placeholder="Select district"
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-sm h-9"
                    />
                  </>
                )}
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
                  {(a.role as string) === "ngo" && (
                    <p className="text-xs text-slate-400">{a.ngoName} · {a.district}</p>
                  )}
                  {a.banned && <span className="text-xs text-rose-600 font-medium"> · Frozen</span>}
                  {!a.verified && a.role !== "ngo" && <span className="text-xs text-amber-600 font-medium"> · Deactivated</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={a.role === "super_admin" ? "bg-rose-100 text-rose-700" : a.role === "administrator" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}>{a.role}</Badge>
                  {user?.role === "super_admin" && a.role !== "super_admin" && (
                    <>
                      <Button size="sm" variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto" onClick={() => {
                        setProfileForm({ name: a.name, email: a.email || "", designation: a.designation || "", district: a.district || "" });
                        setEditingAdminId(a.id);
                        setShowProfileEdit(true);
                        setTab("profile");
                      }}>Edit</Button>
                      <Button size="sm" variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto" loading={busy === `pw-${a.id}`} onClick={async () => {
                        setBusy(`pw-${a.id}`);
                        try {
                          const res = await api.adminViewPassword(a.id);
                          setViewedPassword(res.password);
                          setViewingPasswordFor(a.name);
                        } catch (e: any) { alert(e.message); } finally { setBusy(null); }
                      }}>View PW</Button>
                      <Button size="sm" variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto" loading={busy === `reset-${a.id}`} onClick={async () => {
                        const pw = prompt(`Reset password for ${a.name}:`);
                        if (!pw) return;
                        setBusy(`reset-${a.id}`);
                        try {
                          await api.adminResetPassword(a.id, pw);
                          alert("Password reset successfully");
                        } catch (e: any) { alert(e.message); } finally { setBusy(null); }
                      }}>Reset PW</Button>
                      <Button size="sm" variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto" loading={busy === `freeze-${a.id}`} onClick={async () => {
                        if (!confirm(`Freeze ${a.name}? They will be banned from login.`)) return;
                        setBusy(`freeze-${a.id}`);
                        try { await api.adminFreezeUser(a.id); await loadAll(); } catch (e: any) { alert(e.message); } finally { setBusy(null); }
                      }}>{a.banned ? "Unfreeze" : "Freeze"}</Button>
                      <Button size="sm" variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto" loading={busy === `deact-${a.id}`} onClick={async () => {
                        if (!confirm(`${a.verified ? "Deactivate" : "Activate"} ${a.name}?`)) return;
                        setBusy(`deact-${a.id}`);
                        try { await api.adminDeactivateUser(a.id); await loadAll(); } catch (e: any) { alert(e.message); } finally { setBusy(null); }
                      }}>{a.verified ? "Deactivate" : "Activate"}</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {viewedPassword && (
            <div className="mt-3 rounded-lg bg-slate-800 p-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Password for {viewingPasswordFor}:</p>
                  <p className="text-sm font-mono font-bold">{viewedPassword}</p>
                </div>
                <button onClick={() => { setViewedPassword(null); setViewingPasswordFor(null); }} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "profile" && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{editingAdminId ? "Edit Admin Profile" : "My Profile"}</h3>
            <div className="flex gap-2">
              {!editingAdminId && (
                <Button size="sm" variant="outline" onClick={() => setShowPasswordChange(!showPasswordChange)}>Change Password</Button>
              )}
              {!showProfileEdit && (
                <Button size="sm" onClick={() => {
                  setProfileForm({ name: user?.name || "", email: user?.email || "", designation: user?.designation || "", district: user?.district || "" });
                  setShowProfileEdit(true);
                }}>Edit Profile</Button>
              )}
            </div>
          </div>
          
          {showPasswordChange && !editingAdminId && (
            <div className="mb-4 rounded-lg bg-slate-50 p-4">
              <div className="mb-3 grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Confirm Password</label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={busy === "changePassword"} onClick={async () => {
                  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                    alert("New passwords do not match");
                    return;
                  }
                  setBusy("changePassword");
                  try {
                    await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
                    alert("Password changed successfully");
                    setShowPasswordChange(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  } catch (e: any) { alert(e.message); } finally { setBusy(null); }
                }}>Update Password</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}>Cancel</Button>
              </div>
            </div>
          )}
          
          {showProfileEdit ? (
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Designation</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={profileForm.designation}
                    onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">District</label>
                  <SearchableSelect
                    options={TN_DISTRICTS}
                    value={profileForm.district}
                    onChange={(v) => setProfileForm({ ...profileForm, district: v })}
                    placeholder="Select district"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={busy === "updateProfile"} onClick={async () => {
                  setBusy("updateProfile");
                  try {
                    if (editingAdminId) {
                      await api.adminUpdateAdmin(editingAdminId, profileForm);
                    } else {
                      await api.updateProfile(profileForm);
                    }
                    await loadAll();
                    setShowProfileEdit(false);
                    setEditingAdminId(null);
                  } catch (e: any) { alert(e.message); } finally { setBusy(null); }
                }}>Save Changes</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowProfileEdit(false);
                  setEditingAdminId(null);
                }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Mobile</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.mobile || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Role</p>
                  <Badge className="bg-violet-100 text-violet-700">{user?.role || "—"}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Designation</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.designation || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">District</p>
                  <p className="text-sm font-semibold text-slate-800">{user?.district || "—"}</p>
                </div>
                {(user?.role as string) === "ngo" && (
                  <>
                    <div>
                      <p className="text-xs text-slate-500">NGO Name</p>
                      <p className="text-sm font-semibold text-slate-800">{user?.ngoName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">NGO Status</p>
                      <Badge className={user?.ngoStatus === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{user?.ngoStatus || "—"}</Badge>
                    </div>
                  </>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Account Created</p>
                <p className="text-sm font-semibold text-slate-800">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ============ ACTIVITY FEED ============ */}
      {tab === "activity" && (
        <Card className="p-4">
          <h3 className="mb-3 font-bold text-slate-800">Activity Timeline ({activity.length})</h3>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {activity.length === 0 && <p className="text-sm text-slate-400">No recent activity</p>}
            {activity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-uyir-100">
                    <Activity className="h-3.5 w-3.5 text-uyir-600" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{a.userName || "System"}</span>
                    <span className="text-slate-500"> · {a.action}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {a.entityType && `${a.entityType}`}
                    {a.details && ` · ${a.details}`}
                    {` · ${timeAgo(a.createdAt)}`}
                  </p>
                </div>
                <Badge className="bg-slate-200 text-slate-600 text-[10px]">{a.userRole || "system"}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ============ BLOOD INVENTORY ============ */}
      {tab === "inventory" && bloodInventory && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Heart} label="Total Donors" value={bloodInventory.totalDonors} color="bg-red-50 text-red-600" />
            <StatCard icon={CheckCircle2} label="Eligible Donors (90d+)" value={bloodInventory.totalEligible} color="bg-emerald-50 text-emerald-600" />
          </div>
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">Blood Group Inventory</h3>
            <div className="grid grid-cols-4 gap-3">
              {bloodInventory.byGroup.map((g: any) => (
                <div key={g.bloodGroup} className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-extrabold text-red-600">{g.bloodGroup}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-slate-600">Donors: <span className="font-bold">{g.donorCount}</span></p>
                    <p className="text-emerald-600">Eligible: <span className="font-bold">{g.eligibleDonors}</span></p>
                    <p className="text-violet-600">Platelet: <span className="font-bold">{g.plateletDonors}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">Donors by District</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bloodInventory.byDistrict.map((d: any) => (
                <div key={d.district} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{d.district}</span>
                  <div className="flex gap-2">
                    <Badge className="bg-blue-100 text-blue-700">{d.donorCount} donors</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700">{d.eligibleDonors} eligible</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ============ REQUEST PIPELINE ============ */}
      {tab === "pipeline" && pipeline && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">Request Fulfillment Pipeline</h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-extrabold text-slate-800">{pipeline.fulfillmentRate?.total || 0}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-600">Completed</p>
                <p className="text-2xl font-extrabold text-emerald-700">{pipeline.fulfillmentRate?.completed || 0}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 text-center">
                <p className="text-xs text-slate-500">Closed</p>
                <p className="text-2xl font-extrabold text-slate-600">{pipeline.fulfillmentRate?.closed || 0}</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3 text-center">
                <p className="text-xs text-rose-600">Rejected</p>
                <p className="text-2xl font-extrabold text-rose-700">{pipeline.fulfillmentRate?.rejected || 0}</p>
              </div>
            </div>
            {pipeline.fulfillmentRate?.total > 0 && (
              <div className="mt-3">
                <div className="flex h-6 rounded-full overflow-hidden">
                  <div className="bg-emerald-500" style={{ width: `${(pipeline.fulfillmentRate.completed / pipeline.fulfillmentRate.total) * 100}%` }} />
                  <div className="bg-slate-400" style={{ width: `${(pipeline.fulfillmentRate.closed / pipeline.fulfillmentRate.total) * 100}%` }} />
                  <div className="bg-rose-400" style={{ width: `${(pipeline.fulfillmentRate.rejected / pipeline.fulfillmentRate.total) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Fulfillment rate: {((pipeline.fulfillmentRate.completed / pipeline.fulfillmentRate.total) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">Status Breakdown</h3>
            <div className="space-y-2">
              {pipeline.byStatus.map((s: any) => (
                <div key={s.status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700 capitalize">{s.status.replace(/_/g, " ")}</span>
                  <div className="flex gap-2">
                    <Badge className="bg-slate-200 text-slate-700">{s.cnt} total</Badge>
                    {s.redCount > 0 && <Badge className="bg-rose-100 text-rose-700">{s.redCount} red</Badge>}
                    {s.orangeCount > 0 && <Badge className="bg-amber-100 text-amber-700">{s.orangeCount} orange</Badge>}
                    {s.greenCount > 0 && <Badge className="bg-emerald-100 text-emerald-700">{s.greenCount} green</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="mb-3 font-bold text-slate-800">By Blood Group</h3>
              <div className="space-y-2">
                {pipeline.byBloodGroup.map((b: any) => (
                  <div key={b.bloodGroup} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm font-bold text-red-600">{b.bloodGroup}</span>
                    <Badge className="bg-red-100 text-red-700">{b.cnt}</Badge>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 font-bold text-slate-800">By District</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pipeline.byDistrict.map((d: any) => (
                  <div key={d.district} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{d.district}</span>
                    <Badge className="bg-blue-100 text-blue-700">{d.cnt}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============ ANALYTICS ============ */}
      {tab === "analytics" && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="mb-3 font-bold text-slate-800">Requests (Last 30 Days)</h3>
              <div className="flex items-end gap-1 h-32">
                {analytics.requestsOverTime.map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${d.cnt}`}>
                    <div className="w-full bg-red-400 rounded-t" style={{ height: `${(d.cnt / Math.max(...analytics.requestsOverTime.map((x: any) => x.cnt), 1)) * 100}%` }} />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{analytics.requestsOverTime.length} days · Total: {analytics.requestsOverTime.reduce((s: number, d: any) => s + d.cnt, 0)}</p>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 font-bold text-slate-800">Completed Donations (Last 30 Days)</h3>
              <div className="flex items-end gap-1 h-32">
                {analytics.donationsOverTime.map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${d.cnt}`}>
                    <div className="w-full bg-emerald-400 rounded-t" style={{ height: `${(d.cnt / Math.max(...analytics.donationsOverTime.map((x: any) => x.cnt), 1)) * 100}%` }} />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{analytics.donationsOverTime.length} days · Total: {analytics.donationsOverTime.reduce((s: number, d: any) => s + d.cnt, 0)}</p>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">Top 10 Donors</h3>
            <div className="space-y-2">
              {analytics.topDonors.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-uyir-100 text-xs font-bold text-uyir-700">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.bloodGroup} · {d.district}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-red-100 text-red-700">{d.donationCount} donations</Badge>
                    <Badge className="bg-violet-100 text-violet-700">{d.livesSavedCount || 0} lives</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">District Heatmap</h3>
            <div className="grid grid-cols-3 gap-2">
              {analytics.districtHeatmap.map((d: any) => (
                <div key={d.district} className="rounded-lg p-3" style={{ backgroundColor: `rgba(239, 68, 68, ${Math.min(d.requests / 20, 0.9)})` }}>
                  <p className="text-sm font-bold text-white">{d.district}</p>
                  <p className="text-xs text-white/80">{d.requests} requests · {d.active} active</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ============ ROLE HIERARCHY ============ */}
      {tab === "hierarchy" && roleHierarchy && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">Role Distribution</h3>
            <div className="space-y-2">
              {roleHierarchy.byRole.map((r: any) => (
                <div key={r.role} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-sm font-semibold text-slate-700">{r.role.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-blue-100 text-blue-700">{r.cnt} total</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700">{r.activeCount} active</Badge>
                    {r.bannedCount > 0 && <Badge className="bg-rose-100 text-rose-700">{r.bannedCount} banned</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 font-bold text-slate-800">NGO Parent-Child Hierarchy</h3>
            <div className="space-y-2">
              {roleHierarchy.ngoUsers.length === 0 && <p className="text-sm text-slate-400">No NGOs registered</p>}
              {roleHierarchy.ngoUsers.map((n: any, i: number) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{n.ngoName}</p>
                      <p className="text-xs text-slate-400">{n.district || "No district"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-blue-100 text-blue-700">{n.userCount} users</Badge>
                      <Badge className={n.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{n.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ============ DONOR HISTORY MODAL ============ */}
      {showDonorHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDonorHistory(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Donation History</h3>
              <button onClick={() => setShowDonorHistory(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-2">
              {donorHistory.length === 0 && <p className="text-sm text-slate-400">No donation history</p>}
              {donorHistory.map((h: any) => (
                <div key={h.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{h.patientName} · {h.bloodGroup}</p>
                      <p className="text-xs text-slate-400">{h.hospitalName} · {h.district} · {timeAgo(h.createdAt)}</p>
                    </div>
                    <Badge className={h.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}>{h.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      </main>
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
