import type { PageContent, TreeNode, TocItem, PageIndexConfig, DocumentTreeResult } from './types';
import { callLLM, callLLMWithFinishReason } from './llm';
import {
  tocDetectionPrompt,
  pageIndexDetectionPrompt,
  tocTransformPrompt,
  tocTransformContinuePrompt,
  tocIndexExtractPrompt,
  generateStructureInitPrompt,
  generateStructureContinuePrompt,
  titleAppearancePrompt,
  singleItemFixPrompt,
  nodeSummaryPrompt,
  entityDetectionPrompt,
} from './prompts';
import {
  extractJson,
  pageListToGroups,
  writeNodeIds,
  flattenTree,
  listToTree,
  formatPagesForPrompt,
  getPageRangeText,
  countTokens,
} from './utils';

/**
 * Build a document tree from page contents.
 * This is the main entry point for the indexing pipeline.
 *
 * Flow:
 *   1. Detect TOC in first N pages
 *   2. If TOC found with page numbers → processTocWithPageNumbers
 *   3. If TOC found without page numbers → processTocNoPageNumbers
 *   4. If no TOC → processNoToc (LLM generates structure)
 *   5. Post-process: split large nodes, assign IDs, fill text, generate summaries
 */
export async function buildDocumentTree(
  pages: PageContent[],
  docName: string,
  config: PageIndexConfig,
): Promise<DocumentTreeResult> {
  if (pages.length === 0) return { tree: [], detectedEntity: null };

  // Step 1: Detect TOC
  const tocResult = await detectToc(pages, config);

  // Detect entity from first pages (runs concurrently with tree building)
  const firstPagesText = pages
    .slice(0, Math.min(3, pages.length))
    .map((p) => p.text)
    .join('\n\n');
  const entityPromise = callLLM(entityDetectionPrompt(firstPagesText), config)
    .then((r) => {
      const name = r.trim();
      return name && name.toLowerCase() !== 'unknown' ? name : null;
    })
    .catch(() => null);

  let tree: TreeNode[];

  if (tocResult) {
    const { tocText, hasPageNumbers } = tocResult;

    if (hasPageNumbers) {
      // Path A: TOC with page numbers
      tree = await processTocWithPageNumbers(tocText, pages, config);
    } else {
      // Path B: TOC without page numbers
      tree = await processTocNoPageNumbers(tocText, pages, config);
    }
  } else {
    // Path C: No TOC detected
    tree = await processNoToc(pages, config);
  }

  // Post-processing
  tree = splitLargeNodes(tree, pages, config);
  writeNodeIds(tree);
  fillNodeText(tree, pages);
  await generateSummaries(tree, config);

  const detectedEntity = await entityPromise;

  return { tree, detectedEntity };
}

/**
 * Scan first N pages for a table of contents.
 */
async function detectToc(
  pages: PageContent[],
  config: PageIndexConfig,
): Promise<{ tocText: string; hasPageNumbers: boolean } | null> {
  const checkPages = pages.slice(0, config.tocCheckPageNum);

  for (const page of checkPages) {
    if (page.text.trim().length < 50) continue;

    const response = await callLLM(tocDetectionPrompt(page.text), config);
    const isToc = response.trim().toLowerCase().startsWith('yes');

    if (isToc) {
      // Check if TOC has page numbers
      const pageNumResponse = await callLLM(pageIndexDetectionPrompt(page.text), config);
      const hasPageNumbers = pageNumResponse.trim().toLowerCase().startsWith('yes');

      return { tocText: page.text, hasPageNumbers };
    }
  }

  return null;
}

/**
 * Path A: Process a TOC that includes page numbers.
 * Extract TOC items, map them to physical page indices, build tree.
 */
async function processTocWithPageNumbers(
  tocText: string,
  pages: PageContent[],
  config: PageIndexConfig,
): Promise<TreeNode[]> {
  // Transform TOC text to structured JSON
  const tocItems = await transformToc(tocText, config);
  if (!tocItems || tocItems.length === 0) {
    return processNoToc(pages, config);
  }

  // Calculate page offset (difference between TOC page numbers and physical pages)
  // Try to find the offset by checking where the first few items actually appear
  const itemsWithPhysical = await mapTocToPhysicalPages(tocItems, pages, config);

  // Verify and fix any bad mappings
  const verifiedItems = await verifyAndFix(itemsWithPhysical, pages, config);

  return listToTree(verifiedItems, pages);
}

/**
 * Path B: Process a TOC without page numbers.
 * Extract titles from TOC, then search for them in the document.
 */
