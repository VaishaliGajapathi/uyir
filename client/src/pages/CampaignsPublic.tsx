import { useEffect, useState } from "react";
import { Megaphone, MapPin, Clock, Calendar, Users, Droplet, Building2, Heart, Share2, MessageCircle, Facebook, Instagram, Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { SiteFooter } from "../components/SiteFooter";
import { SiteNav } from "../components/SiteNav";
import { SearchableSelect } from "../components/ui";
import { TN_DISTRICTS } from "../lib/constants";

type FilterTab = "upcoming" | "all" | "district" | "past";

export default function CampaignsPublic() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("upcoming");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCampaigns();
  }, [activeTab, selectedDistrict]);

  async function loadCampaigns() {
    setLoading(true);
    try {
      let data: any[] = [];
      if (activeTab === "upcoming") data = await api.upcomingCampaigns();
      else if (activeTab === "past") data = await api.pastCampaigns();
      else if (activeTab === "district" && selectedDistrict) data = await api.districtCampaigns(selectedDistrict);
      else data = await api.campaigns();
      setCampaigns(data);
    } catch (e: any) {
      console.error("Failed to load campaigns:", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = searchQuery
    ? campaigns.filter((c) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.district?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : campaigns;

  function shareCampaign(c: any, platform: "whatsapp" | "facebook" | "instagram" | "copy") {
    const url = `${window.location.origin}/campaigns-public`;
    const text = `🩸 Blood Donation Campaign: ${c.title}\n📍 Venue: ${c.venue}, ${c.district}\n📅 ${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}\n${c.startTime ? "⏰ " + c.startTime + " - " + c.endTime : ""}\n\nJoin and save lives! Register on UYIR.\n${url}`;

    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, "_blank");
    } else if (platform === "instagram") {
      navigator.clipboard?.writeText(text);
      window.open("https://www.instagram.com/", "_blank");
    } else if (platform === "copy") {
      navigator.clipboard?.writeText(text);
      alert("Campaign details copied to clipboard!");
    }
  }

  const partnerIcon = (type: string) => {
    if (type === "hospital") return <Building2 className="h-4 w-4" />;
    if (type === "ngo") return <Heart className="h-4 w-4" />;
    if (type === "blood_bank") return <Droplet className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  const partnerLabel = (c: any) => {
    if (c.partnerType === "hospital") return c.hospitalName || "Hospital";
    if (c.partnerType === "ngo") return c.ngoName || "NGO";
    if (c.partnerType === "blood_bank") return c.bloodBankName || "Blood Bank";
    return [c.hospitalName, c.ngoName, c.bloodBankName].filter(Boolean).join(" + ") || "Mixed";
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "all", label: "All" },
    { id: "district", label: "By District" },
    { id: "past", label: "Past" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SiteNav />
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-uyir-600 to-uyir-700 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Megaphone className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">Blood Donation Campaigns</h1>
          <p className="text-xl text-uyir-100 mb-2">உயிர் - Join a Blood Drive Near You</p>
          <p className="text-lg text-uyir-200 max-w-3xl mx-auto">
            Discover upcoming blood donation camps organized by hospitals, NGOs, and blood banks across Tamil Nadu
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-uyir-600 text-white shadow-lg shadow-uyir-600/30"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* District filter */}
        {activeTab === "district" && (
          <div className="mb-6 max-w-sm">
            <SearchableSelect
              options={TN_DISTRICTS}
              value={selectedDistrict}
              onChange={(v) => setSelectedDistrict(v)}
              placeholder="Select district"
              className="w-full rounded-lg border border-slate-300 text-sm h-12"
            />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-uyir-500 focus:outline-none"
          />
        </div>

        {/* Campaigns */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-uyir-200 border-t-uyir-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-400 shadow-lg">
            <Megaphone className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg">No campaigns found. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-lg border border-slate-100">
                {c.imageUrl && (
                  <img src={c.imageUrl} alt={c.title} className="h-40 w-full object-cover" />
                )}
                <div className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-800">{c.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                      c.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      c.status === "paused" ? "bg-amber-100 text-amber-700" :
                      c.status === "completed" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {c.description && <p className="mb-3 text-sm text-slate-600 line-clamp-2">{c.description}</p>}

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-uyir-500" />
                      <span>{c.venue}, {c.district}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-uyir-500" />
                      <span>{new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</span>
                    </div>
                    {(c.startTime || c.endTime) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-uyir-500" />
                        <span>{c.startTime} - {c.endTime}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {partnerIcon(c.partnerType)}
                      <span>{partnerLabel(c)}</span>
                    </div>
                    {c.expectedDonors > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-uyir-500" />
                        <span>{c.expectedDonors} expected donors</span>
                      </div>
                    )}
                    {c.collectedUnits > 0 && (
                      <div className="flex items-center gap-2">
                        <Droplet className="h-4 w-4 text-rose-500" />
                        <span>{c.collectedUnits} units collected</span>
                      </div>
                    )}
                    {c.contactPhone && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-uyir-500" />
                        <a href={`tel:${c.contactPhone}`} className="text-uyir-600 hover:underline">{c.contactPhone}</a>
                      </div>
                    )}
                  </div>

                  {/* Share */}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <span className="text-xs font-medium text-slate-500">Share:</span>
                    <button onClick={() => shareCampaign(c, "whatsapp")}
                      className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </button>
                    <button onClick={() => shareCampaign(c, "facebook")}
                      className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition">
                      <Facebook className="h-3.5 w-3.5" /> Facebook
                    </button>
                    <button onClick={() => shareCampaign(c, "instagram")}
                      className="flex items-center gap-1 rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 hover:bg-pink-100 transition">
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-uyir-600 to-uyir-700 p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Ready to Donate?</h2>
          <p className="text-uyir-100 mb-6">Sign up on UYIR to get notified about campaigns near you</p>
          <button
            onClick={() => navigate("/")}
            className="bg-white text-uyir-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-slate-100 transition inline-flex items-center gap-2"
          >
            Sign Up Now <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
