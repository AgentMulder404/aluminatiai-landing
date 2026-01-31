"use client";

import React, { useState, useEffect } from "react";
import { Tree, TreeNode as OrgTreeNode } from "react-organizational-chart";
import { TreeNode, calculateCumulativeSavings, getPathToNode } from "@/lib/decisionTree";
import TreeNodeCard from "./TreeNodeCard";

interface DecisionTreeVisualProps {
  workloadDescription?: string;
  agentResponse?: any;
  initialTree?: TreeNode;
}

/**
 * Interactive Decision Tree Visualization
 *
 * Features:
 * - Auto-generates tree from workload or agent response
 * - Click nodes to explore paths and see cumulative savings
 * - Highlights optimization paths
 * - Shows detailed sidebar on node selection
 *
 * Future upgrade path: Consider @xyflow/react (React Flow) for:
 * - Advanced zoom/pan controls
 * - Drag-and-drop node repositioning
 * - Collapsible branches
 * - Custom edge styling and animations
 * - Layout algorithms (dagre, elk)
 */
export default function DecisionTreeVisual({
  workloadDescription,
  agentResponse,
  initialTree,
}: DecisionTreeVisualProps) {
  const [tree, setTree] = useState<TreeNode | null>(initialTree || null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Auto-generate tree on mount if no initial tree provided
  useEffect(() => {
    if (!tree && (workloadDescription || agentResponse)) {
      generateTree();
    }
  }, []);

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
   * Handle node selection
   */
  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    setShowSidebar(true);

    // Calculate path from root
    if (tree) {
      const path = getPathToNode(tree, node.id);
      setSelectedPath(path || []);
    }
  };

  /**
   * Recursive tree renderer
   */
  const renderTree = (node: TreeNode): React.JSX.Element => {
    const isSelected = selectedNode?.id === node.id;
    const isInPath = selectedPath.some((n) => n.id === node.id);

    return (
      <OrgTreeNode
        key={node.id}
        label={
          <div className={isInPath && !isSelected ? "opacity-80" : ""}>
            <TreeNodeCard
              node={node}
              isSelected={isSelected}
              onSelect={handleNodeSelect}
            />
          </div>
        }
      >
        {node.children.map((child) => renderTree(child))}
      </OrgTreeNode>
    );
  };

  /**
   * Calculate cumulative savings for selected path
   */
  const cumulativeSavings = selectedPath.length > 0
    ? calculateCumulativeSavings(selectedPath)
    : 0;

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Optimization Decision Tree</h2>
          {agentResponse?.estimated_kwh && (
            <p className="text-lg text-gray-400 mt-2">
              Current Estimate: <span className="text-white font-semibold">{agentResponse.estimated_kwh} kWh</span>
              {" · "}
              <span className="text-green-400">{agentResponse.estimated_carbon_kg} kg CO₂e</span>
              {" · "}
              <span className="text-blue-400">${agentResponse.estimated_cost_usd}</span>
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
          <div className="text-lg text-gray-300">Generating optimization tree...</div>
          <div className="text-sm text-gray-500 mt-2">This may take 10-20 seconds</div>
        </div>
      )}

      {/* Tree Visualization */}
      {tree && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree Display */}
          <div className={`${showSidebar ? "lg:col-span-2" : "lg:col-span-3"} bg-neutral-900 rounded-lg p-8 border border-neutral-800 overflow-x-auto`}>
            <Tree
              lineWidth="2px"
              lineColor="#525252"
              lineBorderRadius="10px"
              label={
                <TreeNodeCard
                  node={tree}
                  isSelected={selectedNode?.id === tree.id}
                  onSelect={handleNodeSelect}
                />
              }
            >
              {tree.children.map((child) => renderTree(child))}
            </Tree>

            {/* Legend */}
            <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-gray-400">High Savings (≥30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-900/50 rounded"></div>
                <span className="text-gray-400">Moderate Savings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-900/50 rounded"></div>
                <span className="text-gray-400">Has Tradeoff</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500 rounded"></div>
                <span className="text-gray-400">Selected</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {showSidebar && selectedNode && (
            <div className="lg:col-span-1">
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800 sticky top-4">
                {/* Close button */}
                <button
                  onClick={() => setShowSidebar(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  ✕
                </button>

                <h3 className="text-xl font-bold mb-4">Node Details</h3>

                {/* Label */}
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-1">Decision</div>
                  <div className="text-lg font-semibold">{selectedNode.label}</div>
                </div>

                {/* Description */}
                {selectedNode.description && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Description</div>
                    <div className="text-sm text-gray-200">{selectedNode.description}</div>
                  </div>
                )}

                {/* Condition */}
                {selectedNode.condition && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Condition</div>
                    <div className="text-sm text-blue-400 font-mono bg-black/50 p-2 rounded">
                      {selectedNode.condition}
                    </div>
                  </div>
                )}

                {/* Action */}
                {selectedNode.action && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Action</div>
                    <div className="text-sm text-green-400 bg-black/50 p-2 rounded">
                      {selectedNode.action}
                    </div>
                  </div>
                )}

                {/* Savings */}
                {selectedNode.savings_pct !== undefined && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Estimated Savings</div>
                    <div className="text-3xl font-bold text-green-400">
                      {selectedNode.savings_pct}%
                    </div>
                    {agentResponse?.estimated_kwh && (
                      <div className="text-sm text-gray-400 mt-1">
                        ~{Math.round(agentResponse.estimated_kwh * (selectedNode.savings_pct / 100))} kWh saved
                      </div>
                    )}
                  </div>
                )}

                {/* Cumulative Savings */}
                {selectedPath.length > 1 && cumulativeSavings > 0 && (
                  <div className="mb-4 bg-green-900/20 border border-green-700 rounded-lg p-3">
                    <div className="text-sm text-green-400 mb-1">Cumulative Path Savings</div>
                    <div className="text-2xl font-bold text-green-300">
                      {cumulativeSavings.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Following {selectedPath.length} step(s)
                    </div>
                  </div>
                )}

                {/* Tradeoff */}
                {selectedNode.tradeoff && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">⚠️ Tradeoff</div>
                    <div className="text-sm text-orange-300 bg-orange-900/20 p-2 rounded">
                      {selectedNode.tradeoff}
                    </div>
                  </div>
                )}

                {/* Confidence */}
                {selectedNode.confidence !== undefined && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Confidence</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-neutral-800 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${selectedNode.confidence * 100}%` }}
                        />
                      </div>
                      <div className="text-sm font-semibold">
                        {Math.round(selectedNode.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Tooltip */}
                {selectedNode.tooltip && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Additional Info</div>
                    <div className="text-sm text-gray-300 bg-black/50 p-2 rounded">
                      {selectedNode.tooltip}
                    </div>
                  </div>
                )}

                {/* Mock Apply Button */}
                <button className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all">
                  Apply Optimization
                </button>

                {/* Path Info */}
                {selectedPath.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-neutral-700">
                    <div className="text-xs text-gray-400 mb-2">Optimization Path</div>
                    <div className="space-y-1">
                      {selectedPath.map((node, i) => (
                        <div
                          key={node.id}
                          className="text-xs text-gray-300 flex items-start gap-2"
                        >
                          <span className="text-purple-400">{i + 1}.</span>
                          <span className="line-clamp-2">{node.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
