import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Feedback from "./models/Feedback.js";
import Contact from "./models/Contact.js";
import Visit from "./models/Visit.js"; 

const app = express();
app.use(express.json());
app.use(cors());

// ----------- MongoDB Atlas Connection -----------
// SECURITY TIP: In a real project, put this URI in a .env file!
const uri = "mongodb+srv://rautarya02_db_user:arya%402005@cluster0.ltpfyv3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(uri)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// ---------------- FEEDBACK SUBMISSION ----------------
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

// ---------------- CONTACT US ----------------
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

// ---------------- SIGNUP ----------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Email already registered" });

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

// ---------------- LOGIN ----------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    res.json({ message: "Login successful", name: user.name });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

// ---------------- GET USER PROFILE ----------------
// ONLY ONE version of this route should exist.
app.get("/user/profile", async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ message: "Email query parameter is required" });

        const user = await User.findOne({ email });
        
        if (user) {
            // This returns ALL details to your profile page
            res.json({ 
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address 
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (err) {
        console.error("Profile Fetch Error:", err);
        res.status(500).json({ message: "Error fetching profile" });
    }
});

// ---------------- ADMIN API ROUTES ----------------

// --- Get All Data ---
app.get("/admin/users", async (req, res) => {
    const users = await User.find({});
    res.json(users);
});

app.get("/admin/bookings", async (req, res) => {
    const visits = await Visit.find({}); // Fetches from the Visit model we created
    res.json(visits);
});

app.get("/admin/feedbacks", async (req, res) => {
    const feedbacks = await Feedback.find({});
    res.json(feedbacks);
});

app.get("/admin/contacts", async (req, res) => {
    const contacts = await Contact.find({});
    res.json(contacts);
});

// --- Delete Entry Routes ---
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

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});