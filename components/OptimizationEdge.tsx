// components/OptimizationEdge.tsx
"use client";

import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';

export interface OptimizationEdgeData {
  savings?: number;
  tradeoff?: string;
  isInPath?: boolean;
  isBestPath?: boolean;
}

function OptimizationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const edgeData = data as unknown as OptimizationEdgeData;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isInPath = edgeData?.isInPath || false;
  const isBestPath = edgeData?.isBestPath || false;

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${isInPath ? 'stroke-purple-500' : 'stroke-neutral-600'} ${isBestPath ? 'stroke-green-500' : ''}`}
        d={edgePath}
        strokeWidth={isInPath ? 3 : isBestPath ? 3 : 2}
        fill="none"
      />

      {/* Edge label */}
      {edgeData?.savings && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`
              px-2 py-1 rounded text-xs font-bold
              ${isBestPath
                ? 'bg-green-600 text-white'
                : isInPath
                  ? 'bg-purple-600 text-white'
                  : 'bg-neutral-800 text-green-400'}
            `}
          >
            {edgeData.savings}% saved
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(OptimizationEdge);
