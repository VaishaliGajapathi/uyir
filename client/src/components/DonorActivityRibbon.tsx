import { useEffect, useState } from "react";
import { Droplet, MapPin, Clock } from "lucide-react";

interface DonorActivity {
  id: string;
  donorName: string;
  district: string;
  bloodGroup: string;
  timeAgo: string;
}

export function DonorActivityRibbon() {
  const [activities, setActivities] = useState<DonorActivity[]>([]);

  useEffect(() => {
    // Simulated donor activities - in production, this would come from an API
    const mockActivities: DonorActivity[] = [
      { id: "1", donorName: "Rajesh Kumar", district: "Coimbatore", bloodGroup: "O+", timeAgo: "Just now" },
      { id: "2", donorName: "Priya Lakshmi", district: "Chennai", bloodGroup: "A+", timeAgo: "5 min ago" },
      { id: "3", donorName: "Karthik Raja", district: "Madurai", bloodGroup: "B+", timeAgo: "12 min ago" },
      { id: "4", donorName: "Anitha Devi", district: "Trichy", bloodGroup: "AB+", timeAgo: "18 min ago" },
      { id: "5", donorName: "Suresh Babu", district: "Salem", bloodGroup: "O-", timeAgo: "25 min ago" },
      { id: "6", donorName: "Kavitha M", district: "Erode", bloodGroup: "A-", timeAgo: "32 min ago" },
      { id: "7", donorName: "Murali K", district: "Tiruppur", bloodGroup: "B-", timeAgo: "45 min ago" },
      { id: "8", donorName: "Lakshmi S", district: "Vellore", bloodGroup: "O+", timeAgo: "1 hour ago" },
    ];
    setActivities(mockActivities);
  }, []);

  return (
    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 overflow-hidden">
      <div className="flex items-center gap-2 animate-marquee whitespace-nowrap">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-3 px-6 border-r border-emerald-500/30">
            <Droplet className="h-4 w-4 text-emerald-200" />
            <span className="font-semibold">{activity.donorName}</span>
            <span className="text-emerald-200">from</span>
            <span className="font-semibold">{activity.district}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{activity.bloodGroup}</span>
            <span className="text-emerald-200 text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {activity.timeAgo}
            </span>
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {activities.map((activity) => (
          <div key={`dup-${activity.id}`} className="flex items-center gap-3 px-6 border-r border-emerald-500/30">
            <Droplet className="h-4 w-4 text-emerald-200" />
            <span className="font-semibold">{activity.donorName}</span>
            <span className="text-emerald-200">from</span>
            <span className="font-semibold">{activity.district}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{activity.bloodGroup}</span>
            <span className="text-emerald-200 text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {activity.timeAgo}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
