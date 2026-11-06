"use client";

import * as React from "react";
import { checkSessionStatusAction, logoutAction } from "@/actions/auth";
import { toast } from "@/components/ui/toast";

export function SessionTimeoutWatcher() {
  const isLoggingOutRef = React.useRef(false);

  const verifySession = React.useCallback(async () => {
    if (isLoggingOutRef.current) return;

    try {
      const res = await checkSessionStatusAction();
      if (!res.active) {
        isLoggingOutRef.current = true;
        const isDeactivated = res.reason === "DEACTIVATED";

        toast.create({
          title: isDeactivated ? "Account Deactivated" : "Session Expired",
          description: isDeactivated
            ? "Your account is no longer active. Redirecting..."
            : "Your session has expired. Redirecting to sign in...",
          type: "error",
        });

        try {
          await logoutAction();
        } catch {
          // Ignore redirect errors from server actions
        }

        window.location.href = isDeactivated
          ? "/login?deactivated=1"
          : "/login?expired=1";
      }
    } catch (err) {
      console.warn("Session check check failed:", err);
    }
  }, []);

  React.useEffect(() => {
    // Check every 60 seconds
    const interval = setInterval(() => {
      verifySession();
    }, 60 * 1000);

    // Also check immediately when tab becomes active / focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifySession();
      }
    };

    const handleFocus = () => {
      verifySession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [verifySession]);

  return null;
}

