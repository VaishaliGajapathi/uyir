import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date): string {
  const d = new Date(date).getTime();
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const emergencyMeta: Record<string, { label: string; labelTa: string; color: string; ring: string }> = {
  red: { label: "Immediate", labelTa: "உடனடி", color: "bg-uyir-600 text-white", ring: "ring-uyir-500" },
  orange: { label: "6 Hours", labelTa: "6 மணி", color: "bg-orange-500 text-white", ring: "ring-orange-400" },
  green: { label: "24 Hours", labelTa: "24 மணி", color: "bg-emerald-600 text-white", ring: "ring-emerald-400" },
};

export const statusMeta: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-200 text-slate-700" },
  pending_verification: { label: "Pending Verification", color: "bg-amber-100 text-amber-700" },
  verified: { label: "Verified", color: "bg-emerald-100 text-emerald-700" },
  alert_sent: { label: "Alert Sent", color: "bg-blue-100 text-blue-700" },
  donor_accepted: { label: "Donor Accepted", color: "bg-violet-100 text-violet-700" },
  completed: { label: "Completed", color: "bg-emerald-600 text-white" },
  closed: { label: "Closed", color: "bg-slate-300 text-slate-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
};
