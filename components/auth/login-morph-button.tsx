"use client";

import * as React from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";

export type MorphPhase = "idle" | "morphing" | "authenticating" | "success" | "error";

interface LoginMorphButtonProps {
  phase: MorphPhase;
  loading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onSuccessNavigate?: () => void;
}

const CANVAS_SIZE = 220;
const ORB_RADIUS = 66;
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
  const rand = mulberry32(7);
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
        seed: rand() * 6.283,
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
const A_STEPS = 48;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function makePalette(startRgb: [number, number, number], endRgb: [number, number, number]) {
  const out: string[] = [];
  for (let gi = 0; gi <= G_STEPS; gi++) {
    const g = gi / G_STEPS;
    const r = Math.round(lerp(startRgb[0], endRgb[0], g));
    const gg = Math.round(lerp(startRgb[1], endRgb[1], g));
    const b = Math.round(lerp(startRgb[2], endRgb[2], g));
    for (let ai = 0; ai <= A_STEPS; ai++) {
      out.push(`rgba(${r},${gg},${b},${(ai / A_STEPS).toFixed(3)})`);
    }
  }
  return out;
}

const PALETTES = {
  authenticating: makePalette([235, 214, 153], [82, 197, 168]), // warm gold to soft teal
  success: makePalette([34, 197, 94], [16, 185, 129]),          // vivid emerald green
  error: makePalette([239, 68, 68], [220, 38, 38]),            // vivid ruby red
};

const AUTH_LABELS = [
  "Authenticating...",
  "Verifying credentials...",
  "Validating security tokens...",
  "Opening workspace...",
];

