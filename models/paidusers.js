import mongoose from "mongoose";

const PaidUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Direct Paid User"
    },
    email: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: null
    },

    amount: {
      type: Number,
      required: true
    },

    paymentStatus: {
      type: String,
      enum: ["PAID"],
      default: "PAID"
    },

    paymentId: {
      type: String,
      required: true
    },

    orderId: {
      type: String,
      required: true
    },

    paymentMethod: {
      type: String,
      default: "UPI"
    }
  },
  { timestamps: true }
);

export default mongoose.model("PaidUser", PaidUserSchema);
