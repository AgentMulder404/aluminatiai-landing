"use client";

import dynamic from "next/dynamic";

const TerrainScene = dynamic(() => import("./TerrainScene"), { ssr: false });

export default function TerrainCanvas() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none terrain-canvas"
      aria-hidden="true"
    >
      <TerrainScene />
    </div>
  );
}
