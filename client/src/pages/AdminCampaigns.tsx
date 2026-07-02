import { useEffect, useState } from "react";
import { Megaphone, Plus, Pause, Play, XCircle, CheckCircle2, Trash2, Pencil, MapPin, Clock, Calendar, Users, Droplet, Building2, Heart, TrendingUp, BarChart3, X } from "lucide-react";
import { api } from "../lib/api";
import { Card, Button, Badge, Spinner, SearchableSelect } from "../components/ui";
import { TN_DISTRICTS } from "../lib/constants";

interface Campaign {
  id: string;
  title: string;
  description?: string;
  venue: string;
  district: string;
  address?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  partnerType: string;
  hospitalName?: string;
  ngoName?: string;
  bloodBankName?: string;
  contactPerson?: string;
  contactPhone?: string;
  expectedDonors: number;
  collectedUnits: number;
  registeredDonors: number;
  status: string;
  imageUrl?: string;
  createdAt: string;
}

const PARTNER_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "ngo", label: "NGO" },
  { value: "blood_bank", label: "Blood Bank" },
  { value: "mixed", label: "Mixed Partnership" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  completed: "bg-blue-100 text-blue-700",
};

export function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);

  const emptyForm = {
    title: "", description: "", venue: "", district: "", address: "",
    startDate: "", endDate: "", startTime: "", endTime: "",
    partnerType: "hospital", hospitalName: "", ngoName: "", bloodBankName: "",
    contactPerson: "", contactPhone: "", expectedDonors: 0, imageUrl: "",
  };
  const [form, setForm] = useState<any>(emptyForm);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterDistrict) params.district = filterDistrict;
      const [data, analyticsData] = await Promise.all([
        api.campaigns(params),
        api.campaignAnalytics().catch(() => null),
      ]);
      setCampaigns(data);
      setAnalytics(analyticsData);
    } catch (e: any) {
      console.error("Failed to load campaigns:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus, filterDistrict]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({
      title: c.title || "", description: c.description || "", venue: c.venue || "",
      district: c.district || "", address: c.address || "",
      startDate: c.startDate ? c.startDate.slice(0, 16) : "",
      endDate: c.endDate ? c.endDate.slice(0, 16) : "",
      startTime: c.startTime || "", endTime: c.endTime || "",
      partnerType: c.partnerType || "hospital",
      hospitalName: c.hospitalName || "", ngoName: c.ngoName || "", bloodBankName: c.bloodBankName || "",
      contactPerson: c.contactPerson || "", contactPhone: c.contactPhone || "",
      expectedDonors: c.expectedDonors || 0, imageUrl: c.imageUrl || "",
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.title || !form.venue || !form.district || !form.startDate || !form.endDate) {
      alert("Please fill all required fields");
      return;
    }
    try {
      if (editing) {
        await api.updateCampaign(editing.id, form);
      } else {
        await api.createCampaign(form);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleAction(c: Campaign, action: "pause" | "resume" | "cancel" | "complete" | "delete") {
    if (action === "delete" && !confirm("Delete this campaign permanently?")) return;
    try {
      if (action === "pause") await api.pauseCampaign(c.id);
      else if (action === "resume") await api.resumeCampaign(c.id);
      else if (action === "cancel") await api.cancelCampaign(c.id);
      else if (action === "complete") {
        const collected = prompt("Collected units:", String(c.collectedUnits || 0));
        const registered = prompt("Registered donors:", String(c.registeredDonors || 0));
        await api.completeCampaign(c.id, { collectedUnits: Number(collected) || 0, registeredDonors: Number(registered) || 0 });
      } else if (action === "delete") await api.deleteCampaign(c.id);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const partnerIcon = (type: string) => {
    if (type === "hospital") return <Building2 className="h-3.5 w-3.5" />;
    if (type === "ngo") return <Heart className="h-3.5 w-3.5" />;
    if (type === "blood_bank") return <Droplet className="h-3.5 w-3.5" />;
    return <Users className="h-3.5 w-3.5" />;
  };

  const partnerLabel = (c: Campaign) => {
    if (c.partnerType === "hospital") return c.hospitalName || "Hospital";
    if (c.partnerType === "ngo") return c.ngoName || "NGO";
    if (c.partnerType === "blood_bank") return c.bloodBankName || "Blood Bank";
    return [c.hospitalName, c.ngoName, c.bloodBankName].filter(Boolean).join(" + ") || "Mixed";
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Blood Donation Campaigns</h2>
          <p className="text-sm text-slate-500">Manage campaigns from hospitals, NGOs & blood banks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart3 className="h-4 w-4" /> Analytics
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && analytics && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-800">{analytics.total}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-emerald-600">Active</p>
            <p className="text-2xl font-bold text-emerald-700">{analytics.active}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-amber-600">Paused</p>
            <p className="text-2xl font-bold text-amber-700">{analytics.paused}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-blue-600">Upcoming</p>
            <p className="text-2xl font-bold text-blue-700">{analytics.upcoming}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-slate-500">Expected Donors</p>
            <p className="text-2xl font-bold text-slate-800">{analytics.totalExpectedDonors}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-rose-600">Units Collected</p>
            <p className="text-2xl font-bold text-rose-700">{analytics.totalCollectedUnits}</p>
          </Card>

          {analytics.byDistrict?.length > 0 && (
            <Card className="col-span-2 md:col-span-4 p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Campaigns by District</h3>
              <div className="space-y-2">
                {analytics.byDistrict.map((d: any) => (
                  <div key={d.district} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{d.district}</span>
                    <div className="flex gap-4">
                      <span className="font-semibold text-slate-800">{d.cnt} campaigns</span>
                      <span className="text-slate-500">{d.expectedDonors || 0} expected</span>
                      <span className="text-rose-600">{d.collectedUnits || 0} units</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {analytics.byPartnerType?.length > 0 && (
            <Card className="col-span-2 md:col-span-2 p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">By Partner Type</h3>
              <div className="space-y-2">
                {analytics.byPartnerType.map((p: any) => (
                  <div key={p.partnerType} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-600">{p.partnerType.replace("_", " ")}</span>
                    <span className="font-semibold text-slate-800">{p.cnt}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {analytics.monthlyTrend?.length > 0 && (
            <Card className="col-span-2 md:col-span-6 p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Monthly Trend</h3>
              <div className="flex flex-wrap gap-3">
                {analytics.monthlyTrend.map((m: any) => (
                  <div key={m.month} className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                    <p className="text-xs text-slate-500">{m.month}</p>
                    <p className="text-lg font-bold text-slate-800">{m.cnt}</p>
                    <p className="text-xs text-rose-600">{m.collectedUnits || 0} units</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={filterDistrict}
          onChange={(e) => setFilterDistrict(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All Districts</option>
          {TN_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : campaigns.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No campaigns found. Create one to get started.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="overflow-hidden p-0">
              {c.imageUrl && (
                <img src={c.imageUrl} alt={c.title} className="h-32 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-800">{c.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[c.status] || "bg-slate-100"}`}>
                    {c.status}
                  </span>
                </div>
                {c.description && <p className="mb-2 text-xs text-slate-500 line-clamp-2">{c.description}</p>}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {c.venue}, {c.district}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</div>
                  {(c.startTime || c.endTime) && (
                    <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" /> {c.startTime} - {c.endTime}</div>
                  )}
                  <div className="flex items-center gap-2">{partnerIcon(c.partnerType)} {partnerLabel(c)}</div>
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-slate-400" /> {c.expectedDonors} expected · {c.registeredDonors} registered</div>
                  {c.collectedUnits > 0 && (
                    <div className="flex items-center gap-2"><Droplet className="h-3.5 w-3.5 text-rose-500" /> {c.collectedUnits} units collected</div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => openEdit(c)} className="rounded-md bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {c.status === "active" && (
                    <button onClick={() => handleAction(c, "pause")} className="rounded-md bg-amber-100 p-1.5 text-amber-600 hover:bg-amber-200" title="Pause">
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {c.status === "paused" && (
                    <button onClick={() => handleAction(c, "resume")} className="rounded-md bg-emerald-100 p-1.5 text-emerald-600 hover:bg-emerald-200" title="Resume">
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(c.status === "active" || c.status === "paused") && (
                    <>
                      <button onClick={() => handleAction(c, "complete")} className="rounded-md bg-blue-100 p-1.5 text-blue-600 hover:bg-blue-200" title="Complete">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleAction(c, "cancel")} className="rounded-md bg-rose-100 p-1.5 text-rose-600 hover:bg-rose-200" title="Cancel">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleAction(c, "delete")} className="rounded-md bg-slate-100 p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{editing ? "Edit Campaign" : "New Blood Donation Campaign"}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Campaign Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Annual Blood Donation Drive" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Campaign description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Venue *</label>
                  <input type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Rajaji Hall" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">District *</label>
                  <SearchableSelect
                    options={TN_DISTRICTS}
                    value={form.district}
                    onChange={(v) => setForm({ ...form, district: v })}
                    placeholder="Select district"
                    className="w-full rounded-lg border border-slate-300 text-sm h-10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Full address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start Date & Time *</label>
                  <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End Date & Time *</label>
                  <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start Time (display)</label>
                  <input type="text" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. 9:00 AM" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End Time (display)</label>
                  <input type="text" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. 5:00 PM" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Partner Type</label>
                <select value={form.partnerType} onChange={(e) => setForm({ ...form, partnerType: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {PARTNER_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {form.partnerType === "hospital" || form.partnerType === "mixed" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Name</label>
                    <input type="text" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Hospital" />
                  </div>
                ) : null}
                {form.partnerType === "ngo" || form.partnerType === "mixed" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">NGO Name</label>
                    <input type="text" value={form.ngoName} onChange={(e) => setForm({ ...form, ngoName: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="NGO" />
                  </div>
                ) : null}
                {form.partnerType === "blood_bank" || form.partnerType === "mixed" ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Blood Bank Name</label>
                    <input type="text" value={form.bloodBankName} onChange={(e) => setForm({ ...form, bloodBankName: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Blood Bank" />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Contact Person</label>
                  <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Contact name" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Contact Phone</label>
                  <input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Phone" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Expected Donors</label>
                  <input type="number" value={form.expectedDonors} onChange={(e) => setForm({ ...form, expectedDonors: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Image URL</label>
                  <input type="text" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>{editing ? "Update" : "Create"} Campaign</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
