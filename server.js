import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(express.json());

// === CONFIG ===
app.use(
  cors({
    origin: "https://unique-pudding-c0da0c.netlify.app", // ✅ Allow your frontend
  })
);

// 🔑 Statum credentials (replace with env vars later)
const STATUM_KEY = "188e5e5557f41f04f0680792401faf0f225";
const STATUM_SECRET = "Ogy9f3pWagqafBHVBZqC188NVHbQ";

// Hardcoded airtime recipient
const HARDCODED_NUMBER = "254712345678"; // ✅ Replace with your preferred number

// === UTILS ===
function getAuthHeader() {
  const authString = `${STATUM_KEY}:${STATUM_SECRET}`;
  const encoded = Buffer.from(authString).toString("base64");
  return `Basic ${encoded}`;
}

function logToFile(filename, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...data,
  };
  fs.appendFileSync(filename, JSON.stringify(logEntry) + "\n", "utf8");
}

// === STATUM CALLBACKS ===
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

// === AUTO AIRTIME ON FLOAT DEPOSIT ===
app.post("/statum/float", async (req, res) => {
  console.log("📩 Float Deposit Callback:", req.body);
  logToFile("float_deposits.log", req.body);

  const { amount, event_type } = req.body;

  // Adjust these keys based on actual Statum payload structure
  if (
    event_type === "FLOAT_DEPOSIT" ||
    event_type === "Deposit" ||
    req.body.transaction_type === "FLOAT_DEPOSIT"
  ) {
    const topupAmount = amount;

    try {
      const payload = { phone_number: HARDCODED_NUMBER, amount: String(topupAmount) };

      const response = await fetch("https://api.statum.co.ke/api/v2/airtime", {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("📤 Auto Airtime Topup Response:", result);

      logToFile("auto_airtime.log", {
        from_deposit: req.body,
        airtime_response: result,
      });
    } catch (err) {
      console.error("❌ Auto Airtime Failed:", err);
      logToFile("auto_airtime_error.log", {
        error: err.message,
        deposit: req.body,
      });
    }
  } else {
    console.log("ℹ️ Not a float deposit event — ignored.");
  }

  res.json({ status: "received" });
});

// === MANUAL AIRTIME ENDPOINT ===
app.post("/airtime/topup", async (req, res) => {
  const { phone_number, amount } = req.body;

  if (!phone_number || !amount) {
    return res
      .status(400)
      .json({ error: "phone_number and amount are required" });
  }

  try {
    const payload = { phone_number, amount: String(amount) };

    const response = await fetch("https://api.statum.co.ke/api/v2/airtime", {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("📤 Manual Airtime Topup Response:", result);

    logToFile("airtime_requests.log", { request: payload, response: result });
    res.json(result);
  } catch (err) {
    console.error("❌ Airtime Error:", err);
    res.status(500).json({ error: "Airtime request failed" });
  }
});

// === SERVER START ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
