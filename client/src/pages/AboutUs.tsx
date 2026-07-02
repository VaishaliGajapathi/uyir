import { Heart, Users, Shield, Globe, Award, Clock, Phone, Mail, MapPin, Facebook, Instagram, Twitter, Quote, ArrowRight, Droplet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { t } from "../lib/constants";
import { SiteFooter } from "../components/SiteFooter";
import { SiteNav } from "../components/SiteNav";

export default function AboutUs() {
  const navigate = useNavigate();
  const thirukkuralText = [
    t.thirukkural.en[0],
    t.thirukkural.en[1],
    t.thirukkural.ta[0],
    t.thirukkural.ta[1]
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SiteNav />
      {/* Thirukkural Running Ribbon */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3 overflow-hidden">
        <div className="flex items-center gap-2 animate-marquee whitespace-nowrap">
          <Quote className="h-4 w-4 text-amber-200 shrink-0" />
          {thirukkuralText.map((text, i) => (
            <span key={i} className="font-semibold px-4 border-r border-amber-500/30">{text}</span>
          ))}
          <Quote className="h-4 w-4 text-amber-200 shrink-0 rotate-180" />
          {/* Duplicate for seamless loop */}
          <Quote className="h-4 w-4 text-amber-200 shrink-0" />
          {thirukkuralText.map((text, i) => (
            <span key={`dup-${i}`} className="font-semibold px-4 border-r border-amber-500/30">{text}</span>
          ))}
          <Quote className="h-4 w-4 text-amber-200 shrink-0 rotate-180" />
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
        `}</style>
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-uyir-600 to-uyir-700 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">About UYIR</h1>
          <p className="text-xl md:text-2xl text-uyir-100 mb-2">உயிர் - Tamil Nadu's Lifesaving Blood Network</p>
          <p className="text-lg text-uyir-200 max-w-3xl mx-auto">
            Connecting donors with those in need, every drop counts in saving lives across Tamil Nadu
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Our Noble Mission</h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            UYIR (உயிர்) means "Life" in Tamil. We are on a mission to ensure no life is lost due to blood shortage in Tamil Nadu. 
            Our platform connects voluntary blood donors with patients in critical need, leveraging technology to bridge the gap between those who can give and those who need.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Heart className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Save Lives</h3>
            <p className="text-slate-600 text-center">
              Every donation can save up to 3 lives. Our platform ensures blood reaches those who need it most during emergencies.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Connect Community</h3>
            <p className="text-slate-600 text-center">
              Building a network of voluntary donors across Tamil Nadu, ready to respond to blood emergencies in their communities.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Shield className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Verified & Safe</h3>
            <p className="text-slate-600 text-center">
              AI-powered verification ensures all requests are genuine. No monetary transactions - pure voluntary donation.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-slate-100 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">How UYIR Saves Lives</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-uyir-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-bold text-slate-800 mb-2">Request Blood</h3>
              <p className="text-sm text-slate-600">Patient or hospital submits verified blood request with details</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-uyir-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-bold text-slate-800 mb-2">AI Verification</h3>
              <p className="text-sm text-slate-600">AI verifies documents and urgency to prevent fraud</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-uyir-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-bold text-slate-800 mb-2">Alert Donors</h3>
              <p className="text-sm text-slate-600">Nearby donors receive real-time alerts based on location</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-uyir-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
              <h3 className="font-bold text-slate-800 mb-2">Save Life</h3>
              <p className="text-sm text-slate-600">Donor reaches hospital, donates blood, saves a life</p>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Our Impact</h2>
        
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6 text-center">
            <div className="text-4xl font-extrabold mb-2">500+</div>
            <div className="text-red-100">Lives Saved</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 text-center">
            <div className="text-4xl font-extrabold mb-2">1000+</div>
            <div className="text-blue-100">Registered Donors</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 text-center">
            <div className="text-4xl font-extrabold mb-2">32</div>
            <div className="text-emerald-100">Districts Covered</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 text-center">
            <div className="text-4xl font-extrabold mb-2">15 min</div>
            <div className="text-purple-100">Avg Response Time</div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="bg-slate-100 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Our Core Values</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-uyir-100 rounded-lg flex items-center justify-center shrink-0">
                <Globe className="h-6 w-6 text-uyir-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Voluntary & Free</h3>
                <p className="text-slate-600">Blood donation is voluntary and unpaid. No money changes hands - it's about saving lives, not profit.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-uyir-100 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-uyir-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Rapid Response</h3>
                <p className="text-slate-600">AI-powered matching and real-time alerts ensure donors reach patients within critical time windows.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-uyir-100 rounded-lg flex items-center justify-center shrink-0">
                <Award className="h-6 w-6 text-uyir-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Trust & Transparency</h3>
                <p className="text-slate-600">Verified requests, donor ratings, and complete tracking build trust in the system.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-uyir-100 rounded-lg flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-uyir-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Community First</h3>
                <p className="text-slate-600">Built for Tamil Nadu, by Tamil Nadu. Local language support and district-wise networks.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Get In Touch</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Contact Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-uyir-100 rounded-lg flex items-center justify-center">
                  <Phone className="h-5 w-5 text-uyir-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Emergency Helpline</p>
                  <p className="font-semibold text-slate-800">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-uyir-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-uyir-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-semibold text-slate-800">help@uyir.org</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-uyir-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-uyir-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Headquarters</p>
                  <p className="font-semibold text-slate-800">Chennai, Tamil Nadu, India</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <a href="#" className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:from-purple-600 hover:to-pink-600">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center hover:bg-sky-600">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Send us a Message</h3>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input type="text" className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-uyir-500 outline-none" placeholder="Your name" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-uyir-500 outline-none" placeholder="your@email.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea rows={4} className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-uyir-500 outline-none" placeholder="How can we help?"></textarea>
              </div>
              
              <button className="w-full bg-uyir-600 text-white py-3 rounded-lg font-semibold hover:bg-uyir-700 transition">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CTA - Save a Life */}
      <div className="bg-gradient-to-r from-uyir-600 to-uyir-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Droplet className="h-12 w-12 mx-auto mb-4 fill-white/20" />
          <h2 className="text-3xl font-bold mb-4">Save a Life - Sign Up Today</h2>
          <p className="text-xl text-uyir-100 mb-8">
            Every 2 seconds, someone needs blood. Your one donation can save up to 3 lives. Join UYIR's network of lifesavers across Tamil Nadu.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/")}
              className="bg-white text-uyir-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition flex items-center justify-center gap-2"
            >
              Sign Up as Donor <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("/donate-request")}
              className="bg-uyir-800 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-uyir-900 transition"
            >
              Request Blood
            </button>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
