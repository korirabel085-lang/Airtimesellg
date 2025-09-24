import express from "express";
import fetch from "node-fetch";
import cors from "cors";

// App setup
const app = express();
app.use(express.json());

// Allow requests ONLY from your frontend domain
app.use(cors({
  origin: "https://swiftloanapp-ke.onrender.com"
}));

// ✅ Hardcoded API credentials (REMOVE or put in env vars later)
const consumerKey = "1881a4fde7210d4415992b6bc4675c0757a";
const consumerSecret = "5M6LQuwucAT09Wzb7R0b188MTgIn";
const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

// --- ROUTES ---

// Test route
app.get("/", (req, res) => {
  res.send("✅ Statum Airtime API is running...");
});

// Buy Airtime route
app.post("/buy-airtime", async (req, res) => {
  try {
    const { phone_number, amount } = req.body;

    if (!phone_number || !amount) {
      return res.status(400).json({ error: "phone_number and amount are required" });
    }

    const response = await fetch("https://api.statum.co.ke/api/v2/airtime", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone_number, amount })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Callback/Notification from Statum
app.post("/callback", (req, res) => {
  console.log("📩 Callback received from Statum:", req.body);
  // 👉 Save to DB, update status, etc.
  res.json({ message: "Notification received" });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
