import { NavLink } from "react-router-dom";
import { Home, Droplet, MapPin, Award, User, Shield } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { tr } from "../lib/constants";
import { cn } from "../lib/utils";

const mainItems = [
  { to: "/", key: "home", icon: Home, end: true },
  { to: "/requests", key: "requests", icon: Droplet },
  { to: "/nearby", key: "nearby", icon: MapPin },
  { to: "/impact", key: "impact", icon: Award },
] as const;

const profileItem = { to: "/profile", key: "profile", icon: User } as const;
const adminItem = { to: "/admin", key: "admin", icon: Shield } as const;

export function BottomNav() {
  const { lang, user } = useApp();
  const isAdmin = user?.role === "admin" || user?.role === "verifier";
  return (
    <nav className="fixed left-0 top-0 bottom-0 z-40 w-20 border-r border-slate-200 bg-white/95 backdrop-blur flex flex-col pt-safe">
      <div className="flex flex-col items-center py-4 gap-1 border-b border-slate-100">
        <img src="/uyir-logo.png" alt="UYIR" className="h-14 w-auto object-contain" />
      </div>
      <div className="flex flex-1 flex-col items-center py-4 gap-1">
        {mainItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={(it as any).end}
            className={({ isActive }) =>
              cn("flex flex-col items-center gap-1 p-2 rounded-xl transition", isActive ? "bg-uyir-50 text-uyir-600" : "text-slate-400 hover:bg-slate-50")
            }
          >
            {({ isActive }) => (
              <>
                <it.icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
                <span className={cn("text-[10px] font-medium", lang === "ta" && "ta")}>{tr(it.key as any, lang)}</span>
              </>
            )}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to={adminItem.to}
            className={({ isActive }) =>
              cn("flex flex-col items-center gap-1 p-2 rounded-xl transition", isActive ? "bg-uyir-50 text-uyir-600" : "text-slate-400 hover:bg-slate-50")
            }
          >
            {({ isActive }) => (
              <>
                <adminItem.icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[10px] font-medium">Admin</span>
              </>
            )}
          </NavLink>
        )}
      </div>
      <div className="border-t border-slate-200 p-2">
        <NavLink
          to={profileItem.to}
          className={({ isActive }) =>
            cn("flex flex-col items-center gap-1 p-2 rounded-xl transition", isActive ? "bg-uyir-50 text-uyir-600" : "text-slate-400 hover:bg-slate-50")
          }
        >
          {({ isActive }) => (
            <>
              <profileItem.icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
              <span className={cn("text-[10px] font-medium", lang === "ta" && "ta")}>{tr(profileItem.key as any, lang)}</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
