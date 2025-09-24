const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "https://stupendous-tapioca-9986c7.netlify.app" })); // your frontend
app.use(bodyParser.json());

const STATUM_KEY = "18826dcf302ed924a468d6f3f69c2edf713";
const STATUM_SECRET = "GMRFbrLBTeXyuY4tsPtk188qBUxL";
const AUTH_HEADER = "Basic " + Buffer.from(`${STATUM_KEY}:${STATUM_SECRET}`).toString("base64");

// 🔹 Step 1: Start STK Push
app.post("/pay", async (req, res) => {
  const { phone, amount } = req.body;

  try {
    const response = await fetch("https://api.statum.co.ke/api/v2/mpesa-online", {
      method: "POST",
      headers: {
        "Authorization": AUTH_HEADER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone_number: phone,
        amount: amount,
        short_code: "YOUR_PAYBILL", // from Statum dashboard
        account_reference: "AIRTIME_TOPUP"
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Payment request failed" });
  }
});

// 🔹 Step 2: Handle STK Push Callback
app.post("/stk-callback", async (req, res) => {
  console.log("STK Callback:", req.body);

  const { result_code, phone_number, amount } = req.body;

  if (result_code === "0") {
    // Payment successful → Send airtime
    try {
      const airtimeResponse = await fetch("https://api.statum.co.ke/api/v2/airtime", {
        method: "POST",
        headers: {
          "Authorization": AUTH_HEADER,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone_number,
          amount,
          country_code: "KE" // Kenya
        })
      });

      const airtimeData = await airtimeResponse.json();
      console.log("Airtime Response:", airtimeData);

    } catch (err) {
      console.error("Airtime Error:", err);
    }
  }

  res.json({ message: "Callback received" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
