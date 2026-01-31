// Decision Tree Types and Utilities

/**
 * Tree node representing an optimization decision point
 */
export interface TreeNode {
  id: string;              // Unique identifier (e.g., "root", "node-1a")
  label: string;           // Display label (e.g., "High energy (>1000 kWh)?")
  description?: string;    // Additional context
  condition?: string;      // Condition to evaluate (e.g., "Energy > 1000 kWh")
  action?: string;         // Action to take (e.g., "Apply INT8 quantization")
  savings_pct?: number;    // Estimated savings percentage (0-100)
  tradeoff?: string;       // Potential downsides (e.g., "~2% accuracy loss")
  confidence?: number;     // Confidence in recommendation (0-1)
  children: TreeNode[];    // Child nodes
  tooltip?: string;        // Extended tooltip text
}

/**
 * Generate tree request
 */
export interface GenerateTreeRequest {
  workload_description?: string;
  agent_response?: any;
}

/**
 * Generate tree response
 */
export interface GenerateTreeResponse {
  tree?: TreeNode;
  error?: string;
  generation_time_ms?: number;
  model_used?: string;
}

/**
 * Calculate cumulative savings along a path
 */
export function calculateCumulativeSavings(nodes: TreeNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.savings_pct) {
      // Compound savings: each step reduces from the previous amount
      return total + (node.savings_pct * (1 - total / 100));
    }
    return total;
  }, 0);
}

/**
 * Find node by ID in tree
 */
export function findNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;

  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Get path from root to node
 */
export function getPathToNode(root: TreeNode, targetId: string, path: TreeNode[] = []): TreeNode[] | null {
  path.push(root);

  if (root.id === targetId) {
    return path;
  }

  for (const child of root.children) {
    const result = getPathToNode(child, targetId, [...path]);
    if (result) return result;
  }

  return null;
}

/**
 * Validate tree structure
 */
export function validateTree(node: TreeNode): boolean {
  if (!node.id || !node.label) return false;

  for (const child of node.children) {
    if (!validateTree(child)) return false;
  }

  return true;
}
