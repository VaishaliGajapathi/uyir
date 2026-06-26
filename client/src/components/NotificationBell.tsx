import { useState, useEffect } from "react";
import { Bell, BellRing, X, Droplet, MapPin, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { api } from "../lib/api";
import { Sheet } from "./ui";
import { emergencyMeta, timeAgo } from "../lib/utils";
import { cn } from "../lib/utils";

interface AlertItem {
  id: string;
  requestId: string;
  bloodGroup: string;
  hospitalName: string;
  district: string;
  emergencyLevel: string;
  unitsRequired: number;
  componentType: string;
  status: string;
  createdAt: string;
  distanceKm?: number;
  etaMinutes?: number;
}

const responseStatusLabels: Record<string, { en: string; ta: string }> = {
  accepted: { en: "Accepted", ta: "ஏற்றுக்கொள்ளப்பட்டது" },
  declined: { en: "Declined", ta: "மறுக்கப்பட்டது" },
  arrived: { en: "Arrived", ta: "வந்துவிட்டது" },
  completed: { en: "Completed", ta: "முடிந்தது" },
  pending: { en: "Pending", ta: "நிலுவையில்" },
};

export function NotificationBell() {
  const { liveAlert, dismissAlert, lang, user } = useApp();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (!user) return null;

  const unreadCount = liveAlert ? 1 : 0;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.myAlerts()
      .then((r) => {
        const mapped: AlertItem[] = r.map((resp: any) => ({
          id: resp.id,
          requestId: resp.requestId,
          bloodGroup: resp.bloodGroup,
          hospitalName: resp.hospitalName,
          district: resp.district,
          emergencyLevel: resp.emergencyLevel,
          unitsRequired: resp.unitsRequired,
          componentType: resp.componentType,
          status: resp.status,
          createdAt: resp.createdAt,
          distanceKm: resp.distanceKm,
          etaMinutes: resp.etaMinutes,
        }));
        setAlerts(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleViewLive = () => {
    setOpen(false);
    dismissAlert();
    nav("/nearby");
  };

  const handleViewHistory = (alert: AlertItem) => {
    setOpen(false);
    if (liveAlert && liveAlert.requestId === alert.requestId) {
      dismissAlert();
    }
    nav(`/request/${alert.requestId}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-uyir-600" />
        ) : (
          <Bell className="h-5 w-5 text-slate-500" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-uyir-600 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            {lang === "ta" ? "அறிவிப்புகள்" : "Notifications"}
          </h2>
          <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {/* Live Alert */}
          {liveAlert && (
            <div className="mb-4 rounded-2xl bg-uyir-50 p-4 ring-1 ring-uyir-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-2 w-2 animate-ping rounded-full bg-uyir-600" />
                  <span className="h-2 w-2 rounded-full bg-uyir-600" />
                </span>
                <span className="text-xs font-bold text-uyir-700">
                  {lang === "ta" ? "உடனடி அறிவிப்பு" : "LIVE ALERT"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uyir-100 text-sm font-bold text-uyir-700">
                  {liveAlert.bloodGroup}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {liveAlert.unitsRequired} unit(s) {liveAlert.componentType.replace("_", " ")}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {liveAlert.hospitalName}, {liveAlert.district}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                {liveAlert.distanceKm != null && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{liveAlert.distanceKm} km
                  </span>
                )}
                {liveAlert.etaMinutes != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />~{liveAlert.etaMinutes} min
                  </span>
                )}
              </div>
              <button
                onClick={handleViewLive}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-uyir-600 font-semibold text-white text-sm"
              >
                <Droplet className="h-4 w-4" /> {lang === "ta" ? "காண்க & உதவி" : "View & Help"}
              </button>
            </div>
          )}

          {/* Alert History */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-500">
              {lang === "ta" ? "முந்தைய அறிவிப்புகள்" : "Alert History"}
            </h3>
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">
                {lang === "ta" ? "ஏற்றுகிறது..." : "Loading..."}
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                {lang === "ta" ? "அறிவிப்புகள் இல்லை" : "No alerts yet"}
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => {
                  const em = emergencyMeta[alert.emergencyLevel] || emergencyMeta.orange;
                  const statusLabel = responseStatusLabels[alert.status] || responseStatusLabels.pending;
                  return (
                    <button
                      key={alert.id}
                      onClick={() => handleViewHistory(alert)}
                      className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-slate-100 hover:bg-slate-50 transition"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uyir-50 text-sm font-bold text-uyir-700">
                        {alert.bloodGroup}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800">
                          {alert.unitsRequired} unit(s) {alert.componentType.replace("_", " ")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {alert.hospitalName}, {alert.district}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", em.color)}>
                            {em.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {statusLabel[lang]}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {timeAgo(alert.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}
