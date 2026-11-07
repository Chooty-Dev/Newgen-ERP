"use client";

import * as React from "react";
import Link from "next/link";
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
  Sparkles,
  ArrowRight,
  Layers,
  Calendar,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  ChevronRight,
  Info,
  Sliders,
  Check,
} from "lucide-react";

interface ReleaseItem {
  version: string;
  releaseDate: string;
  releaseType: "MINOR" | "PATCH" | "MAJOR";
  tag: string;
  isCurrent?: boolean;
  summary: string;
  whatsNew?: string[];
  isUiRedesign?: boolean;
  maintenanceNotes?: string[];
  details: {
    targetModules: string[];
    affectedRoles: string[];
    migrationRequired: boolean;
    technicalHighlights: string[];
  };
}

const RELEASES: ReleaseItem[] = [
  {
    version: "v2.1.0",
    releaseDate: "November 2026",
    releaseType: "MINOR",
    tag: "Feature Additions & Review Engine",
    isCurrent: true,
    summary:
      "Introduction of the centralized System Changelog hub, refined cross-branch transaction review pipeline, petty cash transfer normalization, and guided feature tours.",
    whatsNew: [
      "Dedicated System Changelog & Version Hub for Administrators",
      "Interactive Feature Tour spotlight for Profile Card & Changelog Hub",
      "Inter-Branch Petty Cash Transfer auto-settlement integration",
      "Instant multi-dashboard cache revalidation on transaction reviews",
    ],
    maintenanceNotes: ["Bug fixes and performance improvements"],
    details: {
      targetModules: ["Changelog Hub", "Finances", "Daily Settlement", "Tour System"],
      affectedRoles: ["Admin", "Verifier"],
      migrationRequired: false,
      technicalHighlights: [
        "Extended FinanceRecord settlementType enum with PETTY_CASH_TRANSFER",
        "Added automatic Server Action cache invalidation across all branch dashboards",
        "Normalized input payload parsing in reviewFinanceRecordAction",
        "Implemented custom event communication between AppHeader and WhatsNewTour",
      ],
    },
  },
  {
    version: "v2.0.1",
    releaseDate: "November 2026",
    releaseType: "PATCH",
    tag: "Stability & Security Patch",
    summary:
      "Targeted stability improvements covering petty cash withdrawal types, multi-branch user assignment validation, and proactive session timeout management.",
    maintenanceNotes: [
      "Bug fixes and performance improvements",
      "Petty cash withdrawal action and schema alignment",
      "Multi-branch user creation validation handling",
      "Automated session expiry listener and proactive logout trigger",
    ],
    details: {
      targetModules: ["Petty Cash", "User Management", "Authentication"],
      affectedRoles: ["Admin", "Staff", "Verifier"],
      migrationRequired: false,
      technicalHighlights: [
        "Aligned petty cash schema WITHDRAWAL enum with form actions",
        "Bound Shop selection state across user creation modals",
        "Introduced SessionTimeoutWatcher with server-side checkSessionStatusAction",
      ],
    },
  },
  {
    version: "v2.0.0",
    releaseDate: "October 2026",
    releaseType: "MAJOR",
    tag: "Theme 2.0 & Glassmorphism Overhaul",
    isUiRedesign: true,
    summary:
      "A complete architectural and visual redesign of Newgen ERP featuring minimalist glassmorphism, responsive light/dark themes, single-shop workspaces, and seamless navigation.",
    whatsNew: [
      "Complete Minimalist Glassmorphism Theme Redesign",
      "Unified Sun & Moon Theme Switcher with Smooth Transitions",
      "Brand New Profile Card in Header Navigation",
      "Borderless Sleek Sidebar & Dynamic Shop Selector",
      "Single Shop View Workspace with Dedicated Feature Tabs",
      "Comprehensive Branch Discrepancy Manager with Prior Carryovers",
    ],
    maintenanceNotes: ["Bug fixes and performance improvements"],
    details: {
      targetModules: ["Core UI", "Header & Sidebar", "Single Shop Workspaces", "Dashboard"],
      affectedRoles: ["Admin", "Verifier", "Staff"],
      migrationRequired: false,
      technicalHighlights: [
        "Replaced legacy heavy card wrappers with ultra-clean border-muted/20 glass cards",
        "Redesigned Single Shop View with tabs for Sales, Bills, Inventory, Credits, and Wastage",
        "Optimized client-side rendering with Tailwind v4 CSS variables",
      ],
    },
  },
  {
    version: "v1.0.0",
    releaseDate: "September 2026",
    releaseType: "MAJOR",
    tag: "Foundational Release",
    summary:
      "The initial production release of Newgen Financial Management System, providing multi-shop ledger accounting, POS communication counter, and customer debt management.",
    whatsNew: [
      "Centralized Multi-Branch Financial Management Core",
      "Sequential Running Cash Drawer Balance Tracking",
      "POS Communication Retail Sales, Telecom Reloads & Utility Bills Counter",
      "Customer Credit Ledger, Statements & Debt Repayment Processing",
      "Role-Based Access Control (Admin, Verifier, Staff) with Complete Audit Logs",
    ],
    maintenanceNotes: ["Bug fixes and performance improvements"],
    details: {
      targetModules: ["Finances", "Communication", "Credit Customers", "Shops", "Audit Logs"],
      affectedRoles: ["Admin", "Verifier", "Staff"],
      migrationRequired: true,
      technicalHighlights: [
        "Multi-shop MongoDB architecture with Mongoose ODM",
        "NextAuth v5 beta session management with role-based routing",
        "Chronological running balance recalculation engine",
      ],
    },
  },
];

