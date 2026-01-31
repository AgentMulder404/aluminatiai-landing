// components/DecisionTreeVisual.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TreeNode } from "@/lib/decisionTree";
import {
  treeToNodesAndEdges,
  getLayoutedElements,
  getPathToNode,
  getCumulativeSavings,
  findBestPath,
  getDescendantIds,
} from "@/lib/decisionTreeHelpers";
import OptimizationNode from "./OptimizationNode";
import OptimizationEdge from "./OptimizationEdge";

interface DecisionTreeVisualProps {
  workloadDescription?: string;
  agentResponse?: any;
  initialTree?: TreeNode;
}

const nodeTypes = {
  optimizationNode: OptimizationNode,
};

const edgeTypes = {
  optimizationEdge: OptimizationEdge,
};

/**
 * Interactive Decision Tree Visualization with React Flow
 *
 * Features:
 * - Full zoom, pan, drag support
 * - Collapsible/expandable branches
 * - Path highlighting (root to selected node)
 * - Auto-highlighted best path (highest savings)
 * - Edge labels showing savings
 * - Cumulative projections sidebar
 * - Dagre auto-layout
 */
export default function DecisionTreeVisual({
  workloadDescription,
  agentResponse,
  initialTree,
}: DecisionTreeVisualProps) {
  const [tree, setTree] = useState<TreeNode | null>(initialTree || null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<TreeNode[]>([]);
  const [bestPath, setBestPath] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Auto-generate tree on mount if no initial tree provided
  useEffect(() => {
    if (!tree && (workloadDescription || agentResponse)) {
      generateTree();
    }
  }, []);

  // Update React Flow nodes/edges when tree or hidden nodes change
  useEffect(() => {
    if (tree) {
      updateFlowElements();
    }
  }, [tree, hiddenNodeIds, selectedPath, bestPath]);

  /**
   * Call API to generate tree
   */
  const generateTree = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workload_description: workloadDescription,
          agent_response: agentResponse,
        }),
      });

      const data = await response.json();

      if (data.tree) {
        setTree(data.tree);
        if (data.error) {
          setError(`Using fallback tree: ${data.error}`);
        }

        // Calculate and highlight best path
        const best = findBestPath(data.tree);
        setBestPath(best);
      } else {
        throw new Error(data.error || "Failed to generate tree");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update React Flow nodes and edges from tree
   */
  const updateFlowElements = () => {
    if (!tree) return;

    const { nodes: rawNodes, edges: rawEdges } = treeToNodesAndEdges(tree, hiddenNodeIds);

    // Add path highlighting and best path highlighting
    const selectedPathIds = new Set(selectedPath.map(n => n.id));
    const bestPathIds = new Set(bestPath.map(n => n.id));

    const enhancedNodes = rawNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onToggleExpand: handleToggleExpand,
        isInPath: selectedPathIds.has(node.id),
        isBestPath: bestPathIds.has(node.id),
      },
    }));

    const enhancedEdges = rawEdges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isInPath: selectedPathIds.has(edge.target),
        isBestPath: bestPathIds.has(edge.target),
      },
    }));

    // Apply dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      enhancedNodes,
      enhancedEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  };

  /**
   * Handle node click - calculate path and show sidebar
   */
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!tree) return;

      const path = getPathToNode(tree, node.id);
      if (path) {
        setSelectedPath(path);
        setSelectedNode(path[path.length - 1]);
        setShowSidebar(true);
      }
    },
    [tree]
  );

  /**
   * Toggle expand/collapse for a node
   */
  const handleToggleExpand = useCallback((nodeId: string) => {
    if (!tree) return;

    // Toggle the expanded state in the tree
    const toggleNode = (node: TreeNode): TreeNode => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      return {
        ...node,
        children: node.children.map(toggleNode),
      };
    };

    const updatedTree = toggleNode(tree);
    setTree(updatedTree);

    // Update hidden nodes
    const descendants = getDescendantIds(tree, nodeId);
    const newHidden = new Set(hiddenNodeIds);

    const nodeWasExpanded = !hiddenNodeIds.has(descendants[0]);

    if (nodeWasExpanded) {
      // Collapse: hide descendants
      descendants.forEach(id => newHidden.add(id));
    } else {
      // Expand: show direct children (but not their collapsed descendants)
      descendants.forEach(id => newHidden.delete(id));
    }

    setHiddenNodeIds(newHidden);
  }, [tree, hiddenNodeIds]);

  /**
   * Calculate cumulative savings for selected path
   */
  const cumulativeData = useMemo(() => {
    if (selectedPath.length === 0 || !agentResponse?.estimated_kwh) {
      return null;
    }

    const baseKwh = agentResponse.estimated_kwh;
    const { totalSavingsPct, tradeoffScore } = getCumulativeSavings(selectedPath);
    const reducedKwh = baseKwh * (1 - totalSavingsPct / 100);
    const savedKwh = baseKwh - reducedKwh;

    // Carbon: assume 0.4 kg CO2e per kWh
    const baseCarbonKg = baseKwh * 0.4;
    const reducedCarbonKg = reducedKwh * 0.4;
    const savedCarbonKg = baseCarbonKg - reducedCarbonKg;

    // Cost: assume $0.15 per kWh
    const baseCost = baseKwh * 0.15;
    const reducedCost = reducedKwh * 0.15;
    const savedCost = baseCost - reducedCost;

    return {
      baseKwh,
      reducedKwh,
      savedKwh,
      totalSavingsPct,
      baseCarbonKg,
      reducedCarbonKg,
      savedCarbonKg,
      baseCost,
      reducedCost,
      savedCost,
      tradeoffScore,
    };
  }, [selectedPath, agentResponse]);

  /**
   * Reset selection
   */
  const handleReset = () => {
    setSelectedNode(null);
    setSelectedPath([]);
    setShowSidebar(false);
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Optimization Decision Tree</h2>
          {agentResponse?.estimated_kwh && (
            <p className="text-lg text-gray-400 mt-2">
              Current Estimate:{" "}
              <span className="text-white font-semibold">
                {agentResponse.estimated_kwh} kWh
              </span>
              {" · "}
              <span className="text-green-400">
                {agentResponse.estimated_carbon_kg} kg CO₂e
              </span>
              {" · "}
              <span className="text-blue-400">
                ${agentResponse.estimated_cost_usd}
              </span>
            </p>
          )}
        </div>

        {!tree && !loading && (
          <button
            onClick={generateTree}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Generate Tree
          </button>
        )}
      </div>

      {/* Error State */}
      {error && !tree && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Warning for fallback */}
      {error && tree && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-6">
          <p className="text-yellow-300 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-neutral-900 rounded-lg p-12 border border-neutral-800 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-700 border-t-purple-600 mb-4"></div>
          <div className="text-lg text-gray-300">
            Generating optimization tree...
          </div>
          <div className="text-sm text-gray-500 mt-2">
            This may take 10-20 seconds
          </div>
        </div>
      )}

      {/* React Flow Visualization */}
      {tree && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree Display */}
          <div
            className={`${
              showSidebar ? "lg:col-span-2" : "lg:col-span-3"
            } bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden`}
            style={{ height: "700px" }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              minZoom={0.1}
              maxZoom={2}
              defaultEdgeOptions={{
                type: "optimizationEdge",
              }}
            >
              <Background color="#404040" gap={16} />
              <Controls className="!bg-neutral-800 !border-neutral-700" />
              <MiniMap
                className="!bg-neutral-800 !border-neutral-700"
                nodeColor={(node) => {
                  if (node.data.isBestPath) return "#22c55e";
                  if (node.data.isInPath) return "#a855f7";
                  return "#404040";
                }}
              />
            </ReactFlow>

            {/* Legend */}
            <div className="px-6 py-4 border-t border-neutral-800 flex flex-wrap gap-4 text-sm bg-neutral-900">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-gray-400">High Savings (≥30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-500 rounded"></div>
                <span className="text-gray-400">Best Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500 rounded"></div>
                <span className="text-gray-400">Selected Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-900/50 rounded"></div>
                <span className="text-gray-400">Has Tradeoff</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {showSidebar && selectedNode && (
            <div className="lg:col-span-1">
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800 sticky top-4 max-h-[700px] overflow-y-auto">
                {/* Close button */}
                <button
                  onClick={() => setShowSidebar(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  ✕
                </button>

                <h3 className="text-xl font-bold mb-4">Path Analysis</h3>

                {/* Cumulative Projections */}
                {cumulativeData && (
                  <div className="mb-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-700/50 rounded-lg p-4">
                    <div className="text-sm text-purple-400 mb-3 font-semibold">
                      📊 Cumulative Impact
                    </div>

                    {/* Energy */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Energy</div>
                      <div className="text-2xl font-bold text-green-400">
                        {cumulativeData.savedKwh.toFixed(1)} kWh saved
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {cumulativeData.baseKwh.toFixed(0)} kWh →{" "}
                        {cumulativeData.reducedKwh.toFixed(0)} kWh (
                        {cumulativeData.totalSavingsPct.toFixed(1)}% reduction)
                      </div>
                    </div>

                    {/* Carbon */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Carbon</div>
                      <div className="text-xl font-bold text-blue-400">
                        {cumulativeData.savedCarbonKg.toFixed(1)} kg CO₂e saved
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {cumulativeData.baseCarbonKg.toFixed(0)} kg →{" "}
                        {cumulativeData.reducedCarbonKg.toFixed(0)} kg
                      </div>
                    </div>

                    {/* Cost */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Cost</div>
                      <div className="text-xl font-bold text-yellow-400">
                        ${cumulativeData.savedCost.toFixed(2)} saved
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        ${cumulativeData.baseCost.toFixed(2)} → $
                        {cumulativeData.reducedCost.toFixed(2)}
                      </div>
                    </div>

                    {/* Tradeoff Score */}
                    <div className="pt-3 border-t border-purple-700/30">
                      <div className="text-xs text-gray-400 mb-1">
                        Tradeoff Complexity
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-800 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(cumulativeData.tradeoffScore * 20, 100)}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-orange-400">
                          {cumulativeData.tradeoffScore.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Node Details */}
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-1">
                    Selected Node
                  </div>
                  <div className="text-lg font-semibold">{selectedNode.label}</div>
                </div>

                {selectedNode.description && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Description</div>
                    <div className="text-sm text-gray-200">
                      {selectedNode.description}
                    </div>
                  </div>
                )}

                {selectedNode.action && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Action</div>
                    <div className="text-sm text-green-400 bg-black/50 p-2 rounded">
                      {selectedNode.action}
                    </div>
                  </div>
                )}

                {selectedNode.savings_pct !== undefined && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">
                      Node Savings
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {selectedNode.savings_pct}%
                    </div>
                  </div>
                )}

                {selectedNode.tradeoff && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">⚠️ Tradeoff</div>
                    <div className="text-sm text-orange-300 bg-orange-900/20 p-2 rounded">
                      {selectedNode.tradeoff}
                    </div>
                  </div>
                )}

                {/* Path Steps */}
                {selectedPath.length > 1 && (
                  <div className="mt-6 pt-4 border-t border-neutral-700">
                    <div className="text-xs text-gray-400 mb-2">
                      Optimization Path ({selectedPath.length} steps)
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {selectedPath.map((node, i) => (
                        <div
                          key={node.id}
                          className="text-xs text-gray-300 flex items-start gap-2"
                        >
                          <span className="text-purple-400 font-semibold">
                            {i + 1}.
                          </span>
                          <span className="line-clamp-2">{node.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="w-full mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Reset Selection
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
