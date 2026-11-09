"use server";

import { signIn, signOut, auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { UserSession } from "@/models/UserSession";
import { recordUserSession } from "@/lib/sessionTracker";
import { sanitizeInput } from "@/lib/sanitize";
import {
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
} from "@/schemas/auth";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AuthError } from "next-auth";
import { logAuditEvent } from "@/lib/audit";

export async function loginAction(formData: unknown) {
  const result = loginSchema.safeParse(formData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid input data",
    };
  }

  const { email, password } = result.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    try {
      await connectDB();
      const userDoc = await User.findOne({ email }).select("_id").lean();
      if (userDoc?._id) {
        await recordUserSession(userDoc._id);
      }
    } catch (sessionErr) {
      console.error("Device session record error on login:", sessionErr);
    }

    return { success: true };
  } catch (error) {
    // If NextAuth throws NEXT_REDIRECT, it means authentication succeeded and session was created
    if (
      (typeof error === "object" && error !== null && "digest" in error && String((error as any).digest).startsWith("NEXT_REDIRECT")) ||
      (error instanceof Error && error.message.includes("NEXT_REDIRECT"))
    ) {
      try {
        await connectDB();
        const userDoc = await User.findOne({ email }).select("_id").lean();
        if (userDoc?._id) {
          await recordUserSession(userDoc._id);
        }
      } catch {}
      return { success: true };
    }

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password." };
        default:
          return { success: false, error: "Authentication failed. Please try again." };
      }
    }
    console.error("Login unexpected error:", error);
    return { success: false, error: "An unexpected error occurred during login." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function checkSessionStatusAction(): Promise<{ active: boolean; reason?: "EXPIRED" | "DEACTIVATED" }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { active: false, reason: "EXPIRED" };
    }

    await connectDB();
    const user = await User.findById(session.user.id).select("isActive").lean();
    if (!user || !user.isActive) {
      return { active: false, reason: "DEACTIVATED" };
    }

    return { active: true };
  } catch (error) {
    console.error("Session check error:", error);
    // On unexpected database connection blip, don't boot user immediately
    return { active: true };
  }
}

export async function updateProfileAction(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const cleanData = sanitizeInput(data);
  const result = updateProfileSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const updated = await User.findByIdAndUpdate(
      session.user.id,
      {
        name: result.data.name,
        phone: result.data.phone || "",
        avatarUrl: result.data.avatarUrl || null,
      },
      { new: true }
    ).select("-password");

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_PROFILE",
      targetType: "User",
      targetId: session.user.id,
      metadata: { name: result.data.name },
    });

    return { success: true, user: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Profile update error:", error);
    return { success: false, error: "Failed to update profile." };
  }
}

export async function changePasswordAction(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const cleanData = sanitizeInput(data);
  const result = changePasswordSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select("+password");

    if (!user || !user.password) {
      return { success: false, error: "User not found" };
    }

    const isMatch = await bcrypt.compare(
      result.data.currentPassword,
      user.password
    );

    if (!isMatch) {
      return { success: false, error: "Current password is incorrect" };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(result.data.newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "CHANGE_PASSWORD",
      targetType: "User",
      targetId: session.user.id,
    });

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, error: "Failed to change password." };
  }
}

export interface LoggedDeviceItem {
  id: string;
  name: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  type: "desktop" | "mobile" | "tablet";
}

export async function getUserDevicesAction(): Promise<{
  success: boolean;
  devices: LoggedDeviceItem[];
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, devices: [] };
    }

    await connectDB();

    // 1. Record or update current active session with live timestamp and IP/device details
    const currentSession = await recordUserSession(session.user.id);
    const currentToken = currentSession ? currentSession.sessionToken : "";

    // 2. Fetch all real active user device sessions directly from MongoDB
    const sessionDocs = await UserSession.find({
      user: new mongoose.Types.ObjectId(session.user.id),
      isActive: true,
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    const devices: LoggedDeviceItem[] = sessionDocs.map((doc) => {
      const isCurrent = doc.sessionToken === currentToken;
      const diffMs = Date.now() - new Date(doc.lastActiveAt).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let lastActive = "Active now";
      if (isCurrent) {
        lastActive = "Active Now";
      } else if (diffMins < 5) {
        lastActive = "Active just now";
      } else if (diffMins < 60) {
        lastActive = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        lastActive = `${diffHours}h ago`;
      } else if (diffDays === 1) {
        lastActive = "Yesterday";
      } else {
        lastActive = `${diffDays}d ago`;
      }

      return {
        id: doc._id.toString(),
        name: doc.deviceName,
        location: doc.location,
        ip: doc.ipAddress,
        lastActive,
        isCurrent,
        type: doc.deviceType as "desktop" | "mobile" | "tablet",
      };
    });

    // Sort: current session always first
    devices.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return 0;
    });

    return {
      success: true,
      devices,
    };
  } catch (error) {
    console.error("Failed to fetch real user devices:", error);
    return { success: false, devices: [] };
  }
}

export async function revokeDeviceSessionAction(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await connectDB();
    await UserSession.updateOne(
      {
        _id: new mongoose.Types.ObjectId(sessionId),
        user: new mongoose.Types.ObjectId(session.user.id),
      },
      {
        $set: { isActive: false, lastActiveAt: new Date() },
      }
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to revoke device session:", error);
    return { success: false, error: "Failed to revoke device session" };
  }
}