async function processTocNoPageNumbers(
  tocText: string,
  pages: PageContent[],
  config: PageIndexConfig,
): Promise<TreeNode[]> {
  // Transform TOC to get titles and structure
  const tocItems = await transformToc(tocText, config);
  if (!tocItems || tocItems.length === 0) {
    return processNoToc(pages, config);
  }

  // Search for each title in the document pages
  const groups = pageListToGroups(pages, config.maxTokenNumEachNode * 4, 1);

  for (const item of tocItems) {
    // Search pages for where this title appears
    for (const group of groups) {
      const groupText = formatPagesForPrompt(group);
      const response = await callLLM(
        `Find the physical page index where the section titled "${item.title}" starts in the following text. Return ONLY a single integer.\n\n${groupText}`,
        config,
      );
      const pageNum = parseInt(response.trim(), 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages.length) {
        item.physicalIndex = pageNum;
        break;
      }
    }

    // Default to page 1 if not found
    if (!item.physicalIndex) {
      item.physicalIndex = 1;
    }
  }

  const verified = await verifyAndFix(tocItems, pages, config);
  return listToTree(verified, pages);
}

/**
 * Path C: No TOC detected. Use LLM to generate structure from text.
 */
async function processNoToc(
  pages: PageContent[],
  config: PageIndexConfig,
): Promise<TreeNode[]> {
  const groups = pageListToGroups(pages, config.maxTokenNumEachNode * 4, 1);
  let allItems: TocItem[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    const groupText = formatPagesForPrompt(group);

    let response: string;
    if (i === 0) {
      response = await callLLM(generateStructureInitPrompt(groupText), config);
    } else {
      const prevStructure = JSON.stringify(
        allItems.slice(-5).map((item) => ({
          structure: item.structure,
          title: item.title,
        })),
      );
      response = await callLLM(
        generateStructureContinuePrompt(prevStructure, groupText),
        config,
      );
    }

    const items = extractJson<Array<{ structure: string; title: string; physical_index: number }>>(response);
    if (items && Array.isArray(items)) {
      for (const item of items) {
        allItems.push({
          structure: item.structure,
          title: item.title,
          physicalIndex: item.physical_index,
        });
      }
    }
  }

  // If LLM generated nothing, create a single root node
  if (allItems.length === 0) {
    return [
      {
        title: 'Document',
        nodeId: '',
        startIndex: 1,
        endIndex: pages.length > 0 ? pages[pages.length - 1]!.pageNumber : 1,
        summary: '',
        text: '',
        nodes: [],
      },
    ];
  }

  return listToTree(allItems, pages);
}

/**
 * Transform TOC text into structured TocItem array via LLM.
 * Handles continuation if the response is cut off.
 */
async function transformToc(tocText: string, config: PageIndexConfig): Promise<TocItem[] | null> {
  const { text, finishReason } = await callLLMWithFinishReason(
    tocTransformPrompt(tocText),
    config,
  );

  let fullResponse = text;

  // If response was cut off (length limit), try to continue
  if (finishReason === 'length') {
    const continuation = await callLLM(
      tocTransformContinuePrompt(fullResponse, tocText),
      config,
    );
    fullResponse = fullResponse + continuation;
  }

  const items = extractJson<Array<{ structure: string; title: string; page_number: number | null }>>(fullResponse);
  if (!items || !Array.isArray(items)) return null;

  return items.map((item) => ({
    structure: item.structure,
    title: item.title,
    pageNumber: item.page_number ?? undefined,
  }));
}

/**
 * Map TOC items (with logical page numbers) to physical page indices.
 */
async function mapTocToPhysicalPages(
  tocItems: TocItem[],
  pages: PageContent[],
  config: PageIndexConfig,
): Promise<TocItem[]> {
  // Build page content summary for the LLM
  const groups = pageListToGroups(pages, config.maxTokenNumEachNode * 4, 1);

  // Format TOC items for prompt
  const tocSummary = tocItems
    .map((item) => `"${item.title}" (TOC page: ${item.pageNumber ?? 'unknown'})`)
    .join('\n');

  for (const group of groups) {
    const groupText = formatPagesForPrompt(group);

    const response = await callLLM(
      tocIndexExtractPrompt(tocSummary, groupText),
      config,
    );

    const mappings = extractJson<Array<{ title: string; physical_index: number }>>(response);
    if (mappings && Array.isArray(mappings)) {
      for (const mapping of mappings) {
        const item = tocItems.find(
          (t) => t.title.toLowerCase() === mapping.title.toLowerCase(),
        );
        if (item && !item.physicalIndex) {
          item.physicalIndex = mapping.physical_index;
        }
      }
    }
  }

  // Fill in any unmapped items by interpolation
  for (let i = 0; i < tocItems.length; i++) {
    if (!tocItems[i]!.physicalIndex) {
      // Use page number as fallback
      tocItems[i]!.physicalIndex = tocItems[i]!.pageNumber ?? 1;
    }
  }

  return tocItems;
}

