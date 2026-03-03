import mongoose from "mongoose";

const PaidUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "Direct Paid User"
    },

    email: {
      type: String,
      required: true,           // ✅ MUST be required (important for orders page)
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      default: null
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    paymentStatus: {
      type: String,
      enum: ["PAID"],
      default: "PAID"
    },

    paymentId: {
      type: String,
      required: true,
      unique: true              // ✅ prevents duplicate payment saves
    },

    orderId: {
      type: String,
      required: true,
      unique: true              // ✅ prevents duplicate order saves
    },

    paymentMethod: {
      type: String,
      default: "UPI"
    }
  },
  {
    timestamps: true           // ✅ creates createdAt & updatedAt
  }
);

/* ===============================
   INDEXES (Improves performance)
=============================== */

PaidUserSchema.index({ email: 1 });
PaidUserSchema.index({ createdAt: -1 });

export default mongoose.model("PaidUser", PaidUserSchema);
