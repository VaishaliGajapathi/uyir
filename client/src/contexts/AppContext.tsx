import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { api, setToken, getToken, type User, streamUrl } from "../lib/api";
import type { Lang } from "../lib/constants";

interface IncomingAlert {
  responseId?: string;
  requestId: string;
  bloodGroup: string;
  componentType: string;
  unitsRequired: number;
  hospitalName: string;
  district: string;
  emergencyLevel: string;
  distanceKm?: number;
  etaMinutes?: number;
}

interface AppState {
  user: User | null;
  loading: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  liveAlert: IncomingAlert | null;
  dismissAlert: () => void;
  aiStatus: { openai: boolean; gemini: boolean; replicate: boolean } | null;
}

const Ctx = createContext<AppState>(null as any);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Lang>((localStorage.getItem("uyir_lang") as Lang) || "ta");
  const [liveAlert, setLiveAlert] = useState<IncomingAlert | null>(null);
  const [aiStatus, setAiStatus] = useState<AppState["aiStatus"]>(null);
  const esRef = useRef<EventSource | null>(null);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("uyir_lang", l);
  };

  const refreshUser = async () => {
    try {
      const u = await api.me();
      setUser(u);
    } catch {
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    api.aiStatus().then(setAiStatus).catch(() => {});
    if (getToken()) refreshUser().finally(() => setLoading(false));
    else setLoading(false);
  }, []);

  // Real-time alert stream (SSE) for the logged-in donor.
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    const es = new EventSource(streamUrl(`/stream/alerts?token=${token}`));
    es.addEventListener("alert", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setLiveAlert({ ...data.payload, requestId: data.requestId, responseId: data.donorId });
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("UYIR · Urgent blood request", {
            body: `${data.payload.bloodGroup} needed at ${data.payload.hospitalName}`,
          });
        }
      } catch {}
    });
    esRef.current = es;
    return () => es.close();
  }, [user]);

  const login = (token: string, u: User) => {
    setToken(token);
    setUser(u);
    if (u.language) setLang(u.language as Lang);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    esRef.current?.close();
  };

  return (
    <Ctx.Provider value={{ user, loading, lang, setLang, login, logout, refreshUser, liveAlert, dismissAlert: () => setLiveAlert(null), aiStatus }}>
      {children}
    </Ctx.Provider>
  );
}
