"use client";

/**
 * GhostLedger — atmospheric background text layer
 *
 * Architecture:
 *   position:fixed canvas (z-5) — sits above terrain (z-0), below content (z-10+)
 *   Canvas 2D, requestAnimationFrame at 60fps, zero re-renders (all refs)
 *
 * Three-phase reveal triggered by cursor gravity well (radius 150px):
 *   Phase 1 – GLOW      : Characters flicker into #1e6e42 green
 *   Phase 2 – SCRAMBLE  : Characters cycle through rain charset (Greek/Latin)
 *   Phase 3 – REVEAL    : English translation appears below in monospace
 *
 * Extra effects:
 *   "Hush"         : 10% dark radial vignette centered on cursor
 *   Residual heat  : 1.5s cubic-ease fade after cursor leaves
 *   Parallax       : Each mantra drifts at a unique scroll depth factor
 *   Micro-rotation : Mantras tilted ±1–2° to feel etched, not typeset
 */

import { useEffect, useRef } from "react";
import { useTerrainContext } from "@/components/terrain/TerrainProvider";

// ── Constants ──────────────────────────────────────────────────────────────

const CURSOR_RADIUS = 150;      // px — gravity well size
const RESIDUAL_MS  = 1500;      // ms — "residual heat" persistence
const GHOST_ALPHA  = 0.022;     // base opacity of un-revealed text (≈2%)
const GLOW_COLOR   = "#1e6e42"; // AluminatAI forest green

/**
 * Rain charset: Greek uppercase + key Latin chars + digits.
 * Cinzel renders these perfectly — no box-character fallback risk.
 */
const RAIN_CHARS =
  "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ0123456789ΣΩΔΦΨ".split("");

// ── Mantra data ────────────────────────────────────────────────────────────

interface Mantra {
  latin:          string;
  english:        string;
  /** 0–1 fraction of viewport width for anchor X */
  xPct:           number;
  /** Absolute page-scroll position where mantra is at vertical mid-screen */
  yBase:          number;
  /**
   * Parallax depth (0.08–0.18).
   * screenY = yBase - scrollY × (1 − parallax)
   * Smaller → moves closer to content speed (foreground feel)
   * Larger  → moves much slower (deep background feel)
   */
  parallax:       number;
  fontSize:       number;
  /** Rotation in degrees — small, for an "etched" look */
  deg:            number;
}

