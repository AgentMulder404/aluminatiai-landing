"use client";

import { useRef, useEffect } from "react";
import { useNeuralPath } from "./NeuralPathProvider";

interface SynapseWireProps {
  wireIndex: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export default function SynapseWire({ wireIndex, from, to }: SynapseWireProps) {
  const { wires, markWireDrawn } = useNeuralPath();
  const pathRef = useRef<SVGPathElement>(null);
  const animatedRef = useRef(false);
  const wire = wires[wireIndex];

  // Build cubic bezier with organic S-curve
  const midY = (from.y + to.y) / 2;
  const offsetX = 60;
  const d = `M ${from.x} ${from.y} C ${from.x + offsetX} ${midY}, ${to.x - offsetX} ${midY}, ${to.x} ${to.y}`;

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;

    if (!wire.drawing && !wire.drawn) {
      path.style.strokeDashoffset = `${length}`;
      path.style.opacity = "0.15";
      animatedRef.current = false;
      return;
    }

    if (wire.drawn) {
      path.style.strokeDashoffset = "0";
      path.style.opacity = "1";
      return;
    }

    if (wire.drawing && !animatedRef.current) {
      animatedRef.current = true;
      path.style.strokeDashoffset = `${length}`;
      path.style.opacity = "1";

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReduced) {
        path.style.strokeDashoffset = "0";
        markWireDrawn(wireIndex);
        return;
      }

      // Use GSAP if available, fallback to CSS transition
      import("gsap").then(({ gsap }) => {
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power2.inOut",
          onComplete: () => markWireDrawn(wireIndex),
        });
      });
    }
  }, [wire.drawing, wire.drawn, wireIndex, markWireDrawn]);

  return (
    <path
      ref={pathRef}
      d={d}
      fill="none"
      stroke={`url(#wire-gradient-${wireIndex})`}
      strokeWidth={2}
      filter="url(#wire-glow)"
      className={wire.drawn ? "animate-[wire-electricity_3s_linear_infinite]" : ""}
    />
  );
}
