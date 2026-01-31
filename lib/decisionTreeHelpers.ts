// lib/decisionTreeHelpers.ts
import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { TreeNode } from './decisionTree';

/**
 * Convert recursive TreeNode structure to flat React Flow nodes and edges
 */
export function treeToNodesAndEdges(
  tree: TreeNode,
  hiddenNodeIds: Set<string> = new Set()
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function traverse(node: TreeNode, parentId: string | null = null) {
    const isHidden = hiddenNodeIds.has(node.id);

    // Add node
    nodes.push({
      id: node.id,
      type: 'optimizationNode',
      data: {
        ...node,
        hasChildren: node.children.length > 0,
        expanded: node.expanded !== false, // Default to expanded
      },
      position: { x: 0, y: 0 }, // Will be set by layout
      hidden: isHidden,
    });

    // Add edge from parent
    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'optimizationEdge',
        data: {
          savings: node.savings_pct,
          tradeoff: node.tradeoff,
        },
        hidden: isHidden,
      });
    }

    // Traverse children if node is expanded
    if (node.expanded !== false) {
      node.children.forEach(child => traverse(child, node.id));
    }
  }

  traverse(tree);
  return { nodes, edges };
}

/**
 * Apply dagre layout algorithm to position nodes
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 280;
  const nodeHeight = 180;

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  // Only layout visible nodes
  const visibleNodes = nodes.filter(n => !n.hidden);
  const visibleEdges = edges.filter(e => !e.hidden);

  visibleNodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  visibleEdges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map(node => {
    if (node.hidden) return node;

    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Find path from root to target node
 */
export function getPathToNode(tree: TreeNode, targetId: string): TreeNode[] | null {
  const path: TreeNode[] = [];

  function traverse(node: TreeNode): boolean {
    path.push(node);

    if (node.id === targetId) {
      return true;
    }

    for (const child of node.children) {
      if (traverse(child)) {
        return true;
      }
    }

    path.pop();
    return false;
  }

  return traverse(tree) ? path : null;
}

/**
 * Calculate cumulative energy savings along a path
 */
export function getCumulativeSavings(path: TreeNode[]): {
  totalSavingsPct: number;
  reducedKwh: number;
  reducedCarbonKg: number;
  tradeoffScore: number;
} {
  let totalSavingsPct = 0;

  // Apply savings multiplicatively (each step reduces remaining energy)
  path.forEach(node => {
    if (node.savings_pct) {
      totalSavingsPct = totalSavingsPct + node.savings_pct * (1 - totalSavingsPct / 100);
    }
  });

  // Simple tradeoff scoring (count tradeoffs, weighted by severity)
  const tradeoffScore = path.reduce((score, node) => {
    if (node.tradeoff) {
      // Simple heuristic: longer tradeoff text = more severe
      return score + Math.min(node.tradeoff.length / 20, 5);
    }
    return score;
  }, 0);

  return {
    totalSavingsPct,
    reducedKwh: 0, // Will be calculated with base kWh
    reducedCarbonKg: 0, // Will be calculated with base kWh
    tradeoffScore,
  };
}

/**
 * Find the best path (highest cumulative savings)
 */
export function findBestPath(tree: TreeNode): TreeNode[] {
  let bestPath: TreeNode[] = [];
  let bestSavings = 0;

  function traverse(node: TreeNode, currentPath: TreeNode[]) {
    const newPath = [...currentPath, node];
    const { totalSavingsPct } = getCumulativeSavings(newPath);

    if (totalSavingsPct > bestSavings) {
      bestSavings = totalSavingsPct;
      bestPath = newPath;
    }

    node.children.forEach(child => traverse(child, newPath));
  }

  traverse(tree, []);
  return bestPath;
}

/**
 * Get all descendant node IDs (for collapsing)
 */
export function getDescendantIds(tree: TreeNode, nodeId: string): string[] {
  const descendants: string[] = [];

  function findAndCollect(node: TreeNode): boolean {
    if (node.id === nodeId) {
      collectDescendants(node);
      return true;
    }

    for (const child of node.children) {
      if (findAndCollect(child)) return true;
    }

    return false;
  }

  function collectDescendants(node: TreeNode) {
    node.children.forEach(child => {
      descendants.push(child.id);
      collectDescendants(child);
    });
  }

  findAndCollect(tree);
  return descendants;
}
