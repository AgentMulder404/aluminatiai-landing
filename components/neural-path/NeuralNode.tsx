"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

interface NeuralNodeProps {
  activated: boolean;
}

function Particles({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const positions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.6 + Math.random() * 0.4;
      arr.push([
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 1.2,
        Math.sin(angle) * radius,
      ]);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export default function NeuralNode({ activated }: NeuralNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    // Continuous pulse: scale 1.0 → 1.05 → 1.0 over 2s
    const pulse = 1.0 + 0.05 * Math.sin(timeRef.current * Math.PI);
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <MeshDistortMaterial
          color={activated ? "#22c55e" : "#1e6e42"}
          emissive={activated ? "#22c55e" : "#1e6e42"}
          emissiveIntensity={activated ? 1.5 : 0.4}
          distort={0.3}
          speed={2}
          roughness={0.2}
        />
      </mesh>
      {activated && <Particles count={20} />}
    </group>
  );
}
