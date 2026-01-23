import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "./models/User.js";
import Feedback from "./models/Feedback.js";
import Contact from "./models/Contact.js";
import Visit from "./models/Visit.js";

dotenv.config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());
app.use(
  cors({
    origin: "*", // later restrict to Netlify URL
    methods: ["GET", "POST", "PUT", "DELETE"]
  })
);

/* ---------------- PORT ---------------- */
const PORT = process.env.PORT || 5000;

/* ---------------- MONGOOSE SETTINGS (IMPORTANT) ---------------- */
mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false); // ⛔ prevent buffering timeouts

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
    process.exit(1); // ❌ crash app if DB not connected
  }
}

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("Real Estate Backend is running 🚀");
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
    if (userExists)
      return res.status(400).json({ message: "Email already registered" });

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
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

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
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

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
app.get("/admin/users", async (req, res) => {
  res.json(await User.find({}));
});

app.get("/admin/bookings", async (req, res) => {
  res.json(await Visit.find({}));
});

app.get("/admin/feedbacks", async (req, res) => {
  res.json(await Feedback.find({}));
});

app.get("/admin/contacts", async (req, res) => {
  res.json(await Contact.find({}));
});

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

/* ---------------- START SERVER ONLY AFTER DB ---------------- */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});


/* ---------------- CHATBOT (DEMO) ---------------- */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Please type a message." });
    }

    // Simple demo replies
    let reply = "I'm here to help with Skyline Properties 😊";

    if (message.toLowerCase().includes("buy")) {
      reply = "Looking to buy a property? Browse listings on our website.";
    } else if (message.toLowerCase().includes("rent")) {
      reply = "We have great rental properties available!";
    } else if (message.toLowerCase().includes("contact")) {
      reply = "You can contact us via the Contact Us page.";
    }

    res.json({ reply });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ reply: "Chat service is temporarily unavailable." });
  }
});
