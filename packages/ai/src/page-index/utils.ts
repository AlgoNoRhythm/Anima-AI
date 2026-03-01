import type { PageContent, TreeNode, TocItem } from './types';

/**
 * Estimate token count for text. Uses chars/4 as a fast approximation.
 * For more accuracy, js-tiktoken can be used but this is sufficient for page grouping.
 */
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extract JSON from LLM response text.
 * Handles markdown code fences, trailing commas, and other common LLM artifacts.
 */
export function extractJson<T>(llmResponse: string): T | null {
  let text = llmResponse.trim();

  // Remove markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1]!.trim();
  }

  // Try to find JSON array or object
  const jsonStart = text.search(/[\[{]/);
  if (jsonStart === -1) return null;

  // Find the matching closing bracket
  const openChar = text[jsonStart]!;
  const closeChar = openChar === '[' ? ']' : '}';
  let depth = 0;
  let jsonEnd = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = jsonStart; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  if (jsonEnd === -1) return null;

  let jsonStr = text.slice(jsonStart, jsonEnd + 1);

  // Fix trailing commas before closing brackets
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Split pages into groups that fit within a token limit, with optional overlap.
 */
export function pageListToGroups(
  pages: PageContent[],
  maxTokens: number,
  overlapPages: number = 1,
): PageContent[][] {
  if (pages.length === 0) return [];

  const groups: PageContent[][] = [];
  let currentGroup: PageContent[] = [];
  let currentTokens = 0;

  for (const page of pages) {
    if (currentTokens + page.tokenCount > maxTokens && currentGroup.length > 0) {
      groups.push([...currentGroup]);

      // Keep overlap pages from the end of current group
      const overlap = currentGroup.slice(-overlapPages);
      currentGroup = [...overlap];
      currentTokens = overlap.reduce((sum, p) => sum + p.tokenCount, 0);
    }

    currentGroup.push(page);
    currentTokens += page.tokenCount;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Assign sequential zero-padded 4-digit IDs to tree nodes (depth-first).
 */
export function writeNodeIds(nodes: TreeNode[], startId: number = 1): number {
  let currentId = startId;

  for (const node of nodes) {
    node.nodeId = String(currentId).padStart(4, '0');
    currentId++;
    currentId = writeNodeIds(node.nodes, currentId);
  }

  return currentId;
}

/**
 * Flatten a tree to a list of all nodes (depth-first).
 */
export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of nodes) {
    result.push(node);
    result.push(...flattenTree(node.nodes));
  }

  return result;
}

/**
 * Find a node by its ID in the tree.
 */
export function getNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.nodeId === nodeId) return node;
    const found = getNodeById(node.nodes, nodeId);
    if (found) return found;
  }
  return null;
}

/**
 * Convert a flat list of TOC items with structure codes into a nested tree.
 */
export function listToTree(flatItems: TocItem[], pages: PageContent[]): TreeNode[] {
  const root: TreeNode[] = [];

  // Map structure depth: "1" -> 1, "1.1" -> 2, "1.1.1" -> 3
  interface BuildNode {
    item: TocItem;
    node: TreeNode;
    depth: number;
  }

  const buildNodes: BuildNode[] = flatItems.map((item) => {
    const depth = item.structure.split('.').length;
    const physicalIdx = item.physicalIndex ?? item.pageNumber ?? 1;
    return {
      item,
      depth,
      node: {
        title: item.title,
        nodeId: '',
        startIndex: physicalIdx,
        endIndex: physicalIdx, // Will be calculated later
        summary: '',
        text: '',
        nodes: [],
      },
    };
  });

  // Build tree using depth
  const stack: BuildNode[] = [];

  for (const bn of buildNodes) {
    // Pop stack until we find a parent at a lower depth
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= bn.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(bn.node);
    } else {
      stack[stack.length - 1]!.node.nodes.push(bn.node);
    }

    stack.push(bn);
  }

  // Calculate endIndex for each node
  calculateEndIndices(root, pages.length > 0 ? pages[pages.length - 1]!.pageNumber : 1);

  return root;
}

/**
 * Calculate endIndex for each node based on sibling/parent boundaries.
 */
function calculateEndIndices(nodes: TreeNode[], maxPage: number): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const nextSibling = nodes[i + 1];

    if (nextSibling) {
      // End at the page before the next sibling starts
      node.endIndex = Math.max(node.startIndex, nextSibling.startIndex - 1);
    } else {
      // Last sibling extends to maxPage
      node.endIndex = maxPage;
    }

    // Recurse into children
    if (node.nodes.length > 0) {
      calculateEndIndices(node.nodes, node.endIndex);
    }
  }
}

/**
 * Create a copy of the tree with specified fields removed (for presenting to LLM).
 */
export function removeFields(nodes: TreeNode[], fields: string[]): object[] {
  return nodes.map((node) => {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (fields.includes(key)) continue;
      if (key === 'nodes') {
        copy[key] = removeFields(node.nodes, fields);
      } else {
        copy[key] = value;
      }
    }
    return copy;
  });
}

/**
 * Format pages with physical index tags for LLM prompts.
 */
export function formatPagesForPrompt(pages: PageContent[]): string {
  return pages
    .map((p) => `<physical_index_${p.pageNumber}>\n${p.text}\n</physical_index_${p.pageNumber}>`)
    .join('\n\n');
}

/**
 * Get the text content for a page range from the pages array.
 */
export function getPageRangeText(pages: PageContent[], startIndex: number, endIndex: number): string {
  return pages
    .filter((p) => p.pageNumber >= startIndex && p.pageNumber <= endIndex)
    .map((p) => p.text)
    .join('\n\n');
}
