import { useRef } from "react";
import { Award, Calendar, Droplet, MapPin, Share2, Download, CheckCircle } from "lucide-react";
import { Button, Card } from "./ui";
import html2canvas from "html2canvas";
import { useApp } from "../contexts/AppContext";

interface DonationCertificateProps {
  donorName: string;
  bloodGroup: string;
  donationDate: string;
  hospitalName: string;
  district: string;
  certificateId: string;
  hasDonated?: boolean;
  onClose?: () => void;
  downloadable?: boolean;
  nonDonorMessage?: string;
}

export function DonationCertificate({
  donorName,
  bloodGroup,
  donationDate,
  hospitalName,
  district,
  certificateId,
  hasDonated = false,
  onClose,
  downloadable = true,
  nonDonorMessage,
}: DonationCertificateProps) {
  const { lang } = useApp();
  const certificateRef = useRef<HTMLDivElement>(null);

  async function downloadCertificate() {
    if (!downloadable) {
      alert(nonDonorMessage || "You need to donate blood first to download this certificate.");
      return;
    }
    if (!certificateRef.current) return;
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 1,
        backgroundColor: "#ffffff",
        width: 3300,
        height: 2550,
      });
      const link = document.createElement("a");
      link.download = `LifeSaver-Donation-Certificate-${certificateId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Failed to download certificate:", e);
      alert("Failed to download certificate. Please try again.");
    }
  }

  function shareToWhatsApp() {
    const message = `🩸 I just donated blood through UYIR!

Donor: ${donorName}
Blood Group: ${bloodGroup}
Date: ${new Date(donationDate).toLocaleDateString()}
Hospital: ${hospitalName}, ${district}

Certificate ID: ${certificateId}

