// token.model
import { Schema, model, Document, Types } from "mongoose";

export interface IToken extends Document {
  token: string; // hashed token
  user: Types.ObjectId;
  type: "refresh" | "access" | string;
  expires: Date;
  blacklisted: boolean;
  deviceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date | null;
  reason?: string | null;
}

const TokenSchema = new Schema<IToken>(
  {
    token: { type: String, required: true }, // hashed token
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, required: true },
    expires: { type: Date, required: true },
    blacklisted: { type: Boolean, default: false },
    deviceId: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    lastUsedAt: { type: Date, default: null },
    reason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

TokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
TokenSchema.index({ user: 1, type: 1 });

// Export model
const Token = model<IToken>("Token", TokenSchema);
export default Token;
