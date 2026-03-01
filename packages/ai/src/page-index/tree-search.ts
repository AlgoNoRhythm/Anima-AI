import type { DocumentTree, TreeSearchResult, SelectedNode, PageIndexConfig } from './types';
import { callLLM } from './llm';
import { treeSearchPrompt } from './prompts';
import { removeFields, getNodeById, extractJson } from './utils';

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

  // Ask LLM to select relevant nodes
  const response = await callLLM(treeSearchPrompt(query, treeStructure), config);
  const selectedIds = extractJson<string[]>(response);

  if (!selectedIds || !Array.isArray(selectedIds) || selectedIds.length === 0) {
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

  // Resolve selected node IDs to full nodes
  const selectedNodes: SelectedNode[] = [];

  for (let i = 0; i < selectedIds.length; i++) {
    const nodeId = selectedIds[i]!;
    // Search across all trees
    for (const tree of trees) {
      const node = getNodeById(tree.structure, nodeId);
      if (node) {
        selectedNodes.push({
          nodeId: node.nodeId,
          documentId: tree.documentId,
          title: node.title,
          startIndex: node.startIndex,
          endIndex: node.endIndex,
          text: node.text,
          summary: node.summary,
          score: 1 - i / selectedIds.length, // Higher score for earlier selections
        });
        break;
      }
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