const MANTRAS: Mantra[] = [
  {
    latin:   "Lux in Tenebris, Veritas in Numeris",
    english: "Light in Darkness · Truth in Numbers",
    xPct: 0.07,
    yBase: 680,
    parallax: 0.08,
    fontSize: 21,
    deg: -1.6,
  },
  {
    latin:   "Potentia sine Mensura, Vanitas est",
    english: "Power Without Measure is Vanity",
    xPct: 0.52,
    yBase: 1750,
    parallax: 0.13,
    fontSize: 19,
    deg: 1.3,
  },
  {
    latin:   "Ex Luce, Potentia. Ex Potentia, Veritas.",
    english: "From Light, Power. From Power, Truth.",
    xPct: 0.12,
    yBase: 2820,
    parallax: 0.10,
    fontSize: 20,
    deg: -0.9,
  },
  {
    latin:   "Machina Vigilat, Terra Respirat",
    english: "The Machine Watches · The Earth Breathes",
    xPct: 0.55,
    yBase: 3900,
    parallax: 0.15,
    fontSize: 20,
    deg: 1.1,
  },
  {
    latin:   "Scientia Potentia Est",
    english: "Knowledge is Power",
    xPct: 0.20,
    yBase: 5000,
    parallax: 0.09,
    fontSize: 24,
    deg: -1.2,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Cubic ease-out: decelerates into the end value (organic feel) */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Smooth-step S-curve — same as GLSL smoothstep */
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GhostLedger() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const mouseRef       = useRef({ x: -9999, y: -9999 });
  const scrollRef      = useRef(0);
  const revealTimesRef = useRef<number[]>(MANTRAS.map(() => 0));
  const rafRef         = useRef<number>(0);
  const fontReadyRef   = useRef(false);

  const { reducedMotion } = useTerrainContext();

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;

    // ── Resize ──────────────────────────────────────────────────────
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Input trackers (refs → zero re-renders) ──────────────────
    const onMouse  = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onScroll = ()              => { scrollRef.current = window.scrollY; };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("scroll",    onScroll, { passive: true });

    // ── Ensure Cinzel is loaded before drawing ───────────────────
    document.fonts.load("400 20px Cinzel").then(() => {
      fontReadyRef.current = true;
    });

    // ── RAF draw loop ────────────────────────────────────────────
    const startTime = performance.now();

    const draw = () => {
      const now = performance.now();
      const t   = (now - startTime) / 1000;   // seconds
      const { x: mx, y: my } = mouseRef.current;
      const scrollY = scrollRef.current;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Draw "Hush" vignette once per frame, beneath all text
      if (mx > 0) {
        const hush = ctx.createRadialGradient(mx, my, 0, mx, my, CURSOR_RADIUS);
        hush.addColorStop(0,   "rgba(0,0,0,0.10)");
        hush.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.fillStyle = hush;
        ctx.beginPath();
        ctx.arc(mx, my, CURSOR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      MANTRAS.forEach((mantra, i) => {
        // ── Screen position with parallax ──────────────────────
        // screenY = yBase - scrollY × (1 − parallax)
        // Elements with higher parallax move SLOWER → feel deeper
        const screenY = mantra.yBase - scrollY * (1 - mantra.parallax);
        const screenX = W * mantra.xPct;

        // Skip if fully off screen (+ generous margin)
        if (screenY < -80 || screenY > H + 80) return;

        // ── Cursor distance to mantra anchor ───────────────────
        const dx   = mx - screenX;
        const dy   = my - screenY;
        const dist = Math.hypot(dx, dy);
        const inRadius = dist < CURSOR_RADIUS;

        if (inRadius) revealTimesRef.current[i] = now;

        const msSince     = now - revealTimesRef.current[i];
        const residualRaw = Math.max(0, 1 - msSince / RESIDUAL_MS);
        const residualT   = easeOutCubic(residualRaw);   // organic ease

        const isActive = inRadius || residualT > 0;

        ctx.save();

        // ── Apply micro-rotation centered on text anchor ────────
        ctx.translate(screenX, screenY);
        ctx.rotate((mantra.deg * Math.PI) / 180);
        ctx.translate(-screenX, -screenY);

        // ── Font setup ─────────────────────────────────────────
        const cinzelFamily = fontReadyRef.current
          ? "Cinzel, 'Palatino Linotype', Georgia, serif"
          : "'Palatino Linotype', Georgia, serif";
        const monoFamily =
          "var(--font-geist-mono), 'JetBrains Mono', 'Courier New', monospace";

        ctx.font          = `400 ${mantra.fontSize}px ${cinzelFamily}`;
        ctx.textAlign     = "left";
        ctx.textBaseline  = "middle";

        if (!isActive) {
          // ── GHOST STATE: barely-visible texture ──────────────
          ctx.shadowBlur = 0;
          ctx.fillStyle  = `rgba(255,255,255,${GHOST_ALPHA})`;
          ctx.fillText(mantra.latin, screenX, screenY);
          ctx.restore();
          return;
        }

        // ── ACTIVE STATE ──────────────────────────────────────

        /**
         * "revealStrength" drives all effect intensities:
         *   - 1.0  when cursor is directly over
         *   - eases to 0 over 1.5s after cursor leaves (residual heat)
         */
        const revealStrength = inRadius ? 1.0 : residualT;

        // Phase 1 flicker: sharp stochastic noise only while cursor is live.
        // Uses two sine waves with incommensurate frequencies for natural feel.
        const flicker = inRadius
          ? 0.82 + 0.18 * Math.abs(
              Math.sin(t * 23.7 + i * 5.1) * Math.sin(t * 17.3 + i * 2.3)
            )
          : 1.0;

        // ── Measure each character width for per-char effects ──
        const chars     = mantra.latin.split("");
        const charXs: number[] = [];
        let runX = screenX;
        chars.forEach((ch) => {
          charXs.push(runX);
          runX += ctx.measureText(ch).width;
        });
        const textWidth = runX - screenX;

        // ── Draw characters one-by-one ─────────────────────────
        chars.forEach((ch, ci) => {
          const charCenterX = charXs[ci] + ctx.measureText(ch).width * 0.5;
          const charDist    = Math.hypot(mx - charCenterX, my - screenY);
          const charProx    = Math.max(0, 1 - charDist / CURSOR_RADIUS);

          // Scramble intensity peaks at mid-radius, zeroes at center
          // (center is "resolved" — Latin shows through clearly)
          const innerResolved = smoothstep(CURSOR_RADIUS * 0.4, CURSOR_RADIUS * 0.1, charDist);
          const scrambleProb  = charProx * (1 - innerResolved);

          // Rain character cycle: speed proportional to proximity
          const cycleSpeed  = charProx * 18;
          const showRain    = inRadius
            && Math.sin(t * cycleSpeed + ci * 3.79) > (1 - scrambleProb * 0.85);
          const displayChar = showRain
            ? RAIN_CHARS[Math.floor(t * 9 + ci * 7.13) % RAIN_CHARS.length]
            : ch;

          // Alpha: 2% → ~88% based on revealStrength + flicker
          const alpha = GHOST_ALPHA + (1 - GHOST_ALPHA) * revealStrength * flicker * charProx
                      + GHOST_ALPHA * (1 - charProx);

          // Color: white (#fff) → AluminatAI green (#1e6e42) with charProx
          const r = Math.round(lerp(255, 30,  charProx * revealStrength));
          const g = Math.round(lerp(255, 110, charProx * revealStrength));
          const b = Math.round(lerp(255, 66,  charProx * revealStrength));

          // Glow shadow — radiates outward proportional to proximity
          ctx.shadowColor = GLOW_COLOR;
          ctx.shadowBlur  = charProx > 0.2 ? charProx * 22 * revealStrength : 0;

          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fillText(displayChar, charXs[ci], screenY);
        });

        // ── Phase 3 — English "whisper" translation ────────────
        // Appears below the Latin text; alpha driven by closeness to center.
        // Smaller font, monospace — footnote / secret-annotation feel.
        const centerProx  = Math.max(0, 1 - dist / (CURSOR_RADIUS * 0.65));
        const englishAlpha = centerProx * revealStrength * 0.88;

        if (englishAlpha > 0.01) {
          const engSize = Math.round(mantra.fontSize * 0.60);
          ctx.save();
          ctx.font          = `${engSize}px ${monoFamily}`;
          ctx.textAlign     = "left";
          ctx.textBaseline  = "top";
          ctx.shadowColor   = GLOW_COLOR;
          ctx.shadowBlur    = 6;
          // Subtle letter-spacing achieved via character-by-character drawing
          // with a 1px kern. English text sits 1.9× fontSize below Latin baseline.
          const engY    = screenY + mantra.fontSize * 1.0;
          const engX    = screenX + textWidth * 0.0;   // left-aligned with Latin
          const tint    = Math.round(lerp(150, 200, centerProx));
          ctx.fillStyle = `rgba(${tint}, 220, 180, ${englishAlpha})`;
          ctx.fillText(mantra.english, engX, engY);
          ctx.restore();
        }

        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll",    onScroll);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:       "fixed",
        inset:          0,
        width:          "100%",
        height:         "100%",
        zIndex:         5,
        pointerEvents:  "none",
        userSelect:     "none",
      }}
    />
  );
}
