"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
}

export interface TourConfig {
  id: string;
  matchPath: (pathname: string) => boolean;
  steps: TourStep[];
}

interface WhatsNewTourProps {
  user: {
    id: string;
    role: string;
    name?: string | null;
    shop?: string | null;
  };
}

export function WhatsNewTour({ user }: WhatsNewTourProps) {
  const pathname = usePathname();
  const [activeTour, setActiveTour] = React.useState<TourConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Role-specific dashboard tour steps
  const dashboardSteps = React.useMemo<TourStep[]>(() => {
    const commonSteps: TourStep[] = [
      {
        id: "header-profile",
        targetSelector: '[data-tour="header-profile"]',
        title: user.role === "ADMIN" ? "Admin Profile & Hub" : "Profile & Hub",
        description:
          user.role === "ADMIN"
            ? "Click your profile above to access account settings, real-time logged devices, and the system changelog."
            : "Access your account details, active branch, operational role, and logged devices directly from the header profile trigger.",
      },
    ];

    if (user.role === "ADMIN") {
      commonSteps.push({
        id: "header-changelog",
        targetSelector: '[data-tour="header-changelog"]',
        title: "System Changelog (v2.1.1)",
        description:
          "Click the highlighted Changelog button to view full version histories, UI updates, bug fixes, and semantic versioning specs.",
      });
    }

    commonSteps.push({
      id: "header-logged-devices",
      targetSelector: '[data-tour="header-logged-devices"]',
      title: "Real-time Logged Devices",
      description:
        "Inspect verified active device sessions, hardware models, and login locations, with one-click remote session revocation.",
    });

    commonSteps.push(
      {
        id: "header-theme",
        targetSelector: '[data-tour="header-theme"]',
        title: "Theme Toggle",
        description:
          "Switch seamlessly between light and dark modes with the interactive sun and moon toggle.",
      },
      {
        id: "sidebar-nav",
        targetSelector: '[data-tour="sidebar-nav"]',
        title: "Seamless Sidebar Navigation",
        description:
          "Navigate modules smoothly with borderless navigation menus and switch active branches on the fly.",
      }
    );

    if (user.role === "ADMIN") {
      commonSteps.push({
        id: "admin-metrics",
        targetSelector: '[data-tour="admin-metrics"]',
        title: "Consolidated Financials",
        description:
          "Monitor multi-branch net cash balances, total inflows, operating outflows, and pending approvals in real-time.",
      });
    } else if (user.role === "VERIFIER") {
      commonSteps.push({
        id: "verifier-queue",
        targetSelector: '[data-tour="verifier-queue"]',
        title: "Verification Queue",
        description:
          "Audit branch ledger submissions, inspect daily balances, and authorize or decline financial entries.",
      });
    } else {
      commonSteps.push({
        id: "staff-overview",
        targetSelector: '[data-tour="staff-overview"]',
        title: "Branch Ledger & Finances",
        description:
          "Track sequential running cash balance, submit daily expenses, and monitor approval statuses.",
      });
    }

    return commonSteps;
  }, [user.role]);

  // Single shop view tour steps (Admin)
  const singleShopSteps = React.useMemo<TourStep[]>(() => {
    return [
      {
        id: "shop-discrepancy",
        targetSelector: '[data-tour="shop-discrepancy"]',
        title: "Discrepancy Manager",
        description:
          "Audit daily cash discrepancies with prior days carryover balance calculations, unsettled surplus breakdown, and reconciliation tools.",
      },
      {
        id: "shop-settlement",
        targetSelector: '[data-tour="shop-settlement"]',
        title: "Daily Settlement & Float Carryover",
        description:
          "Review branch daily settlements, carryover float balances, and verified bank handovers.",
      },
      {
        id: "shop-workspace-nav",
        targetSelector: '[data-tour="shop-workspace-nav"]',
        title: "Dedicated Branch Tabs",
        description:
          "Switch between item sales, utility bills, inventory, credit customers, and wastage tracking directly from the branch workspace.",
      },
    ];
  }, []);

  // Staff finances tour steps
  const staffFinancesSteps = React.useMemo<TourStep[]>(() => {
    return [
      {
        id: "staff-finance-balance",
        targetSelector: '[data-tour="staff-finance-balance"]',
        title: "Sequential Running Balance",
        description:
          "Check real-time verified ledger balance, prior carryovers, and daily opening floats for your branch.",
      },
      {
        id: "staff-new-record",
        targetSelector: '[data-tour="staff-new-record"]',
        title: "Submit Daily Record",
        description:
          "Record daily collections, payment receipts, and operating expenses for instant verifier review.",
      },
      {
        id: "staff-settle-debt",
        targetSelector: '[data-tour="staff-settle-debt"]',
        title: "Settle Customer Debt & Search",
        description:
          "Look up credit customers by name or phone with instant side-by-side search, view outstanding balances, and record debt settlements.",
      },
    ];
  }, []);

  // Registered Tours
  const tours = React.useMemo<TourConfig[]>(() => {
    return [
      {
        id: "tour_dashboard_v2_5",
        matchPath: (p: string) =>
          p === "/dashboard" ||
          p === "/dashboard/admin/dashboard" ||
          p === "/dashboard/verifier/dashboard" ||
          p === "/dashboard/staff/dashboard",
        steps: dashboardSteps,
      },
      {
        id: "tour_single_shop_v1",
        matchPath: (p: string) => /^\/dashboard\/admin\/shops\/[a-zA-Z0-9_-]+$/.test(p),
        steps: singleShopSteps,
      },
      {
        id: "tour_staff_finances_v1",
        matchPath: (p: string) => p === "/dashboard/staff/finances",
        steps: staffFinancesSteps,
      },
    ];
  }, [dashboardSteps, singleShopSteps, staffFinancesSteps]);

  // Synchronize profile dialog visibility with the tour step
  React.useEffect(() => {
    if (!activeTour || !isOpen) return;
    const currentStep = activeTour.steps[currentStepIndex];
    if (
      currentStep?.id === "header-changelog" ||
      currentStep?.id === "header-logged-devices"
    ) {
      window.dispatchEvent(new CustomEvent("newgen-open-profile-dialog"));
    } else {
      window.dispatchEvent(new CustomEvent("newgen-close-profile-dialog"));
    }
  }, [activeTour, currentStepIndex, isOpen]);

  // If user clicks the profile trigger button during step 1, advance into the profile steps
  React.useEffect(() => {
    const onProfileClicked = () => {
      if (!activeTour || !isOpen) return;
      const currentStep = activeTour.steps[currentStepIndex];
      if (currentStep?.id === "header-profile") {
        const changelogIdx = activeTour.steps.findIndex((s) => s.id === "header-changelog");
        const devicesIdx = activeTour.steps.findIndex((s) => s.id === "header-logged-devices");
        if (changelogIdx !== -1) {
          setCurrentStepIndex(changelogIdx);
        } else if (devicesIdx !== -1) {
          setCurrentStepIndex(devicesIdx);
        }
      }
    };

    window.addEventListener("newgen-profile-clicked", onProfileClicked);
    return () => {
      window.removeEventListener("newgen-profile-clicked", onProfileClicked);
    };
  }, [activeTour, currentStepIndex, isOpen]);

  // Determine active tour based on pathname & localStorage
  React.useEffect(() => {
    // Strictly do not run on login or outside dashboard
    if (!pathname || !pathname.startsWith("/dashboard")) {
      setIsOpen(false);
      setActiveTour(null);
      return;
    }

    const matched = tours.find((t) => t.matchPath(pathname));
    if (!matched) {
      setIsOpen(false);
      setActiveTour(null);
      return;
    }

    const storageKey = `newgen_tour_${matched.id}_${user.id}`;
    const alreadySeen = localStorage.getItem(storageKey);
    if (alreadySeen) {
      setIsOpen(false);
      setActiveTour(null);
      return;
    }

    // Small delay to allow page elements to mount and layout
    const timer = setTimeout(() => {
      setActiveTour(matched);
      setCurrentStepIndex(0);
      setIsOpen(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [pathname, tours, user.id]);

  // Track target element rect
  const updateTargetRect = React.useCallback(() => {
    if (!activeTour || !isOpen) {
      setTargetRect(null);
      return;
    }

    const currentStep = activeTour.steps[currentStepIndex];
    if (!currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Smooth scroll if element is far offscreen
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setTargetRect(null);
    }
  }, [activeTour, currentStepIndex, isOpen]);

  React.useEffect(() => {
    updateTargetRect();
    const t1 = setTimeout(updateTargetRect, 60);
    const t2 = setTimeout(updateTargetRect, 180);
    const t3 = setTimeout(updateTargetRect, 320);

    const handleResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [currentStepIndex, isOpen, updateTargetRect]);

  const markTourCompleted = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent("newgen-close-profile-dialog"));
    if (activeTour) {
      const storageKey = `newgen_tour_${activeTour.id}_${user.id}`;
      localStorage.setItem(storageKey, "true");
    }
    setIsOpen(false);
    setActiveTour(null);
  }, [activeTour, user.id]);

  const handleTargetClick = () => {
    if (!activeTour) return;
    const currentStep = activeTour.steps[currentStepIndex];
    if (!currentStep) return;

    if (currentStep.id === "header-profile") {
      window.dispatchEvent(new CustomEvent("newgen-open-profile-dialog"));
      const changelogIdx = activeTour.steps.findIndex((s) => s.id === "header-changelog");
      const devicesIdx = activeTour.steps.findIndex((s) => s.id === "header-logged-devices");
      if (changelogIdx !== -1) {
        setCurrentStepIndex(changelogIdx);
      } else if (devicesIdx !== -1) {
        setCurrentStepIndex(devicesIdx);
      } else {
        handleNext();
      }
    } else if (currentStep.id === "header-changelog") {
      window.dispatchEvent(new CustomEvent("newgen-close-profile-dialog"));
      markTourCompleted();
      window.location.href = "/dashboard/admin/changelog";
    } else if (currentStep.id === "header-logged-devices") {
      handleNext();
    }
  };

  const handleNext = () => {
    if (!activeTour) return;
    const currentStep = activeTour.steps[currentStepIndex];

    if (currentStep?.id === "header-profile") {
      window.dispatchEvent(new CustomEvent("newgen-open-profile-dialog"));
      const changelogIdx = activeTour.steps.findIndex((s) => s.id === "header-changelog");
      const devicesIdx = activeTour.steps.findIndex((s) => s.id === "header-logged-devices");
      if (changelogIdx !== -1) {
        setCurrentStepIndex(changelogIdx);
        return;
      } else if (devicesIdx !== -1) {
        setCurrentStepIndex(devicesIdx);
        return;
      }
    }

    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      markTourCompleted();
    }
  };

  const handleSkip = () => {
    markTourCompleted();
  };

  const handleClose = () => {
    markTourCompleted();
  };

  // Expose global helper for testing/resetting in console
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__resetNewgenTours = () => {
        tours.forEach((t) => {
          localStorage.removeItem(`newgen_tour_${t.id}_${user.id}`);
        });
        window.location.reload();
      };
    }
  }, [tours, user.id]);

  if (!isOpen || !activeTour) return null;

  const currentStep = activeTour.steps[currentStepIndex];
  if (!currentStep) return null;

  const isLastStep = currentStepIndex === activeTour.steps.length - 1;
  const isClickableStep =
    currentStep.id === "header-profile" || currentStep.id === "header-changelog";
  const padding = currentStep.id === "header-logged-devices" ? 4 : 8;
  const cutoutRadius = currentStep.id === "header-logged-devices" ? 26 : 18;

  // Calculate tip popover position
  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect || typeof window === "undefined") {
      // Centered fallback if element not in DOM
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const popoverWidth = Math.min(380, window.innerWidth - 32);
    const popoverHeight = 220; // Estimated height

    const targetCenterY = targetRect.top + targetRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;

    // Special Case 1: Target is header-profile (top-right header trigger)
    if (currentStep.id === "header-profile") {
      const top = targetRect.bottom + 16;
      const left = Math.max(16, targetRect.right - popoverWidth);
      return { top: `${top}px`, left: `${left}px`, width: `${popoverWidth}px` };
    }

    // Special Case 2: Target is inside the modal (header-changelog or header-logged-devices)
    if (currentStep.id === "header-changelog" || currentStep.id === "header-logged-devices") {
      if (currentStep.id === "header-changelog") {
        // Target is the Changelog button on the left card: position to the left if room
        if (targetRect.left >= popoverWidth + 24) {
          const left = targetRect.left - popoverWidth - 20;
          const top = Math.max(
            20,
            Math.min(window.innerHeight - popoverHeight - 20, targetCenterY - popoverHeight / 2)
          );
          return { top: `${top}px`, left: `${left}px`, width: `${popoverWidth}px` };
        }
      } else if (currentStep.id === "header-logged-devices") {
        // Target is the Logged Devices card on the right: position to the right if room
        if (window.innerWidth - targetRect.right >= popoverWidth + 24) {
          const left = targetRect.right + 20;
          const top = Math.max(
            20,
            Math.min(window.innerHeight - popoverHeight - 20, targetRect.top + 20)
          );
          return { top: `${top}px`, left: `${left}px`, width: `${popoverWidth}px` };
        }
      }

      // Fallback for smaller screen width: place below target if room, else above or bottom
      if (window.innerHeight - targetRect.bottom >= popoverHeight + 16) {
        const top = targetRect.bottom + 16;
        const left = Math.max(
          16,
          Math.min(window.innerWidth - popoverWidth - 16, targetCenterX - popoverWidth / 2)
        );
        return { top: `${top}px`, left: `${left}px`, width: `${popoverWidth}px` };
      } else if (targetRect.top >= popoverHeight + 16) {
        const top = targetRect.top - popoverHeight - 16;
        const left = Math.max(
          16,
          Math.min(window.innerWidth - popoverWidth - 16, targetCenterX - popoverWidth / 2)
        );
        return { top: `${top}px`, left: `${left}px`, width: `${popoverWidth}px` };
      }

      const safeTop = Math.max(16, window.innerHeight - popoverHeight - 16);
      const safeLeft = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, targetCenterX - popoverWidth / 2));
      return { top: `${safeTop}px`, left: `${safeLeft}px`, width: `${popoverWidth}px` };
    }

    // Check if target is in the sidebar (left side of screen)
    if (targetRect.left < 280 && targetRect.width < 320) {
      const left = Math.min(window.innerWidth - popoverWidth - 16, targetRect.right + 20);
      const top = Math.max(20, Math.min(window.innerHeight - popoverHeight - 20, targetCenterY - 100));
      return { top: `${top}px`, left: `${left}px` };
    }

    // Check vertical placement: place below if room, otherwise above
    let top = 0;
    if (targetRect.bottom + popoverHeight + 20 < window.innerHeight) {
      top = targetRect.bottom + 16;
    } else if (targetRect.top - popoverHeight - 20 > 0) {
      top = targetRect.top - popoverHeight - 16;
    } else {
      top = Math.max(16, window.innerHeight - popoverHeight - 16);
    }

    // Horizontal placement: align center with target, clamped within viewport
    let left = targetCenterX - popoverWidth / 2;
    left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, left));

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden select-none">
      {/* SVG Spotlight Mask Backdrop */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="whats-new-spotlight-mask">
            {/* White background: dim everything */}
            <rect width="100%" height="100%" fill="white" />
            {/* Cutout hole: keep target element fully visible and in full color */}
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={cutoutRadius}
                ry={cutoutRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.72)"
          mask="url(#whats-new-spotlight-mask)"
        />
      </svg>

      {/* Target Highlight & Interactive Click Area */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            zIndex: 125,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isClickableStep) {
              handleTargetClick();
            }
          }}
          className={`rounded-3xl transition-all duration-300 ${
            isClickableStep ? "cursor-pointer group" : "pointer-events-none"
          }`}
        >
          {/* Main glowing border */}
          <div
            className={`absolute inset-0 rounded-3xl border-2 transition-all duration-300 ${
              isClickableStep
                ? "border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.45)] group-hover:shadow-[0_0_36px_rgba(52,211,153,0.7)] group-hover:border-emerald-300"
                : "border-emerald-400/80 shadow-[0_0_24px_rgba(52,211,153,0.3)]"
            }`}
          />

          {/* Interactive attention grabbers: Ping wave & Floating badge */}
          {isClickableStep && (
            <>
              {/* Expanding ping wave */}
              <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400 animate-ping opacity-35 pointer-events-none" />

              {/* Bouncing indicator badge ONLY for header-profile so it doesn't overlap other buttons */}
              {currentStep.id === "header-profile" && (
                <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-foreground text-background text-[11px] font-bold tracking-wide shadow-2xl flex items-center gap-1.5 animate-bounce pointer-events-none select-none">
                  <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Click to open Profile</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Transparent click catcher to prevent accidental clicks behind */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      {/* Tip Dialog Box (Strictly No Icons, Text and Buttons Only) */}
      <div
        style={getPopoverStyle()}
        className="fixed z-[130] rounded-3xl p-6 glass-panel border border-muted/30 shadow-2xl bg-surface/95 dark:bg-[#1e2722]/95 backdrop-blur-xl transition-all duration-300 space-y-4"
      >
        {/* Header row: Step Counter and Close text button */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
            Step {currentStepIndex + 1} of {activeTour.steps.length}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
          >
            Close
          </button>
        </div>

        {/* Content: Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {currentStep.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Footer: Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-muted/20">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity shadow-xs"
          >
            {isLastStep ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
