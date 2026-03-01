import type { DoclingOutput, DoclingSection } from './chunker.js';

/**
 * Parses a PDF buffer using pdf-parse and converts to DoclingOutput format.
 * This is a fallback for when the Docling service is not available.
 */
export async function parsePdfBuffer(buffer: Buffer, filename: string): Promise<DoclingOutput> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });

  // getText() auto-loads the document internally
  const result = await parser.getText();
  const totalPages = result.pages ? result.pages.length : 1;
  const pageTexts: string[] = result.pages
    ? result.pages.map((p: { text: string }) => p.text)
    : [];

  const pages = [];

  if (pageTexts.length > 0) {
    for (let i = 0; i < pageTexts.length; i++) {
      const text = pageTexts[i]!;
      if (text.trim()) {
        pages.push({
          page_number: i + 1,
          sections: splitTextIntoSections(text),
          tables: [],
        });
      }
    }
  } else {
    // Fallback: single page with all text
    const fullText = result.text || '';
    if (fullText.trim()) {
      pages.push({
        page_number: 1,
        sections: splitTextIntoSections(fullText),
        tables: [],
      });
    }
  }

  return {
    pages,
    total_pages: totalPages,
    filename,
  };
}

/**
 * Heuristically splits text into sections using line patterns that look like headings.
 */
function splitTextIntoSections(text: string): DoclingSection[] {
  const lines = text.split('\n');
  const sections: DoclingSection[] = [];
  let currentTitle: string | null = null;
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentText += '\n';
      continue;
    }

    // Heuristic: short lines (under 80 chars) that are ALL CAPS or Title Case
    // and followed by content are likely headings
    const isLikelyHeading =
      trimmed.length < 80 &&
      trimmed.length > 2 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(',') &&
      (trimmed === trimmed.toUpperCase() || /^[A-Z][a-z]/.test(trimmed));

    if (isLikelyHeading && currentText.trim().length > 0) {
      sections.push({ title: currentTitle, text: currentText.trim(), bbox: null });
      currentTitle = trimmed;
      currentText = '';
    } else if (isLikelyHeading && currentText.trim().length === 0) {
      currentTitle = trimmed;
    } else {
      currentText += trimmed + '\n';
    }
  }

  if (currentText.trim()) {
    sections.push({ title: currentTitle, text: currentText.trim(), bbox: null });
  }

  // If we got nothing, just push the whole text as one section
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: null, text: text.trim(), bbox: null });
  }

  return sections;
}
