import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import axios from "axios"; // ✅ using axios (unchanged)

import User from "./models/User.js";
import Feedback from "./models/Feedback.js";
import Contact from "./models/Contact.js";
import Visit from "./models/Visit.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------- MIDDLEWARE (CORRECTED CORS) ---------------- */
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://skyline-properties.netlify.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// IMPORTANT: fixes preflight issue on Render
app.options("*", cors());

/* ---------------- MONGOOSE SETTINGS ---------------- */
mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

/* ---------------- MONGODB CONNECTION ---------------- */
async function connectDB() {
  try {
    console.log("🔍 MONGO_URI:", process.env.MONGO_URI);

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

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("🏡 Skyline Properties Backend is running 🚀");
});

/* ---------------- AI CHATBOT (UNCHANGED LOGIC) ---------------- */
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
              "You are a helpful and professional AI real estate assistant for Skyline Properties. Keep answers brief, friendly and relevant."
          },
          {
            role: "user",
            content: message
          }
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
    console.error("AI Chat Error:", err.response?.data || err.message);
    res.status(500).json({
      reply: "AI service is temporarily unavailable."
    });
  }
});

/* ---------------- FEEDBACK ---------------- */
app.post("/submit-feedback", async (req, res) => {
  try {
    const newFeedback = new Feedback(req.body);
    await newFeedback.save();
    res.status(201).json({ message: "Feedback submitted successfully!" });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ message: "Failed to save feedback" });
  }
});

/* ---------------- CONTACT US ---------------- */
app.post("/contact-us", async (req, res) => {
  try {
    const newContact = new Contact(req.body);
    await newContact.save();
    res.status(201).json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("Contact Error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});

/* ---------------- SIGNUP ---------------- */
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
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
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

/* ---------------- LOGIN ---------------- */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({ message: "Login successful", name: user.name });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ---------------- USER PROFILE ---------------- */
app.get("/user/profile", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
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
    console.error("Profile Error:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

/* ---------------- ADMIN ROUTES ---------------- */
app.get("/admin/users", async (_, res) => res.json(await User.find({})));
app.get("/admin/bookings", async (_, res) => res.json(await Visit.find({})));
app.get("/admin/feedbacks", async (_, res) => res.json(await Feedback.find({})));
app.get("/admin/contacts", async (_, res) => res.json(await Contact.find({})));

/* ---------------- DELETE ROUTES ---------------- */
app.delete("/admin/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.delete("/admin/bookings/:id", async (req, res) => {
  await Visit.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.delete("/admin/feedbacks/:id", async (req, res) => {
  await Feedback.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.delete("/admin/contacts/:id", async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* ---------------- START SERVER ---------------- */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
