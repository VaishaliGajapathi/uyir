const configuredBase = import.meta.env.VITE_API_URL || "/api";
const BASE = configuredBase.endsWith("/api") || configuredBase === "/api" ? configuredBase : `${configuredBase.replace(/\/$/, "")}/api`;

let token: string | null = localStorage.getItem("uyir_token");
const GET_CACHE_TTL_MS = 15000;
// Render free/standby instances can cold-start in 30-60s after inactivity.
// Use a generous default timeout so the first request after a spin-down
// doesn't abort before the server has finished waking up.
const REQUEST_TIMEOUT_MS = 60000;
const getCache = new Map<string, { expires: number; promise: Promise<any> }>();

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("uyir_token", t);
  else localStorage.removeItem("uyir_token");
}

export function getToken() {
  return token;
}

async function req<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = (opts.method || "GET").toUpperCase();
  const cacheKey = method === "GET" && !token ? path : "";
  const cached = cacheKey ? getCache.get(cacheKey) : undefined;
  if (cached && cached.expires > Date.now()) return cached.promise;

  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const request = fetch(`${BASE}${path}`, { ...opts, headers, signal: controller.signal })
    .then(async (res) => {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error("API returned HTML instead of JSON. Backend may be unreachable.");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        let message: string;
        if (typeof err.error === "string") {
          message = err.error;
        } else if (err.error) {
          message = JSON.stringify(err.error);
        } else {
          message = `Request failed (${res.status})`;
        }
        throw new Error(message);
      }
      return res.status === 204 ? (null as any) : res.json();
    })
    .catch((e: any) => {
      if (e?.name === "AbortError") throw new Error("The server is taking longer than usual to respond (it may be waking up). Please try again in a few seconds.");
      throw e;
    })
    .finally(() => clearTimeout(timeoutId));

  if (cacheKey) getCache.set(cacheKey, { expires: Date.now() + GET_CACHE_TTL_MS, promise: request });
  return request;
}

export interface User {
  id: string; name: string; mobile: string; role: "donor" | "administrator" | "volunteer" | "ngo" | "blood_bank" | "hospital" | "super_admin"; language: string;
  email?: string;
  designation?: string;
  ngoName?: string;
  ngoStatus?: string;
  district?: string; taluk?: string; bloodGroup?: string; gender?: string; age?: number;
  dob?: string; // Date of birth
  isPlateletDonor: boolean; shareLocation: boolean;
  lastDonationDate?: string; reputationScore: number; donationCount: number;
  livesSavedCount?: number; // Track impact
  verified: boolean; badges?: { badgeName: string; awardedDate: string }[];
  pincode?: string; // Auto-filled from geolocation
  lat?: number; lng?: number;
  notificationsEnabled?: boolean; whatsappEnabled?: boolean; voiceEnabled?: boolean; locationEnabled?: boolean;
  weight?: number; height?: number; hemoglobinLevel?: number; sleepHours?: number;
  drinkingHabits?: string; smokingHabits?: string;
  documents?: DonorDocument[];
  hospitalName?: string;
  hospitalRegistrationId?: string;
  hospitalId?: string;
  bloodBankId?: string;
  bloodBankName?: string;
  facilityLogo?: string;
  createdAt?: string;
}

export interface DonorDocument {
  id: string;
  donorId: string;
  documentType: "aadhar" | "driving_license" | "passport";
  fileUrl: string;
  documentNumber?: string;
  verified: boolean;
  aiVerified: boolean;
  aiScore: number;
  aiNotes?: string;
  uploadedAt: string;
}

export interface DonationRating {
  id: string;
  requestId: string;
  donorId: string;
  requesterId: string;
  rating: number;
  testimonial?: string;
  responseId: string;
  createdAt: string;
}

