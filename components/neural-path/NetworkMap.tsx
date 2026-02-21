"use client";

import { motion } from "framer-motion";
import { useNeuralPath } from "./NeuralPathProvider";

export default function NetworkMap() {
  const { nodes, wires, allActivated } = useNeuralPath();

  return (
    <div
      className={`hidden md:block fixed bottom-8 right-8 z-50 w-[120px] rounded-xl border backdrop-blur-xl bg-black/60 p-3 transition-colors duration-300 ${
        allActivated
          ? "network-map-complete border-green-500/60"
          : "border-white/10"
      }`}
    >
      <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2 text-center">
        Progress
      </div>
      <div className="flex flex-col items-center gap-0">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center">
            {/* Dot */}
            <motion.div
              className="w-2.5 h-2.5 rounded-full border"
              animate={{
                backgroundColor: node.activated ? "#22c55e" : "#1e6e42",
                borderColor: node.activated
                  ? "rgba(34,197,94,0.6)"
                  : "rgba(30,110,66,0.4)",
                scale: node.activated ? 1 : 0.8,
              }}
              transition={{ duration: 0.3 }}
              title={node.label}
            />
            {/* Connector line */}
            {i < nodes.length - 1 && (
              <motion.div
                className="w-px h-3"
                animate={{
                  backgroundColor:
                    wires[i]?.drawn ? "#22c55e" : "rgba(255,255,255,0.1)",
                }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
