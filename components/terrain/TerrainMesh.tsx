"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTerrainContext } from "./TerrainProvider";
import { terrainVertexShader, terrainFragmentShader } from "./shaders/terrain.shaders";

function createLatinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = "white";
  ctx.font = "italic 42px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Ex Luce, Potentia", 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function TerrainMesh() {
  const { smoothness, mouseUV, ctaFired, reducedMotion } = useTerrainContext();
  const meshRef = useRef<THREE.Mesh>(null);
  const smoothnessRef = useRef(smoothness);
  const ctaRef = useRef(0);
  const rippleTimeRef = useRef(0);
  const howItWorksTriggered = useRef(false);

  const latinTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createLatinTexture();
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSmoothness: { value: 0.2 },
      uMouseUV: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseRadius: { value: 5.0 },
      uMouseStrength: { value: 1.5 },
      uRippleTime: { value: 0 },
      uCTAFired: { value: 0 },
      uLatinTexture: { value: latinTexture },
    }),
    [latinTexture]
  );

  useEffect(() => {
    smoothnessRef.current = smoothness;
    // Trigger ripple when transitioning to how-it-works
    if (smoothness >= 0.7 && !howItWorksTriggered.current) {
      howItWorksTriggered.current = true;
      rippleTimeRef.current = 0.01;
    }
  }, [smoothness]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;

    // Time — frozen for reduced motion
    if (!reducedMotion) {
      mat.uniforms.uTime.value += delta;
    }

    // Lazy lerp smoothness (factor 0.04 → ~1.5s organic lag)
    const currentSmooth = mat.uniforms.uSmoothness.value;
    mat.uniforms.uSmoothness.value = THREE.MathUtils.lerp(
      currentSmooth,
      smoothnessRef.current,
      0.04
    );

    // Mouse UV (ref-based, zero re-renders)
    mat.uniforms.uMouseUV.value.set(mouseUV.current.x, mouseUV.current.y);

    // Ripple
    if (rippleTimeRef.current > 0) {
      rippleTimeRef.current += delta;
      mat.uniforms.uRippleTime.value = rippleTimeRef.current;
      if (rippleTimeRef.current > 5) {
        rippleTimeRef.current = 0;
        mat.uniforms.uRippleTime.value = 0;
      }
    }

    // CTA
    if (ctaFired) {
      ctaRef.current = THREE.MathUtils.lerp(ctaRef.current, 1, 0.03);
      mat.uniforms.uCTAFired.value = ctaRef.current;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.8, 0, 0]}>
      <planeGeometry args={[40, 20, 128, 64]} />
      <shaderMaterial
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
