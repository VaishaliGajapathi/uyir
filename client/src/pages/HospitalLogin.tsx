import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogIn } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Input, Card } from "../components/ui";

export function HospitalLogin() {
  const nav = useNavigate();
  const { login } = useApp();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    hospitalName: "",
    hospitalRegistrationId: "",
    mobile: "",
  });
  const [err, setErr] = useState("");

  async function handleLogin() {
    if (!form.hospitalName || !form.hospitalRegistrationId) {
      setErr("Hospital name and registration ID are required");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const res = await api.hospitalLogin(form);
      login(res.token, res.user);
      nav("/hospital-dashboard");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-uyir-100 text-uyir-700">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Hospital Approver Login</h1>
          <p className="mt-2 text-sm text-slate-500">Verify blood requests from your hospital</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Name</label>
            <Input
              placeholder="Enter hospital name"
              value={form.hospitalName}
              onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Registration ID</label>
            <Input
              placeholder="Enter registration ID"
              value={form.hospitalRegistrationId}
              onChange={(e) => setForm({ ...form, hospitalRegistrationId: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mobile Number (Optional)</label>
            <Input
              placeholder="Enter mobile number"
              inputMode="numeric"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          {err && <p className="text-sm text-uyir-600">{err}</p>}

          <Button className="w-full" size="lg" loading={busy} onClick={handleLogin}>
            <LogIn className="h-4 w-4" /> Login as Hospital Approver
          </Button>

          <div className="pt-4 text-center">
            <button
              onClick={() => nav("/")}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back to main app
            </button>
            <div className="mt-3">
              <button
                onClick={() => nav("/hospital-register")}
                className="text-sm font-semibold text-uyir-600 hover:underline"
              >
                New hospital? Register here
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
export default HospitalLogin;
