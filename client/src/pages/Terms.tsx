import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Shield, AlertTriangle, Gavel, Heart } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { Card } from "../components/ui";

export function Terms() {
  const { lang, user } = useApp();
  const nav = useNavigate();

  const handleBack = () => {
    if (user) {
      nav(-1);
    } else {
      nav("/");
    }
  };

  return (
    <div className="px-4 py-4">
      <header className="mb-4 flex items-center gap-3 py-4">
        <button onClick={handleBack}><ArrowLeft className="h-6 w-6 text-slate-700" /></button>
        <h1 className="text-xl font-extrabold text-slate-800">
          {lang === "ta" ? "விதிமுறைகள் மற்றும் நிபந்தனைகள்" : "Terms & Conditions"}
        </h1>
      </header>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-uyir-600" />
            <h2 className="text-lg font-bold text-slate-800">
              {lang === "ta" ? "UYIR - தமிழ்நாடு சரிபார்க்கப்பட்ட இரத்தம் மற்றும் தட்டுசெல்லுலின் அவசர நெட்வொர்க்" : "UYIR - Tamil Nadu Verified Blood & Platelet Emergency Network"}
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === "ta"
              ? "இந்த விதிமுறைகள் மற்றும் நிபந்தனைகள் UYIR தளத்தைப் பயன்படுத்தும் ஒவ்வொரு பயனருக்கும் பொருந்தும் சட்டபூர்வமான ஒப்பந்தமாகும். பதிவு செய்வது, கோரிக்கை எழுப்புவது, தானம் செய்ய முன்வருவது அல்லது தளத்தின் எந்த வசதியையும் பயன்படுத்துவது மூலம், நீங்கள் இவ்விதிமுறைகளை முழுமையாக ஏற்றுக்கொள்கிறீர்கள்."
              : "These Terms & Conditions are a legally binding agreement between every user and the UYIR platform. By registering, raising a request, volunteering as a donor, responding to an emergency, or using any feature of this platform, you confirm that you have read, understood, and agreed to these terms in full."}
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "1. இரத்த தானம் - முற்றிலும் இலவசம்" : "1. Blood Donation - Strictly Voluntary"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            {lang === "ta"
              ? "UYIR தளத்தில் ஏற்படும் ஒவ்வொரு இரத்த மற்றும் தட்டுச்சல் தானமும் முற்றிலும் தன்னார்வமானது, இலவசமானது, மனிதாபிமான நோக்கத்திற்காக மட்டுமே நடத்தப்பட வேண்டும். தானம் செய்யும் நபரிடம், நோயாளி குடும்பத்திடம், மருத்துவமனை தொடர்பாளரிடம் அல்லது எந்த மூன்றாம் நபரிடமும் பணம், கமிஷன், பரிசு, போக்குவரத்து கட்டணம் என்ற பெயரில் கூட கட்டாயமாக தொகை கேட்பது கடுமையாகத் தடைசெய்யப்படுகிறது."
              : "Every blood or platelet donation facilitated through UYIR must be strictly voluntary, unpaid, and performed only for humanitarian life-saving purposes. No donor, requester, hospital contact, volunteer, broker, or third party may demand, collect, offer, negotiate, or imply payment, commission, reward, transport fee, service charge, or any other monetary benefit in exchange for blood or platelet donation."}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === "ta"
              ? "இரத்தத்திற்கு பணம் கேட்பது அல்லது வழங்குவது சட்டவிரோதமான செயலாகும். இத்தகைய செயல்களில் ஈடுபடுபவர்கள் தளத்திலிருந்து உடனடியாக தடைசெய்யப்படலாம், அவர்களின் கணக்கு, மொபைல் எண், கோரிக்கைகள், உரையாடல்கள் மற்றும் ஆதாரங்கள் பாதுகாக்கப்பட்டு உரிய அதிகாரிகள் அல்லது சட்ட அமலாக்க அமைப்புகளுக்கு அளிக்கப்படலாம்."
              : "Requesting or offering money for blood may be unlawful and may expose the involved parties to serious legal consequences. UYIR may immediately suspend or permanently ban such users, preserve account details, phone numbers, request records, communication history, reports, and supporting evidence, and share them with competent authorities or law enforcement when required."}
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "2. மோசடி தடுப்பு" : "2. Fraud Prevention"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            {lang === "ta"
              ? "போலி நோயாளி விவரங்கள், போலி மருத்துவமனை பெயர்கள், போலி ஆவணங்கள், தவறான அவசர நிலை, பல முறை ஒரே கோரிக்கையை உருவாக்குதல், பிறர் பெயரில் கணக்கு பயன்படுத்துதல், அல்லது தானர்களை ஏமாற்றும் எந்த செயல்பாடும் கடுமையான மோசடியாக கருதப்படும்."
              : "Fake patient details, false hospital names, forged documents, misleading emergency claims, duplicate requests, account impersonation, misuse of another person’s identity, or any attempt to deceive donors, requesters, hospitals, or volunteers will be treated as serious fraud and platform abuse."}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === "ta"
              ? "UYIR தளம் AI, ஆவண சரிபார்ப்பு, மருத்துவமனை சரிபார்ப்பு, பயனர் புகார், செயல்பாட்டு வரலாறு போன்ற பல அடுக்குகள் மூலம் மோசடியை கண்டறியலாம். சந்தேகமான கணக்குகள் தற்காலிகமாக முடக்கப்படலாம்; உறுதியான மோசடி நிரூபிக்கப்பட்டால் நிரந்தர தடை மற்றும் சட்ட நடவடிக்கை எடுக்கப்படும்."
              : "UYIR may use AI screening, document checks, hospital verification, community reports, activity history, and manual review to detect fraud. Suspicious accounts may be temporarily restricted during investigation. Confirmed fraud may result in permanent bans, escalation to administrators, and appropriate legal or institutional action."}
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "3. சட்ட பொறுப்பு" : "3. Legal Liability"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            {lang === "ta"
              ? "UYIR என்பது அவசர இரத்த மற்றும் தட்டுச்சல் தேவைகளில் தானர்கள், கோருபவர்கள், மருத்துவமனை தொடர்பாளர்கள் மற்றும் தன்னார்வலர்களை இணைக்கும் தொழில்நுட்ப தளம் மட்டுமே. UYIR மருத்துவமனை அல்ல, இரத்த வங்கி அல்ல, மருத்துவ ஆலோசனை வழங்கும் அமைப்பு அல்ல, மற்றும் எந்த மருத்துவ சிகிச்சையையும் நேரடியாக நடத்தாது."
              : "UYIR is a technology platform that connects donors, requesters, hospital contacts, and volunteers during blood and platelet emergencies. UYIR is not a hospital, blood bank, diagnostic center, medical advisory service, or direct healthcare provider, and it does not perform or supervise any medical procedure."}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === "ta"
              ? "தானம் செய்வதற்கு முன் தானர் தனது உடல்நிலை, வயது, ஹீமோகுளோபின் அளவு, சமீபத்திய நோய், மருந்து பயன்பாடு, கர்ப்பம், அறுவை சிகிச்சை வரலாறு போன்றவற்றை மருத்துவ நிபுணர்களிடம் வெளிப்படையாக தெரிவிக்க வேண்டும். அனுமதிக்கப்பட்ட மருத்துவமனை, இரத்த வங்கி அல்லது தகுதி பெற்ற மருத்துவ மேற்பார்வையில் மட்டுமே தானம் செய்ய வேண்டும்."
              : "Before donating, every donor must truthfully disclose health condition, age, hemoglobin level, recent illness, medication use, pregnancy, surgery history, and any other relevant medical information to qualified medical staff. Donation must take place only at authorized hospitals, licensed blood banks, or under qualified medical supervision."}
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "4. தனியுரிமை மற்றும் தரவு" : "4. Privacy & Data"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            {lang === "ta"
              ? "UYIR உங்கள் பெயர், மொபைல் எண், இருப்பிடம், இரத்த வகை, தான வரலாறு, ஆவண சரிபார்ப்பு தகவல், மருத்துவ தொடர்புடைய சுயவிவர தகவல் போன்றவற்றை அவசர இரத்த தான சேவைக்காக சேமிக்கலாம். இத்தகவல்கள் தேவையான தானர்கள், கோருபவர்கள், மருத்துவமனை சரிபார்ப்பாளர்கள், நிர்வாகிகள் அல்லது சட்டப்படி தேவையான அதிகாரிகளுடன் மட்டுமே பகிரப்படும்."
              : "UYIR may collect and store your name, mobile number, location, blood group, donation history, verification documents, health-related profile information, request details, and response activity for emergency coordination, safety, verification, fraud prevention, and service improvement. Information is shared only with necessary donors, requesters, hospital verifiers, administrators, or lawful authorities when required."}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {lang === "ta"
              ? "உங்கள் தகவல்களை பாதுகாப்பாக வைத்திருக்க தொழில்நுட்ப மற்றும் நிர்வாக பாதுகாப்பு முறைகள் பயன்படுத்தப்படும். இருப்பினும், எந்த இணைய தளமும் முழுமையான பாதுகாப்பை உறுதி செய்ய முடியாது என்பதை பயனர் புரிந்துகொள்கிறார். தவறான தகவல் வழங்குதல், பிறரின் தகவலை தவறாகப் பயன்படுத்துதல், அல்லது அனுமதியின்றி தகவல் பகிர்வு செய்தல் தடைசெய்யப்பட்டுள்ளது."
              : "We use technical and administrative safeguards to protect user information. However, users understand that no digital platform can guarantee absolute security. Submitting false data, misusing another person’s information, unauthorized sharing of contact details, or using collected information for harassment, marketing, brokerage, or monetary gain is strictly prohibited."}
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-600" />
            <h3 className="font-bold text-slate-800">
              {lang === "ta" ? "5. பயனர் பொறுப்பு" : "5. User Responsibilities"}
            </h3>
          </div>
          <ul className="text-sm text-slate-600 leading-relaxed space-y-2 list-disc list-inside">
            {lang === "ta" ? (
              <>
                <li>சரியான தகவல்களை வழங்கவும்</li>
                <li>மருத்துவமனையில் மட்டுமே இரத்தம் தானம் செய்யவும்</li>
                <li>மோசடி செய்பவர்களை அறிவியுங்கள்</li>
                <li>இரத்த தானத்திற்கு உடல் நலமாக இருங்கள்</li>
              </>
            ) : (
              <>
                <li>Provide accurate information</li>
                <li>Donate only at authorized hospitals</li>
                <li>Report fraudulent activity</li>
                <li>Be in good health before donating</li>
              </>
            )}
          </ul>
        </Card>

        <Card className="bg-uyir-50 p-4">
          <p className="text-sm font-semibold text-uyir-800">
            {lang === "ta"
              ? "இந்த தளத்தைப் பயன்படுத்துவதன் மூலம், நீங்கள் இந்த விதிமுறைகளுக்கு ஒப்புக்கொள்கிறீர்கள்."
              : "By using this platform, you agree to these terms and conditions."}
          </p>
        </Card>
      </div>
    </div>
  );
}
export default Terms;
