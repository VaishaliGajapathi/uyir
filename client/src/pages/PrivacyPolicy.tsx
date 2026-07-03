import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Database, MapPin, Phone, Droplet, Lock, Eye, Share2, Trash2, Mail, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { Card } from "../components/ui";
import { SiteNav } from "../components/SiteNav";
import { SiteFooter } from "../components/SiteFooter";

export function PrivacyPolicy() {
  const { lang, user } = useApp();
  const nav = useNavigate();

  const handleBack = () => {
    if (user) { nav(-1); } else { nav("/"); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <button onClick={handleBack}><ArrowLeft className="h-6 w-6 text-slate-700" /></button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <Shield className="h-6 w-6 text-uyir-600" />
              {lang === "ta" ? "தனியுரிமை கொள்கை" : "Privacy Policy"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {lang === "ta" ? "கடைசியாக புதுப்பிக்கப்பட்டது: ஜூலை 2026" : "Last updated: July 2026"}
            </p>
          </div>
        </header>

        <Card className="mb-4 p-4 bg-uyir-50 border-uyir-100">
          <p className="text-sm text-slate-700 leading-relaxed">
            {lang === "ta"
              ? "UYIR (உயிர்) தளத்தைப் பயன்படுத்துவதன் மூலம், இந்த தனியுரிமை கொள்கையின்படி உங்கள் தகவல்கள் சேகரிக்கப்படுவதையும் பயன்படுத்தப்படுவதையும் நீங்கள் ஏற்றுக்கொள்கிறீர்கள்."
              : "By using the UYIR platform, you consent to the collection and use of your information as described in this Privacy Policy."}
          </p>
        </Card>

        {/* What We Collect */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-uyir-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "1. நாங்கள் என்ன தகவல் சேகரிக்கிறோம்" : "1. Information We Collect"}
            </h3>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "மொபைல் எண்" : "Mobile Number"}</p>
                <p>{lang === "ta" ? "OTP சரிபார்ப்பு, உள்நுழைவு, அவசர அறிவிப்புகளுக்காக." : "For OTP verification, login, and emergency notifications."}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Droplet className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "பெயர்" : "Name"}</p>
                <p>{lang === "ta" ? "அடையாளம் மற்றும் தானச் சான்றிதழுக்காக." : "For identification and donation certificates."}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Droplet className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "இரத்த வகை" : "Blood Group"}</p>
                <p>{lang === "ta" ? "தானம் மற்றும் கோரிக்கை பொருத்தத்திற்காக." : "For matching donors with blood requests."}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "வயது" : "Age"}</p>
                <p>{lang === "ta" ? "தான தகுதி சரிபார்ப்புக்காக (18-65)." : "For donor eligibility check (18-65 years)."}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "இருப்பிடம் (GPS)" : "Location (GPS)"}</p>
                <p>{lang === "ta" ? "அருகிலுள்ள தானர்களைக் கண்டறிய GPS ஆயத்த தீர்க்கோடு மற்றும் அகலம்." : "GPS latitude and longitude to find nearby donors during emergencies."}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "மாவட்டம் மற்றும் பின்கோடு" : "District & Pincode"}</p>
                <p>{lang === "ta" ? "பகுதி அடிப்படையில் தானர் பொருத்தத்திற்காக." : "For area-based donor matching and district filtering."}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Droplet className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "தான வரலாறு" : "Donation History"}</p>
                <p>{lang === "ta" ? "தான தேதி, மருத்துவமனை பெயர், சான்றிதழ் விவரங்கள்." : "Donation date, hospital name, and certificate details."}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{lang === "ta" ? "கடவுச்சொல்" : "Password"}</p>
                <p>{lang === "ta" ? "பத்திரமாக ஹாஷ் செய்யப்பட்டு சேமிக்கப்படுகிறது." : "Securely hashed and stored. Never stored in plain text."}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* How We Use */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-uyir-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "2. தகவல்களை எவ்வாறு பயன்படுத்துகிறோம்" : "2. How We Use Your Information"}
            </h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
            {lang === "ta" ? (
              <>
                <li>அவசர நேரத்தில் அருகிலுள்ள தானர்களுக்கு அறிவிப்பு அனுப்ப</li>
                <li>இரத்த வகை மற்றும் இருப்பிட அடிப்படையில் தானர்களைப் பொருத்த</li>
                <li>தானச் சான்றிதழ் வழங்க</li>
                <li>மோசடி தடுப்பு மற்றும் பயனர் சரிபார்ப்பு</li>
                <li>தள மேம்பாடு மற்றும் பகுப்பாய்வு</li>
                <li>பிரச்சாரம் மற்றும் இரத்த தான முகாம் அறிவிப்புகள்</li>
              </>
            ) : (
              <>
                <li>Send emergency alerts to nearby donors during blood crises</li>
                <li>Match donors based on blood group and location proximity</li>
                <li>Generate donation certificates</li>
                <li>Fraud prevention and user verification</li>
                <li>Platform improvement and analytics</li>
                <li>Campaign and blood donation camp notifications</li>
              </>
            )}
          </ul>
        </Card>

        {/* Data Storage */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "3. தரவு சேமிப்பு மற்றும் பாதுகாப்பு" : "3. Data Storage & Security"}
            </h3>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p>{lang === "ta" ? "தரவு PostgreSQL தரவுத்தளத்தில் பாதுகாப்பாக சேமிக்கப்படுகிறது." : "Data is stored securely in a PostgreSQL database."}</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p>{lang === "ta" ? "அனைத்து தகவல்களும் HTTPS/TLS குறியாக்கத்துடன் பரிமாறப்படுகின்றன." : "All data in transit is encrypted via HTTPS/TLS."}</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p>{lang === "ta" ? "கடவுச்சொற்கள் bcrypt மூலம் ஹாஷ் செய்யப்படுகின்றன." : "Passwords are hashed using bcrypt — never stored in plain text."}</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p>{lang === "ta" ? "OTP MSG91 மூலம் பாதுகாப்பாக அனுப்பப்படுகிறது." : "OTP is sent securely via MSG91 service."}</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p>{lang === "ta" ? "சேவையகங்கள் இந்தியாவில் ஹோஸ்ட் செய்யப்படுகின்றன." : "Servers are hosted in India."}</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p>{lang === "ta" ? "எந்த இணைய தளமும் 100% பாதுகாப்பை உறுதி செய்ய முடியாது." : "No digital platform can guarantee 100% absolute security."}</p>
            </div>
          </div>
        </Card>

        {/* Who We Share With */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "4. யாருடன் தகவல் பகிர்கிறோம்" : "4. Who We Share Information With"}
            </h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
            {lang === "ta" ? (
              <>
                <li><strong>மருத்துவமனை / இரத்த வங்கி:</strong> அவசர நேரத்தில் உங்கள் பெயர், மொபைல் எண், இரத்த வகை</li>
                <li><strong>கோருபவர்:</strong> தானரின் பெயர் மற்றும் மொபைல் எண் (அவசர நேரத்தில் மட்டும்)</li>
                <li><strong>நிர்வாகிகள்:</strong> மோசடி தடுப்பு, சரிபார்ப்பு, தள நிர்வாகம்</li>
                <li><strong>MSG91:</strong> OTP சேவைக்காக மொபைல் எண் மட்டும்</li>
                <li><strong>சட்ட அமலாக்க அமைப்புகள்:</strong> சட்டப்படி தேவைப்படும்போது மட்டும்</li>
              </>
            ) : (
              <>
                <li><strong>Hospitals / Blood Banks:</strong> Your name, mobile number, and blood group during emergencies</li>
                <li><strong>Requestors:</strong> Donor's name and mobile number (only during active emergency)</li>
                <li><strong>Administrators:</strong> For fraud prevention, verification, and platform management</li>
                <li><strong>MSG91:</strong> Mobile number only, for OTP delivery</li>
                <li><strong>Law Enforcement:</strong> Only when legally required</li>
              </>
            )}
          </ul>
          <div className="mt-3 rounded-lg bg-amber-50 p-3">
            <p className="text-xs text-amber-800 font-medium">
              {lang === "ta"
                ? "நாங்கள் உங்கள் தகவல்களை விளம்பர நிறுவனங்களுக்கு விற்க மாட்டோம்."
                : "We never sell your data to advertising companies or third-party marketers."}
            </p>
          </div>
        </Card>

        {/* Your Rights */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-rose-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "5. உங்கள் உரிமைகள்" : "5. Your Rights"}
            </h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
            {lang === "ta" ? (
              <>
                <li>உங்கள் சுயவிவரத் தகவல்களை எந்த நேரத்திலும் புதுப்பிக்கலாம்</li>
                <li>இருப்பிட பகிர்வை இயக்க/முடக்கலாம்</li>
                <li>அறிவிப்புகளை அணைக்கலாம்</li>
                <li>கணக்கை நீக்க கோரலாம் (support@uyirngo.in க்கு மின்னஞ்சல் அனுப்பவும்)</li>
                <li>தான வரலாற்றைப் பார்க்கலாம்</li>
              </>
            ) : (
              <>
                <li>Update your profile information at any time</li>
                <li>Enable/disable location sharing</li>
                <li>Turn off notifications</li>
                <li>Request account deletion (email support@uyirngo.in)</li>
                <li>View your donation history</li>
              </>
            )}
          </ul>
        </Card>

        {/* Data Retention */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-violet-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "6. தரவு வைப்புக் காலம்" : "6. Data Retention"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === "ta"
              ? "உங்கள் கணக்கு செயலில் இருக்கும் வரை தகவல்கள் சேமிக்கப்படும். கணக்கை நீக்கினால், தனிப்பட்ட தகவல்கள் 30 நாட்களுக்குள் நீக்கப்படும். தான வரலாறு மற்றும் சான்றிதழ் பதிவுகள் சட்டப்படி தேவைப்படும் காலம் வரை வைக்கப்படலாம்."
              : "Your information is retained as long as your account is active. Upon account deletion request, personal data is removed within 30 days. Donation history and certificate records may be retained as required by law."}
          </p>
        </Card>

        {/* Children */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "7. சிறார்களின் தனியுரிமை" : "7. Children's Privacy"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === "ta"
              ? "UYIR தளம் 18 வயது மற்றும் அதற்கு மேற்பட்டவர்களுக்கானது. 18 வயதுக்குட்பட்டவர்கள் பதிவு செய்ய முடியாது. தான தகுதி வயது 18-65."
              : "UYIR is intended for users aged 18 and above. Users under 18 cannot register. Donor eligibility age is 18-65 years."}
          </p>
        </Card>

        {/* Contact */}
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5 text-uyir-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "8. தொடர்பு கொள்ள" : "8. Contact Us"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-2">
            {lang === "ta"
              ? "இந்த தனியுரிமை கொள்கை குறித்து கேள்விகள் இருந்தால்:"
              : "If you have questions about this Privacy Policy:"}
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-slate-700"><Mail className="inline h-4 w-4 mr-1 text-slate-400" /> <a href="mailto:support@uyirngo.in" className="text-uyir-600 hover:underline">support@uyirngo.in</a></p>
            <p className="text-slate-700"><Phone className="inline h-4 w-4 mr-1 text-slate-400" /> +91 9940874198</p>
          </div>
        </Card>

        <Card className="bg-uyir-50 p-4">
          <p className="text-sm font-semibold text-uyir-800 text-center">
            {lang === "ta"
              ? "இந்த தளத்தைப் பயன்படுத்துவதன் மூலம், நீங்கள் இந்த தனியுரிமை கொள்கைக்கு ஒப்புக்கொள்கிறீர்கள்."
              : "By using this platform, you agree to this Privacy Policy."}
          </p>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
export default PrivacyPolicy;
