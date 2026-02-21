"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

interface TerrainContextValue {
  smoothness: number;
  setSmoothness: (v: number) => void;
  mouseUV: React.MutableRefObject<{ x: number; y: number }>;
  ctaFired: boolean;
  fireCTA: () => void;
  reducedMotion: boolean;
}

const TerrainContext = createContext<TerrainContextValue | null>(null);

export function useTerrainContext() {
  const ctx = useContext(TerrainContext);
  if (!ctx) throw new Error("useTerrainContext must be inside TerrainProvider");
  return ctx;
}

export function TerrainProvider({ children }: { children: ReactNode }) {
  const [smoothness, setSmoothness] = useState(0.2);
  const [ctaFired, setCtaFired] = useState(false);
  const mouseUV = useRef({ x: 0.5, y: 0.5 });

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const fireCTA = useCallback(() => setCtaFired(true), []);

  return (
    <TerrainContext.Provider
      value={{ smoothness, setSmoothness, mouseUV, ctaFired, fireCTA, reducedMotion }}
    >
      {children}
    </TerrainContext.Provider>
  );
}