Join UYIR and save lives! 🙏
#UYIR #BloodDonation #SaveLives`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function shareToTwitter() {
    const text = `🩸 I just donated blood through UYIR! Every drop counts. Join me in saving lives. 🙏 #UYIR #BloodDonation #SaveLives`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function shareToFacebook() {
    const message = `🩸 I just donated blood through UYIR! Every drop counts. Join me in saving lives. 🙏 #UYIR #BloodDonation #SaveLives`;
    const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      <div
        ref={certificateRef}
        className="relative mx-auto overflow-hidden rounded-xl border-4 border-uyir-600 bg-white shadow-2xl"
        style={{ 
          backgroundImage: "linear-gradient(135deg, #fef3c7 0%, #ffffff 50%, #fef3c7 100%)",
          aspectRatio: "11/8.5",
          maxWidth: "800px"
        }}
      >
        {/* Header - Horizontal layout */}
        <div className="flex h-full flex-col p-4">
          <div className="mb-3 flex items-center gap-3">
            <img src="/uyir-logo.png" alt="Life Saver" className="h-12 w-auto object-contain" />
            <div className="flex-1">
              <h1 className="whitespace-nowrap text-base font-extrabold text-uyir-700 italic" style={{ fontFamily: "cursive, serif" }}>CERTIFICATE OF APPRECIATION</h1>
              <p className="text-[10px] font-semibold text-slate-600">Tamil Nadu Verified Blood & Platelet Emergency Network</p>
            </div>
          </div>

          {/* Recognition Message */}
          <div className="mb-3 text-center">
            <p className="text-[10px] font-medium text-slate-700">
              In grateful recognition of your voluntary blood donation. Your generosity reflects the true spirit of humanity and lifesaving service.
            </p>
            <p className="text-[10px] font-medium text-slate-700">
              உங்கள் தன்னார்வ இரத்ததானத்திற்காக நன்றி. உங்கள் தாரளம் மனிதநேயத்தின் உண்மையான உணர்வையும் உயிர் காப்பு சேவையையும் பிரதிபலிக்கிறது.
            </p>
          </div>

          {/* Main Content - Single row layout */}
          <div className="mb-3 flex items-center justify-around gap-4 rounded-lg bg-white/50 p-3">
            {/* Donor Info */}
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-uyir-600" />
              <div>
                <p className="text-[9px] text-slate-500">Presented to</p>
                <p className="text-sm font-bold text-slate-800 italic" style={{ fontFamily: "cursive, serif" }}>{donorName}</p>
              </div>
            </div>

            {/* Blood Group */}
            <div className="flex items-center gap-2">
              <Droplet className="h-3 w-3 text-rose-600" />
              <div>
                <p className="text-[9px] text-slate-500">Blood Group</p>
                <p className="text-sm font-bold text-slate-800 italic" style={{ fontFamily: "cursive, serif" }}>{bloodGroup}</p>
              </div>
            </div>

            {/* Donation Date */}
            <div className="flex items-center gap-2">
              <Calendar className={`h-3 w-3 ${hasDonated ? "text-blue-600" : "text-slate-400"}`} />
              <div>
                <p className="text-[9px] text-slate-500">Donation Date</p>
                <p className={`text-sm font-bold italic ${hasDonated ? "text-slate-800" : "text-slate-400"}`} style={{ fontFamily: "cursive, serif" }}>
                  {hasDonated ? new Date(donationDate).toLocaleDateString() : (lang === "ta" ? "இன்னும் தானம் செய்யவில்லை" : "Not donated yet")}
                </p>
              </div>
            </div>
          </div>

          {/* Badge - Centered */}
          <div className="mb-3 flex items-center justify-center gap-2 rounded-full bg-uyir-100 px-4 py-2">
            <CheckCircle className="h-5 w-5 text-uyir-600" />
            <span className="text-base font-bold text-uyir-700">Life Saver</span>
          </div>

          {/* Signature Section */}
          <div className="mb-3 flex items-end justify-between gap-4">
            <div className="flex-1 text-center">
              <p className="mb-1 text-[9px] text-slate-500">Date</p>
              <p className={`text-sm font-bold italic ${hasDonated ? "text-slate-800" : "text-slate-400"}`} style={{ fontFamily: "cursive, serif" }}>
                {hasDonated ? new Date(donationDate).toLocaleDateString() : (lang === "ta" ? "—" : "—")}
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="mb-1 text-[9px] text-slate-500">Founder</p>
              <p className="text-lg font-bold text-slate-800 italic" style={{ fontFamily: "cursive, serif" }}>Founder</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-2 text-center">
            <p className="text-[10px] text-slate-500">Certificate ID: {certificateId}</p>
            <p className="text-[9px] text-slate-400">This certificate is generated by Life Saver to honor blood donors</p>
          </div>

          {/* Decorative corners */}
          <div className="absolute left-2 top-2 h-8 w-8 border-l-4 border-t-4 border-uyir-600"></div>
          <div className="absolute right-2 top-2 h-8 w-8 border-r-4 border-t-4 border-uyir-600"></div>
          <div className="absolute left-2 bottom-2 h-8 w-8 border-l-4 border-b-4 border-uyir-600"></div>
          <div className="absolute right-2 bottom-2 h-8 w-8 border-r-4 border-b-4 border-uyir-600"></div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {hasDonated ? (
            <Button className="flex-1" onClick={downloadCertificate}>
              <Download className="h-4 w-4" /> {lang === "ta" ? "பதிவிறக்கம்" : "Download"}
            </Button>
          ) : (
            <Button className="flex-1" disabled variant="outline">
              <Download className="h-4 w-4" /> {lang === "ta" ? "தானம் செய்த பின் பதிவிறக்கம்" : "Download after donation"}
            </Button>
          )}
          {onClose && (
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {lang === "ta" ? "மூடு" : "Close"}
            </Button>
          )}
        </div>

        {hasDonated && (
        <div>
          <p className="mb-2 text-center text-sm font-semibold text-slate-700">Share your achievement</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={shareToWhatsApp}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.417-.074-.128-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
            <button
              onClick={shareToTwitter}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-600"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            <button
              onClick={shareToFacebook}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button
              onClick={() => {
                const shareLink = window.location.href;
                navigator.clipboard.writeText(shareLink);
                alert("Certificate link copied!");
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700"
            >
              <Share2 className="h-6 w-6" />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
