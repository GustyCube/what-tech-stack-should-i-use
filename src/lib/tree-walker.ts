import { TreeNode, TreeStructure, TreeOption } from './tree-types';

const nodeCache = new Map<string, TreeNode>();
const optionCache = new Map<string, Map<string, string>>();

/**
 * Walk the tree to find the next node based on the selected option text
 * Optimized with caching for better performance
 */
export function walkTree(
  tree: TreeStructure,
  currentId: string,
  optionText: string
): string | null {
  const cacheKey = `${currentId}:${optionText}`;
  
  if (!optionCache.has(currentId)) {
    const node = tree[currentId];
    
    if (!node) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Node with id "${currentId}" not found in tree`);
      }
      return null;
    }
    
    if (!node.options) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Node "${currentId}" has no options`);
      }
      return null;
    }
    
    const optionMap = new Map<string, string>();
    node.options.forEach(option => {
      optionMap.set(option.text, option.nextId);
    });
    
    optionCache.set(currentId, optionMap);
  }
  
  const nodeOptions = optionCache.get(currentId)!;
  const nextId = nodeOptions.get(optionText);
  
  if (!nextId && process.env.NODE_ENV === 'development') {
    console.error(`Option "${optionText}" not found in node "${currentId}"`);
  }
  
  return nextId || null;
}

/**
 * Get the current node from the tree with caching
 */
export function getCurrentNode(
  tree: TreeStructure,
  nodeId: string
): TreeNode | null {
  if (nodeCache.has(nodeId)) {
    return nodeCache.get(nodeId)!;
  }
  
  const node = tree[nodeId] || null;
  if (node) {
    nodeCache.set(nodeId, node);
  }
  
  return node;
}

/**
 * Check if a node is a terminal node (has a result)
 */
export function isTerminalNode(node: TreeNode): boolean {
  return !!node.result;
}

/**
 * Validate the tree structure for common issues
 */
export function validateTree(tree: TreeStructure): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const visitedNodes = new Set<string>();
  
  // Check for start node
  if (!tree.start) {
    errors.push('Tree must have a "start" node');
  }
  
  // Check each node
  Object.entries(tree).forEach(([nodeId, node]) => {
    visitedNodes.add(nodeId);
    
    // Check if node has either question or result
    if (!node.question && !node.result) {
      errors.push(`Node "${nodeId}" must have either a question or result`);
    }
    
    // Check if non-terminal nodes have options
    if (!node.result && (!node.options || node.options.length === 0)) {
      errors.push(`Non-terminal node "${nodeId}" must have options`);
    }
    
    // Check if terminal nodes don't have options
    if (node.result && node.options) {
      errors.push(`Terminal node "${nodeId}" should not have options`);
    }
    
    // Check options format
    if (node.options) {
      if (node.options.length > 10) {
        errors.push(`Node "${nodeId}" has too many options (${node.options.length}). Consider splitting into sub-categories.`);
      }
      
      node.options.forEach((option, index) => {
        if (!option.text) {
          errors.push(`Node "${nodeId}" option ${index} is missing text`);
        }
        if (!option.nextId) {
          errors.push(`Node "${nodeId}" option ${index} is missing nextId`);
        }
      });
    }
  });
  
  // Check for orphaned references
  Object.entries(tree).forEach(([nodeId, node]) => {
    if (node.options) {
      node.options.forEach((option, index) => {
        if (!tree[option.nextId]) {
          errors.push(`Node "${nodeId}" option ${index} references non-existent node "${option.nextId}"`);
        }
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

const pathSummaryCache = new Map<string, string[]>();

/**
 * Generate a path summary from history with memoization
 */
export function generatePathSummary(
  tree: TreeStructure,
  history: { nodeId: string; answer: string }[]
): string[] {
  const cacheKey = history.map(h => `${h.nodeId}:${h.answer}`).join('|');
  
  if (pathSummaryCache.has(cacheKey)) {
    return pathSummaryCache.get(cacheKey)!;
  }
  
  const summary = history.map(({ nodeId, answer }) => {
    const node = getCurrentNode(tree, nodeId);
    if (!node || !node.question) return '';
    return `${node.question} → ${answer}`;
  }).filter(Boolean);
  
  pathSummaryCache.set(cacheKey, summary);
  return summary;
}

/**
 * Clear all caches - useful for development or when tree changes
 */
export function clearCaches(): void {
  nodeCache.clear();
  optionCache.clear();
  pathSummaryCache.clear();
}