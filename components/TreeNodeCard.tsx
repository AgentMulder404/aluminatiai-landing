"use client";

import { TreeNode } from "@/lib/decisionTree";

interface TreeNodeCardProps {
  node: TreeNode;
  isSelected: boolean;
  onSelect: (node: TreeNode) => void;
}

/**
 * Custom tree node renderer with card styling
 * Shows label, savings, tradeoffs with color coding
 */
export default function TreeNodeCard({ node, isSelected, onSelect }: TreeNodeCardProps) {
  const hasSavings = node.savings_pct && node.savings_pct > 0;
  const highSavings = node.savings_pct && node.savings_pct >= 30;
  const hasTradeoff = Boolean(node.tradeoff);

  return (
    <div
      onClick={() => onSelect(node)}
      className={`
        cursor-pointer transition-all duration-200
        min-w-[200px] max-w-[280px]
        ${isSelected ? "ring-2 ring-purple-500 scale-105" : "hover:scale-102"}
      `}
      title={node.tooltip || node.description}
    >
      <div
        className={`
          rounded-lg border-2 p-4 bg-neutral-900
          ${isSelected ? "border-purple-500" : "border-neutral-700 hover:border-neutral-600"}
          ${highSavings ? "bg-gradient-to-br from-green-900/20 to-neutral-900" : ""}
        `}
      >
        {/* Label */}
        <div className="font-semibold text-sm text-white mb-2 line-clamp-2">
          {node.label}
        </div>

        {/* Description */}
        {node.description && (
          <div className="text-xs text-gray-400 mb-2 line-clamp-2">
            {node.description}
          </div>
        )}

        {/* Action */}
        {node.action && (
          <div className="text-xs text-blue-400 mb-2 flex items-start gap-1">
            <span className="mt-0.5">→</span>
            <span className="line-clamp-2">{node.action}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Savings */}
          {hasSavings && (
            <div
              className={`
                px-2 py-1 rounded text-xs font-bold
                ${
                  highSavings
                    ? "bg-green-600 text-white"
                    : "bg-green-900/50 text-green-300"
                }
              `}
            >
              ↓{node.savings_pct}%
            </div>
          )}

          {/* Confidence */}
          {node.confidence !== undefined && (
            <div className="px-2 py-1 rounded text-xs bg-neutral-800 text-gray-300">
              {Math.round(node.confidence * 100)}% conf
            </div>
          )}

          {/* Tradeoff indicator */}
          {hasTradeoff && (
            <div className="px-2 py-1 rounded text-xs bg-orange-900/50 text-orange-300">
              ⚠️ Tradeoff
            </div>
          )}
        </div>

        {/* Condition (if present) */}
        {node.condition && (
          <div className="text-xs text-gray-500 mt-2 italic">
            When: {node.condition}
          </div>
        )}
      </div>
    </div>
  );
}
