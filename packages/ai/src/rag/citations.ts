import type { Citation, RetrievedNode } from '../types';
import type { SelectedNode } from '../page-index/types';

/**
 * Extract citations from tree search results.
 * Accepts SelectedNode from tree search (new pipeline).
 */
export function extractCitations(
  nodes: SelectedNode[],
  documentTitles: Map<string, string>,
): Citation[] {
  return nodes.map((node) => {
    // Build page number range
    const pageNumbers: number[] = [];
    for (let i = node.startIndex; i <= node.endIndex; i++) {
      pageNumbers.push(i);
    }

    return {
      documentId: node.documentId,
      documentTitle: documentTitles.get(node.documentId) || 'Unknown Document',
      pageNumbers,
      sectionTitle: node.title,
      text: node.text.slice(0, 500), // Truncate for citation display
      score: node.score,
    };
  });
}