export interface BloodRequest {
  id: string; patientName: string; patientAge?: number; patientGender?: string; bloodGroup: string; componentType: string;
  unitsRequired: number; hospitalName: string; district: string; taluk?: string;
  contactPerson: string; contactNumber: string; doctorReference?: string;
  emergencyLevel: string; status: string; verificationScore: number;
  verificationNotes?: string; alertRadiusKm: number; createdAt: string;
  lat?: number; lng?: number; _count?: { responses: number };
  documents?: any[]; responses?: any[]; alerts?: any[];
  createdById?: string;
  closedAt?: string;
  createdBy?: {
    id: string;
    name: string;
    mobile?: string;
    district?: string;
    taluk?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
}

export const api = {
  // Fire-and-forget ping to wake a cold/standby server (e.g. Render free tier).
  // Call this early (e.g. on the login page) so the backend is warm by the
  // time the user submits credentials. Ignores all errors.
  warmup: () => {
    try {
      fetch(`${BASE}/health`, { method: "GET", cache: "no-store" }).catch(() => {});
    } catch { /* ignore */ }
  },
  // auth
  requestOtp: (mobile: string, name?: string) => req<{ ok: boolean; exists: boolean; hasPassword?: boolean; user?: User }>("/auth/otp/request", { method: "POST", body: JSON.stringify({ mobile, name }) }),
  verifyOtp: (data: any) => req<{ token: string; user: User }>("/auth/otp/verify", { method: "POST", body: JSON.stringify(data) }),
  login: (mobile: string, password: string) => req<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ mobile, password }) }),
  forgotPassword: (mobile: string) => req<{ ok: boolean; message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ mobile }) }),
  resetPassword: (mobile: string, accessToken: string, password: string) => req<{ ok: boolean; message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ mobile, accessToken, password }) }),
  // users
  me: () => req<User>("/users/me"),
  updateMe: (data: Partial<User>) => req<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
  updateProfile: (data: { name?: string; email?: string; designation?: string; district?: string }) => req<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
  setLocation: (lat: number, lng: number, extra: { district?: string; taluk?: string; pincode?: string } = {}) =>
    req("/users/me/location", { method: "POST", body: JSON.stringify({ lat, lng, ...extra }) }),
  getDocuments: () => req<DonorDocument[]>("/users/me/documents"),
  uploadDonorDocument: (data: { documentType: "aadhar" | "driving_license" | "passport"; fileUrl: string; documentNumber?: string }) => req<DonorDocument>("/users/me/documents", { method: "POST", body: JSON.stringify(data) }),
  deleteDocument: (id: string) => req("/users/me/documents/" + id, { method: "DELETE" }),
  // requests
  listRequests: (params: Record<string, string> = {}) => req<BloodRequest[]>(`/requests?${new URLSearchParams(params)}`),
  myRequests: () => req<BloodRequest[]>(`/requests?mine=true`),
  getRequest: (id: string) => req<BloodRequest>(`/requests/${id}`),
  createRequest: (data: any) => req<BloodRequest>("/requests", { method: "POST", body: JSON.stringify(data) }),
  uploadDocument: (id: string, base64: string, mimeType: string, documentType: string) =>
    req(`/requests/${id}/documents`, { method: "POST", body: JSON.stringify({ base64, mimeType, documentType }) }),
  verifyRequest: (id: string) => req(`/requests/${id}/verify`, { method: "POST" }),
  alertRequest: (id: string) => req<{ alerted: number; radiusKm: number }>(`/requests/${id}/alert`, { method: "POST" }),
  escalateRequest: (id: string) => req<{ radiusKm: number }>(`/requests/${id}/escalate`, { method: "POST" }),
  closeRequest: (id: string) => req(`/requests/${id}/close`, { method: "POST" }),
  // responses
  myAlerts: () => req<any[]>("/responses/mine"),
  acceptResponse: (id: string) => req(`/responses/${id}/accept`, { method: "POST" }),
  declineResponse: (id: string) => req(`/responses/${id}/decline`, { method: "POST" }),
  acceptRequestAsDonor: (requestId: string) => req<any>(`/responses/for-request/${requestId}/accept`, { method: "POST" }),
  completeResponse: (id: string) => req<{ ok: boolean; donationCount: number; newBadge: string | null }>(`/responses/${id}/complete`, { method: "POST" }),
  markLifeSaved: (id: string) => req(`/responses/${id}/life-saved`, { method: "POST" }),
  rateDonor: (id: string, data: { rating: number; testimonial?: string }) => req<DonationRating>(`/responses/${id}/rate`, { method: "POST", body: JSON.stringify(data) }),
  report: (data: any) => req("/responses/report", { method: "POST", body: JSON.stringify(data) }),
  // Donation tracking
  startNavigation: (responseId: string) => req(`/responses/${responseId}/start-navigation`, { method: "POST" }),
  meetPerson: (responseId: string) => req(`/responses/${responseId}/meet-person`, { method: "POST" }),
  startDonation: (responseId: string) => req(`/responses/${responseId}/start-donation`, { method: "POST" }),
  updateLocation: (responseId: string, lat: number, lng: number) => req(`/responses/${responseId}/update-location`, { method: "POST", body: JSON.stringify({ lat, lng }) }),
  // ai
  aiStatus: () => req<{ openai: boolean; gemini: boolean; replicate: boolean }>("/ai/status"),
  transcribe: (blob: Blob, mode: string, language = "ta") => {
    const fd = new FormData();
    fd.append("audio", blob, "voice.webm");
    return req<{ text: string; parsed: any }>(`/ai/transcribe?mode=${mode}&language=${language}`, { method: "POST", body: fd });
  },
  parseRequest: (text: string) => req<any>("/ai/parse-request", { method: "POST", body: JSON.stringify({ text }) }),
  fraudCheck: (text: string) => req<any>("/ai/fraud-check", { method: "POST", body: JSON.stringify({ text }) }),
  // impact
  stats: () => req<{ activeRequests: number; livesSaved: number; donors: number; requestsToday: number }>("/impact/stats"),
  heatmap: () => req<{ district: string; active: number }[]>("/impact/heatmap"),
  leaderboard: () => req<any[]>("/impact/leaderboard"),
  districts: () => req<string[]>("/districts"),
  // admin
  adminStats: () => req<{ totalDonors: number; totalRequests: number; pendingVerifications: number; activeRequests: number; fraudReports: number; livesSaved: number }>("/admin/stats"),
  adminDonors: () => req<any[]>("/admin/donors"),
  adminRequests: () => req<any[]>("/admin/requests"),
  adminPendingVerification: () => req<any[]>("/admin/pending-verification"),
  adminFraudReports: () => req<any[]>("/admin/fraud-reports"),
  adminHospitals: () => req<any[]>("/admin/hospitals"),
  adminCreateHospital: (data: { name: string; district: string; address?: string; phone?: string; registrationId?: string; logo?: string }) => req<any>("/admin/hospitals", { method: "POST", body: JSON.stringify(data) }),
  adminEditHospital: (id: string, data: { name?: string; district?: string; address?: string; phone?: string; registrationId?: string; logo?: string }) => req<any>(`/admin/hospitals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  adminGetBloodBanks: () => req<any[]>("/admin/blood-banks"),
  adminCreateBloodBank: (data: { name: string; district: string; address?: string; phone?: string; email?: string; contactName?: string; registrationNumber?: string; website?: string; description?: string; availableBloodGroups?: string; logo?: string }) => req<any>("/admin/blood-banks", { method: "POST", body: JSON.stringify(data) }),
  adminEditBloodBank: (id: string, data: { name?: string; district?: string; address?: string; phone?: string; email?: string; contactName?: string; registrationNumber?: string; website?: string; description?: string; availableBloodGroups?: string; logo?: string }) => req<any>(`/admin/blood-banks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  adminVerifyBloodBank: (id: string) => req(`/admin/blood-banks/${id}/verify`, { method: "POST" }),
  adminRejectBloodBank: (id: string) => req(`/admin/blood-banks/${id}/reject`, { method: "POST" }),
  adminVerifyRequest: (id: string, approved: boolean, notes: string) => req(`/admin/verify-request/${id}`, { method: "POST", body: JSON.stringify({ approved, notes }) }),
  adminGetDocuments: (id: string) => req<{ documents: any[] }>(`/admin/requests/${id}/documents`),
  adminCloseRequest: (id: string) => req(`/admin/requests/${id}/close`, { method: "POST" }),
  adminRejectRequest: (id: string, notes: string) => req(`/admin/requests/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),
  adminBanUser: (id: string) => req(`/admin/ban-user/${id}`, { method: "POST" }),
  adminGetAdmins: () => req<any[]>("/admin/admins"),
  adminVerifyHospital: (id: string) => req(`/admin/hospitals/${id}/verify`, { method: "POST" }),
  adminCreateAdmin: (data: { name: string; mobile: string; role: string; password?: string; district?: string; ngoName?: string; ngoId?: string; designation?: string; ngoAddress?: string; ngoRegistrationNumber?: string; ngoPhone?: string; ngoEmail?: string; hospitalId?: string; hospitalName?: string; bloodBankId?: string }) => req<any>("/admin/admins", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateAdmin: (id: string, data: { name?: string; email?: string; designation?: string; district?: string }) => req<User>(`/admin/admins/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  adminResetPassword: (id: string, password: string) => req(`/admin/admins/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
  adminViewPassword: (id: string) => req<{ password: string }>(`/admin/admins/${id}/password`),
  adminFreezeUser: (id: string) => req(`/admin/admins/${id}/freeze`, { method: "POST" }),
  adminDeactivateUser: (id: string) => req(`/admin/admins/${id}/deactivate`, { method: "POST" }),
  adminDeleteUser: (id: string) => req(`/admin/admins/${id}`, { method: "DELETE" }),
  changePassword: (currentPassword: string, newPassword: string) => req("/admin/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  adminGetNgos: () => req<any[]>("/admin/ngos"),
  adminCreateNgo: (data: { name: string; district: string; address?: string; registrationNumber?: string; registrationYear?: string; phone?: string; email?: string; contactName?: string; description?: string; website?: string; logo?: string }) => req<any>("/admin/ngos", { method: "POST", body: JSON.stringify(data) }),
  // CRM
  adminActivity: (limit = 50) => req<any[]>(`/admin/activity?limit=${limit}`),
  adminUserActivity: (id: string) => req<any[]>(`/admin/users/${id}/activity`),
  adminDonorSearch: (params: Record<string, string>) => req<any[]>(`/admin/donors/search?${new URLSearchParams(params)}`),
  adminBloodInventory: () => req<{ byGroup: any[]; byDistrict: any[]; totalDonors: number; totalEligible: number }>("/admin/blood-inventory"),
  adminRequestPipeline: () => req<{ byStatus: any[]; byBloodGroup: any[]; byDistrict: any[]; fulfillmentRate: any }>("/admin/requests/pipeline"),
  adminDonorHistory: (id: string) => req<any[]>(`/admin/donors/${id}/history`),
  adminRoleHierarchy: () => req<{ byRole: any[]; ngoUsers: any[] }>("/admin/role-hierarchy"),
  adminAnalytics: () => req<{ requestsOverTime: any[]; donationsOverTime: any[]; topDonors: any[]; districtHeatmap: any[] }>("/admin/analytics"),
  adminRejectHospital: (id: string) => req(`/admin/hospitals/${id}/reject`, { method: "POST" }),
  adminToggleHospitalActive: (id: string) => req<{ ok: boolean; active: boolean }>(`/admin/hospitals/${id}/toggle-active`, { method: "POST" }),
  adminDismissFraud: (id: string) => req(`/admin/reports/${id}/dismiss`, { method: "POST" }),
  adminApproveNgo: (id: string) => req(`/admin/ngos/${id}/approve`, { method: "POST" }),
  adminRejectNgo: (id: string) => req(`/admin/ngos/${id}/reject`, { method: "POST" }),
  // ngo
  ngoStats: () => req<{ district: string; ngoName?: string | null; totalUsers: number; totalDonors: number; totalRequests: number; pendingVerifications: number; activeRequests: number; completedDonations: number; livesSaved: number; totalHospitals: number }>("/ngo/stats"),
  ngoRequests: () => req<any[]>("/ngo/requests"),
  ngoPendingVerification: () => req<any[]>("/ngo/pending-verification"),
  ngoHospitals: () => req<any[]>("/ngo/hospitals"),
  ngoVerifyRequest: (id: string, approved: boolean, notes: string) => req(`/ngo/verify-request/${id}`, { method: "POST", body: JSON.stringify({ approved, notes }) }),
  ngoVerifyHospital: (id: string) => req(`/ngo/hospitals/${id}/verify`, { method: "POST" }),
  ngoRejectHospital: (id: string) => req(`/ngo/hospitals/${id}/reject`, { method: "POST" }),
  // hospital
  hospitalRegister: (data: { hospitalName: string; hospitalRegistrationId: string; district: string; address?: string; phone?: string; contactPerson: string; contactMobile: string; password: string }) => req<{ token: string; user: User; hospital: any }>("/auth/hospital/register", { method: "POST", body: JSON.stringify(data) }),
  getHealthTips: () => req("/ai/health-tips", { method: "POST" }),
  // push notifications
  savePushSubscription: (subscription: PushSubscription) => req("/users/me/push-subscription", { method: "POST", body: JSON.stringify({ subscription }) }),
  testPushNotification: () => req("/users/me/test-push", { method: "POST" }),
  // FCM token management
  registerFcmToken: (token: string, platform?: string) => req("/users/me/fcm-token", { method: "POST", body: JSON.stringify({ token, platform }) }),
  unregisterFcmToken: () => req("/users/me/fcm-token", { method: "DELETE" }),
  subscribeToTopic: (topic: string) => req("/users/me/subscribe-topic", { method: "POST", body: JSON.stringify({ topic }) }),
  // campaigns
  campaigns: (params?: Record<string, string>) => req<any[]>(`/campaigns?${params ? new URLSearchParams(params) : ""}`),
  upcomingCampaigns: () => req<any[]>("/campaigns/upcoming"),
  pastCampaigns: () => req<any[]>("/campaigns/past"),
  districtCampaigns: (district: string) => req<any[]>(`/campaigns/district/${encodeURIComponent(district)}`),
  campaignDetail: (id: string) => req<any>(`/campaigns/${id}`),
  campaignAnalytics: () => req<any>("/campaigns/analytics/summary"),
  createCampaign: (data: any) => req<any>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: any) => req<any>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  pauseCampaign: (id: string) => req<any>(`/campaigns/${id}/pause`, { method: "POST" }),
  resumeCampaign: (id: string) => req<any>(`/campaigns/${id}/resume`, { method: "POST" }),
  cancelCampaign: (id: string) => req<any>(`/campaigns/${id}/cancel`, { method: "POST" }),
  completeCampaign: (id: string, data: { collectedUnits?: number; registeredDonors?: number }) => req<any>(`/campaigns/${id}/complete`, { method: "POST", body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => req(`/campaigns/${id}`, { method: "DELETE" }),
};

export function streamUrl(path: string) {
  const base = BASE.startsWith("http") ? BASE : `${location.origin}${BASE}`;
  return `${base}${path}`;
}
