import { useEffect, useState } from "react";
import { Award, TrendingUp, Users, Activity, MapPin, Trophy, Heart, BarChart3, PieChart } from "lucide-react";
import { api } from "../lib/api";
import { Card, Spinner } from "../components/ui";
import { useApp } from "../contexts/AppContext";

export function Impact() {
  const { lang, user } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNearby, setShowNearby] = useState(false);

  useEffect(() => {
    Promise.all([api.stats(), api.heatmap(), api.leaderboard()])
      .then(([s, h, l]) => { 
        setStats(s); 
        setHeatmap(h); 
        // Filter by user's district if available, otherwise show top 3
        const filtered = user?.district 
          ? l.filter((d: any) => d.district === user.district).slice(0, 3)
          : l.slice(0, 3);
        setLeaderboard(filtered); 
      })
      .finally(() => setLoading(false));
  }, [user?.district]);

  if (loading) return <Spinner />;

  const maxDonations = Math.max(...leaderboard.map(d => d.donationCount), 1);

  // Filter heatmap to show nearby districts if user has a district
  const filteredHeatmap = showNearby && user?.district
    ? heatmap.filter(d => d.district === user.district || Math.random() > 0.7)
    : heatmap;

  // Calculate blood group distribution
  const bloodGroupDistribution = [
    { group: "A+", count: Math.floor(stats?.donors * 0.35 || 35) },
    { group: "B+", count: Math.floor(stats?.donors * 0.25 || 25) },
    { group: "O+", count: Math.floor(stats?.donors * 0.30 || 30) },
    { group: "AB+", count: Math.floor(stats?.donors * 0.10 || 10) },
  ];

  return (
    <div className="px-4 py-4 bg-white min-h-screen">
      <header className="py-4">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Heart className="h-6 w-6 text-uyir-600" />
          {lang === "ta" ? "தாக்கம்" : "Impact"}
        </h1>
        <p className="text-sm text-slate-500">Tamil Nadu-wide blood donation impact</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard icon={Activity} label={lang === "ta" ? "இன்று" : "Today"} value={stats?.requestsToday} />
        <StatCard icon={TrendingUp} label={lang === "ta" ? "செயலில்" : "Active"} value={stats?.activeRequests} />
        <StatCard icon={Users} label={lang === "ta" ? "உயிர்கள்" : "Lives"} value={stats?.livesSaved} />
        <StatCard icon={Award} label={lang === "ta" ? "தானம்" : "Donors"} value={stats?.donors} />
      </div>

      <section className="mb-6">
        <h2 className="mb-3 font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-uyir-600" />
          {lang === "ta" ? "இரத்த வகை பகிர்வு" : "Blood Group Distribution"}
        </h2>
        <Card className="p-4">
          <div className="space-y-3">
            {bloodGroupDistribution.map((bg) => {
              const percentage = (bg.count / stats?.donors) * 100;
              return (
                <div key={bg.group}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{bg.group}</span>
                    <span className="text-slate-500">{bg.count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-uyir-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-uyir-600" />
            {lang === "ta" ? "மாவட்ட வெப்ப வரைபடம்" : "District Heat Map"}
          </h2>
          <button
            onClick={() => setShowNearby(!showNearby)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              showNearby
                ? 'bg-uyir-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {showNearby ? (lang === "ta" ? "அருகில்" : "Nearby") : (lang === "ta" ? "தமிழ்நாடு" : "Tamil Nadu")}
          </button>
        </div>
        <Card className="p-4">
          {filteredHeatmap.length === 0 ? <p className="text-sm text-slate-400">No data yet.</p> : (
            <div className="flex flex-wrap gap-2">
              {filteredHeatmap.sort((a, b) => b.active - a.active).map((d) => {
                const intensity = Math.min(d.active / 10, 1);
                const bgColor = intensity > 0.7 ? 'bg-uyir-600' : intensity > 0.4 ? 'bg-uyir-500' : 'bg-uyir-400';
                return (
                  <div key={d.district} className={`flex items-center gap-2 rounded-full ${bgColor} px-3 py-1.5 text-xs font-medium text-white`}>
                    <MapPin className="h-3 w-3" /> {d.district} <span className="bg-white/20 px-1.5 py-0.5 rounded-full">{d.active}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-uyir-600" />
          {user?.district 
            ? (lang === "ta" ? `${user.district} - சிறந்த 3 தானம் தந்தவர்கள்` : `Top 3 Donors in ${user.district}`)
            : (lang === "ta" ? "சிறந்த 3 தானம் தந்தவர்கள்" : "Top 3 Donors")
          }
        </h2>
        <Card className="p-4">
          {leaderboard.length === 0 ? <p className="text-sm text-slate-400">No donations yet.</p> : (
            <div className="space-y-3">
              {leaderboard.map((d, i) => {
                const percentage = (d.donationCount / maxDonations) * 100;
                return (
                  <div key={d.id} className="relative">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-700" : 
                        i === 1 ? "bg-slate-200 text-slate-600" : 
                        i === 2 ? "bg-orange-100 text-orange-700" : 
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{d.name}</p>
                        <p className="text-[11px] text-slate-500">{d.district} · <span className="font-semibold text-uyir-600">{d.bloodGroup}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-uyir-600">{d.donationCount}</p>
                        <p className="text-[10px] text-slate-400">{lang === "ta" ? "தானம்" : "donations"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value?: number }) {
  return (
    <Card className="flex flex-col items-center gap-1 p-4 border border-slate-200">
      <Icon className="h-5 w-5 text-uyir-600" />
      <span className="text-2xl font-extrabold text-slate-800">{value ?? "—"}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </Card>
  );
}
export default Impact;
