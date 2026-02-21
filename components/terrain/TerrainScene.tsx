"use client";

import { Canvas } from "@react-three/fiber";
import TerrainMesh from "./TerrainMesh";
import { useTerrainScroll } from "./useTerrainScroll";
import { useMouseGravity } from "./useMouseGravity";

function TerrainInner() {
  useTerrainScroll();
  useMouseGravity();
  return <TerrainMesh />;
}

export default function TerrainScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, 14], fov: 55 }}
      frameloop="always"
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <TerrainInner />
    </Canvas>
  );
}
