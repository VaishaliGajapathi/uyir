import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle, Building2 } from "lucide-react";
import { api, type BloodRequest } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Button, Card, Badge, Spinner } from "../components/ui";
import { emergencyMeta, timeAgo } from "../lib/utils";

export function HospitalDashboard() {
  const { user, logout } = useApp();
  const nav = useNavigate();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadRequests() {
    setLoading(true);
    try {
      // Get pending verification requests for this hospital
      const allRequests = await api.listRequests({ status: "pending_verification" });
      // Filter by hospital name (case-insensitive)
      const hospitalRequests = allRequests.filter(
        (r) => r.hospitalName.toLowerCase() === user?.hospitalName?.toLowerCase()
      );
      setRequests(hospitalRequests);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "hospital") {
      loadRequests();
    }
  }, [user]);

  async function verifyRequest(requestId: string, approved: boolean, notes: string) {
    setBusy(true);
    try {
      await api.adminVerifyRequest(requestId, approved, notes);
      await loadRequests();
      alert(approved ? "Request verified successfully" : "Request rejected");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    logout();
    nav("/hospital-login");
  }

  if (user?.role !== "hospital") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md p-6 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="mb-2 text-lg font-bold text-slate-800">Access Denied</h2>
          <p className="mb-4 text-sm text-slate-500">This dashboard is only for hospital approvers.</p>
          <Button onClick={() => nav("/hospital-login")}>Go to Hospital Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4">
      <header className="mb-6 flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <img src={user?.facilityLogo || "/uyir-logo.png"} alt="Logo" className="h-14 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Hospital Dashboard</h1>
            <p className="text-sm text-slate-500">{user?.hospitalName}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </header>

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-uyir-600" />
          <div>
            <p className="font-bold text-slate-800">{user?.hospitalName}</p>
            <p className="text-xs text-slate-500">Registration ID: {user?.hospitalRegistrationId}</p>
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <h2 className="mb-3 text-lg font-bold text-slate-800">Pending Verifications</h2>
        {loading ? (
          <Spinner />
        ) : requests.length === 0 ? (
          <Card className="py-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No pending requests for verification</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const em = emergencyMeta[r.emergencyLevel] || emergencyMeta.orange;
              return (
                <Card key={r.id} className={`overflow-hidden ring-1 ${em.ring} ring-opacity-30`}>
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{r.patientName}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${em.color}`}>{em.label}</span>
                        </div>
                        <p className="text-sm text-slate-500">{r.bloodGroup} · {r.unitsRequired} unit(s) · {r.componentType.replace("_", " ")}</p>
                        <p className="text-xs text-slate-400">{r.hospitalName} · {timeAgo(r.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mb-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Contact:</span>
                        <span className="font-medium text-slate-800">{r.contactPerson} ({r.contactNumber})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Doctor Ref:</span>
                        <span className="font-medium text-slate-800">{r.doctorReference || "N/A"}</span>
                      </div>
                      {r.documents && r.documents.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Documents:</span>
                          <span className="font-medium text-slate-800">{r.documents.length} uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        loading={busy}
                        onClick={() => {
                          const notes = prompt("Add verification notes (optional):");
                          verifyRequest(r.id, true, notes || "");
                        }}
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        loading={busy}
                        onClick={() => {
                          const notes = prompt("Reason for rejection:");
                          if (notes) verifyRequest(r.id, false, notes);
                        }}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export default HospitalDashboard;
