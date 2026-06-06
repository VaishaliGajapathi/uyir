import { useNavigate } from "react-router-dom";
import { Droplet, MapPin, X, Clock } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { emergencyMeta } from "../lib/utils";

// Floating real-time alert shown to a donor when a matching request fires.
export function LiveAlertBanner() {
  const { liveAlert, dismissAlert } = useApp();
  const nav = useNavigate();
  if (!liveAlert) return null;
  const em = emergencyMeta[liveAlert.emergencyLevel] || emergencyMeta.orange;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-safe">
      <div className="mt-2 w-full max-w-md animate-slidein overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className={`flex items-center justify-between px-4 py-1.5 text-xs font-bold ${em.color}`}>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-2 w-2 animate-ping2 rounded-full bg-white/80" />
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            URGENT · {em.label}
          </span>
          <button onClick={dismissAlert}><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-uyir-50 text-lg font-extrabold text-uyir-700">
              {liveAlert.bloodGroup}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">
                {liveAlert.unitsRequired} unit(s) {liveAlert.componentType.replace("_", " ")}
              </p>
              <p className="flex items-center gap-1 truncate text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {liveAlert.hospitalName}, {liveAlert.district}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            {liveAlert.distanceKm != null && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{liveAlert.distanceKm} km</span>}
            {liveAlert.etaMinutes != null && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />~{liveAlert.etaMinutes} min</span>}
          </div>
          <button
            onClick={() => { dismissAlert(); nav("/nearby"); }}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-uyir-600 font-semibold text-white"
          >
            <Droplet className="h-4 w-4" /> View & Help
          </button>
        </div>
      </div>
    </div>
  );
}
