"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { motion } from "framer-motion";
import { useNeuralPath } from "./NeuralPathProvider";
import NeuralNode from "./NeuralNode";

interface NeuralNodeAnchorProps {
  sectionId: string;
}

export default function NeuralNodeAnchor({ sectionId }: NeuralNodeAnchorProps) {
  const { nodes, setNodePosition } = useNeuralPath();
  const rafRef = useRef<number>(0);
  const node = nodes.find((n) => n.id === sectionId);

  const trackPosition = useCallback(() => {
    const section = document.getElementById(sectionId);
    if (section) {
      const rect = section.getBoundingClientRect();
      // Position the node at the left edge, vertically centered
      const x = 40;
      const y = rect.top + rect.height / 2;
      setNodePosition(sectionId, x, y);
    }
    rafRef.current = requestAnimationFrame(trackPosition);
  }, [sectionId, setNodePosition]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(trackPosition);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trackPosition]);

  if (!node?.position) return null;

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <motion.div
      className="fixed z-20 pointer-events-none"
      style={{
        left: node.position.x - 40,
        top: node.position.y - 40,
        width: 80,
        height: 80,
      }}
      initial={prefersReduced ? { scale: 1 } : { scale: 0 }}
      animate={{ scale: node.activated ? 1 : 0 }}
      transition={
        prefersReduced
          ? { duration: 0 }
          : { duration: 0.6, ease: [0.19, 1, 0.22, 1] }
      }
    >
      {/* Green glow shadow beneath orb */}
      <div className="neural-node-glow-shadow" />
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <NeuralNode activated={node.activated} />
      </Canvas>
    </motion.div>
  );
}
