"use client";

import { useNeuralPath } from "./NeuralPathProvider";
import SynapseWire from "./SynapseWire";

export default function SynapseWireLayer() {
  const { nodes, wires } = useNeuralPath();

  return (
    <svg
      className="fixed inset-0 z-30 pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    >
      <defs>
        {wires.map((wire, i) => {
          const fromNode = nodes.find((n) => n.id === wire.fromId);
          const toNode = nodes.find((n) => n.id === wire.toId);
          if (!fromNode?.position || !toNode?.position) return null;

          return (
            <linearGradient
              key={`grad-${i}`}
              id={`wire-gradient-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={fromNode.position.x}
              y1={fromNode.position.y}
              x2={toNode.position.x}
              y2={toNode.position.y}
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          );
        })}
        <filter id="wire-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {wires.map((wire, i) => {
        const fromNode = nodes.find((n) => n.id === wire.fromId);
        const toNode = nodes.find((n) => n.id === wire.toId);
        if (!fromNode?.position || !toNode?.position) return null;

        return (
          <SynapseWire
            key={`${wire.fromId}-${wire.toId}`}
            wireIndex={i}
            from={fromNode.position}
            to={toNode.position}
          />
        );
      })}
    </svg>
  );
}
