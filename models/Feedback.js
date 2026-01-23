import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    experience: { type: String, required: true },
    easeOfUse: { type: String, required: true },
    favoriteFeature: { type: String, required: true },
    starRating: { type: Number, required: true },
    suggestions: { type: String },
    recommend: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;