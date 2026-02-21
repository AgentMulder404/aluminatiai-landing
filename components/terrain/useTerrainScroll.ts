"use client";

import { useEffect, useRef } from "react";
import { useTerrainContext } from "./TerrainProvider";

const SECTION_SMOOTHNESS: Record<string, number> = {
  hero: 0.2,
  problem: 0.0,
  "how-it-works": 0.75,
  features: 0.85,
  "built-for-ai": 0.9,
  "free-trial": 0.95,
  "closing-cta": 1.0,
};

const SECTION_ORDER = [
  "hero",
  "problem",
  "how-it-works",
  "features",
  "built-for-ai",
  "free-trial",
  "closing-cta",
];

export function useTerrainScroll() {
  const { setSmoothness, reducedMotion } = useTerrainContext();
  const rippleTimeRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      setSmoothness(1.0);
      return;
    }

    const sectionEls = SECTION_ORDER.map((id) => document.getElementById(id)).filter(
      Boolean
    ) as HTMLElement[];

    if (sectionEls.length === 0) return;

    const handleScroll = () => {
      const viewportMiddle = window.scrollY + window.innerHeight / 2;

      // Find the two closest sections to interpolate between
      let closest = sectionEls[0];
      let closestDist = Infinity;

      for (const el of sectionEls) {
        const rect = el.getBoundingClientRect();
        const elMiddle = window.scrollY + rect.top + rect.height / 2;
        const dist = Math.abs(viewportMiddle - elMiddle);
        if (dist < closestDist) {
          closestDist = dist;
          closest = el;
        }
      }

      const target = SECTION_SMOOTHNESS[closest.id] ?? 0.2;
      setSmoothness(target);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [setSmoothness, reducedMotion]);

  return rippleTimeRef;
}
