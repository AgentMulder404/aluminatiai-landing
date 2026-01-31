// components/OptimizationNode.tsx
"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export interface OptimizationNodeData {
  label: string;
  description?: string;
  action?: string;
  savings_pct?: number;
  tradeoff?: string;
  confidence?: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggleExpand?: (nodeId: string) => void;
  isInPath?: boolean;
  isBestPath?: boolean;
}

function OptimizationNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as OptimizationNodeData;
  const hasSavings = nodeData.savings_pct && nodeData.savings_pct > 0;
  const highSavings = nodeData.savings_pct && nodeData.savings_pct >= 30;
  const hasTradeoff = Boolean(nodeData.tradeoff);

  return (
    <div className="optimization-node">
      {/* Input handle (top) */}
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />

      <div
        className={`
          min-w-[280px] rounded-xl border-2 p-4 bg-neutral-900 shadow-lg
          transition-all duration-200
          ${nodeData.isInPath ? 'ring-2 ring-purple-500' : ''}
          ${nodeData.isBestPath ? 'ring-2 ring-green-500 shadow-green-500/20' : ''}
          ${highSavings ? 'bg-gradient-to-br from-green-900/30 to-neutral-900' : ''}
        `}
      >
        {/* Label */}
        <div className="font-bold text-sm text-white mb-2 line-clamp-2">
          {nodeData.label}
        </div>

        {/* Description */}
        {nodeData.description && (
          <div className="text-xs text-gray-400 mb-2 line-clamp-2">
            {nodeData.description}
          </div>
        )}

        {/* Action */}
        {nodeData.action && (
          <div className="text-xs text-blue-400 mb-3 flex items-start gap-1">
            <span className="mt-0.5">→</span>
            <span className="line-clamp-2">{nodeData.action}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Savings */}
          {hasSavings && (
            <div
              className={`
                px-2 py-1 rounded text-xs font-bold
                ${highSavings
                  ? 'bg-green-600 text-white'
                  : 'bg-green-900/50 text-green-300'}
              `}
            >
              ↓{nodeData.savings_pct}%
            </div>
          )}

          {/* Confidence */}
          {nodeData.confidence !== undefined && (
            <div className="px-2 py-1 rounded text-xs bg-neutral-800 text-gray-300">
              {Math.round(nodeData.confidence * 100)}% conf
            </div>
          )}

          {/* Tradeoff indicator */}
          {hasTradeoff && (
            <div className="px-2 py-1 rounded text-xs bg-orange-900/50 text-orange-300">
              ⚠️ Tradeoff
            </div>
          )}
        </div>

        {/* Expand/Collapse button */}
        {nodeData.hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onToggleExpand?.(id);
            }}
            className="mt-3 w-full px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs font-semibold text-gray-300 transition-colors"
          >
            {nodeData.expanded ? '− Collapse' : '+ Expand'}
          </button>
        )}
      </div>

      {/* Output handle (bottom) */}
      {nodeData.hasChildren && (
        <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
      )}
    </div>
  );
}

export default memo(OptimizationNode);
