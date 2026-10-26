"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LoginAuthStatus = "idle" | "authenticating" | "success" | "error";

interface LoginMorphOrbProps {
  status: LoginAuthStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  onSuccessComplete?: () => void;
}

const CANVAS_SIZE = 240;
const ORB_RADIUS = 74;
const TAU = Math.PI * 2;
const RINGS = 16;

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DOT_LIST = (() => {
  const rand = mulberry32(42);
  const out: { x: number; y: number; z: number; u: number; seed: number }[] = [];
  for (let k = 0; k < RINGS; k++) {
    const y = 1 - ((k + 0.5) / RINGS) * 2;
    const r = Math.sqrt(1 - y * y);
    const m = Math.max(4, Math.round(30 * r));
    for (let j = 0; j < m; j++) {
      const a = (j / m) * TAU + k * 0.35;
      out.push({
        x: Math.cos(a) * r,
        y,
        z: Math.sin(a) * r,
        u: (1 - y) / 2,
        seed: rand() * TAU,
      });
    }
  }
  return out;
})();

const N = DOT_LIST.length;
const DX = Float32Array.from(DOT_LIST, (d) => d.x);
const DY = Float32Array.from(DOT_LIST, (d) => d.y);
const DZ = Float32Array.from(DOT_LIST, (d) => d.z);
const DU = Float32Array.from(DOT_LIST, (d) => d.u);
const DS = Float32Array.from(DOT_LIST, (d) => d.seed);

const G_STEPS = 24;
const A_STEPS = 40;

function generatePalette(startRgb: [number, number, number], endRgb: [number, number, number]) {
  const out: string[] = [];
  for (let gi = 0; gi <= G_STEPS; gi++) {
    const g = gi / G_STEPS;
    const r = Math.round(startRgb[0] + (endRgb[0] - startRgb[0]) * g);
    const gg = Math.round(startRgb[1] + (endRgb[1] - startRgb[1]) * g);
    const b = Math.round(startRgb[2] + (endRgb[2] - startRgb[2]) * g);
    for (let ai = 0; ai <= A_STEPS; ai++) {
      out.push(`rgba(${r},${gg},${b},${(ai / A_STEPS).toFixed(3)})`);
    }
  }
  return out;
}

const PALETTES = {
  authenticating: generatePalette([214, 189, 152], [167, 193, 168]), // warm gold to soft sage
  success: generatePalette([34, 197, 94], [16, 185, 129]),           // bright glowing emerald green
  error: generatePalette([239, 68, 68], [220, 38, 38]),             // bright ruby crimson red
};

const AUTH_LABELS = [
  "Verifying credentials...",
  "Validating security tokens...",
  "Connecting to branch nodes...",
  "Preparing workspace...",
];

