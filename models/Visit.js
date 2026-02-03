import mongoose from "mongoose";

const VisitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    date: {
      type: String,
      required: true
    },
    timeSlot: {
      type: String,
      required: true
    },
    contactMethods: {
      type: [String],
      default: []
    },
    message: {
      type: String,
      default: ""
    },
    propertyId: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("Visit", VisitSchema);
