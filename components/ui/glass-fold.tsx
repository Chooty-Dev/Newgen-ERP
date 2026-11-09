"use client";

// From GradFlow, animated WebGL gradients for React: https://gradflow.meerbahadin.dev
// Enhanced with interactive mouse-driven wave distortion & progressive line unfold sequence

import { useEffect, useRef, useState } from "react";

export interface GlassFoldProps {
  /** The body of each glass pane. */
  color1?: string;
  /** The background. */
  color2?: string;
  /** The lit edges. */
  color3?: string;
  /** Animation speed. 0 freezes it. */
  speed?: number;
  /** How tightly the folds are packed. Higher is more, smaller folds. */
  scale?: number;
  /** Film grain, 0 to 0.5. */
  noise?: number;
  className?: string;
  /** Enable mouse interaction */
  interactive?: boolean;
  /** Auto detect dark/light mode from globals.css or specify */
  theme?: "dark" | "light" | "auto";
  /** How many seconds the sequential line unfolding entrance takes */
  introDuration?: number;
}

const VERTEX = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT = `
  precision highp float;

  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_scale;
  uniform float u_noise;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_progress;
  varying vec2 vUv;

  float grain(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 centered(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return p;
  }

  mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  // panes of glass folded over each other with sequential unfolding
  vec3 shade(vec2 uv, float time) {
    vec2 m = (u_mouse - 0.5) * 0.45;
    vec2 q = rot(0.6 + m.x * 0.5) * (centered(uv) - m * 0.15) * 2.0 * u_scale;
    float t = time * 0.6;
    float pixel = 2.0 * u_scale / max(u_resolution.y, 1.0);

    vec3 color = mix(u_color2, u_color2 * 0.35, clamp(length(centered(uv) - m * 0.1) * 1.3, 0.0, 1.0));

    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      
      // Each glass fold line appears one by one across u_progress (0.0 to 6.0)
      float foldIntro = clamp((u_progress - fi * 0.82) / 0.72, 0.0, 1.0);
      float paneAlpha = smoothstep(0.0, 1.0, foldIntro);
      if (paneAlpha <= 0.001) continue;

      float bend = mod(fi, 2.0) * 2.0 - 1.0;

      float crease = (fi - 2.5) * 0.4
                   + 0.26 * sin(q.x * (1.05 + 0.12 * fi) + fi * 1.9 + t * (0.25 + 0.05 * fi) + m.y * 1.2)
                   + 0.1 * bend * q.x * q.x;
      
      // Morph crease slightly as it unfolds into view
      crease = mix(crease + (bend > 0.0 ? 0.5 : -0.5) * (1.0 - paneAlpha), crease, paneAlpha);

      float s = q.y - crease;
      float pane = smoothstep(-pixel, pixel, s);
      float back = max(s, 0.0);

      // thick near the crease, clear further in
      float body = exp(-back * 1.7);
      float fresnel = exp(-back * 8.0);
      // the lit edge, and a fainter line just inside it for the glass's thickness
      float rim = exp(-back * 80.0);
      float inner = exp(-pow((back - 0.045) / 0.014, 2.0));
      float bloom = exp(-abs(s) * 20.0);

      vec3 tint = mix(u_color1, u_color3, clamp(fresnel * 0.6 + 0.08 + 0.14 * sin(fi * 2.1 + q.x * 0.8 + t * 0.2 + m.x), 0.0, 1.0));
      vec3 light = (tint * pane * (body * 0.42 + fresnel * 0.4)
                 + u_color3 * (pane * (rim * 0.6 + inner * 0.12) + bloom * 0.1)) * paneAlpha;

      // screen blend
      color += light * (1.0 - color);
    }

    return clamp(color, 0.0, 1.0);
  }

  void main() {
    vec3 color = shade(vUv, u_time);
    if (u_noise > 0.001) {
      float g = grain(vUv * 200.0 + u_time * 0.1);
      color *= 1.0 - u_noise * 0.4 + u_noise * g * 0.4;
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export function GlassFold({
  color1,
  color2,
  color3,
  speed = 0.45,
  scale = 1.15,
  noise = 0.08,
  className,
  interactive = true,
  theme = "auto",
  introDuration = 1.6,
}: GlassFoldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(true);

  // Sync with document theme class for dynamic light/dark response
  useEffect(() => {
    if (typeof document === "undefined") return;
    const checkDark = () => document.documentElement.classList.contains("dark");
    setIsDark(checkDark());

    const observer = new MutationObserver(() => {
      setIsDark(checkDark());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const activeDark = theme === "dark" || (theme === "auto" && isDark);

  // Darkened tones harmonized with globals.css:
  // Dark: #122421 (deep teal/card), #060d0d (ultra dark background), #819A91 (stat-1 lit edge)
  // Light: #52665c (darkened secondary), #283832 (deep sage forest), #A7C1A8 (secondary lit edge)
  const resolvedColor1 = color1 ?? (activeDark ? "#122421" : "#52665c");
  const resolvedColor2 = color2 ?? (activeDark ? "#060d0d" : "#283832");
  const resolvedColor3 = color3 ?? (activeDark ? "#819A91" : "#A7C1A8");

  const mouseState = useRef({
    currentX: 0.5,
    currentY: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    isHovered: false,
  });

  const props = useRef({
    color1: resolvedColor1,
    color2: resolvedColor2,
    color3: resolvedColor3,
    speed,
    scale,
    noise,
    interactive,
    introDuration,
  });

  props.current = {
    color1: resolvedColor1,
    color2: resolvedColor2,
    color3: resolvedColor3,
    speed,
    scale,
    noise,
    interactive,
    introDuration,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      time: uniform("u_time"),
      color1: uniform("u_color1"),
      color2: uniform("u_color2"),
      color3: uniform("u_color3"),
      scale: uniform("u_scale"),
      noise: uniform("u_noise"),
      resolution: uniform("u_resolution"),
      mouse: uniform("u_mouse"),
      progress: uniform("u_progress"),
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    let elapsed = 0;
    let last: number | null = null;
    let frame = 0;

    const draw = (now: number) => {
      const p = props.current;
      const m = mouseState.current;

      // Speed accelerates slightly on hover for responsiveness
      const activeSpeed = m.isHovered && p.interactive ? p.speed * 1.35 : p.speed;
      if (last !== null) elapsed += Math.min((now - last) / 1000, 0.1) * activeSpeed;
      last = now;

      // Smooth mouse interpolation (spring lerp)
      if (p.interactive) {
        m.currentX += (m.targetX - m.currentX) * 0.08;
        m.currentY += (m.targetY - m.currentY) * 0.08;
      } else {
        m.currentX = 0.5;
        m.currentY = 0.5;
      }

      // Calculate sequential line unfold progress from 0.0 to 6.0
      const introDur = Math.max(0.5, p.introDuration);
      const progress = Math.min(6.0, (elapsed / introDur) * 6.0);

      resize();
      gl.uniform1f(u.time, elapsed);
      gl.uniform3fv(u.color1, hexToVec3(p.color1));
      gl.uniform3fv(u.color2, hexToVec3(p.color2));
      gl.uniform3fv(u.color3, hexToVec3(p.color3));
      gl.uniform1f(u.scale, p.scale);
      gl.uniform1f(u.noise, p.noise);
      gl.uniform2f(u.resolution, canvas.width, canvas.height);
      gl.uniform2f(u.mouse, m.currentX, m.currentY);
      gl.uniform1f(u.progress, progress);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loop = (now: number) => {
      draw(now);
      if (!still) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => {
      if (still) draw(performance.now());
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  useEffect(() => {
    if (!interactive) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
      mouseState.current.targetX = x;
      mouseState.current.targetY = y;
      mouseState.current.isHovered = true;
    };

    const handleWindowPointerLeave = () => {
      mouseState.current.targetX = 0.5;
      mouseState.current.targetY = 0.5;
      mouseState.current.isHovered = false;
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("pointerleave", handleWindowPointerLeave);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerleave", handleWindowPointerLeave);
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
    />
  );
}