export function LoginMorphButton({
  phase,
  loading,
  errorMessage,
  onRetry,
  onSuccessNavigate,
}: LoginMorphButtonProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [labelIndex, setLabelIndex] = React.useState(0);
  const [shake, setShake] = React.useState(false);
  const [isFadingOut, setIsFadingOut] = React.useState(false);

  // Label cycle during authenticating
  React.useEffect(() => {
    if (phase !== "authenticating" && phase !== "morphing") return;
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % AUTH_LABELS.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [phase]);

  // Handle error shake and auto-return
  React.useEffect(() => {
    if (phase === "error") {
      setShake(true);
      const shakeTimer = setTimeout(() => setShake(false), 500);

      // Auto return back to login after 2.4s so user can re-enter credentials
      const returnTimer = setTimeout(() => {
        onRetry();
      }, 2400);

      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(returnTimer);
      };
    }
  }, [phase, onRetry]);

  // Handle success fadeout and navigate directly to dashboard
  React.useEffect(() => {
    if (phase === "success") {
      // Keep green orb visible for 1.3s, then trigger fade-out
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1300);

      // Once faded out, navigate directly without ever showing login page
      const navTimer = setTimeout(() => {
        onSuccessNavigate?.();
      }, 2000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(navTimer);
      };
    } else {
      setIsFadingOut(false);
    }
  }, [phase, onSuccessNavigate]);

  // 3D Canvas Orb Animation using exact spherical projection and light programs
  React.useEffect(() => {
    if (phase === "idle") return;

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
    const pw = [1, 0, 0, 0];

    const CP = Math.cos(0.35);
    const SP = Math.sin(0.35);
    const C0 = CANVAS_SIZE / 2;

    const render = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - lastNow) / 1000));
      lastNow = now;
      time += dt;

      const spinSpeed = phase === "success" ? 0.8 : phase === "error" ? 0.35 : 1.5;
      rot += spinSpeed * dt;

      const yaw = rot;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);

      // Light program progression
      const stepW = dt / 0.35;
      const prog = phase === "success" ? 1 : Math.floor((time * 0.8) % 4);
      for (let q = 0; q < 4; q++) {
        const d = (q === prog ? 1 : 0) - pw[q];
        pw[q] += Math.abs(d) <= stepW ? d : d > 0 ? stepW : -stepW;
      }

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const paletteKey = phase === "success" ? "success" : phase === "error" ? "error" : "authenticating";
      const palette = PALETTES[paletteKey];

      const decay = Math.exp(-dt / 0.5);
      const h0 = (time * 300) % N;
      const h3 = (time * 480) % N;
      const lat = Math.sin(time * 2.2);

      for (let n = 0; n < N; n++) {
        const dx = DX[n];
        const dy = DY[n];
        const dz = DZ[n];
        const u = DU[n];

        // Light wave calculation
        let pulse = 0;
        if (pw[0] > 0.001) {
          let dd = Math.abs(n - h0);
          if (dd > N - dd) dd = N - dd;
          const v = Math.max(0, 1 - dd / 16);
          pulse = Math.max(pulse, v * v * pw[0]);
        }
        if (pw[2] > 0.001) {
          const e = dy - lat;
          const v = Math.max(0, 1 - (e * e) / 0.02);
          pulse = Math.max(pulse, v * v * pw[2]);
        }
        if (pw[3] > 0.001) {
          let dd = Math.abs(n - h3);
          if (dd > N - dd) dd = N - dd;
          const v = Math.max(0, 1 - dd / 22);
          pulse = Math.max(pulse, v * v * pw[3]);
        }
        const l = Math.max(lit[n] * decay, pulse);
        lit[n] = l;

        // 3D Spherical coordinates rotation
        const x1 = dx * cyw + dz * syw;
        const z1 = -dx * syw + dz * cyw;
        const y2 = dy * CP - z1 * SP;
        const z2 = dy * SP + z1 * CP;

        const f = 2.8 / (2.8 - z2);
        const depth = (z2 + 1) / 2;

        const radiusScale = phase === "success" ? 1.15 : phase === "error" ? 0.95 : 1.0;
        const ox = x1 * ORB_RADIUS * radiusScale * f;
        const oy = -y2 * ORB_RADIUS * radiusScale * f;

        let alpha = 0.15 + 0.04 * Math.sin(DS[n] + time * 1.8) + 0.38 * depth * depth + 0.65 * l;
        if (phase === "success") alpha = Math.min(1, alpha * 1.35);
        if (phase === "error") alpha = Math.min(1, alpha * 1.25);
        alpha = Math.max(0, Math.min(1, alpha));

        SX[n] = C0 + ox;
        SY[n] = C0 + oy;
        SD[n] = depth;
        SR[n] = (1.15 * (0.45 + 0.75 * depth) * f + 0.8 * l) * (phase === "success" ? 1.15 : 1.0);

        const ai = Math.round(alpha * A_STEPS);
        const gi = Math.round(depth * G_STEPS);
        SC[n] = ai <= 0 ? -1 : gi * (A_STEPS + 1) + ai;
      }

      // Two pass rendering: back dots first, then front dots for true 3D depth
      for (let pass = 0; pass < 2; pass++) {
        for (let n = 0; n < N; n++) {
          const c = SC[n];
          if (c < 0 || !palette[c]) continue;
          if ((SD[n] >= 0.5) !== (pass === 1)) continue;

          ctx.fillStyle = palette[c];
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
  }, [phase]);

  // IDLE: Regular full-width button
  if (phase === "idle") {
    return (
      <button
        type="submit"
        disabled={loading}
        className="w-full h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold flex items-center justify-between px-6 transition-all duration-300 shadow-md cursor-pointer"
      >
        <span>Continue</span>
        <ArrowUpRight className="size-5" />
      </button>
    );
  }

  // ACTIVE PHASES: Button morphs into the circular 3D Particle Orb!
  return (
    <div
      className={`w-full flex flex-col items-center justify-center py-4 transition-all duration-700 ease-in-out ${
        isFadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      <div
        className={`relative flex flex-col items-center justify-center transition-all duration-500 ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Dynamic Glowing Aura behind the Morphed Orb */}
        <div
          className={`absolute size-44 rounded-full blur-3xl opacity-60 transition-colors duration-700 pointer-events-none ${
            phase === "success"
              ? "bg-emerald-500/70"
              : phase === "error"
              ? "bg-red-500/70"
              : "bg-primary/50"
          }`}
        />

        {/* The 3D Morph Orb Canvas Container */}
        <div
          className={`relative flex items-center justify-center rounded-full transition-all duration-500 shadow-2xl ${
            phase === "success"
              ? "border border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
              : phase === "error"
              ? "border border-red-500/40 bg-red-950/20 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
              : "border border-muted/30 bg-surface/30 shadow-[0_0_30px_rgba(0,0,0,0.2)]"
          }`}
          style={{ width: 140, height: 140 }}
        >
          <canvas
            ref={canvasRef}
            className="drop-shadow-lg"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
          />
        </div>

        {/* Dynamic Status Text underneath the Orb */}
        <div className="text-center space-y-1 mt-5 min-h-[56px] flex flex-col items-center justify-center">
          {(phase === "morphing" || phase === "authenticating") && (
            <>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                Authenticating
              </h3>
              <p className="text-xs font-medium text-muted-foreground animate-pulse">
                {AUTH_LABELS[labelIndex]}
              </p>
            </>
          )}

          {phase === "success" && (
            <>
              <h3 className="text-2xl font-extrabold tracking-tight text-emerald-500 animate-in fade-in">
                Welcome!
              </h3>
              <p className="text-xs font-medium text-muted-foreground">
                Access granted. Welcome to Newgen ERP.
              </p>
            </>
          )}

          {phase === "error" && (
            <>
              <h3 className="text-2xl font-extrabold tracking-tight text-destructive animate-in fade-in">
                Oops!
              </h3>
              <p className="text-xs font-medium text-muted-foreground max-w-xs">
                {errorMessage || "Invalid login credentials. Please try again."}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline mt-2 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Try Again</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
