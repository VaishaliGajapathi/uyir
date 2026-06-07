const configuredBase = import.meta.env.VITE_API_URL || "/api";
const BASE = configuredBase.endsWith("/api") || configuredBase === "/api" ? configuredBase : `${configuredBase.replace(/\/$/, "")}/api`;

let token: string | null = localStorage.getItem("uyir_token");

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("uyir_token", t);
  else localStorage.removeItem("uyir_token");
}

export function getToken() {
  return token;
}

async function req<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (!(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (null as any) : res.json();
}

export interface User {
  id: string; name: string; mobile: string; role: string; language: string;
  district?: string; taluk?: string; bloodGroup?: string; gender?: string; age?: number;
  isPlateletDonor: boolean; nightEmergency: boolean; shareLocation: boolean;
  lastDonationDate?: string; reputationScore: number; donationCount: number;
  verified: boolean; badges?: { badgeName: string; awardedDate: string }[];
  hemoglobinLevel?: number; drinkingHabits?: string; smokingHabits?: string; sleepHours?: number; healthTips?: string;
  weight?: number; height?: number;
  notificationsEnabled?: boolean; voiceEnabled?: boolean; locationEnabled?: boolean;
  documents?: DonorDocument[];
  hospitalName?: string;
  hospitalRegistrationId?: string;
  hospitalId?: string;
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
}

export const api = {
  // auth
  requestOtp: (mobile: string, name?: string) => req<{ ok: boolean; devOtp: string; exists: boolean; user?: User }>("/auth/otp/request", { method: "POST", body: JSON.stringify({ mobile, name }) }),
  verifyOtp: (data: any) => req<{ token: string; user: User }>("/auth/otp/verify", { method: "POST", body: JSON.stringify(data) }),
  login: (mobile: string) => req<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ mobile }) }),
  hospitalLogin: (data: { hospitalName: string; hospitalRegistrationId: string; mobile?: string }) => req<{ token: string; user: User }>("/auth/hospital/login", { method: "POST", body: JSON.stringify(data) }),
  // users
  me: () => req<User>("/users/me"),
  updateMe: (data: Partial<User>) => req<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
  setLocation: (lat: number, lng: number) => req("/users/me/location", { method: "POST", body: JSON.stringify({ lat, lng }) }),
  getDocuments: () => req<DonorDocument[]>("/users/me/documents"),
  uploadDonorDocument: (data: { documentType: "aadhar" | "driving_license" | "passport"; fileUrl: string; documentNumber?: string }) => req<DonorDocument>("/users/me/documents", { method: "POST", body: JSON.stringify(data) }),
  deleteDocument: (id: string) => req("/users/me/documents/" + id, { method: "DELETE" }),
  // requests
  listRequests: (params: Record<string, string> = {}) => req<BloodRequest[]>(`/requests?${new URLSearchParams(params)}`),
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
  adminVerifyRequest: (id: string, approved: boolean, notes: string) => req(`/admin/verify-request/${id}`, { method: "POST", body: JSON.stringify({ approved, notes }) }),
  adminBanUser: (id: string) => req(`/admin/ban-user/${id}`, { method: "POST" }),
  getHealthTips: () => req("/ai/health-tips", { method: "POST" }),
};

export function streamUrl(path: string) {
  const base = BASE.startsWith("http") ? BASE : `${location.origin}${BASE}`;
  return `${base}${path}`;
}
