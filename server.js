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
import Visit from "./models/Visit.js";        // optional, unchanged
import PaidUser from "./models/PaidUser.js";  // ✅ separate collection

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
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());

/* ================== MONGODB ================== */

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

async function connectDB() {
  try {
    console.log("🔍 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
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

/* ================== USER PROFILE ================== */

app.get("/user/profile", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address
    });

  } catch (err) {
    console.error("❌ Fetch Profile Error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

/* ================== RAZORPAY PAYMENT ================== */

// Create Order (₹1)
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
      email   // ✅ ADD THIS
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false });
    }
if (!email) {
  return res.status(400).json({ success: false, message: "Email required" });
}
    // ✅ SAVE TO SEPARATE COLLECTION
const existingPayment = await PaidUser.findOne({
  paymentId: razorpay_payment_id
});

if (!existingPayment) {
  await new PaidUser({
    email,
    amount: 1,
    paymentStatus: "PAID",
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    paymentMethod: "Google Pay"
  }).save();
}

    res.json({ success: true });
  } catch (err) {
    console.error("❌ PaidUser Save Error:", err);
    res.status(500).json({ success: false });
  }
});

/* ================== CHATBOT ================== */

app.get("/chat", (_, res) => {
  res.json({ status: "ok", message: "Chat endpoint live" });
});

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
          "Content-Type": "application/json",
          "HTTP-Referer": "https://skyline-properties.netlify.app",
          "X-Title": "Skyline Estates AI Concierge"
        },
        timeout: 20000
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

/* ================== FEEDBACK ================== */

app.post("/submit-feedback", async (req, res) => {
  try {
    await new Feedback(req.body).save();
    res.status(201).json({ message: "Feedback submitted successfully!" });
  } catch {
    res.status(500).json({ message: "Failed to save feedback" });
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
      email: email,
      paymentStatus: "PAID"
    }).sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    console.error("❌ Fetch Paid Orders Error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* ================== CONTACT ================== */

app.post("/contact-us", async (req, res) => {
  try {
    await new Contact(req.body).save();
    res.status(201).json({ message: "Message sent successfully!" });
  } catch {
    res.status(500).json({ message: "Failed to send message" });
  }
});

/* ================== VISIT BOOKING (OPTIONAL, UNCHANGED) ================== */

app.post("/submit-visit", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      date,
      visitDate,
      timeSlot,
      contactMethods = [],
      message = "",
      propertyId = null
    } = req.body;

    const finalDate = date || visitDate;

    if (!name || !email || !phone || !finalDate || !timeSlot) {
      return res.status(400).json({ success: false });
    }

    const visit = await new Visit({
      name,
      email,
      phone,
      date: finalDate,
      timeSlot,
      contactMethods,
      message,
      propertyId,
      paymentStatus: "PENDING"
    }).save();

    res.status(201).json({ success: true, visitId: visit._id });
  } catch {
    res.status(500).json({ success: false });
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

/* ================== ADMIN ================== */

app.get("/admin/users", async (_, res) => res.json(await User.find()));
app.get("/admin/paid-users", async (_, res) => res.json(await PaidUser.find()));
app.get("/admin/bookings", async (_, res) => res.json(await Visit.find()));
app.get("/admin/feedbacks", async (_, res) => res.json(await Feedback.find()));
app.get("/admin/contacts", async (_, res) => res.json(await Contact.find()));

app.delete("/admin/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* ================== START ================== */

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
