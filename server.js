import express from "express";
import cors from "cors";
import axios from "axios";

// Hardcoded keys (replace later)
const consumerKey = "1889e51713b700048eb98fd58cb167a32d3";
const consumerSecret = "mgwITZ2PxOw2tYgeWK9a188mGSzo";
const authHeader = "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

// Statum endpoints
const MPESA_URL = "https://api.statum.co.ke/api/v2/mpesa/online";
const AIRTIME_URL = "https://api.statum.co.ke/api/v2/airtime";

const app = express();
app.use(express.json());

// Allow only your frontend
app.use(cors({
  origin: "https://swiftloanfinance.onrender.com"
}));

// 1️⃣ User initiates airtime purchase
app.post("/buy-airtime", async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "Phone and amount are required" });
    }

    // Trigger STK Push via Statum
    const response = await axios.post(
      MPESA_URL,
      {
        phone_number: phone,
        short_code: "709345", // Replace with your shortcode from Statum
        amount: String(amount),
        bill_ref_number: "AIRTIME_PURCHASE"
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      message: "STK Push initiated. Complete payment on phone.",
      data: response.data
    });

  } catch (error) {
    console.error("STK Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to initiate STK push" });
  }
});

// 2️⃣ Statum sends payment callback here
app.post("/mpesa-callback", async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("📩 STK Callback:", callbackData);

    if (callbackData.result_code === "200") {
      const { phone_number, amount } = callbackData;

      // Trigger Airtime Top-up
      const airtimeRes = await axios.post(
        AIRTIME_URL,
        {
          phone_number,
          amount: String(amount)
        },
        {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json"
          }
        }
      );

      console.log("✅ Airtime Response:", airtimeRes.data);
    }

    // Always acknowledge callback
    res.json({ status_code: 200, description: "Callback received" });

  } catch (error) {
    console.error("Callback error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to process callback" });
  }
});

// 3️⃣ Airtime delivery callback (optional)
app.post("/airtime-callback", (req, res) => {
  console.log("📲 Airtime Callback:", req.body);
  res.json({ status_code: 200, description: "Airtime callback received" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
