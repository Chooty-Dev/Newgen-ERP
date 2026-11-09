import { headers } from "next/headers";
import crypto from "crypto";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { UserSession, type IUserSession } from "@/models/UserSession";

export interface ParsedDeviceInfo {
  os: string;
  browser: string;
  deviceName: string;
  type: "desktop" | "mobile" | "tablet";
}

export function parseDeviceFromUserAgent(ua: string): ParsedDeviceInfo {
  let os = "Windows PC";
  let type: "desktop" | "mobile" | "tablet" = "desktop";

  // OS Detection
  if (/Windows NT 10.0/i.test(ua)) os = "Windows 11 / 10 PC";
  else if (/Windows NT 6.3/i.test(ua)) os = "Windows 8.1 PC";
  else if (/Windows NT 6.1/i.test(ua)) os = "Windows 7 PC";
  else if (/Windows/i.test(ua)) os = "Windows Workstation";
  else if (/iPhone/i.test(ua)) {
    os = "Apple iPhone";
    type = "mobile";
  } else if (/iPad/i.test(ua)) {
    os = "Apple iPad";
    type = "tablet";
  } else if (/Android/i.test(ua)) {
    type = /Mobile/i.test(ua) ? "mobile" : "tablet";
    os = type === "mobile" ? "Android Mobile" : "Android Tablet";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "MacBook Pro / Mac";
    type = "desktop";
  } else if (/Linux/i.test(ua)) {
    os = "Linux Workstation";
    type = "desktop";
  }

  // Browser Detection
  let browser = "Google Chrome";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Google Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Apple Safari";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) browser = "Opera";

  const deviceName = `${os} • ${browser}`;

  return { os, browser, deviceName, type };
}

export function parseLocationFromHeaders(headersList: Headers, ip: string): string {
  // Check standard CDN / hosting platform geo-headers
  const city = headersList.get("x-vercel-ip-city") || headersList.get("cf-ipcity");
  const region = headersList.get("x-vercel-ip-country-region") || headersList.get("cf-region");
  const country = headersList.get("x-vercel-ip-country") || headersList.get("cf-ipcountry");

  if (city) {
    return `${city}${region ? `, ${region}` : ""}, ${country || "LK"}`;
  }

  // If local or private network, designate primary operational region
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return "Colombo, Western Province, LK";
  }

  return "Sri Lanka";
}

/**
 * Accurately records or updates a device session upon login or API interaction.
 */
export async function recordUserSession(
  userId: string | mongoose.Types.ObjectId
): Promise<IUserSession | null> {
  try {
    await connectDB();
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "Web Browser Workstation";
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : (realIp || "127.0.0.1");

    const { os, browser, deviceName, type } = parseDeviceFromUserAgent(userAgent);
    const location = parseLocationFromHeaders(headersList, ip);

    // Compute deterministic hash token for this specific physical client & IP
    const sessionToken = crypto
      .createHash("sha256")
      .update(`${userId.toString()}_${deviceName}_${ip}`)
      .digest("hex");

    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // Check if session already exists for this device
    const existing = await UserSession.findOne({
      user: userObjectId,
      sessionToken,
    });

    if (existing) {
      existing.lastActiveAt = new Date();
      existing.isActive = true;
      existing.location = location;
      existing.userAgent = userAgent;
      await existing.save();
      return existing;
    }

    // New device login
    const newSession = await UserSession.create({
      user: userObjectId,
      sessionToken,
      deviceName,
      deviceType: type,
      browser,
      os,
      ipAddress: ip,
      location,
      userAgent,
      lastActiveAt: new Date(),
      isActive: true,
    });

    return newSession;
  } catch (error) {
    console.error("Failed to record device session:", error);
    return null;
  }
}

