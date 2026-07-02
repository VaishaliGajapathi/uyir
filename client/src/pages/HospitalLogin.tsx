import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LogIn } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Input, Card } from "../components/ui";

const SUPPORT_EMAIL = "support@uyirngo.in";

export function HospitalLogin() {
  const nav = useNavigate();
  const { login } = useApp();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    mobile: "",
    password: "",
  });
  const [err, setErr] = useState("");

  async function handleLogin() {
    if (!form.mobile || !form.password) {
      setErr("Mobile and password are required");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const res = await api.login(form.mobile, form.password);
      if (res.user.role !== "hospital") {
        setErr("This account is not a hospital approver");
        return;
      }
      login(res.token, res.user);
      nav("/hospital-dashboard");
    } catch (e: any) {
      setErr(`${e.message || "Login failed"} If the issue persists, contact: ${SUPPORT_EMAIL}`);
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Mobile Number</label>
            <Input
              placeholder="Enter mobile number"
              inputMode="numeric"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <Input
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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

      <div className="mt-4 text-center text-xs text-slate-400">
        Still having queries? <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-uyir-600 hover:underline">{SUPPORT_EMAIL}</a>
      </div>
    </div>
  );
}
export default HospitalLogin;
