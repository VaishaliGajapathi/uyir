import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Phone, MapPin, User, Lock } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Input } from "../components/ui";
import { BLOOD_GROUPS, TN_DISTRICTS, t } from "../lib/constants";

export default function HospitalRegister() {
  const { login, lang } = useApp();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    hospitalName: "",
    hospitalRegistrationId: "",
    district: "",
    address: "",
    phone: "",
    contactPerson: "",
    contactMobile: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hospitalName || !form.hospitalRegistrationId || !form.district || !form.contactPerson || !form.contactMobile || !form.password) {
      alert(lang === "ta" ? "அனைத்து தேவையான புலங்களையும் நிரப்பவும்" : "Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const r = await api.hospitalRegister(form);
      login(r.token, r.user);
      nav("/hospital-dashboard");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <Building2 className="mx-auto h-16 w-16 text-uyir-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-800">
            {lang === "ta" ? "மருத்துவமனை பதிவு" : "Hospital Registration"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {lang === "ta" ? "UYIR இரத்த வங்கியுடன் உங்கள் மருத்துவமனையை பதிவு செய்யவும்" : "Register your hospital with UYIR Blood Bank"}
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "மருத்துவமனை பெயர் *" : "Hospital Name *"}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-200 pl-10 pr-3 py-2 text-sm"
                  placeholder={lang === "ta" ? "மருத்துவமனை பெயர்" : "Hospital Name"}
                  value={form.hospitalName}
                  onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "பதிவு எண் *" : "Registration ID *"}
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={lang === "ta" ? "மருத்துவமனை பதிவு எண்" : "Hospital Registration ID"}
                value={form.hospitalRegistrationId}
                onChange={(e) => setForm({ ...form, hospitalRegistrationId: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "மாவட்டம் *" : "District *"}
              </label>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              >
                <option value="">{lang === "ta" ? "தேர்வு செய்யவும்" : "Select"}</option>
                {TN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "முகவரி" : "Address"}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-200 pl-10 pr-3 py-2 text-sm"
                  placeholder={lang === "ta" ? "மருத்துவமனை முகவரி" : "Hospital Address"}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "தொலைபேசி" : "Phone"}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  className="w-full rounded-md border border-slate-200 pl-10 pr-3 py-2 text-sm"
                  placeholder={lang === "ta" ? "மருத்துவமனை தொலைபேசி" : "Hospital Phone"}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "தொடர்பு நபர் *" : "Contact Person *"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-200 pl-10 pr-3 py-2 text-sm"
                  placeholder={lang === "ta" ? "பெயர்" : "Contact Person Name"}
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "தொடர்பு மொபைல் *" : "Contact Mobile *"}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  className="w-full rounded-md border border-slate-200 pl-10 pr-3 py-2 text-sm"
                  placeholder={lang === "ta" ? "மொபைல் எண்" : "Mobile Number"}
                  value={form.contactMobile}
                  onChange={(e) => setForm({ ...form, contactMobile: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                {lang === "ta" ? "கடவுச்சொல் *" : "Password *"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-200 pl-10 pr-3 py-2 text-sm"
                  placeholder={lang === "ta" ? "கடவுச்சொல்" : "Password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <Button className="w-full" loading={loading} type="submit">
              {lang === "ta" ? "பதிவு செய்" : "Register"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => nav("/hospital-login")}
              className="text-sm text-uyir-600 hover:underline"
            >
              {lang === "ta" ? "ஏற்கனவே பதிவு செய்துள்ளீர்களா? உள்நுழையவும்" : "Already registered? Login"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
