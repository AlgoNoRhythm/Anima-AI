import type { DocumentTree, TreeSearchResult, SelectedNode, PageIndexConfig, TreeNode } from './types';
import { callLLM } from './llm';
import { treeSearchPrompt } from './prompts';
import { removeFields, flattenTree, extractJson } from './utils';

/**
 * Search document trees for nodes relevant to a query.
 * Uses LLM reasoning to navigate the tree structure and find relevant sections.
 */
export async function searchTree(
  query: string,
  trees: DocumentTree[],
  config: PageIndexConfig,
): Promise<TreeSearchResult> {
  if (trees.length === 0) {
    return { nodes: [], context: '' };
  }

  // Build a combined tree structure for the LLM, stripping text to save tokens
  const treeStructure = trees
    .map((tree) => {
      const stripped = removeFields(tree.structure, ['text']);
      return `Document: "${tree.docName}" (ID: ${tree.documentId})\n${JSON.stringify(stripped, null, 2)}`;
    })
    .join('\n\n---\n\n');

  // Ask LLM to select relevant nodes — fall back to root nodes on any error
  let selectedIds: string[] = [];
  try {
    const response = await callLLM(treeSearchPrompt(query, treeStructure), config);
    selectedIds = extractJson<string[]>(response) ?? [];
    if (!Array.isArray(selectedIds)) selectedIds = [];
  } catch {
    // LLM failed/timed out/circuit open — fall through to root-node fallback
    selectedIds = [];
  }

  if (selectedIds.length === 0) {
    // Fallback: return root nodes
    const fallbackNodes: SelectedNode[] = trees.flatMap((tree) =>
      tree.structure.slice(0, 1).map((node) => ({
        nodeId: node.nodeId,
        documentId: tree.documentId,
        title: node.title,
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        text: node.text,
        summary: node.summary,
        score: 0.5,
      })),
    );

    return {
      nodes: fallbackNodes,
      context: fallbackNodes.map((n) => n.text).join('\n\n---\n\n'),
    };
  }

  // Build lookup map O(n) — one pass over all trees for O(1) per-ID resolution
  const nodeMap = new Map<string, { node: TreeNode; documentId: string }>();
  for (const tree of trees) {
    for (const node of flattenTree(tree.structure)) {
      nodeMap.set(node.nodeId, { node, documentId: tree.documentId });
    }
  }

  // Resolve selected node IDs to full nodes — O(1) per ID
  const selectedNodes: SelectedNode[] = [];

  for (let i = 0; i < selectedIds.length; i++) {
    const entry = nodeMap.get(selectedIds[i]!);
    if (entry) {
      selectedNodes.push({
        nodeId: entry.node.nodeId,
        documentId: entry.documentId,
        title: entry.node.title,
        startIndex: entry.node.startIndex,
        endIndex: entry.node.endIndex,
        text: entry.node.text,
        summary: entry.node.summary,
        score: 1 - i / selectedIds.length, // Higher score for earlier selections
      });
    }
  }

  // If no nodes were resolved (IDs didn't match), use fallback
  if (selectedNodes.length === 0) {
    const fallbackNodes: SelectedNode[] = trees.flatMap((tree) =>
      tree.structure.slice(0, 1).map((node) => ({
        nodeId: node.nodeId,
        documentId: tree.documentId,
        title: node.title,
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        text: node.text,
        summary: node.summary,
        score: 0.5,
      })),
    );

    return {
      nodes: fallbackNodes,
      context: fallbackNodes.map((n) => n.text).join('\n\n---\n\n'),
    };
  }

  // Build context string from selected node texts
  const context = selectedNodes
    .map(
      (n) =>
        `[Source: ${n.title}, Pages ${n.startIndex}-${n.endIndex}]\n${n.text}`,
    )
    .join('\n\n---\n\n');

  return { nodes: selectedNodes, context };
}
