import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Radio, MapPin, Flag, X, Clock, ShieldCheck, ChevronsUp, Share2, Navigation, UserCheck, Droplet, Star, Heart, MessageSquare, Award } from "lucide-react";
import { api, type BloodRequest, type DonationRating } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Spinner, Sheet, Badge } from "../components/ui";
import { emergencyMeta, statusMeta, timeAgo } from "../lib/utils";
import { MapView } from "../components/MapView";
import { DonationCertificate } from "../components/DonationCertificate";
import { requestUrl, nativeShare, shareWhatsApp, shareFacebook, shareInstagram } from "../lib/share";

export function RequestDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useApp();
  const [r, setR] = useState<BloodRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [testimonial, setTestimonial] = useState("");
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [donorLocation, setDonorLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);

  async function load() {
    if (!id) return;
    try { 
      console.log("Loading request with ID:", id);
      const data = await api.getRequest(id);
      console.log("Request data loaded:", data);
      setR(data); 
    } catch (e: any) {
      console.error("Failed to load request:", e);
      alert("Failed to load request: " + e.message);
    } finally { 
      setLoading(false); 
    }
  }
  useEffect(() => { load(); }, [id]);

  // Live updates for this request via SSE.
  useEffect(() => {
    if (!id) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${location.origin}/api/stream/request/${id}`);
      es.addEventListener("update", () => {
        console.log("SSE update received, reloading request");
        load();
      });
      es.onerror = (e) => {
        console.error("SSE error:", e);
        if (es) {
          es.close();
          es = null;
        }
      };
    } catch (e) {
      console.error("Failed to create SSE connection:", e);
    }
    return () => {
      if (es) es.close();
    };
  }, [id]);

  // Start GPS tracking when donor starts navigation
  useEffect(() => {
    if (!r) return;
    const myResponse = (r.responses || []).find((x: any) => x.donorId === user?.id);
    if (!myResponse || myResponse.status !== "accepted" || !myResponse.navigationStarted) {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        setLocationWatchId(null);
      }
      return;
    }

    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setDonorLocation({ lat: latitude, lng: longitude });
        try {
          await api.updateLocation(myResponse.id, latitude, longitude);
        } catch (e) {
          console.error("Failed to update location:", e);
        }
      },
      (err) => console.log("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    setLocationWatchId(watchId);

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [r, user?.id, locationWatchId]);

  if (loading) return <Spinner />;
  if (!r) return <div className="p-10 text-center text-slate-400">Request not found.</div>;

  const em = emergencyMeta[r.emergencyLevel] || emergencyMeta.orange;
  const sm = statusMeta[r.status];
  const canShareRequest = ["verified", "alert_sent", "donor_accepted", "completed", "life_saved"].includes(r.status);
  const canManageRequest = ["verified", "alert_sent", "donor_accepted"].includes(r.status);
  const isOwner = r.createdById === user?.id || user?.role === "admin" || user?.role === "verifier" || user?.role === "ngo" || user?.role === "blood_bank" || user?.role === "hospital" || user?.role === "super_admin";
  const isDonor = user?.role === "donor" && r.createdById !== user?.id;
  const accepted = (r.responses || []).filter((x: any) => ["accepted", "arrived", "completed"].includes(x.status));
  const myResponse = (r.responses || []).find((x: any) => x.donorId === user?.id);

  async function act(fn: () => Promise<any>, msg?: string) {
    setBusy(true);
    try { await fn(); await load(); if (msg) alert(msg); } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function submitReport() {
    if (!reportText.trim()) return;
    setBusy(true);
    try {
      const res: any = await api.report({ againstUserId: user?.id, requestId: r!.id, reason: reportText });
      alert(res.ai?.flagged ? `Report filed. AI flagged: ${res.ai.category} (${res.ai.confidence}%).` : "Report filed for review.");
      setReportOpen(false); setReportText("");
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function markLifeSaved(responseId: string) {
    setBusy(true);
    try {
      await api.markLifeSaved(responseId);
      await load();
      alert("Thank you for confirming! The donor will receive an appreciation message.");
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function submitRating() {
    if (!selectedResponseId || rating < 1) return;
    setBusy(true);
    try {
      await api.rateDonor(selectedResponseId, { rating, testimonial });
      setRatingOpen(false);
      setRating(0);
      setTestimonial("");
      setSelectedResponseId(null);
      await load();
      alert("Thank you for your feedback!");
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  function buildShareMessage(includeComponent = false) {
    if (!r) return "";
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const componentLine = includeComponent ? `\nComponent: ${r.componentType.replace("_", " ")}\nUnits: ${r.unitsRequired}` : "";
    return `🚨 UYIR Verified Emergency — ${timestamp} IST\n\nPatient: ${r.patientName}\nBlood Group: ${r.bloodGroup}${componentLine}\nHospital: ${r.hospitalName}, ${r.district}\nContact: ${r.contactNumber}\n\n✅ Verified by UYIR AI + Hospital\n📱 Open UYIR: ${requestUrl(r.id, "accept")}\n\nPlease share with eligible donors. Every drop counts! 🙏\n\n#UYIR #TamilNadu #BloodDonation`;
  }

  async function shareToWhatsApp() {
    if (!r) return;
    const message = buildShareMessage(true);
    if (await nativeShare({ title: "UYIR Blood Request", text: message, url: requestUrl(r.id, "accept") })) return;
    shareWhatsApp(message);
  }

  async function shareToInstagram() {
    if (!r) return;
    await shareInstagram(buildShareMessage());
  }

  async function shareToFacebook() {
    if (!r) return;
    const message = buildShareMessage();
    if (await nativeShare({ title: "UYIR Blood Request", text: message, url: requestUrl(r.id, "accept") })) return;
    shareFacebook(requestUrl(r.id, "accept"), message);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={`${em.color} px-4 pb-5 pt-safe`}>
        <div className="flex items-center justify-between py-3">
          <button onClick={() => nav(-1)}><ArrowLeft className="h-6 w-6" /></button>
          <span className="text-sm font-bold uppercase tracking-wide">{em.label}</span>
          <button onClick={() => setReportOpen(true)}><Flag className="h-5 w-5" /></button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold backdrop-blur">{r.bloodGroup}</div>
          <div>
            <h1 className="text-xl font-extrabold">{r.patientName}</h1>
            <p className="text-sm text-white/85">{r.unitsRequired} unit(s) · {r.componentType.replace("_", " ")}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        <Card className="space-y-3 p-4">
          {sm && <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sm.color}`}>{sm.label}</span>}
          <Row icon={MapPin} label="Hospital" value={`${r.hospitalName}, ${r.district}`} />
          <Row icon={ShieldCheck} label="Verification" value={`${r.verificationScore}% ${r.verificationNotes ? "· " + r.verificationNotes : ""}`} />
          <Row icon={Radio} label="Alert radius" value={r.alertRadiusKm >= 9999 ? "Entire Tamil Nadu" : `${r.alertRadiusKm} km`} />
          <Row icon={Clock} label="Created" value={`${new Date(r.createdAt).toLocaleString()} (${timeAgo(r.createdAt)})`} />
        </Card>

        {!showContact ? (
          <Button variant="soft" className="w-full" onClick={() => setShowContact(true)}>
            <Phone className="h-4 w-4" /> Reveal contact (logged for safety)
          </Button>
        ) : (
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-slate-500">{r.contactPerson}</p>
              <p className="text-lg font-bold text-slate-800">{r.contactNumber}</p>
            </div>
            <a href={`tel:${r.contactNumber}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"><Phone className="h-5 w-5" /></a>
          </Card>
        )}

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Share this request</p>
          <div className="flex gap-3">
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={shareToWhatsApp}
              disabled={!canShareRequest}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.417-.074-.128-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={shareToInstagram}
              disabled={!canShareRequest}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </button>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={shareToFacebook}
              disabled={!canShareRequest}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canShareRequest}
              onClick={async () => {
                const message = buildShareMessage();
                if (await nativeShare({ title: "UYIR Blood Request", text: message, url: requestUrl(r.id, "accept") })) return;
                try { await navigator.clipboard.writeText(message); } catch { /* noop */ }
                alert("Message copied! Share with donors to help them navigate to the app and login.");
              }}
            >
              <Share2 className="h-6 w-6" />
            </button>
          </div>
          {!canShareRequest && (
            <p className="text-xs text-slate-400">Share buttons will be enabled after UYIR team verification</p>
          )}
        </div>

        <MapView hospitalAddress={`${r.hospitalName}, ${r.district}`} hospitalLat={r.lat} hospitalLng={r.lng} showNavigation={false} />

        {isDonor && canManageRequest && !["completed", "closed"].includes(r.status) && !myResponse && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full"
              variant="outline"
              loading={busy}
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${r.hospitalName}, ${r.district}`)}`, "_blank")}
            >
              <Navigation className="h-4 w-4" /> Navigate
            </Button>
            <Button
              className="w-full"
              loading={busy}
              onClick={() => act(() => api.acceptRequestAsDonor(r.id), "Response submitted! You'll be contacted.")}
            >
              <Droplet className="h-4 w-4" /> I can donate
            </Button>
          </div>
        )}

        {isDonor && canManageRequest && !["completed", "closed"].includes(r.status) && myResponse && (
          <Card className="space-y-3 p-4">
            <h3 className="font-bold text-slate-800">Your Response</h3>
              <div className="space-y-2">
                <Badge className={myResponse.status === "accepted" ? "bg-violet-100 text-violet-700" : myResponse.status === "arrived" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}>
                  Status: {myResponse.status}
                </Badge>
                {myResponse.status === "accepted" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" loading={busy} onClick={() => act(() => api.startNavigation(myResponse.id), "Navigation started")}>
                      <Navigation className="h-4 w-4" /> Start navigation
                    </Button>
                    <Button size="sm" loading={busy} onClick={() => act(() => api.startDonation(myResponse.id), "Donation started")}>
                      <Droplet className="h-4 w-4" /> Start donation
                    </Button>
                  </div>
                )}
                {myResponse.status === "accepted" && myResponse.navigationStarted && (
                  <Button size="sm" variant="outline" loading={busy} onClick={() => act(() => api.meetPerson(myResponse.id), "Meeting recorded")}>
                    <UserCheck className="h-4 w-4" /> Met contact person
                  </Button>
                )}
                {myResponse.status === "arrived" && (
                  <Button size="sm" className="bg-emerald-600" loading={busy} onClick={() => act(async () => {
                    const res = await api.completeResponse(myResponse.id);
                    if (res.newBadge) alert(`Donation complete! New badge: ${res.newBadge}`);
                    // Show certificate
                    setCertificateData({
                      donorName: user?.name || "Donor",
                      bloodGroup: user?.bloodGroup || "Unknown",
                      donationDate: new Date().toISOString(),
                      hospitalName: r.hospitalName,
                      district: r.district,
                      certificateId: `UYIR-${Date.now()}-${user?.id?.slice(-6)}`,
                    });
                    setCertificateOpen(true);
                  }, "Thank you for donating!")}>
                    Complete donation
                  </Button>
                )}
              </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="mb-2 font-bold text-slate-800">Donor responses ({r.responses?.length ?? 0})</h3>
          {accepted.length === 0 && <p className="text-sm text-slate-400">No acceptances yet. Donors are being alerted.</p>}
          <div className="space-y-2">
            {(r.responses || []).slice(0, 12).map((x: any) => {
              const responseTime = x.createdAt ? Math.round((new Date(x.createdAt).getTime() - new Date(r.createdAt).getTime()) / 60000) : null;
              const canRate = isOwner && x.status === "completed" && r.status !== "life_saved";
              const canMarkLifeSaved = isOwner && x.status === "completed" && r.status !== "life_saved";
              return (
                <div key={x.id} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{x.donorName || "Donor"} · {x.donorBloodGroup || "Unknown"}</p>
                      <p className="text-[11px] text-slate-400">{x.distanceKm != null ? `${x.distanceKm} km` : x.donorDistrict || "Unknown district"} {x.etaMinutes ? `· ~${x.etaMinutes} min` : ""} · score {x.matchScore}</p>
                    </div>
                    <Badge className={x.status === "accepted" ? "bg-violet-100 text-violet-700" : x.status === "completed" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}>{x.status}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {x.createdAt && <span>Responded: {new Date(x.createdAt).toLocaleString()}</span>}
                    {responseTime !== null && <span className="text-emerald-600 font-semibold">Response time: {responseTime} min</span>}
                    {x.navigationStarted && <span>Navigation: {new Date(x.navigationStarted).toLocaleString()}</span>}
                    {x.personMet && <span>Met: {new Date(x.personMet).toLocaleString()}</span>}
                    {x.donationStarted && <span>Donation: {new Date(x.donationStarted).toLocaleString()}</span>}
                    {x.completedAt && <span>Completed: {new Date(x.completedAt).toLocaleString()}</span>}
                  </div>
                  {x.status === "accepted" && x.etaMinutes && (
                    <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700">
                          ETA: ~{x.etaMinutes} min
                        </span>
                        {x.distanceKm && (
                          <span className="text-xs text-emerald-600">
                            ({x.distanceKm} km away)
                          </span>
                        )}
                      </div>
                      {x.lastLocationUpdate && (
                        <p className="mt-1 text-[10px] text-emerald-500">
                          Last update: {new Date(x.lastLocationUpdate).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                  {canMarkLifeSaved && (
                    <Button size="sm" className="mt-2 w-full bg-emerald-600" loading={busy} onClick={() => markLifeSaved(x.id)}>
                      <Heart className="h-4 w-4" /> Mark as Life Saved
                    </Button>
                  )}
                  {canRate && r.status === "life_saved" && (
                    <Button size="sm" variant="outline" className="mt-2 w-full" loading={busy} onClick={() => { setSelectedResponseId(x.id); setRatingOpen(true); }}>
                      <Star className="h-4 w-4" /> Rate Donor
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {isOwner && canManageRequest && !["completed", "closed"].includes(r.status) && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" loading={busy} onClick={() => act(() => api.alertRequest(r.id), "Re-alerted donors")}><Radio className="h-4 w-4" /> Alert now</Button>
            <Button variant="outline" loading={busy} onClick={() => act(() => api.escalateRequest(r.id), "Radius expanded")}><ChevronsUp className="h-4 w-4" /> Expand radius</Button>
            <Button variant="ghost" className="col-span-2 text-uyir-600" loading={busy} onClick={() => act(() => api.closeRequest(r.id))}>Close request</Button>
          </div>
        )}
      </div>

      <Sheet open={reportOpen} onClose={() => setReportOpen(false)}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Report abuse</h3>
          <button onClick={() => setReportOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="mb-2 text-sm text-slate-500">Did someone ask for money or misuse this request? AI screens every report.</p>
        <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={3}
          placeholder="Describe what happened…" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-uyir-500" />
        <Button className="mt-3 w-full" loading={busy} onClick={submitReport}>Submit report</Button>
      </Sheet>

      <Sheet open={ratingOpen} onClose={() => setRatingOpen(false)}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Rate Donor</h3>
          <button onClick={() => setRatingOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="mb-3 text-sm text-slate-500">How was your experience with the donor?</p>
        <div className="mb-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`h-10 w-10 rounded-full ${rating >= star ? "text-amber-400" : "text-slate-300"}`}
            >
              <Star className="h-6 w-6" fill={rating >= star ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <textarea
          value={testimonial}
          onChange={(e) => setTestimonial(e.target.value)}
          rows={3}
          placeholder="Share your experience (optional)…"
          className="mb-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-uyir-500"
        />
        <Button className="w-full" loading={busy} onClick={submitRating}>Submit Rating</Button>
      </Sheet>

      <Sheet open={certificateOpen} onClose={() => setCertificateOpen(false)}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Your Donation Certificate</h3>
          <button onClick={() => setCertificateOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        {certificateData && (
          <DonationCertificate
            donorName={certificateData.donorName}
            bloodGroup={certificateData.bloodGroup}
            donationDate={certificateData.donationDate}
            hospitalName={certificateData.hospitalName}
            district={certificateData.district}
            certificateId={certificateData.certificateId}
            onClose={() => setCertificateOpen(false)}
          />
        )}
      </Sheet>
    </div>
  );
}
export default RequestDetail;

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}
