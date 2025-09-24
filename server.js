// server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());

// Allow your Netlify frontend + Render domain
app.use(
  cors({
    origin: [
      "https://starlit-squirrel-826c31.netlify.app",
      "https://sweet-crisp-2fef37.netlify.app",
    ],
  })
);

// Hardcoded API credentials (remove later)
const consumerKey = "1889e51713b700048eb98fd58cb167a32d3";
const consumerSecret = "mgwITZ2PxOw2tYgeWK9a188mGSzo";

// Build the Base64 Authorization header
const authHeader =
  "Basic " +
  Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

// Route: Buy Airtime
app.post("/buy-airtime", async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: "Phone and amount are required" });
  }

  try {
    // Send request to Statum/AirtimeSell API
    const response = await axios.post(
      "https://airtimesellg.onrender.com/api/airtime", // confirm endpoint
      {
        phoneNumber: phone,
        amount: amount,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader, // ✅ Proper Basic Auth
        },
      }
    );

    console.log("AirtimeSell response:", response.data);

    return res.json({
      message: "STK push sent successfully",
      data: response.data,
    });
  } catch (err) {
    console.error("API Error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to process airtime purchase",
      details: err.response?.data || err.message,
    });
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("✅ Airtime backend is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
