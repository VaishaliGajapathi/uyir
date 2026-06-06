import { Droplet, Heart, Clock, MapPin, Phone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DonateRequest() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-red-600 to-red-700 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">Donate or Request Blood</h1>
          <p className="text-xl md:text-2xl text-red-100 mb-2">உயிர் - Save a Life Today</p>
          <p className="text-lg text-red-200 max-w-3xl mx-auto">
            Every drop counts. Join our community of lifesavers across Tamil Nadu
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Donate Blood Card */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-red-100 hover:border-red-300 transition">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Droplet className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 text-center mb-4">Donate Blood</h2>
            <p className="text-slate-600 text-center mb-6">
              Register as a voluntary blood donor and save lives. Your one donation can save up to 3 lives.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-700">
                <Heart className="h-5 w-5 text-red-500" />
                <span>Save up to 3 lives per donation</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Clock className="h-5 w-5 text-red-500" />
                <span>Process takes only 15-20 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <MapPin className="h-5 w-5 text-red-500" />
                <span>Donate at verified hospitals near you</span>
              </div>
            </div>

            <button 
              onClick={() => navigate("/signup")}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              Register as Donor <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Request Blood Card */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-100 hover:border-blue-300 transition">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Heart className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 text-center mb-4">Request Blood</h2>
            <p className="text-slate-600 text-center mb-6">
              Need blood urgently? Submit a verified request and we'll connect you with nearby donors instantly.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-700">
                <Clock className="h-5 w-5 text-blue-500" />
                <span>Average response time: 15 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <MapPin className="h-5 w-5 text-blue-500" />
                <span>Location-based donor matching</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Phone className="h-5 w-5 text-blue-500" />
                <span>Verified requests only</span>
              </div>
            </div>

            <button 
              onClick={() => navigate("/new-request")}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              Request Blood <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Eligibility Section */}
      <div className="bg-slate-100 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Who Can Donate Blood?</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-emerald-600 mb-4">You Can Donate If:</h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>Age between 18-60 years</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>Weight at least 50 kg</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>Hemoglobin level ≥ 12.5 g/dL</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>No recent tattoos or piercings (6 months)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>Not pregnant or breastfeeding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">✓</span>
                  <span>No major surgery in last 6 months</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-red-600 mb-4">You Cannot Donate If:</h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Have HIV, Hepatitis B/C, or other blood-borne diseases</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Have recent tattoos or piercings (within 6 months)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Are pregnant or breastfeeding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Have taken antibiotics in last 7 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Have low hemoglobin level</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Have donated blood in last 3 months</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Blood Types Info */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Blood Type Compatibility</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: "A+", canGive: "A+, AB+", canReceive: "A+, A-, O+, O-" },
            { type: "A-", canGive: "A+, A-, AB+, AB-", canReceive: "A-, O-" },
            { type: "B+", canGive: "B+, AB+", canReceive: "B+, B-, O+, O-" },
            { type: "B-", canGive: "B+, B-, AB+, AB-", canReceive: "B-, O-" },
            { type: "AB+", canGive: "AB+", canReceive: "All types" },
            { type: "AB-", canGive: "AB+, AB-", canReceive: "A-, B-, AB-, O-" },
            { type: "O+", canGive: "A+, B+, AB+, O+", canReceive: "O+, O-" },
            { type: "O-", canGive: "All types", canReceive: "O-" },
          ].map((bt) => (
            <div key={bt.type} className="bg-white rounded-xl p-4 shadow-lg border-2 border-slate-100 text-center">
              <div className="text-3xl font-extrabold text-red-600 mb-2">{bt.type}</div>
              <div className="text-xs text-slate-500 mb-1">Can give to:</div>
              <div className="text-sm font-semibold text-slate-700 mb-2">{bt.canGive}</div>
              <div className="text-xs text-slate-500 mb-1">Can receive from:</div>
              <div className="text-sm font-semibold text-slate-700">{bt.canReceive}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-uyir-600 to-uyir-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Save a Life?</h2>
          <p className="text-xl text-uyir-100 mb-8">
            Join thousands of donors across Tamil Nadu who are making a difference every day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate("/signup")}
              className="bg-white text-uyir-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition"
            >
              Register as Donor
            </button>
            <button 
              onClick={() => navigate("/new-request")}
              className="bg-uyir-800 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-uyir-900 transition"
            >
              Request Blood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
