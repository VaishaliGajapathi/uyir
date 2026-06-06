import { useEffect, useState } from "react";
import { Award, TrendingUp, Users, Activity, MapPin, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { Card, Spinner } from "../components/ui";
import { useApp } from "../contexts/AppContext";

export function Impact() {
  const { lang } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats(), api.heatmap(), api.leaderboard()])
      .then(([s, h, l]) => { setStats(s); setHeatmap(h); setLeaderboard(l); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="px-4 py-4">
      <header className="py-4">
        <h1 className="text-xl font-extrabold text-slate-800">{lang === "ta" ? "தாக்கம்" : "Impact"}</h1>
        <p className="text-sm text-slate-500">Tamil Nadu-wide blood donation impact</p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stat icon={Activity} label={lang === "ta" ? "இன்று" : "Today"} value={stats?.requestsToday} />
        <Stat icon={TrendingUp} label={lang === "ta" ? "செயலில்" : "Active"} value={stats?.activeRequests} />
        <Stat icon={Users} label={lang === "ta" ? "உயிர்கள்" : "Lives"} value={stats?.livesSaved} />
        <Stat icon={Award} label={lang === "ta" ? "தானம்" : "Donors"} value={stats?.donors} />
      </div>

      <section className="mb-5">
        <h2 className="mb-2 font-bold text-slate-800">District heat map</h2>
        <Card className="p-3">
          {heatmap.length === 0 ? <p className="text-sm text-slate-400">No data yet.</p> : (
            <div className="flex flex-wrap gap-2">
              {heatmap.map((d) => (
                <div key={d.district} className="flex items-center gap-1.5 rounded-full bg-uyir-50 px-2.5 py-1 text-xs font-medium text-uyir-700">
                  <MapPin className="h-3 w-3" /> {d.district} <span className="text-uyir-500">({d.active})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 font-bold text-slate-800">Top donors</h2>
        <Card className="p-3">
          {leaderboard.length === 0 ? <p className="text-sm text-slate-400">No donations yet.</p> : (
            <div className="space-y-2">
              {leaderboard.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"}`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700">{d.name}</p>
                    <p className="text-[11px] text-slate-400">{d.district} · {d.bloodGroup}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-uyir-600">{d.donationCount}</p>
                    <p className="text-[10px] text-slate-400">donations</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value?: number }) {
  return (
    <Card className="flex flex-col items-center gap-1 py-3">
      <Icon className="h-5 w-5 text-uyir-600" />
      <span className="text-xl font-extrabold text-slate-800">{value ?? "—"}</span>
      <span className="text-[11px] text-slate-500">{label}</span>
    </Card>
  );
}
export default Impact;
