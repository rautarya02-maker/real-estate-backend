import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import axios from "axios";

import User from "./models/User.js";
import Feedback from "./models/Feedback.js";
import Contact from "./models/Contact.js";
import Visit from "./models/Visit.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("Blocked by CORS:", origin);
        callback(null, false);
      }
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
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
}

/* ================== HEALTH CHECK ================== */

app.get("/", (req, res) => {
  res.send("🏡 Skyline Properties Backend is running 🚀");
});

/* ================== CHATBOT ================== */

app.get("/chat", (req, res) => {
  res.json({
    status: "ok",
    message: "Chat endpoint is live. Use POST /chat."
  });
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
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
      reply: response.data.choices[0].message.content,
      success: true
    });
  } catch (err) {
    console.error("AI Chat Error:", err.message);
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

/* ================== CONTACT ================== */

app.post("/contact-us", async (req, res) => {
  try {
    await new Contact(req.body).save();
    res.status(201).json({ message: "Message sent successfully!" });
  } catch {
    res.status(500).json({ message: "Failed to send message" });
  }
});

/* ================== VISIT BOOKING (FIXED) ================== */

app.post("/submit-visit", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      visitDate,      // ✅ frontend field
      timeSlot,
      contactMethods,
      message,
      propertyId
    } = req.body;

    // Debug (safe to keep during testing)
    console.log("VISIT PAYLOAD:", req.body);

    if (!name || !email || !phone || !visitDate || !timeSlot) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await new Visit({
      name,
      email,
      phone,
      date: visitDate, // ✅ mapped correctly to DB
      timeSlot,
      contactMethods,
      message,
      propertyId
    }).save();

    res.status(201).json({
      success: true,
      message: "Visit booked successfully!"
    });
  } catch (err) {
    console.error("Visit Booking Error:", err);
    res.status(500).json({ message: "Failed to book visit" });
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
app.get("/admin/bookings", async (_, res) => res.json(await Visit.find()));
app.get("/admin/feedbacks", async (_, res) => res.json(await Feedback.find()));
app.get("/admin/contacts", async (_, res) => res.json(await Contact.find()));

app.delete("/admin/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.delete("/admin/bookings/:id", async (req, res) => {
  await Visit.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* ================== START SERVER ================== */

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
