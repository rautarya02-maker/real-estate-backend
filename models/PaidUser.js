import mongoose from "mongoose";

const PaidUserSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true
    },
    paymentId: {
      type: String,
      required: true,
      unique: true
    },
    orderId: {
      type: String,
      required: true
    },
    paymentMethod: {
      type: String,
      default: "UPI"
    },
    status: {
      type: String,
      default: "PAID"
    }
  },
  { timestamps: true }
);

export default mongoose.model("PaidUser", PaidUserSchema);
