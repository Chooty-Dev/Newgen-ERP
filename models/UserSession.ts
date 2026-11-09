import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserSession extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  sessionToken: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  lastActiveAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionToken: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: true,
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet"],
      default: "desktop",
    },
    browser: {
      type: String,
      default: "Unknown Browser",
    },
    os: {
      type: String,
      default: "Unknown OS",
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    location: {
      type: String,
      default: "Colombo, Western Province, LK",
    },
    userAgent: {
      type: String,
      default: "",
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

UserSessionSchema.index({ user: 1, sessionToken: 1 });
UserSessionSchema.index({ user: 1, isActive: 1, lastActiveAt: -1 });

export const UserSession: Model<IUserSession> =
  mongoose.models.UserSession ||
  mongoose.model<IUserSession>("UserSession", UserSessionSchema);

export default UserSession;

