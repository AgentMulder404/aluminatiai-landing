"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNeuralPath } from "./NeuralPathProvider";

export default function BloomFlash() {
  const { wires, nodes, markBloomFired } = useNeuralPath();
  const [activeBloom, setActiveBloom] = useState<{
    wireIndex: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    for (let i = 0; i < wires.length; i++) {
      const w = wires[i];
      if (w.drawn && !w.bloomFired) {
        const targetNode = nodes.find((n) => n.id === w.toId);
        if (targetNode?.position) {
          setActiveBloom({
            wireIndex: i,
            x: targetNode.position.x,
            y: targetNode.position.y,
          });
          markBloomFired(i);
        }
        break;
      }
    }
  }, [wires, nodes, markBloomFired]);

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <AnimatePresence>
        {activeBloom && (
          <motion.div
            key={activeBloom.wireIndex}
            className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: activeBloom.x,
              top: activeBloom.y,
              background:
                "radial-gradient(circle, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0) 70%)",
            }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onAnimationComplete={() => setActiveBloom(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
