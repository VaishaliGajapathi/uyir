import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Droplet } from "lucide-react";

const NAV_LINKS = [
  { to: "/about", label: "About Us" },
  { to: "/donate-request", label: "Donate / Request" },
  { to: "/campaigns-public", label: "Campaigns" },
  { to: "/contact", label: "Contact Us" },
];

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-uyir-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/uyir-logo.png" alt="UYIR" className="h-10 w-auto object-contain" />
            <div className="hidden sm:block">
              <span className="text-lg font-extrabold text-uyir-700">UYIR</span>
              <span className="ml-1 text-xs text-slate-500">உயிர்</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-uyir-50 text-uyir-700"
                      : "text-slate-600 hover:text-uyir-700 hover:bg-uyir-50/50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              to="/"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-uyir-600 px-5 py-2 text-sm font-bold text-white hover:bg-uyir-700 transition"
            >
              <Droplet className="h-4 w-4" />
              Sign Up
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-uyir-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-uyir-50 text-uyir-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-uyir-600 text-sm font-bold text-white"
            >
              <Droplet className="h-4 w-4" />
              Sign Up / Login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
