import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import axios from "axios";
import Razorpay from "razorpay";
import crypto from "crypto";

import User from "./models/User.js";
import Feedback from "./models/Feedback.js";
import Contact from "./models/Contact.js";
import Visit from "./models/Visit.js";
import PaidUser from "./models/PaidUser.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ================== RAZORPAY ================== */

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ================== MIDDLEWARE ================== */

app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://skyline-properties.netlify.app",
  "https://skyline-properties-maharashtra.netlify.app"
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn("❌ Blocked by CORS:", origin);
      return callback(null, false);
    },
    credentials: true
  })
);

app.options("*", cors());

/* ================== MONGODB ================== */

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  }
}

/* ================== HEALTH ================== */

app.get("/", (_, res) => {
  res.send("🏡 Skyline Properties Backend is running 🚀");
});

/* ================== RAZORPAY PAYMENT ================== */

// Create Order
app.post("/create-order", async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: 1 * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now()
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("❌ Razorpay Order Error:", err);
    res.status(500).json({ success: false });
  }
});

// Verify Payment & Save Paid User
app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email   // ✅ added
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    // ✅ Save with email (important for Your Orders page)
    await new PaidUser({
      email,
      amount: 1,
      paymentStatus: "PAID",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentMethod: "Google Pay"
    }).save();

    res.json({ success: true });

  } catch (err) {
    console.error("❌ PaidUser Save Error:", err);
    res.status(500).json({ success: false });
  }
});

/* ================== USER PAID ORDERS ================== */

app.get("/user/paid-orders", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const orders = await PaidUser.find({
      email,
      paymentStatus: "PAID"
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    console.error("❌ Fetch Paid Orders Error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* ================== CHATBOT ================== */

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ reply: "Please type a message 😊" });
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful and professional AI real estate assistant for Skyline Properties."
          },
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      reply: response.data.choices[0].message.content
    });

  } catch (err) {
    console.error("❌ AI Chat Error:", err.message);
    res.status(500).json({ reply: "AI service unavailable" });
  }
});

/* ================== AUTH ================== */

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address
    });

    res.json({ message: "Account created successfully!" });

  } catch {
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({ message: "Login successful", name: user.name });

  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================== START ================== */

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
