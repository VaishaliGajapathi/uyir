// AI endpoint smoke test for UYIR.
// Usage:
//   BASE=https://uyirproduction.onrender.com TOKEN=<jwt> node scripts/test-ai-endpoints.mjs
//   BASE=https://uyirproduction.onrender.com MOBILE=9XXXXXXXXX PASSWORD=secret node scripts/test-ai-endpoints.mjs
//
// TOKEN takes precedence. If MOBILE+PASSWORD are given, the script logs in first.

const BASE = process.env.BASE || "https://uyirproduction.onrender.com";
let TOKEN = process.env.TOKEN || "";
const MOBILE = process.env.MOBILE || "";
const PASSWORD = process.env.PASSWORD || "";

const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m ${m}`);
const fail = (m) => console.log(`  \x1b[31mFAIL\x1b[0m ${m}`);
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

async function req(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function login() {
  if (TOKEN) return;
  if (!MOBILE || !PASSWORD) return;
  head("Logging in");
  const r = await req("POST", "/api/auth/login", { json: { mobile: MOBILE, password: PASSWORD } });
  if (r.status === 200 && r.data.token) { TOKEN = r.data.token; pass(`login ok, role=${r.data.user?.role}`); }
  else fail(`login failed: ${r.status} ${JSON.stringify(r.data)}`);
}

// Build a tiny valid WebM audio blob is non-trivial; we send a small buffer and
// accept either a transcription or a graceful error (endpoint reachability test).
function makeAudioForm() {
  const fd = new FormData();
  const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]); // EBML/WebM magic header
  fd.append("audio", new Blob([bytes], { type: "audio/webm" }), "test.webm");
  return fd;
}

async function main() {
  console.log(`Base URL: ${BASE}`);
  await login();

  head("1. GET /api/ai/status (public)");
  {
    const r = await req("GET", "/api/ai/status");
    if (r.status === 200) pass(`status ${r.status} → ${JSON.stringify(r.data)}`);
    else fail(`status ${r.status} → ${JSON.stringify(r.data)}`);
    if (r.data && r.data.fal === true) pass("fal.ai is configured");
    else fail("fal.ai NOT configured (FAL_KEY missing)");
  }

  if (!TOKEN) {
    head("Skipping authed endpoints — no TOKEN/login provided");
    console.log("Provide TOKEN=<jwt> or MOBILE=<m> PASSWORD=<p> to test the rest.");
    return;
  }

  head("2. POST /api/ai/parse-request (auth)");
  {
    const text = "Need 2 units of O positive blood for patient Raju at Apollo Hospital, Chennai. Urgent.";
    const r = await req("POST", "/api/ai/parse-request", { token: TOKEN, json: { text } });
    if (r.status === 200) {
      pass(`status 200 → ${JSON.stringify(r.data)}`);
      const d = r.data || {};
      if (d.bloodGroup) pass(`extracted bloodGroup=${d.bloodGroup}`); else fail("bloodGroup not extracted");
      if (d.unitsRequired) pass(`extracted units=${d.unitsRequired}`); else fail("units not extracted");
      if (d.hospitalName) pass(`extracted hospital=${d.hospitalName}`); else fail("hospital not extracted");
    } else fail(`status ${r.status} → ${JSON.stringify(r.data)}`);
  }

  head("3. POST /api/ai/fraud-check (auth)");
  {
    const r = await req("POST", "/api/ai/fraud-check", { token: TOKEN, json: { text: "Please send money to my account urgently for blood" } });
    if (r.status === 200) { pass(`status 200 → ${JSON.stringify(r.data)}`); }
    else fail(`status ${r.status} → ${JSON.stringify(r.data)}`);
  }

  head("4. POST /api/ai/health-tips (auth)");
  {
    const r = await req("POST", "/api/ai/health-tips", { token: TOKEN, json: {} });
    if (r.status === 200) {
      pass(`status 200`);
      const d = r.data || {};
      if (Array.isArray(d.tips) && d.tips.length) pass(`got ${d.tips.length} tips`); else fail("no tips returned");
      if (typeof d.eligibilityScore === "number") pass(`eligibilityScore=${d.eligibilityScore}`); else fail("no eligibilityScore");
    } else fail(`status ${r.status} → ${JSON.stringify(r.data)}`);
  }

  head("5. POST /api/ai/transcribe (auth, reachability)");
  {
    const r = await req("POST", "/api/ai/transcribe?mode=request&language=en", { token: TOKEN, form: makeAudioForm() });
    // A 4-byte file won't transcribe to meaningful text; we accept 200 or a 500 STT error,
    // but NOT 401/404 (which would indicate auth/route problems).
    if (r.status === 200) pass(`status 200 → ${JSON.stringify(r.data).slice(0, 200)}`);
    else if (r.status === 500) pass(`status 500 (reachable; STT rejected tiny sample) → ${JSON.stringify(r.data).slice(0, 200)}`);
    else fail(`status ${r.status} → ${JSON.stringify(r.data)}`);
  }

  head("Done");
}

main().catch((e) => { console.error(e); process.exit(1); });
