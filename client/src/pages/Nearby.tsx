import { useEffect, useState } from "react";
import { Radar, MapPin, Clock, Check, X, Navigation, Droplet } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Spinner } from "../components/ui";
import { emergencyMeta } from "../lib/utils";

export function Nearby() {
  const { user, refreshUser } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [requests, alerts] = await Promise.all([
        api.listRequests(),
        api.myAlerts(),
      ]);

      const alertByRequestId = new Map(alerts.map((a: any) => [a.requestId || a.request?.id, a]));

      const merged = requests.map((request: any) => {
        const existingAlert = alertByRequestId.get(request.id);
        return {
          id: existingAlert?.id || request.id,
          request,
          status: existingAlert?.status || "available",
          matchScore: existingAlert?.matchScore ?? null,
          distanceKm: existingAlert?.distanceKm ?? null,
          etaMinutes: existingAlert?.etaMinutes ?? null,
          responseId: existingAlert?.id ?? null,
        };
      });

      const completedAlerts = alerts
        .filter((a: any) => a.status === "completed" && !merged.some((m: any) => m.responseId === a.id))
        .map((a: any) => ({
          id: a.id,
          request: a.request,
          status: a.status,
          matchScore: a.matchScore ?? null,
          distanceKm: a.distanceKm ?? null,
          etaMinutes: a.etaMinutes ?? null,
          responseId: a.id,
        }));

      setItems([...merged, ...completedAlerts]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

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

  const active = items.filter((a) => !["declined", "completed"].includes(a.status));
  const done = items.filter((a) => a.status === "completed");

  return (
    <div className="px-4 py-4">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Radar className="h-6 w-6 text-uyir-600" />
          <h1 className="text-xl font-extrabold text-slate-800">Blood Radar</h1>
        </div>
        <span className="text-xs text-slate-400">{active.length} live</span>
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
          <p className="font-medium text-slate-500">No live requests for you right now</p>
          <p className="text-sm text-slate-400">We'll alert you when {user?.bloodGroup || "your blood type"} is needed nearby.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((a) => {
            const r = a.request;
            const em = emergencyMeta[r.emergencyLevel] || emergencyMeta.orange;
            return (
              <Card key={a.id} className={`overflow-hidden ring-2 ${em.ring} ring-opacity-40`}>
                <div className={`flex items-center justify-between px-4 py-1.5 text-xs font-bold ${em.color}`}>
                  <span>URGENT · {em.label}</span>
                  <span className="font-semibold">{a.matchScore != null ? `match ${a.matchScore}` : "nearby"}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-uyir-50 text-xl font-extrabold text-uyir-700">{r.bloodGroup}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800">{r.unitsRequired} unit(s) · {r.componentType.replace("_", " ")}</p>
                      <p className="flex items-center gap-1 truncate text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" /> {r.hospitalName}, {r.district}</p>
                      <div className="mt-0.5 flex gap-3 text-[11px] text-slate-400">
                        {a.distanceKm != null && <span>{a.distanceKm} km away</span>}
                        {a.etaMinutes != null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{a.etaMinutes} min</span>}
                      </div>
                    </div>
                  </div>

                  {a.status === "available" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button loading={busy === a.id} onClick={() => act(a.id, () => api.acceptRequestAsDonor(r.id))}><Check className="h-4 w-4" /> I can donate</Button>
                      <Button variant="outline" loading={busy === a.id} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${r.hospitalName}, ${r.district}`)}`, "_blank")}><Navigation className="h-4 w-4" /> Navigate</Button>
                    </div>
                  )}
                  {a.status === "alerted" && a.responseId && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button loading={busy === a.id} onClick={() => act(a.id, () => api.acceptResponse(a.responseId))}><Check className="h-4 w-4" /> Accept</Button>
                      <Button variant="outline" loading={busy === a.id} onClick={() => act(a.id, () => api.declineResponse(a.responseId))}><X className="h-4 w-4" /> Decline</Button>
                    </div>
                  )}
                  {a.status === "accepted" && a.responseId && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <span>You accepted · contact {r.contactPerson}</span>
                        <a href={`tel:${r.contactNumber}`} className="font-bold underline">Call</a>
                      </div>
                      <Button className="w-full" loading={busy === a.id} onClick={() => act(a.id, async () => { const res = await api.completeResponse(a.responseId); if (res.newBadge) alert(`Donation complete! New badge: ${res.newBadge}`); })}>
                        <Droplet className="h-4 w-4" /> Mark donation complete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <p className="mt-5 text-center text-sm text-emerald-600">{done.length} donation(s) completed. Thank you for saving lives. 🩸</p>
      )}
    </div>
  );
}
export default Nearby;
