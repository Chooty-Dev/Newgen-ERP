"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Check,
  Lightbulb,
} from "lucide-react";

interface ReleaseItem {
  version: string;
  releaseDate: string;
  isLatest?: boolean;
  isUiRedesign?: boolean;
  summary: string;
  whatsNew?: string[];
  maintenance: string;
  details: {
    overview: string;
    highlights: string[];
    userTips?: string[];
  };
}

const RELEASES: ReleaseItem[] = [
  {
    version: "v2.1.1",
    releaseDate: "November 2026",
    isLatest: true,
    summary:
      "Customer phone validation updates, duplicate account prevention, and a clean side-by-side debt settlement view.",
    whatsNew: [
      "No spaces allowed in mobile numbers to keep customer records neat and accurate",
      "Automatic duplicate prevention — existing credit customers are recognized instantly",
      "Live status indicator shows if a customer exists and their current debt",
      "Clean side-by-side Debt Settlement view with instant search results",
      "Search results show up to 3 best matches without clutter",
    ],
    maintenance: "Improved search matching and duplicate record prevention",
    details: {
      overview:
        "This update makes customer records cleaner by preventing duplicate accounts and blocking spaces in phone numbers. It also adds a clean side-by-side view to search customers and settle debts quickly.",
      highlights: [
        "Spaces are blocked automatically when typing or pasting mobile numbers",
        "Existing customer accounts are reused automatically, so duplicates never get created",
        "Two-pane Debt Settlement lets you view the payment form and search results side-by-side",
        "Clear live indicator shows you existing debt balances before recording a sale",
      ],
      userTips: [
        "Type a 10-digit mobile number (e.g. 0771234567) without spaces to look up customers fast.",
        "Click 'Settle Debt' in Staff Finances to view and settle customer balances side-by-side.",
      ],
    },
  },
  {
    version: "v2.1.0",
    releaseDate: "November 2026",
    summary:
      "Added the new System Changelog page, guided feature tours, and inter-branch cash transfers.",
    whatsNew: [
      "New Changelog page to easily see what's new in the system",
      "Interactive guided tours for staff finances and debt settlement",
      "Added petty cash transfer options between branches",
    ],
    maintenance: "Bug fixes and performance improvements",
    details: {
      overview:
        "Introduced the central Changelog page alongside guided feature tours and branch cash transfer tools.",
      highlights: [
        "Easily view all system updates right from your profile menu",
        "Interactive spotlights show you where new buttons and features are located",
        "Faster sync when reviewing transactions across different branches",
      ],
      userTips: [
        "Click the Changelog button in your account menu to see the latest updates anytime.",
      ],
    },
  },
  {
    version: "v2.0.1",
    releaseDate: "November 2026",
    summary:
      "Minor maintenance update focused on login security, smoother branch assignments, and stability.",
    maintenance: "Bug fixes and performance improvements",
    details: {
      overview:
        "A stability and security update ensuring smoother branch assignments and automatic session security.",
      highlights: [
        "Smoother branch user assignments during account setup",
        "Automatic session protection when the application is idle",
        "Refined petty cash withdrawal validations",
      ],
      userTips: [
        "Your session is automatically secured if you leave your browser open.",
      ],
    },
  },
  {
    version: "v2.0.0",
    releaseDate: "October 2026",
    isUiRedesign: true,
    summary:
      "A complete visual redesign featuring a fresh modern look, dark & light themes, and streamlined shop dashboards.",
    whatsNew: [
      "Fresh modern interface with dark and light themes",
      "Redesigned account profile card in the top navigation bar",
      "Sleek sidebar with quick branch switching",
      "Enhanced shop view for faster sales, bill tracking, and inventory",
    ],
    maintenance: "Bug fixes and performance improvements",
    details: {
      overview:
        "Theme 2.0 brings a completely refreshed, clean design with smooth transitions and dedicated workspaces for each branch.",
      highlights: [
        "Comfortable dark and light viewing modes tailored for all screens",
        "Faster navigation between branches with the top bar",
        "Clean, clutter-free tables and forms across all operational modules",
        "Instant discrepancy tracking for daily branch accounts",
      ],
      userTips: [
        "Use the sun/moon icon in the header to switch between light and dark modes.",
        "Each branch now has its own focused workspace tab.",
      ],
    },
  },
  {
    version: "v1.0.0",
    releaseDate: "September 2026",
    summary:
      "Initial launch of Newgen ERP for branch daily accounts, sales counters, and customer credit tracking.",
    whatsNew: [
      "Multi-branch cash drawer & daily finance management",
      "Sales counter for phone reloads and utility bills",
      "Customer credit tracking and repayment history",
      "Role-based accounts for Admin, Verifier, and Staff",
    ],
    maintenance: "Initial production release",
    details: {
      overview:
        "The initial foundation of Newgen ERP, unifying multi-shop finances and customer balances into one secure platform.",
      highlights: [
        "Real-time tracking of branch daily cash drawers",
        "Comprehensive customer credit history and receipts",
        "Detailed activity logs for administrative oversight",
      ],
    },
  },
];

