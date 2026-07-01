// Tests the document vision verification path (fal.ai OpenRouter vision).
// Creates a throwaway request, uploads a small image, and reports the AI result.
// Usage: BASE=... MOBILE=... PASSWORD=... node scripts/test-doc-verify.mjs

const BASE = process.env.BASE || "https://uyirproduction.onrender.com";
const MOBILE = process.env.MOBILE, PASSWORD = process.env.PASSWORD;

async function req(method, path, { token, json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { method, headers, body: json ? JSON.stringify(json) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// 1x1 white PNG
const PNG_1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

const login = await req("POST", "/api/auth/login", { json: { mobile: MOBILE, password: PASSWORD } });
if (login.status !== 200) { console.error("Login failed:", login.data); process.exit(1); }
const token = login.data.token;
console.log("Logged in as", login.data.user?.name);

const create = await req("POST", "/api/requests", { token, json: {
  patientName: "Test Patient", bloodGroup: "O+", componentType: "whole_blood", unitsRequired: 1,
  hospitalName: "Apollo Hospital", district: "Chennai", contactPerson: "Test", contactNumber: "9384208281",
  emergencyLevel: "green",
}});
if (create.status !== 201) { console.error("Create failed:", create.status, create.data); process.exit(1); }
const reqId = create.data.id;
console.log("Created throwaway request:", reqId);

console.log("\nUploading test image to document verifier (fal.ai vision)...");
const up = await req("POST", `/api/requests/${reqId}/documents`, { token, json: {
  base64: PNG_1x1, mimeType: "image/png", documentType: "admission_slip",
}});
console.log("Upload status:", up.status);
console.log("AI result:", JSON.stringify(up.data?.ai, null, 2));

const notes = String(up.data?.ai?.notes || "");
if (notes.includes("could not run")) {
  console.log("\n\x1b[31mVISION PATH FAILED\x1b[0m — fal.ai vision did not run (fell back). Check model names/endpoint.");
} else if (up.status === 201 && up.data?.ai) {
  console.log("\n\x1b[32mVISION PATH WORKS\x1b[0m — fal.ai vision analyzed the image and returned a real score.");
} else {
  console.log("\n\x1b[33mUNCLEAR\x1b[0m — inspect response above.");
}

// Close the throwaway request to keep things tidy.
await req("POST", `/api/requests/${reqId}/close`, { token });
console.log("Closed throwaway request:", reqId);
