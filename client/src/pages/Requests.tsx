import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { api, type BloodRequest } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card, Button, Spinner } from "../components/ui";
import { emergencyMeta, statusMeta, timeAgo } from "../lib/utils";
import { BLOOD_GROUPS } from "../lib/constants";

export function Requests() {
  const nav = useNavigate();
  const { user } = useApp();
  const [list, setList] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [districts, setDistricts] = useState<string[]>([]);
  const [filters, setFilters] = useState<{ district?: string; bloodGroup?: string; componentType?: string }>({});

  async function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
    try { setList(await api.listRequests(params)); } finally { setLoading(false); }
  }

  useEffect(() => { api.districts().then(setDistricts).catch(() => {}); }, []);
  useEffect(() => { load(); }, [filters]);

  return (
    <div className="px-4 py-4">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-extrabold text-slate-800">Blood Requests</h1>
        <Button size="sm" onClick={() => nav("/new-request")}><Plus className="h-4 w-4" /> New</Button>
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Chip active={!filters.componentType} onClick={() => setFilters((f) => ({ ...f, componentType: undefined }))}>All</Chip>
        <Chip active={filters.componentType === "platelets"} onClick={() => setFilters((f) => ({ ...f, componentType: "platelets" }))}>Platelets</Chip>
        <Chip active={filters.componentType === "whole_blood"} onClick={() => setFilters((f) => ({ ...f, componentType: "whole_blood" }))}>Whole Blood</Chip>
        <select className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs"
          value={filters.bloodGroup || ""} onChange={(e) => setFilters((f) => ({ ...f, bloodGroup: e.target.value || undefined }))}>
          <option value="">Any group</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs"
          value={filters.district || ""} onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value || undefined }))}>
          <option value="">All districts</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : list.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center">
          <Filter className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">No requests match these filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const em = emergencyMeta[r.emergencyLevel] || emergencyMeta.orange;
            const sm = statusMeta[r.status];
            const isOwnRequest = r.createdById === user?.id;
            return (
              <Card key={r.id} className={`overflow-hidden ring-1 ${em.ring} ring-opacity-30`}>
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => nav(`/request/${r.id}`)}>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-uyir-50 text-xl font-extrabold text-uyir-700">{r.bloodGroup}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-slate-800">{r.patientName}</p>
                      {isOwnRequest && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">My request</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${em.color}`}>{em.label}</span>
                    </div>
                    <p className="truncate text-sm text-slate-500">{r.unitsRequired} unit(s) · {r.componentType.replace("_", " ")}</p>
                    <p className="truncate text-xs text-slate-400">{r.hospitalName}, {r.district} · {timeAgo(r.createdAt)}</p>
                  </div>
                </button>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
                  {sm && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sm.color}`}>{sm.label}</span>}
                  <span className="text-[11px] text-slate-400">{isOwnRequest ? "Visible to you" : user?.role === "donor" ? "Visible in your district" : `${r._count?.responses ?? 0} donors alerted`}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ active, children, onClick }: { active?: boolean; children: any; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold ${active ? "bg-uyir-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
      {children}
    </button>
  );
}
export default Requests;
