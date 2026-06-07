import { useState } from "react";
import { Star, MessageSquare, Send, Heart } from "lucide-react";
import { api } from "../lib/api";
import { Card } from "../components/ui";
import { useApp } from "../contexts/AppContext";

export default function RateUs() {
  const { lang, user } = useApp();
  const [rating, setRating] = useState(0);
  const [testimonial, setTestimonial] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert(lang === "ta" ? "தயவு செய்து மதிப்பீட்டைத் தேர்வு செய்யவும்" : "Please select a rating");
      return;
    }
    setLoading(true);
    try {
      // This would be a general app rating endpoint
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitted(true);
    } catch (error) {
      alert(lang === "ta" ? "சமர்ப்பிப்பதில் பிழை" : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="px-4 py-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 p-8 text-center">
          <Heart className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
            {lang === "ta" ? "நன்றி!" : "Thank You!"}
          </h2>
          <p className="text-slate-600">
            {lang === "ta" ? "உங்கள் கருத்து எங்களுக்கு முக்கியமானது" : "Your feedback means a lot to us"}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <header className="py-4">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-500" />
          {lang === "ta" ? "எங்களை மதிப்பிடுங்கள்" : "Rate Us"}
        </h1>
        <p className="text-sm text-slate-500">
          {lang === "ta" ? "உங்கள் அனுபவத்தைப் பகிரவும்" : "Share your experience with UYIR"}
        </p>
      </header>

      <Card className="mb-4 p-6 bg-gradient-to-br from-slate-50 to-white">
        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            {lang === "ta" ? "மதிப்பீடு" : "Rating"}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            {lang === "ta" ? "உங்கள் கருத்து" : "Your Testimonial"}
          </label>
          <textarea
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            placeholder={
              lang === "ta"
                ? "UYIR பற்றிய உங்கள் அனுபவத்தைப் பகிரவும்..."
                : "Share your experience with UYIR..."
            }
            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 focus:border-uyir-500 focus:outline-none focus:ring-2 focus:ring-uyir-500/20"
            rows={4}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-uyir-600 px-4 py-3 font-semibold text-white shadow-lg shadow-uyir-600/30 transition hover:bg-uyir-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <>
              <Send className="h-5 w-5" />
              {lang === "ta" ? "சமர்ப்பிக்கவும்" : "Submit"}
            </>
          )}
        </button>
      </Card>

      <section>
        <h2 className="mb-3 font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-uyir-600" />
          {lang === "ta" ? "பயனர் கருத்துக்கள்" : "User Testimonials"}
        </h2>
        <div className="space-y-3">
          {[
            {
              name: "Karthik",
              district: "Coimbatore",
              rating: 5,
              text: lang === "ta"
                ? "UYIR எனக்கு உயிரைக் காப்பாற்றியது. வேகமான பதில்!"
                : "UYIR saved my life. Quick response!",
            },
            {
              name: "Divya",
              district: "Chennai",
              rating: 5,
              text: lang === "ta"
                ? "சிறந்த இரத்ததான தளம். மிகவும் பயனுள்ளது."
                : "Excellent blood donation platform. Very helpful.",
            },
            {
              name: "Suresh",
              district: "Madurai",
              rating: 4,
              text: lang === "ta"
                ? "நல்ல சேவை, அருகிலுள்ள டோனர்களை விரைவாகக் கண்டுபிடித்தது."
                : "Good service, found nearby donors quickly.",
            },
          ].map((t, i) => (
            <Card key={i} className="p-4 bg-gradient-to-br from-slate-50 to-white">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= t.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500">· {t.district}</span>
              </div>
              <p className="mb-2 text-sm text-slate-700 italic">"{t.text}"</p>
              <p className="text-xs font-semibold text-slate-600">- {t.name}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
