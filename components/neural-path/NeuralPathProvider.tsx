"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export interface NodeState {
  id: string;
  label: string;
  index: number;
  activated: boolean;
  position: { x: number; y: number } | null;
}

export interface WireState {
  fromId: string;
  toId: string;
  drawing: boolean;
  drawn: boolean;
  bloomFired: boolean;
}

const SECTION_IDS = [
  "hero",
  "problem",
  "how-it-works",
  "features",
  "built-for-ai",
  "free-trial",
  "closing-cta",
] as const;

const SECTION_LABELS = [
  "Hero",
  "Problem",
  "How It Works",
  "Features",
  "Built for AI",
  "Free Trial",
  "Get Access",
];

function createInitialNodes(): NodeState[] {
  return SECTION_IDS.map((id, index) => ({
    id,
    label: SECTION_LABELS[index],
    index,
    activated: false,
    position: null,
  }));
}

function createInitialWires(): WireState[] {
  return SECTION_IDS.slice(0, -1).map((id, i) => ({
    fromId: id,
    toId: SECTION_IDS[i + 1],
    drawing: false,
    drawn: false,
    bloomFired: false,
  }));
}

interface NeuralPathContextValue {
  nodes: NodeState[];
  wires: WireState[];
  activateNode: (id: string) => void;
  setNodePosition: (id: string, x: number, y: number) => void;
  startWireDrawing: (wireIndex: number) => void;
  markWireDrawn: (wireIndex: number) => void;
  markBloomFired: (wireIndex: number) => void;
  allActivated: boolean;
}

const NeuralPathContext = createContext<NeuralPathContextValue | null>(null);

export function useNeuralPath() {
  const ctx = useContext(NeuralPathContext);
  if (!ctx) throw new Error("useNeuralPath must be used within NeuralPathProvider");
  return ctx;
}

export function NeuralPathProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<NodeState[]>(createInitialNodes);
  const [wires, setWires] = useState<WireState[]>(createInitialWires);
  const activatedRef = useRef<Set<string>>(new Set());

  const activateNode = useCallback((id: string) => {
    if (activatedRef.current.has(id)) return;
    activatedRef.current.add(id);

    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, activated: true } : n))
    );

    // Check if we should start drawing a wire
    const nodeIndex = SECTION_IDS.indexOf(id as (typeof SECTION_IDS)[number]);
    if (nodeIndex > 0) {
      const prevId = SECTION_IDS[nodeIndex - 1];
      if (activatedRef.current.has(prevId)) {
        setWires((prev) =>
          prev.map((w, i) =>
            i === nodeIndex - 1 ? { ...w, drawing: true } : w
          )
        );
      }
    }
    // Also check if the *next* node is already active (in case of out-of-order activation)
    if (nodeIndex < SECTION_IDS.length - 1) {
      const nextId = SECTION_IDS[nodeIndex + 1];
      if (activatedRef.current.has(nextId)) {
        setWires((prev) =>
          prev.map((w, i) =>
            i === nodeIndex ? { ...w, drawing: true } : w
          )
        );
      }
    }
  }, []);

  const setNodePosition = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, position: { x, y } } : n
      )
    );
  }, []);

  const startWireDrawing = useCallback((wireIndex: number) => {
    setWires((prev) =>
      prev.map((w, i) =>
        i === wireIndex ? { ...w, drawing: true } : w
      )
    );
  }, []);

  const markWireDrawn = useCallback((wireIndex: number) => {
    setWires((prev) =>
      prev.map((w, i) =>
        i === wireIndex ? { ...w, drawn: true, drawing: false } : w
      )
    );
  }, []);

  const markBloomFired = useCallback((wireIndex: number) => {
    setWires((prev) =>
      prev.map((w, i) =>
        i === wireIndex ? { ...w, bloomFired: true } : w
      )
    );
  }, []);

  const allActivated = nodes.every((n) => n.activated);

  return (
    <NeuralPathContext.Provider
      value={{
        nodes,
        wires,
        activateNode,
        setNodePosition,
        startWireDrawing,
        markWireDrawn,
        markBloomFired,
        allActivated,
      }}
    >
      {children}
    </NeuralPathContext.Provider>
  );
}
