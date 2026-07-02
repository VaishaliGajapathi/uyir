import { useEffect, useState } from "react";
import { Megaphone, MapPin, Clock, Calendar, Users, Droplet, Building2, Heart, Share2, MessageCircle, Facebook, Instagram, Search } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card, Spinner, SearchableSelect } from "../components/ui";
import { TN_DISTRICTS } from "../lib/constants";

type FilterTab = "upcoming" | "all" | "district" | "past";

export default function Campaigns() {
  const { user, lang } = useApp();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("upcoming");
  const [selectedDistrict, setSelectedDistrict] = useState(user?.district || "");
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
    const url = `${window.location.origin}/campaigns`;
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
    if (type === "hospital") return <Building2 className="h-3.5 w-3.5" />;
    if (type === "ngo") return <Heart className="h-3.5 w-3.5" />;
    if (type === "blood_bank") return <Droplet className="h-3.5 w-3.5" />;
    return <Users className="h-3.5 w-3.5" />;
  };

  const partnerLabel = (c: any) => {
    if (c.partnerType === "hospital") return c.hospitalName || "Hospital";
    if (c.partnerType === "ngo") return c.ngoName || "NGO";
    if (c.partnerType === "blood_bank") return c.bloodBankName || "Blood Bank";
    return [c.hospitalName, c.ngoName, c.bloodBankName].filter(Boolean).join(" + ") || "Mixed";
  };

  const tabs: { id: FilterTab; label: string; labelTa: string }[] = [
    { id: "upcoming", label: "Upcoming", labelTa: "வரவிருக்கும்" },
    { id: "all", label: "All", labelTa: "அனைத்தும்" },
    { id: "district", label: "In Your District", labelTa: "உங்கள் மாவட்டம்" },
    { id: "past", label: "Past", labelTa: "முன்னைய" },
  ];

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uyir-50">
          <Megaphone className="h-5 w-5 text-uyir-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {lang === "ta" ? "இரத்த தான முகாம்கள்" : "Blood Donation Campaigns"}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === "ta" ? "உயிர் காக்க கலந்துகொள்ளுங்கள்" : "Join and save lives"}
          </p>
        </div>
      </div>

      {/* Tab Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-uyir-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {lang === "ta" ? tab.labelTa : tab.label}
          </button>
        ))}
      </div>

      {/* District filter for district tab */}
      {activeTab === "district" && (
        <div className="flex items-center gap-2">
          <SearchableSelect
            options={TN_DISTRICTS}
            value={selectedDistrict}
            onChange={(v) => setSelectedDistrict(v)}
            placeholder={lang === "ta" ? "உங்கள் மாவட்டம்" : "Select district"}
            className="flex-1 rounded-lg border border-slate-300 text-sm h-11"
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={lang === "ta" ? "முகாம்களைத் தேடவும்" : "Search campaigns..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-uyir-500 focus:outline-none"
        />
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          {lang === "ta" ? "முகாம்கள் இல்லை" : "No campaigns found"}
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <Card key={c.id} className="overflow-hidden p-0">
              {c.imageUrl && (
                <img src={c.imageUrl} alt={c.title} className="h-36 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-800">{c.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    c.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    c.status === "paused" ? "bg-amber-100 text-amber-700" :
                    c.status === "completed" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {c.status}
                  </span>
                </div>

                {c.description && <p className="mb-3 text-sm text-slate-600">{c.description}</p>}

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
                      <span>{c.expectedDonors} {lang === "ta" ? "எதிர்பார்க்கப்படும் தானதாரர்கள்" : "expected donors"}</span>
                    </div>
                  )}
                  {c.collectedUnits > 0 && (
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-rose-500" />
                      <span>{c.collectedUnits} {lang === "ta" ? "அலகுகள் சேகரிக்கப்பட்டன" : "units collected"}</span>
                    </div>
                  )}
                  {c.contactPhone && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-uyir-500" />
                      <a href={`tel:${c.contactPhone}`} className="text-uyir-600 hover:underline">{c.contactPhone}</a>
                    </div>
                  )}
                </div>

                {/* Share Buttons */}
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-medium text-slate-500">
                    {lang === "ta" ? "பகிர்:" : "Share:"}
                  </span>
                  <button
                    onClick={() => shareCampaign(c, "whatsapp")}
                    className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                  <button
                    onClick={() => shareCampaign(c, "facebook")}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Facebook className="h-3.5 w-3.5" /> Facebook
                  </button>
                  <button
                    onClick={() => shareCampaign(c, "instagram")}
                    className="flex items-center gap-1 rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 hover:bg-pink-100 transition"
                  >
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </button>
                  <button
                    onClick={() => shareCampaign(c, "copy")}
                    className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