export function ChangelogView() {
  const [selectedRelease, setSelectedRelease] = React.useState<ReleaseItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [semverSheetOpen, setSemverSheetOpen] = React.useState(false);

  const handleOpenReleaseSheet = (rel: ReleaseItem) => {
    setSelectedRelease(rel);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-12 max-w-full pb-16">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              System Changelog
            </h1>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v2.1.0
            </span>
          </div>
          <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
            Detailed chronological record of platform updates, user interface evolutions, stability
            enhancements, and semantic version milestones.
          </p>
        </div>

        {/* Quick Action Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSemverSheetOpen(true)}
            className="h-11 px-4 rounded-2xl border-muted/30 bg-surface/40 hover:bg-surface/80 text-foreground font-semibold text-xs gap-2 cursor-pointer shadow-xs"
          >
            <Sliders className="size-3.5 text-muted-foreground" />
            <span>SemVer Spec</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-muted/20 bg-surface/30 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Current Version
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-foreground">v2.1.0</span>
            <span className="text-[10px] font-semibold text-emerald-500">Active</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-muted/20 bg-surface/30 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Releases Logged
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-foreground">4</span>
            <span className="text-[10px] font-semibold text-muted-foreground">Milestones</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-muted/20 bg-surface/30 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Release Standard
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-foreground">SemVer 2.0</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-muted/20 bg-surface/30 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Environment
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-foreground">Production</span>
          </div>
        </div>
      </div>

      {/* Main Changelog Stream */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Layers className="size-4 text-foreground" />
          <span>Release History Timeline</span>
        </div>

        <div className="space-y-6">
          {RELEASES.map((rel) => (
            <div
              key={rel.version}
              className={`glass-card rounded-3xl p-6 md:p-8 border transition-all ${
                rel.isCurrent
                  ? "border-emerald-500/30 bg-surface/50 shadow-md"
                  : "border-muted/20 bg-surface/30"
              }`}
            >
              {/* Card Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-muted/20">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xl font-extrabold text-foreground">
                    {rel.version}
                  </span>

                  {rel.isCurrent && (
                    <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 uppercase tracking-wide">
                      Latest Release
                    </span>
                  )}

                  <span
                    className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${
                      rel.releaseType === "MAJOR"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : rel.releaseType === "MINOR"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-muted/30 text-muted-foreground border-muted/30"
                    }`}
                  >
                    {rel.tag}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>{rel.releaseDate}</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenReleaseSheet(rel)}
                    className="h-8 px-3 rounded-xl border border-muted/20 hover:bg-surface/60 text-xs font-semibold gap-1.5 text-foreground cursor-pointer"
                  >
                    <span>Inspect Specs</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Release Summary */}
              <div className="py-4">
                <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                  {rel.summary}
                </p>
              </div>

              {/* What's New List */}
              {rel.whatsNew && rel.whatsNew.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {rel.isUiRedesign ? "What's New (UI Updates)" : "What's New"}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {rel.whatsNew.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-2xl bg-background/50 border border-muted/15 text-xs text-foreground/90"
                      >
                        {rel.isUiRedesign ? (
                          <span
                            className="size-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"
                            title="UI Update Indicator"
                          />
                        ) : (
                          <span
                            className="size-1.5 rounded-full bg-foreground/60 mt-1.5 shrink-0"
                          />
                        )}
                        <span className="leading-relaxed">
                          {rel.isUiRedesign && (
                            <span className="text-rose-500 font-bold mr-1">*</span>
                          )}
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenance & Performance Notes */}
              {rel.maintenanceNotes && rel.maintenanceNotes.length > 0 && (
                <div className="space-y-2 pt-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Maintenance &amp; Fixes
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {rel.maintenanceNotes.map((note, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[11px] font-medium px-3 py-1 rounded-xl bg-surface/40 border border-muted/20 text-muted-foreground flex items-center gap-1.5"
                      >
                        <span className="size-1 rounded-full bg-muted-foreground" />
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Understanding Semantic Versioning (SemVer) */}
      <div className="space-y-6 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Understanding Version Numbers
            </h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Newgen ERP follows standard Semantic Versioning (SemVer) principles to categorize
            releases by architectural scope and backward compatibility.
          </p>
        </div>

        {/* Large Visual Breakdown */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-muted/20 shadow-lg space-y-6">
          {/* Version Formula Pill */}
          <div className="flex items-center justify-center p-4 rounded-2xl bg-surface/40 border border-muted/20">
            <div className="flex items-center gap-2 sm:gap-3 font-mono font-extrabold text-2xl sm:text-4xl text-foreground">
              <span className="text-muted-foreground">v</span>
              <span className="px-3 py-1 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                2
              </span>
              <span className="text-muted-foreground">.</span>
              <span className="px-3 py-1 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                1
              </span>
              <span className="text-muted-foreground">.</span>
              <span className="px-3 py-1 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                0
              </span>
            </div>
          </div>

          {/* 3 Meaning Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. MAJOR */}
            <div className="rounded-2xl p-5 border border-muted/20 bg-background/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-extrabold text-purple-400">2 — MAJOR</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Overhaul
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Increments for fundamental architectural redesigns, core database schema updates, or
                comprehensive visual theme overhauls (e.g. Theme 2.0 Glassmorphism overhaul).
              </p>
              <div className="pt-2 border-t border-muted/15 text-[11px] font-mono text-foreground font-medium">
                Scope: Breaking changes &amp; major milestones
              </div>
            </div>

            {/* 2. MINOR */}
            <div className="rounded-2xl p-5 border border-muted/20 bg-background/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-extrabold text-blue-400">1 — MINOR</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Feature
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Increments when new operational modules, pages, or functional capabilities are added
                in a backward-compatible manner (e.g., System Changelog hub, Inter-Branch
                Settlement).
              </p>
              <div className="pt-2 border-t border-muted/15 text-[11px] font-mono text-foreground font-medium">
                Scope: New backward-compatible features
              </div>
            </div>

            {/* 3. PATCH */}
            <div className="rounded-2xl p-5 border border-muted/20 bg-background/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-extrabold text-emerald-400">0 — PATCH</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Fix &amp; Tune
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Increments for backward-compatible bug resolutions, performance tunings, hotfixes,
                and security hardening without modifying business interfaces or data integrity.
              </p>
              <div className="pt-2 border-t border-muted/15 text-[11px] font-mono text-foreground font-medium">
                Scope: Stability patches &amp; optimizations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creative Shadcn Sheet: Release Specification Inspector */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="glass-panel border-l border-muted/30 p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar sm:max-w-md w-full"
        >
          {selectedRelease && (
            <>
              <SheetHeader className="p-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-extrabold text-foreground">
                    {selectedRelease.version}
                  </span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border bg-surface/50 text-foreground uppercase">
                    {selectedRelease.tag}
                  </span>
                </div>
                <SheetTitle className="text-base font-semibold text-foreground">
                  Release Technical Specifications
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Deployment verification metadata and technical parameter checklist.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 pt-2 text-xs">
                {/* Meta details */}
                <div className="rounded-2xl border border-muted/20 bg-surface/30 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Release Date</span>
                    <span className="font-mono font-semibold text-foreground">
                      {selectedRelease.releaseDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Release Scope</span>
                    <span className="font-mono font-semibold text-foreground">
                      {selectedRelease.releaseType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-mono font-semibold text-emerald-500">Production Ready</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Database Migration</span>
                    <span className="font-mono font-semibold text-foreground">
                      {selectedRelease.details.migrationRequired ? "Required" : "None Required"}
                    </span>
                  </div>
                </div>

                {/* Target Modules */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Target Modules
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRelease.details.targetModules.map((mod, i) => (
                      <span
                        key={i}
                        className="font-mono text-[10px] px-2.5 py-1 rounded-xl bg-background/50 border border-muted/20 text-foreground font-semibold"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Technical Highlights */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Technical Highlights
                  </span>
                  <div className="space-y-2">
                    {selectedRelease.details.technicalHighlights.map((hl, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-3 rounded-xl bg-background/40 border border-muted/15 leading-relaxed text-[11px] text-foreground/90 font-mono"
                      >
                        <span className="size-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Checklist */}
                <div className="rounded-2xl border border-muted/20 bg-surface/20 p-4 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Integrity &amp; Security Verification
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>TypeScript compilation validated (0 errors)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Next.js App Router cache revalidated</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Role-Based Access Control verified</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-muted/20">
                <SheetClose render={<Button variant="outline" className="w-full h-11 rounded-2xl text-xs font-semibold cursor-pointer" />}>
                  Close Inspector
                </SheetClose>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Creative Shadcn Sheet: SemVer Guide */}
      <Sheet open={semverSheetOpen} onOpenChange={setSemverSheetOpen}>
        <SheetContent
          side="right"
          className="glass-panel border-l border-muted/30 p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar sm:max-w-md w-full"
        >
          <SheetHeader className="p-0 space-y-2">
            <SheetTitle className="text-xl font-bold text-foreground">
              Semantic Versioning Spec
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Overview of Newgen ERP version numbering scheme.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-4 rounded-2xl bg-surface/30 border border-muted/20 space-y-2">
              <span className="font-mono font-bold text-sm text-foreground block">
                Format: v[MAJOR].[MINOR].[PATCH]
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                Under this framework, version numbers convey meaning about what has changed in the
                underlying release.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1">
                <span className="font-mono font-bold text-purple-400 block">MAJOR (v2.0.0)</span>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Incompatible or structural changes, major themes, and database redesigns.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
                <span className="font-mono font-bold text-blue-400 block">MINOR (v2.1.0)</span>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Backwards-compatible functionality and new features added to existing workflows.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <span className="font-mono font-bold text-emerald-400 block">PATCH (v2.0.1)</span>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Backwards-compatible bug fixes, performance optimizations, and security patches.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-muted/20">
            <SheetClose render={<Button variant="outline" className="w-full h-11 rounded-2xl text-xs font-semibold cursor-pointer" />}>
              Dismiss Guide
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

