"use client";

import { useEffect } from "react";
import { useTerrainContext } from "./TerrainProvider";

export function useMouseGravity() {
  const { mouseUV, reducedMotion } = useTerrainContext();

  useEffect(() => {
    if (reducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseUV.current.x = e.clientX / window.innerWidth;
      mouseUV.current.y = e.clientY / window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseUV, reducedMotion]);
}
