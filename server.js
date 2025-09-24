const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(express.json());

// Allow only your frontend
app.use(
  cors({
    origin: "https://dapper-sorbet-e4508e.netlify.app", // your Netlify URL
  })
);

// Statum credentials (hardcoded for now)
const consumerKey = "1881a4fde7210d4415992b6bc4675c0757a";
const consumerSecret = "5M6LQuwucAT09Wzb7R0b188MTgIn";

// Base64 encode key:secret
const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

// Route to buy airtime
app.post("/buy-airtime", async (req, res) => {
  try {
    const { phone_number, amount } = req.body;

    const response = await fetch("https://api.statum.co.ke/api/v2/airtime", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone_number, amount }),
    });

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Webhook for delivery reports
app.post("/callback", (req, res) => {
  console.log("📩 Callback received:", req.body);
  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