export function LoginMorphOrb({
  status,
  errorMessage,
  onRetry,
  onSuccessComplete,
}: LoginMorphOrbProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [labelIndex, setLabelIndex] = React.useState(0);
  const [shake, setShake] = React.useState(false);
  const [isFadingOut, setIsFadingOut] = React.useState(false);

  // Cycling status messages during authenticating
  React.useEffect(() => {
    if (status !== "authenticating") return;
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % AUTH_LABELS.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [status]);

  // Shake trigger and auto-return to login on error
  React.useEffect(() => {
    if (status === "error") {
      setShake(true);
      const shakeTimer = setTimeout(() => setShake(false), 500);

      // Automatically return to login page after 2.4 seconds
      const returnTimer = setTimeout(() => {
        onRetry?.();
      }, 2400);

      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(returnTimer);
      };
    }
  }, [status, onRetry]);

  // Smooth fade-out on success before navigating to dashboard
  React.useEffect(() => {
    if (status === "success") {
      // Keep green orb visible for 1.2s, then trigger fade-out animation
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1200);

      // Once faded out, notify parent to push router
      const redirectTimer = setTimeout(() => {
        onSuccessComplete?.();
      }, 1900);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(redirectTimer);
      };
    } else {
      setIsFadingOut(false);
    }
  }, [status, onSuccessComplete]);

  // 3D Canvas Orb Rendering Engine
  React.useEffect(() => {
    if (status === "idle") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let animationFrameId = 0;
    let time = 0;
    let lastNow = performance.now();
    let rot = 0;

    const lit = new Float32Array(N);
    const SX = new Float32Array(N);
    const SY = new Float32Array(N);
    const SD = new Float32Array(N);
    const SR = new Float32Array(N);
    const SC = new Int16Array(N);

    const CP = Math.cos(0.35);
    const SP = Math.sin(0.35);
    const C0 = CANVAS_SIZE / 2;

    const render = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - lastNow) / 1000));
      lastNow = now;
      time += dt;

      const spinSpeed = status === "authenticating" ? 1.6 : status === "success" ? 0.7 : 0.4;
      rot += spinSpeed * dt;

      const yaw = rot;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const paletteKey = status === "success" ? "success" : status === "error" ? "error" : "authenticating";
      const palette = PALETTES[paletteKey];

      const pulseWave = (time * 2.2) % 1;
      const decay = Math.exp(-dt / 0.4);

      for (let n = 0; n < N; n++) {
        const dx = DX[n];
        const dy = DY[n];
        const dz = DZ[n];
        const u = DU[n];

        // 3D Spherical coordinate projection
        const x1 = dx * cyw + dz * syw;
        const z1 = -dx * syw + dz * cyw;
        const y2 = dy * CP - z1 * SP;
        const z2 = dy * SP + z1 * CP;

        const f = 2.8 / (2.8 - z2);
        const depth = (z2 + 1) / 2;

        const radiusScale = status === "success" ? 1.15 : status === "error" ? 0.95 : 1.0;
        const ox = x1 * ORB_RADIUS * radiusScale * f;
        const oy = -y2 * ORB_RADIUS * radiusScale * f;

        // Wave lighting pulse
        const distToPulse = Math.abs(u - pulseWave);
        const waveLit = Math.max(0, 1 - distToPulse * 4);
        lit[n] = Math.max(lit[n] * decay, waveLit);

        let alpha = 0.15 + 0.05 * Math.sin(DS[n] + time * 2) + 0.45 * depth * depth + 0.4 * lit[n];
        if (status === "success") alpha = Math.min(1, alpha * 1.35);
        if (status === "error") alpha = Math.min(1, alpha * 1.25);
        alpha = Math.max(0, Math.min(1, alpha));

        SX[n] = C0 + ox;
        SY[n] = C0 + oy;
        SD[n] = depth;
        SR[n] = (1.2 * (0.4 + 0.8 * depth) * f + 0.8 * lit[n]) * (status === "success" ? 1.15 : 1.0);

        const ai = Math.round(alpha * A_STEPS);
        const gi = Math.round(depth * G_STEPS);
        SC[n] = ai <= 0 ? -1 : gi * (A_STEPS + 1) + ai;
      }

      // Two pass rendering: back dots first, then front dots for true 3D occlusion
      for (let pass = 0; pass < 2; pass++) {
        for (let n = 0; n < N; n++) {
          const colorIdx = SC[n];
          if (colorIdx < 0 || !palette[colorIdx]) continue;
          if ((SD[n] >= 0.5) !== (pass === 1)) continue;

          ctx.fillStyle = palette[colorIdx];
          ctx.beginPath();
          ctx.arc(SX[n], SY[n], Math.max(0.6, SR[n]), 0, TAU);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status]);

  if (status === "idle") return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-2xl transition-all duration-700 ease-in-out ${isFadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100 animate-in fade-in duration-300"
        }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`glass-panel relative flex flex-col items-center justify-center w-full max-w-sm rounded-3xl p-8 border-muted/30 shadow-2xl transition-all duration-300 ${shake ? "animate-shake" : ""
          }`}
      >
        {/* Dynamic Glowing Aura Ring behind Orb */}
        <div
          className={`absolute size-52 rounded-full blur-3xl opacity-50 transition-colors duration-700 pointer-events-none ${status === "success"
              ? "bg-emerald-500/60"
              : status === "error"
                ? "bg-red-500/60"
                : "bg-primary/40"
            }`}
        />

        {/* 3D Rotating Canvas Particle Orb */}
        <div className="relative size-60 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="size-60 drop-shadow-lg"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
          />
        </div>

        {/* Status Messages */}
        <div className="text-center space-y-2 mt-4 w-full">
          {status === "authenticating" && (
            <>
              <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                Authenticating
              </h3>
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                {AUTH_LABELS[labelIndex]}
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <h3 className="text-2xl font-extrabold tracking-tight text-emerald-500 animate-in fade-in">
                Welcome!
              </h3>
              <p className="text-sm font-medium text-muted-foreground">
                Access granted. Welcome to Newgen ERP.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h3 className="text-2xl font-extrabold tracking-tight text-destructive animate-in fade-in">
                Oops!
              </h3>
              <p className="text-sm font-medium text-muted-foreground">
                {errorMessage || "Invalid login credentials. Please try again."}
              </p>
              <div className="pt-3">
                <Button
                  onClick={onRetry}
                  className="w-full h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm gap-2"
                >
                  <RotateCcw className="size-4" />
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
