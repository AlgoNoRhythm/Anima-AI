import { describe, it, expect } from 'vitest';
import { flattenTree, getNodeById } from '../page-index/utils';
import type { TreeNode } from '../page-index/types';

/**
 * Tests that the Map-based lookup (used in tree-search.ts) produces
 * the same results as the recursive getNodeById approach.
 */

function buildTestTree(depth: number, breadth: number, prefix = ''): TreeNode[] {
  if (depth === 0) return [];
  const nodes: TreeNode[] = [];
  for (let i = 0; i < breadth; i++) {
    const nodeId = `${prefix}${i}`;
    nodes.push({
      nodeId,
      title: `Node ${nodeId}`,
      startIndex: i,
      endIndex: i + 1,
      text: `Text for node ${nodeId}`,
      summary: `Summary ${nodeId}`,
      nodes: buildTestTree(depth - 1, breadth, `${nodeId}-`),
    });
  }
  return nodes;
}

describe('tree-search Map-based lookup', () => {
  it('flattenTree returns all nodes', () => {
    const tree = buildTestTree(3, 2);
    const flat = flattenTree(tree);
    // 2 + 2*2 + 2*2*2 = 2 + 4 + 8 = 14
    expect(flat).toHaveLength(14);
  });

  it('Map-based lookup matches getNodeById for all nodes', () => {
    const tree = buildTestTree(3, 3);
    const flat = flattenTree(tree);

    // Build Map (same as tree-search.ts implementation)
    const nodeMap = new Map<string, TreeNode>();
    for (const node of flat) {
      nodeMap.set(node.nodeId, node);
    }

    // Verify every node is found by both methods
    for (const node of flat) {
      const mapResult = nodeMap.get(node.nodeId);
      const recursiveResult = getNodeById(tree, node.nodeId);
      expect(mapResult).toBeDefined();
      expect(recursiveResult).toBeDefined();
      expect(mapResult!.nodeId).toBe(recursiveResult!.nodeId);
      expect(mapResult!.title).toBe(recursiveResult!.title);
      expect(mapResult!.text).toBe(recursiveResult!.text);
    }
  });

  it('Map-based lookup returns undefined for missing IDs', () => {
    const tree = buildTestTree(2, 2);
    const flat = flattenTree(tree);
    const nodeMap = new Map<string, TreeNode>();
    for (const node of flat) {
      nodeMap.set(node.nodeId, node);
    }

    expect(nodeMap.get('nonexistent')).toBeUndefined();
    expect(getNodeById(tree, 'nonexistent')).toBeNull();
  });

  it('handles empty trees', () => {
    const flat = flattenTree([]);
    expect(flat).toHaveLength(0);

    const nodeMap = new Map<string, TreeNode>();
    for (const node of flat) {
      nodeMap.set(node.nodeId, node);
    }
    expect(nodeMap.size).toBe(0);
  });

  it('preserves score ordering for selected IDs', () => {
    const tree = buildTestTree(2, 3);
    const flat = flattenTree(tree);

    const nodeMap = new Map<string, TreeNode>();
    for (const node of flat) {
      nodeMap.set(node.nodeId, node);
    }

    // Simulate selected IDs (like LLM would return)
    const selectedIds = ['0', '1-0', '2'];
    const results: Array<{ nodeId: string; score: number }> = [];

    for (let i = 0; i < selectedIds.length; i++) {
      const entry = nodeMap.get(selectedIds[i]!);
      if (entry) {
        results.push({
          nodeId: entry.nodeId,
          score: 1 - i / selectedIds.length,
        });
      }
    }

    expect(results).toHaveLength(3);
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    expect(results[1]!.score).toBeGreaterThan(results[2]!.score);
  });
});
