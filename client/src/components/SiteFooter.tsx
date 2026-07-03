import { Link } from "react-router-dom";
import { Facebook, Instagram, MessageCircle, Heart } from "lucide-react";

const SOCIAL_LINKS = {
  whatsapp: "https://wa.me/919876543210",
  facebook: "https://www.facebook.com/uyirngo",
  instagram: "https://www.instagram.com/uyirngo",
};

const FOOTER_LINKS = [
  { to: "/about", label: "About Us" },
  { to: "/donate-request", label: "Donate / Request Blood" },
  { to: "/campaigns-public", label: "Campaigns" },
  { to: "/contact", label: "Contact Us" },
  { to: "/", label: "Sign Up / Login" },
];

export function SiteFooter() {
  return (
    <footer className="bg-gradient-to-r from-uyir-600 to-uyir-700 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/uyir-logo.png" alt="UYIR" className="h-12 w-auto object-contain bg-white rounded-lg p-1" />
              <div>
                <h3 className="text-xl font-extrabold">UYIR</h3>
                <p className="text-xs text-uyir-100">உயிர் - Tamil Nadu Blood Network</p>
              </div>
            </div>
            <p className="text-sm text-uyir-100">
              Saving lives, one drop at a time. Connecting voluntary blood donors with patients in critical need across Tamil Nadu.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-3">Quick Links</h4>
            <div className="space-y-2 text-sm">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className="block text-uyir-100 hover:text-white transition">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social + Contact */}
          <div>
            <h4 className="font-bold mb-3">Follow Us</h4>
            <p className="text-sm text-uyir-100 mb-4">Stay connected for updates on blood drives and campaigns</p>
            <div className="flex gap-3">
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition">
                <Facebook className="h-5 w-5" />
              </a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
            <div className="mt-4 text-sm">
              <p className="text-uyir-100">Email: <a href="mailto:support@uyirngo.in" className="hover:text-white">support@uyirngo.in</a></p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/20 pt-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Link to="/privacy-policy" className="text-xs text-uyir-100 hover:text-white transition">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-uyir-100 hover:text-white transition">Terms & Conditions</Link>
          </div>
          <p className="text-sm text-uyir-100 flex items-center justify-center gap-1">
            © 2026 UYIR - Tamil Nadu Blood & Platelet Emergency Network · Made with <Heart className="h-3 w-3 fill-white" /> for Tamil Nadu
          </p>
          <p className="text-xs text-uyir-200 mt-1">உயிர் - உயிரைக் காப்போம்</p>
        </div>
      </div>
    </footer>
  );
}
