import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(express.json());

// Allow frontend (Netlify or your domain)
app.use(cors({
  origin: "https://unique-pudding-c0da0c.netlify.app" // 🔧 change later if needed
}));

// 🔑 Hardcoded credentials (replace later with env vars for security)
const STATUM_KEY = "18826dcf302ed924a468d6f3f69c2edf713";
const STATUM_SECRET = "GMRFbrLBTeXyuY4tsPtk188qBUxL";

// Utility: generate auth header
function getAuthHeader() {
  const authString = `${STATUM_KEY}:${STATUM_SECRET}`;
  const encoded = Buffer.from(authString).toString("base64");
  return `Basic ${encoded}`;
}

// Utility: append logs to file
function logToFile(filename, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...data,
  };
  fs.appendFileSync(filename, JSON.stringify(logEntry) + "\n", "utf8");
}

// === CALLBACK ROUTES ===
app.post("/c2b/validate", (req, res) => {
  console.log("📩 C2B Validation:", req.body);
  logToFile("c2b_validation.log", req.body);
  res.json({ status_code: 200, description: "Validated" });
});

app.post("/c2b/confirm", (req, res) => {
  console.log("📩 C2B Confirmation:", req.body);
  logToFile("c2b_confirmation.log", req.body);
  res.json({ status: "ok" });
});

app.post("/sms/dlr", (req, res) => {
  console.log("📩 SMS Delivery Report:", req.body);
  logToFile("sms_dlr.log", req.body);
  res.json({ status: "ok" });
});

app.post("/airtime/callback", (req, res) => {
  console.log("📩 Airtime Callback:", req.body);
  logToFile("airtime_callback.log", req.body);
  res.json({ status: "ok" });
});

// === PRODUCTION ENDPOINT ===
// Recharge Airtime
app.post("/airtime/topup", async (req, res) => {
  const { phone_number, amount } = req.body;

  if (!phone_number || !amount) {
    return res.status(400).json({ error: "phone_number and amount are required" });
  }

  try {
    const payload = { phone_number, amount: String(amount) };

    const response = await fetch("https://api.statum.co.ke/api/v2/airtime", {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("📤 Airtime Topup Response:", result);

    logToFile("airtime_requests.log", { request: payload, response: result });
    res.json(result);

  } catch (err) {
    console.error("❌ Airtime Error:", err);
    res.status(500).json({ error: "Airtime request failed" });
  }
});

// === SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
