import { describe, it, expect } from 'vitest';
import { extractCitations } from '../rag/citations';
import type { SelectedNode } from '../page-index/types';

describe('extractCitations', () => {
  it('converts tree nodes to citations', () => {
    const nodes: SelectedNode[] = [
      {
        nodeId: '0001',
        documentId: 'doc1',
        title: 'Maintenance',
        startIndex: 12,
        endIndex: 14,
        text: 'Clean the filter regularly.',
        summary: 'Maintenance instructions',
        score: 0.95,
      },
      {
        nodeId: '0002',
        documentId: 'doc2',
        title: 'Cleaning',
        startIndex: 5,
        endIndex: 6,
        text: 'Use mild detergent only.',
        summary: 'Cleaning guide',
        score: 0.82,
      },
    ];

    const titles = new Map([
      ['doc1', 'Dishwasher Manual'],
      ['doc2', 'Cleaning Guide'],
    ]);

    const citations = extractCitations(nodes, titles);
    expect(citations).toHaveLength(2);
    expect(citations[0]!.documentTitle).toBe('Dishwasher Manual');
    expect(citations[0]!.pageNumbers).toEqual([12, 13, 14]);
    expect(citations[0]!.sectionTitle).toBe('Maintenance');
    expect(citations[1]!.documentTitle).toBe('Cleaning Guide');
    expect(citations[1]!.pageNumbers).toEqual([5, 6]);
  });

  it('handles unknown document titles', () => {
    const nodes: SelectedNode[] = [{
      nodeId: '0001',
      documentId: 'unknown',
      title: 'Section',
      startIndex: 1,
      endIndex: 1,
      text: 'Some text',
      summary: 'A section',
      score: 0.5,
    }];

    const citations = extractCitations(nodes, new Map());
    expect(citations[0]!.documentTitle).toBe('Unknown Document');
  });
});
