export interface TreeOption {
  text: string;
  icon?: string;
  nextId: string;
}

export interface TreeNode {
  id: string;
  question?: string;
  metadata?: Record<string, any>;
  options?: TreeOption[]; // Up to 4 options
  result?: TechStackResult;
}

export interface TechStackResult {
  name: string;
  description: string;
  url: string;
  tags: string[];
  reasons?: string[];
}

export type TreeStructure = Record<string, TreeNode>;

export interface TreeState {
  currentId: string;
  history: { nodeId: string; answer: string }[];
  tree: TreeStructure;
}