import { Phone, Mail, MapPin, Clock, Send, Facebook, Instagram, Twitter, Linkedin } from "lucide-react";

export function ContactUs() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-uyir-600 to-uyir-700 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-xl md:text-2xl text-uyir-100 mb-2">உயிர் - We're Here to Help</p>
          <p className="text-lg text-uyir-200 max-w-3xl mx-auto">
            Have questions? Need support? Reach out to us anytime
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Phone className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Emergency Helpline</h3>
            <p className="text-2xl font-extrabold text-uyir-600 mb-2">+91 98765 43210</p>
            <p className="text-sm text-slate-500">24/7 Available</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Email Support</h3>
            <p className="text-lg font-semibold text-slate-700 mb-2">help@uyir.org</p>
            <p className="text-sm text-slate-500">Response within 24 hours</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <MapPin className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Headquarters</h3>
            <p className="text-sm text-slate-700 mb-2">Chennai, Tamil Nadu</p>
            <p className="text-sm text-slate-500">India</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Send us a Message</h2>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:border-uyir-500 outline-none transition" 
                  placeholder="Enter your name" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input 
                  type="email" 
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:border-uyir-500 outline-none transition" 
                  placeholder="your@email.com" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:border-uyir-500 outline-none transition" 
                  placeholder="+91 98765 43210" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                <select className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:border-uyir-500 outline-none transition">
                  <option value="">Select a topic</option>
                  <option value="donation">Blood Donation Inquiry</option>
                  <option value="request">Blood Request Help</option>
                  <option value="technical">Technical Support</option>
                  <option value="partnership">Partnership Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                <textarea 
                  rows={5} 
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 focus:border-uyir-500 outline-none transition resize-none" 
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-uyir-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-uyir-700 transition flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" /> Send Message
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {/* Office Hours */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-uyir-600" />
                <h3 className="text-xl font-bold text-slate-800">Office Hours</h3>
              </div>
              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="font-semibold">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-semibold">10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="font-semibold">Closed</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Emergency helpline is available 24/7 for urgent blood requests
              </p>
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Follow Us</h3>
              <p className="text-slate-600 mb-4">Stay updated with our latest activities and success stories</p>
              <div className="flex gap-4">
                <a href="#" className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition">
                  <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:from-purple-600 hover:to-pink-600 transition">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center hover:bg-sky-600 transition">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="w-12 h-12 bg-blue-700 text-white rounded-full flex items-center justify-center hover:bg-blue-800 transition">
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="bg-gradient-to-r from-uyir-600 to-uyir-700 text-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-2">Have Questions?</h3>
              <p className="text-uyir-100 mb-4">Check our FAQ section for quick answers to common questions</p>
              <button className="bg-white text-uyir-600 px-6 py-2 rounded-lg font-semibold hover:bg-slate-100 transition">
                View FAQ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-slate-100 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-8">Find Us</h2>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="w-full h-80 bg-slate-200 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500">Interactive Map</p>
                <p className="text-sm text-slate-400">Chennai, Tamil Nadu, India</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-400 mb-2">© 2024 UYIR - Tamil Nadu Blood & Platelet Emergency Network</p>
          <p className="text-sm text-slate-500">Saving lives, one drop at a time. உயிர் - உயிரைக் காப்போம்</p>
        </div>
      </div>
    </div>
  );
}
