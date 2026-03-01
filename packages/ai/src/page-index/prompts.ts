export function tocDetectionPrompt(pageText: string): string {
  return `Analyze the following page from a document. Does this page contain a table of contents (TOC)?

A table of contents typically:
- Lists section titles or chapter names
- May include page numbers
- Shows a hierarchical structure of the document
- Uses indentation or numbering to show hierarchy

Page content:
---
${pageText}
---

Respond with ONLY "yes" or "no".`;
}

export function pageIndexDetectionPrompt(tocText: string): string {
  return `Analyze this table of contents. Does it include page numbers next to the entries?

TOC text:
---
${tocText}
---

Respond with ONLY "yes" or "no".`;
}

export function tocTransformPrompt(tocText: string): string {
  return `Convert the following table of contents into a JSON array. Each entry should have:
- "structure": hierarchical numbering like "1", "1.1", "1.2.3" etc.
- "title": the section title
- "page_number": the page number if present (as integer), or null if not present

TOC text:
---
${tocText}
---

Return ONLY a valid JSON array, no other text. Example format:
[
  {"structure": "1", "title": "Introduction", "page_number": 1},
  {"structure": "1.1", "title": "Background", "page_number": 3},
  {"structure": "2", "title": "Methods", "page_number": 10}
]`;
}

export function tocTransformContinuePrompt(partial: string, tocText: string): string {
  return `The previous response was cut off while converting a TOC to JSON. Here is the partial output so far:

${partial}

And here is the original TOC text:
---
${tocText}
---

Continue the JSON array from where it was cut off. Make sure the final output is valid JSON. Return ONLY the continuation (starting right after where the previous output ended).`;
}

export function tocIndexExtractPrompt(toc: string, content: string): string {
  return `Given the following table of contents entries and document page content, determine the physical page index (1-based) where each TOC entry actually appears in the document.

The TOC may list page numbers that don't match the physical page positions (e.g., due to front matter, cover pages, etc.).

TOC entries:
---
${toc}
---

Document pages (with physical indices):
---
${content}
---

Return a JSON array where each entry has:
- "title": the section title
- "physical_index": the physical page number (1-based) where this section starts

Return ONLY a valid JSON array, no other text.`;
}

export function generateStructureInitPrompt(groupText: string): string {
  return `Analyze the following document text and generate a hierarchical structure (table of contents) for it.

The text is divided into pages with markers like <physical_index_N> at the start of each page.

Document text:
---
${groupText}
---

Generate a JSON array representing the document structure. Each entry should have:
- "structure": hierarchical numbering (e.g., "1", "1.1", "1.1.1")
- "title": a descriptive title for the section
- "physical_index": the physical page number where this section starts

Guidelines:
- Create a meaningful hierarchy based on the content
- Each top-level section should cover a distinct topic or theme
- Use sub-sections for detailed breakdowns
- Physical indices should be accurate based on the page markers

Return ONLY a valid JSON array, no other text.`;
}

export function generateStructureContinuePrompt(prevStructure: string, groupText: string): string {
  return `Continue generating the document structure. The previous portion of the document produced this structure:

Previous structure:
${prevStructure}

Now analyze this next portion of the document and extend the structure:
---
${groupText}
---

Continue the numbering from where the previous structure left off. Return ONLY a valid JSON array with the NEW entries (don't repeat previous ones), no other text.

Each entry should have:
- "structure": hierarchical numbering continuing from the previous structure
- "title": a descriptive title for the section
- "physical_index": the physical page number where this section starts`;
}

export function pageNumberAssignPrompt(titles: string, groupText: string): string {
  return `Given the following section titles and document pages, assign the correct physical page index to each title.

Section titles:
${titles}

Document pages:
---
${groupText}
---

For each title, determine which physical page it appears on or starts from.

Return a JSON array where each entry has:
- "title": the section title
- "physical_index": the physical page number (1-based)

Return ONLY a valid JSON array, no other text.`;
}

export function titleAppearancePrompt(title: string, pageText: string): string {
  return `Does the section titled "${title}" appear on this page? The section content or its heading should be present.

Page content:
---
${pageText}
---

Respond with ONLY "yes" or "no".`;
}

export function titleStartCheckPrompt(title: string, pageText: string): string {
  return `Does the section titled "${title}" start at or near the beginning of this page? The heading or first content of this section should appear in the first portion of the page.

Page content:
---
${pageText}
---

Respond with ONLY "yes" or "no".`;
}

export function singleItemFixPrompt(title: string, pageRangeText: string): string {
  return `Find the physical page number where the section titled "${title}" starts.

The section should be within these pages:
---
${pageRangeText}
---

Return ONLY a single integer representing the physical page number (1-based).`;
}

export function nodeSummaryPrompt(nodeText: string): string {
  return `Summarize the following document section. Focus on the main topics, key points, and what information can be found here. Keep the summary concise (2-4 sentences).

Section text:
---
${nodeText.slice(0, 4000)}
---

Return ONLY the summary text, no other formatting.`;
}

export function entityDetectionPrompt(firstPagesText: string): string {
  return `Analyze the following text from the beginning of a document. Identify the main entity this document describes — it could be a product, appliance, place, restaurant, apartment, vehicle, service, or anything else.

Return ONLY a short name for the entity (e.g. "Nespresso Vertuo Plus", "Restaurant La Piazza", "Apartment 3B at 42 Oak Street", "Toyota Corolla 2024 Owner's Manual"). If you cannot determine a specific entity, return "Unknown".

Document text:
---
${firstPagesText.slice(0, 4000)}
---

Return ONLY the entity name, no other text.`;
}

export function treeSearchPrompt(query: string, treeStructure: string): string {
  return `You are a document retrieval system. Given a user query and a document tree structure with summaries, select the most relevant nodes that contain information to answer the query.

User Query: "${query}"

Document Tree Structure:
${treeStructure}

Instructions:
1. Read the query carefully
2. Examine each node's title and summary
3. Select nodes that are most likely to contain relevant information
4. Consider parent-child relationships - if a parent is relevant, some children may be too
5. Select between 1 and 5 nodes maximum
6. Prefer more specific (deeper) nodes over general (higher-level) ones when possible

Return ONLY a JSON array of node IDs (strings), ordered by relevance (most relevant first).
Example: ["0003", "0007", "0012"]`;
}
