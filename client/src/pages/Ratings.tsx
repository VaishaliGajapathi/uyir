import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Plus, MessageSquare, ThumbsUp } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { Button, Input, Card, Badge } from "../components/ui";

const mockTestimonials = [
  {
    id: 1,
    name: "Ramesh Kumar",
    district: "Chennai",
    rating: 5,
    text: "UYIR saved my father's life. Within 30 minutes of posting the request, we got 3 donor responses. Amazing platform!",
    date: "2024-01-15",
    bloodGroup: "A+"
  },
  {
    id: 2,
    name: "Priya Lakshmi",
    district: "Coimbatore",
    rating: 5,
    text: "The verification system gives confidence that the requests are genuine. Very helpful during emergencies.",
    date: "2024-01-10",
    bloodGroup: "O+"
  },
  {
    id: 3,
    name: "Suresh Babu",
    district: "Madurai",
    rating: 4,
    text: "Easy to use and the location feature helped donors reach quickly. Would recommend to everyone.",
    date: "2024-01-05",
    bloodGroup: "B+"
  },
  {
    id: 4,
    name: "Anitha Rajan",
    district: "Tiruchirappalli",
    rating: 5,
    text: "As a regular donor, this platform makes it easy to find nearby requests. The Tamil language support is excellent.",
    date: "2024-01-02",
    bloodGroup: "AB+"
  }
];

export default function Ratings() {
  const nav = useNavigate();
  const { lang } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [testimonials, setTestimonials] = useState(mockTestimonials);
  const [formData, setFormData] = useState({
    name: "",
    text: ""
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.text || rating === 0) return;
    
    const newTestimonial = {
      id: testimonials.length + 1,
      name: formData.name,
      district: "Your District",
      rating,
      text: formData.text,
      date: new Date().toISOString().split('T')[0],
      bloodGroup: "Your Group"
    };
    
    setTestimonials([newTestimonial, ...testimonials]);
    setFormData({ name: "", text: "" });
    setRating(0);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4 pb-20">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => nav(-1)}><ArrowLeft className="h-6 w-6 text-slate-700" /></button>
        <h1 className="text-lg font-bold text-slate-800">{lang === "ta" ? "மதிப்பீடுகள் & சான்றுகள்" : "Ratings & Testimonials"}</h1>
      </header>

      <div className="space-y-4">
        {/* Add Testimonial Button */}
        <Button
          className="w-full"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4" />
          {lang === "ta" ? "உங்கள் அனுபவத்தைப் பகிரவும்" : "Share Your Experience"}
        </Button>

        {/* Add Testimonial Form */}
        {showForm && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-slate-800">{lang === "ta" ? "உங்கள் சான்றைச் சேர்க்கவும்" : "Add Your Testimonial"}</h2>
            
            <Input
              label={lang === "ta" ? "பெயர் *" : "Name *"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {lang === "ta" ? "மதிப்பீடு *" : "Rating *"}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-2xl transition"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {lang === "ta" ? "உங்கள் அனுபவம் *" : "Your Experience *"}
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-uyir-500 focus:ring-2 focus:ring-uyir-100"
                placeholder={lang === "ta" ? "உங்கள் அனுபவத்தைப் பகிரவும்..." : "Share your experience..."}
              />
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmit}>
                {lang === "ta" ? "சமர்ப்பிக்கவும்" : "Submit"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {lang === "ta" ? "ரத்து" : "Cancel"}
              </Button>
            </div>
          </Card>
        )}

        {/* Testimonials List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-800">
            {lang === "ta" ? "சமீபத்திய சான்றுகள்" : "Recent Testimonials"}
          </h2>
          
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{testimonial.name}</h3>
                  <p className="text-sm text-slate-500">{testimonial.district} • {testimonial.date}</p>
                </div>
                <Badge className="bg-uyir-50 text-uyir-700">{testimonial.bloodGroup}</Badge>
              </div>
              
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= testimonial.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-300"
                    }`}
                  />
                ))}
              </div>
              
              <p className="text-sm text-slate-600">{testimonial.text}</p>
              
              <div className="mt-3 flex items-center gap-4">
                <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-uyir-600">
                  <ThumbsUp className="h-4 w-4" />
                  <span>Helpful</span>
                </button>
                <button className="flex items-center gap-1 text-sm text-slate-500 hover:text-uyir-600">
                  <MessageSquare className="h-4 w-4" />
                  <span>Reply</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
