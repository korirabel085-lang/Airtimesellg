// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// === CONFIGURATION ===
// Allowed frontend origin (Netlify)
const FRONTEND_ORIGIN = "https://unique-pudding-c0da0c.netlify.app";
// Your Render backend URL (for reference)
const BACKEND_URL = "https://airtimesellg.onrender.com";

app.use(cors({
  origin: FRONTEND_ORIGIN
}));

// ==== HARDCODED SENSITIVE VALUES (REMOVE / MOVE TO ENV LATER) ====
const CONSUMER_KEY = "18869434d4774f940279783265ee44b565a";
const CONSUMER_SECRET = "DmSzO88gNJjJXQZYCio5188ldIrL";

// Admin password (hardcoded per your request)
const ADMIN_PASSWORD = "3462Abel@#";

// Statum API base endpoints
const STATUM_BASE = "https://api.statum.co.ke/api/v2";
const STATUM_AIRTIME = `${STATUM_BASE}/airtime`;
const STATUM_MPESA_WALLET = `${STATUM_BASE}/mpesa-wallet`;

// Ensure logs directory exists
const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// Helper: append JSON log line
function logToFile(filename, data) {
  const filepath = path.join(LOG_DIR, filename);
  const entry = {
    timestamp: new Date().toISOString(),
    ...data
  };
  fs.appendFileSync(filepath, JSON.stringify(entry) + "\n", "utf8");
}

// Helper: get Basic auth header
function getAuthHeader() {
  const s = `${CONSUMER_KEY}:${CONSUMER_SECRET}`;
  const encoded = Buffer.from(s).toString("base64");
  return `Basic ${encoded}`;
}

// ----------------- ROUTES -----------------

// Health
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "statum-backend", backend: BACKEND_URL });
});

// 1) Airtime top-up (frontend -> backend -> Statum Airtime API)
app.post("/airtime/topup", async (req, res) => {
  try {
    const { phone_number, amount } = req.body;
    if (!phone_number || !amount) {
      return res.status(400).json({ error: "phone_number and amount are required" });
    }

    const payload = {
      phone_number: String(phone_number),
      amount: String(amount)
    };

    const response = await axios.post(STATUM_AIRTIME, payload, {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json"
      },
      timeout: 20000
    });

    // Log request & response
    logToFile("airtime_requests.log", { request: payload, response: response.data });

    return res.json(response.data);
  } catch (err) {
    const details = err.response?.data || err.message;
    console.error("Airtime error:", details);
    logToFile("airtime_errors.log", { error: details, body: req.body });
    return res.status(500).json({ error: "Airtime request failed", details });
  }
});

// 2) Withdraw (B2C) - ADMIN only (frontend sends admin_password)
app.post("/withdraw", async (req, res) => {
  try {
    const { phone_number, amount, short_code, admin_password } = req.body;
    if (!phone_number || !amount || !short_code || !admin_password) {
      return res.status(400).json({ error: "phone_number, amount, short_code and admin_password are required" });
    }

    if (admin_password !== ADMIN_PASSWORD) {
      logToFile("auth_failures.log", { route: "/withdraw", ip: req.ip, body: { phone_number, amount, short_code } });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = { phone_number: String(phone_number), short_code: String(short_code), amount: String(amount) };

    const response = await axios.post(STATUM_MPESA_WALLET, payload, {
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json"
      },
      timeout: 20000
    });

    logToFile("b2c_requests.log", { request: payload, response: response.data });
    return res.json(response.data);
  } catch (err) {
    const details = err.response?.data || err.message;
    console.error("Withdraw error:", details);
    logToFile("b2c_errors.log", { error: details, body: req.body });
    return res.status(500).json({ error: "Withdrawal request failed", details });
  }
});

// 3) C2B callback - Statum will POST here for payments (deposits)
app.post("/c2b-callback", (req, res) => {
  console.log("C2B callback received:", req.body);
  logToFile("c2b_callbacks.log", req.body);
  // Respond with 200 and expected JSON if needed (Statum docs indicate simple ack)
  return res.status(200).json({ status_code: 200, description: "Received" });
});

// 4) Airtime callback - Statum will POST delivery reports here
app.post("/airtime/callback", (req, res) => {
  console.log("Airtime callback:", req.body);
  logToFile("airtime_callbacks.log", req.body);
  return res.status(200).json({ status: "received" });
});

// 5) B2C callback - Statum confirms withdraw results here
app.post("/b2c-callback", (req, res) => {
  console.log("B2C callback:", req.body);
  logToFile("b2c_callbacks.log", req.body);
  return res.status(200).json({ status: "received" });
});

// 6) Simple logs viewer (admin-friendly, not public — still no auth here, use Render dashboard to restrict if needed)
app.get("/logs/:file", (req, res) => {
  const file = req.params.file;
  const allowed = [
    "airtime_requests.log", "airtime_errors.log",
    "b2c_requests.log", "b2c_errors.log",
    "c2b_callbacks.log", "airtime_callbacks.log", "b2c_callbacks.log",
    "auth_failures.log", "airtime_callbacks.log"
  ];
  if (!allowed.includes(file)) return res.status(404).send("Not found");
  const filepath = path.join(LOG_DIR, file);
  if (!fs.existsSync(filepath)) return res.status(404).send("No logs yet");
  const content = fs.readFileSync(filepath, "utf8");
  // Return as plain text (each line is a JSON object)
  res.type("text/plain").send(content);
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Statum backend running on port ${PORT}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});