/**
 * Verify TOC-to-page mappings and fix incorrect ones.
 */
async function verifyAndFix(
  tocItems: TocItem[],
  pages: PageContent[],
  config: PageIndexConfig,
): Promise<TocItem[]> {
  // Quick verify: check a few items to see if they're accurate
  const sampleSize = Math.min(3, tocItems.length);
  const sampleIndices = Array.from({ length: sampleSize }, (_, i) =>
    Math.floor((i / sampleSize) * tocItems.length),
  );

  let correctCount = 0;

  for (const idx of sampleIndices) {
    const item = tocItems[idx]!;
    const physIdx = item.physicalIndex ?? 1;
    const page = pages.find((p) => p.pageNumber === physIdx);

    if (page) {
      const response = await callLLM(
        titleAppearancePrompt(item.title, page.text),
        config,
      );
      if (response.trim().toLowerCase().startsWith('yes')) {
        correctCount++;
      }
    }
  }

  // If most samples are correct, trust the rest
  if (correctCount >= sampleSize * 0.5) {
    return tocItems;
  }

  // Otherwise, fix each item individually
  for (const item of tocItems) {
    const physIdx = item.physicalIndex ?? 1;
    const searchStart = Math.max(1, physIdx - 3);
    const searchEnd = Math.min(pages.length, physIdx + 3);

    const rangeText = formatPagesForPrompt(
      pages.filter((p) => p.pageNumber >= searchStart && p.pageNumber <= searchEnd),
    );

    const response = await callLLM(
      singleItemFixPrompt(item.title, rangeText),
      config,
    );

    const fixedPage = parseInt(response.trim(), 10);
    if (!isNaN(fixedPage) && fixedPage >= 1 && fixedPage <= pages.length) {
      item.physicalIndex = fixedPage;
    }
  }

  return tocItems;
}

/**
 * Split nodes that exceed the max page or token limit.
 */
function splitLargeNodes(
  nodes: TreeNode[],
  pages: PageContent[],
  config: PageIndexConfig,
): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of nodes) {
    // First, recurse into children
    if (node.nodes.length > 0) {
      node.nodes = splitLargeNodes(node.nodes, pages, config);
    }

    const pageSpan = node.endIndex - node.startIndex + 1;
    const nodeText = getPageRangeText(pages, node.startIndex, node.endIndex);
    const tokenCount = countTokens(nodeText);

    if (
      pageSpan > config.maxPageNumEachNode &&
      node.nodes.length === 0 &&
      tokenCount > config.maxTokenNumEachNode
    ) {
      // Split into sub-nodes of roughly equal size
      const numParts = Math.ceil(pageSpan / config.maxPageNumEachNode);
      const pagesPerPart = Math.ceil(pageSpan / numParts);

      for (let i = 0; i < numParts; i++) {
        const start = node.startIndex + i * pagesPerPart;
        const end = Math.min(node.startIndex + (i + 1) * pagesPerPart - 1, node.endIndex);

        node.nodes.push({
          title: `${node.title} (Part ${i + 1})`,
          nodeId: '',
          startIndex: start,
          endIndex: end,
          summary: '',
          text: '',
          nodes: [],
        });
      }
    }

    result.push(node);
  }

  return result;
}

/**
 * Fill the `text` field of each node with the actual page text for its range.
 */
function fillNodeText(nodes: TreeNode[], pages: PageContent[]): void {
  for (const node of nodes) {
    node.text = getPageRangeText(pages, node.startIndex, node.endIndex);

    if (node.nodes.length > 0) {
      fillNodeText(node.nodes, pages);
    }
  }
}

/**
 * Generate summaries for all nodes concurrently.
 */
async function generateSummaries(
  nodes: TreeNode[],
  config: PageIndexConfig,
): Promise<void> {
  const allNodes = flattenTree(nodes);

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < allNodes.length; i += batchSize) {
    const batch = allNodes.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (node) => {
        if (!node.text || node.text.trim().length === 0) {
          node.summary = 'Empty section.';
          return;
        }

        try {
          const summary = await callLLM(nodeSummaryPrompt(node.text), config);
          node.summary = summary.trim();
        } catch {
          node.summary = `Section: ${node.title}`;
        }
      }),
    );
  }
}
