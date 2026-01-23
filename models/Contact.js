import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    subject: { type: String, required: true },
    reason: { type: String, required: true },
    methods: { type: [String], required: true }, // Array for multiple checkboxes
    message: { type: String, required: true },
    attachmentName: { type: String }, // Stores the filename
    submittedAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model("Contact", contactSchema);
export default Contact;