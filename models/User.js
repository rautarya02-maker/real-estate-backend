import mongoose from "mongoose";

// Inside models/User.js
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: { type: String },
    phone: String,   // Ensure this is here
    address: String  // Ensure this is here
});

export default mongoose.model("User", userSchema);