import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    visitDate: { type: String, required: true },
    visitTime: { type: String, required: true },
    contactMethods: { type: [String], required: true },
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Visit", visitSchema);