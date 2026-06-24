import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Droplet, MapPin, Award, User, Shield, Star } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { tr } from "../lib/constants";
import { cn } from "../lib/utils";

const mainItems = [
  { to: "/", key: "home", icon: Home, end: true },
  { to: "/requests", key: "requests", icon: Droplet },
  { to: "/nearby", key: "nearby", icon: MapPin },
  { to: "/impact", key: "impact", icon: Award },
  { to: "/ratings", key: "ratings", icon: Star },
] as const;

const profileItem = { to: "/profile", key: "profile", icon: User } as const;
const adminItem = { to: "/admin", key: "admin", icon: Shield } as const;

export function BottomNav() {
  const { lang, user } = useApp();
  const isAdmin = user?.role === "admin" || user?.role === "verifier";

  return (
    <nav className="fixed left-0 top-0 bottom-0 z-40 w-0 md:w-20 md:border-r border-slate-200 md:bg-white/95 md:backdrop-blur flex flex-col pt-safe">
      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur pb-safe">
        <div className="flex items-center justify-around py-1.5">
          {mainItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={(it as any).end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md transition",
                  isActive ? "bg-uyir-50 text-uyir-600" : "text-slate-400 hover:bg-slate-50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <it.icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 2} />
                  <span className={cn("text-[8px] font-medium", lang === "ta" && "ta")}>{tr(it.key as any, lang)}</span>
                </>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to={adminItem.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md transition",
                  isActive ? "bg-uyir-50 text-uyir-600" : "text-slate-400 hover:bg-slate-50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <adminItem.icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 2} />
                  <span className="text-[8px] font-medium">Admin</span>
                </>
              )}
            </NavLink>
          )}
          <NavLink
            to={profileItem.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md transition",
                isActive ? "bg-uyir-50 text-uyir-600" : "text-slate-400 hover:bg-slate-50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <profileItem.icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 2} />
                <span className={cn("text-[8px] font-medium", lang === "ta" && "ta")}>{tr(profileItem.key as any, lang)}</span>
              </>
            )}
          </NavLink>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <div className="flex flex-col items-center py-4 gap-1 border-b border-slate-100">
          <img src="/uyir-logo.png" alt="Life Saver" className="h-24 w-auto object-contain" />
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
      </div>
    </nav>
  );
}