export function ChangelogView() {
  const [selectedRelease, setSelectedRelease] = React.useState<ReleaseItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const handleOpenReleaseSheet = (rel: ReleaseItem) => {
    setSelectedRelease(rel);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Changelog
          </h1>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            v2.1.1 Active
          </span>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
          See what’s new, recent improvements, and updates across Newgen ERP.
        </p>
      </div>

      {/* Clean Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-muted/20 bg-surface/30">
          <div className="text-xs font-medium text-muted-foreground">Current Version</div>
          <div className="text-lg font-bold text-foreground font-mono mt-0.5">v2.1.1</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-muted/20 bg-surface/30">
          <div className="text-xs font-medium text-muted-foreground">Latest Update</div>
          <div className="text-lg font-bold text-foreground mt-0.5">November 2026</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-muted/20 bg-surface/30">
          <div className="text-xs font-medium text-muted-foreground">System Status</div>
          <div className="text-lg font-bold text-emerald-500 flex items-center gap-1.5 mt-0.5">
            <CheckCircle2 className="size-4" />
            <span>Up to date</span>
          </div>
        </div>
      </div>

      {/* Main Changelog Releases */}
      <div className="space-y-5">
        {RELEASES.map((rel) => (
          <div
            key={rel.version}
            className={`glass-card rounded-3xl p-6 md:p-7 border transition-all ${
              rel.isLatest
                ? "border-emerald-500/30 bg-surface/45 shadow-sm"
                : "border-muted/20 bg-surface/25"
            }`}
          >
            {/* Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-muted/15">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-foreground">
                  {rel.version}
                </span>

                {rel.isLatest && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                    Latest
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>{rel.releaseDate}</span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenReleaseSheet(rel)}
                  className="h-8 px-3 rounded-xl border border-muted/20 hover:bg-surface/60 text-xs font-medium gap-1 text-foreground cursor-pointer"
                >
                  <span>Details</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Friendly Short Summary */}
            <div className="pt-3 pb-2">
              <p className="text-sm text-foreground/90 font-medium leading-relaxed">
                {rel.summary}
              </p>
            </div>

            {/* What's New List (with red dots for UI redesigns as requested) */}
            {rel.whatsNew && rel.whatsNew.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-foreground/70" />
                  <span>What’s New</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rel.whatsNew.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-background/40 border border-muted/15 text-xs text-foreground/90"
                    >
                      {rel.isUiRedesign ? (
                        <span className="text-rose-500 font-bold shrink-0 leading-tight">
                          *
                        </span>
                      ) : (
                        <span className="size-1.5 rounded-full bg-foreground/60 mt-1.5 shrink-0" />
                      )}
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simple Maintenance / Bug fixes note */}
            <div className="pt-3">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-surface/30 px-3 py-1.5 rounded-xl border border-muted/15">
                <Check className="size-3.5 text-emerald-500 shrink-0" />
                <span>{rel.maintenance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section: Understanding Version Numbers */}
      <div className="space-y-4 pt-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            How Version Numbers Work
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            A quick guide to what the numbers in <strong>v2.1.1</strong> mean.
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-muted/20 space-y-5">
          {/* Version Breakdown Display */}
          <div className="flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-surface/30 border border-muted/20">
            <div className="flex items-center gap-2 sm:gap-3 font-mono font-bold text-2xl sm:text-3xl text-foreground">
              <span className="text-muted-foreground font-normal">v</span>
              <span className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400">
                2
              </span>
              <span className="text-muted-foreground">.</span>
              <span className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400">
                1
              </span>
              <span className="text-muted-foreground">.</span>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                1
              </span>
            </div>
          </div>

          {/* 3 Simple Non-Technical Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Major */}
            <div className="rounded-2xl p-4 border border-muted/20 bg-background/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-purple-400">2 — Major</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Big Update
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Changes when there is a major milestone, like a completely new visual theme or system redesign.
              </p>
            </div>

            {/* Minor */}
            <div className="rounded-2xl p-4 border border-muted/20 bg-background/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-blue-400">1 — Features</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  New Tools
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Changes when useful new features, pages, or workflow tools are added to help you do more.
              </p>
            </div>

            {/* Patch */}
            <div className="rounded-2xl p-4 border border-muted/20 bg-background/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-emerald-400">1 — Fixes</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Speed &amp; Fixes
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Changes when bug fixes, speed improvements, and security tune-ups are released.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Creative Shadcn Sheet: Release Details */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="glass-panel border-l border-muted/30 p-6 sm:p-7 space-y-6 overflow-y-auto no-scrollbar sm:max-w-md w-full"
        >
          {selectedRelease && (
            <>
              <SheetHeader className="p-0 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {selectedRelease.version}
                  </span>
                  {selectedRelease.isLatest && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      Latest
                    </span>
                  )}
                </div>
                <SheetTitle className="text-base font-semibold text-foreground">
                  Update Highlights
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Released in {selectedRelease.releaseDate}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 text-xs">
                {/* Overview Box */}
                <div className="p-4 rounded-2xl bg-surface/30 border border-muted/20 space-y-2">
                  <span className="font-semibold text-foreground block">Summary</span>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedRelease.details.overview}
                  </p>
                </div>

                {/* Key Highlights */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    What Changed
                  </span>
                  <div className="space-y-2">
                    {selectedRelease.details.highlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-muted/15 text-foreground/90 leading-relaxed"
                      >
                        <Check className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Tips (if any) */}
                {selectedRelease.details.userTips && (
                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 space-y-2">
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs">
                      <Lightbulb className="size-3.5" />
                      <span>Quick Tip</span>
                    </div>
                    <ul className="space-y-1.5 text-muted-foreground pl-1">
                      {selectedRelease.details.userTips.map((tip, idx) => (
                        <li key={idx} className="leading-relaxed">
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-muted/20">
                <SheetClose render={<Button variant="outline" className="w-full h-11 rounded-2xl text-xs font-semibold cursor-pointer" />}>
                  Close Details
                </SheetClose>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
