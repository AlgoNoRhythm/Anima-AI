import type { DoclingOutput } from './chunker.js';
import type { PageContent } from '@anima-ai/ai';

export interface TextParseResult {
  text: string;
  pageCount: number;
}

const AVG_CHARS_PER_TOKEN = 4;
const SYNTHETIC_PAGE_TOKENS = 2000;
const SYNTHETIC_PAGE_CHARS = SYNTHETIC_PAGE_TOKENS * AVG_CHARS_PER_TOKEN;

/**
 * Parse a buffer into page-by-page content for tree indexing.
 * For single-page formats (TXT, MD, HTML, DOCX), splits into synthetic pages.
 */
export async function parseToPages(buffer: Buffer, filename: string): Promise<PageContent[]> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'md') {
    return parseMarkdownToPages(buffer);
  }

  // For TXT, HTML, DOCX: parse then split into synthetic pages
  let text: string;
  if (ext === 'docx') {
    const result = await parseDocx(buffer, filename);
    text = result.text;
  } else if (ext === 'html') {
    const result = parseHtml(buffer, filename);
    text = result.text;
  } else {
    const result = parseTxt(buffer, filename);
    text = result.text;
  }

  return splitTextToSyntheticPages(text);
}

/**
 * Parse markdown into pages by splitting on top-level headings.
 */
function parseMarkdownToPages(buffer: Buffer): PageContent[] {
  const text = buffer.toString('utf-8');
  const pages: PageContent[] = [];

  // Split by top-level headings (# or ##)
  const sections = text.split(/(?=^#{1,2}\s)/m);
  let pageNum = 1;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const tokenCount = Math.ceil(trimmed.length / AVG_CHARS_PER_TOKEN);

    if (tokenCount > SYNTHETIC_PAGE_TOKENS) {
      // Split large sections into smaller pages
      const subPages = splitTextToSyntheticPages(trimmed, pageNum);
      pages.push(...subPages);
      pageNum += subPages.length;
    } else {
      pages.push({ pageNumber: pageNum, text: trimmed, tokenCount });
      pageNum++;
    }
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, text, tokenCount: Math.ceil(text.length / AVG_CHARS_PER_TOKEN) }];
}

/**
 * Split text into synthetic pages of ~2000 tokens each, splitting at paragraph boundaries.
 */
function splitTextToSyntheticPages(text: string, startPage: number = 1): PageContent[] {
  const pages: PageContent[] = [];
  const paragraphs = text.split(/\n\s*\n/);

  let currentText = '';
  let pageNum = startPage;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentText.length + trimmed.length > SYNTHETIC_PAGE_CHARS && currentText.length > 0) {
      pages.push({
        pageNumber: pageNum,
        text: currentText.trim(),
        tokenCount: Math.ceil(currentText.trim().length / AVG_CHARS_PER_TOKEN),
      });
      pageNum++;
      currentText = trimmed + '\n\n';
    } else {
      currentText += trimmed + '\n\n';
    }
  }

  if (currentText.trim().length > 0) {
    pages.push({
      pageNumber: pageNum,
      text: currentText.trim(),
      tokenCount: Math.ceil(currentText.trim().length / AVG_CHARS_PER_TOKEN),
    });
  }

  return pages;
}

/**
 * Parse a plain text file. Returns text as-is with pageCount=1.
 */
export function parseTxt(buffer: Buffer, _filename: string): TextParseResult {
  const text = buffer.toString('utf-8');
  return { text, pageCount: 1 };
}

/**
 * Parse a Markdown file. Strips markdown syntax and returns plain text.
 */
export function parseMarkdown(buffer: Buffer, _filename: string): TextParseResult {
  let text = buffer.toString('utf-8');

  // Strip images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Strip links [text](url) -> text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Strip code blocks ```...```
  text = text.replace(/```[\s\S]*?```/g, '');
  // Strip inline code `...`
  text = text.replace(/`([^`]*)`/g, '$1');
  // Strip headers # ## ### etc -> just the text
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Strip bold **text** or __text__
  text = text.replace(/\*\*([^*]*)\*\*/g, '$1');
  text = text.replace(/__([^_]*)__/g, '$1');
  // Strip italic *text* or _text_
  text = text.replace(/\*([^*]*)\*/g, '$1');
  text = text.replace(/_([^_]*)_/g, '$1');
  // Strip strikethrough ~~text~~
  text = text.replace(/~~([^~]*)~~/g, '$1');
  // Strip horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  // Strip blockquote markers
  text = text.replace(/^>\s?/gm, '');

  return { text: text.trim(), pageCount: 1 };
}

/**
 * Parse an HTML file. Strips HTML tags and decodes common entities.
 */
export function parseHtml(buffer: Buffer, _filename: string): TextParseResult {
  let text = buffer.toString('utf-8');

  // Remove script and style blocks entirely
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Strip all HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/\n{3,}/g, '\n\n');

  return { text: text.trim(), pageCount: 1 };
}

/**
 * Parse a DOCX file by extracting word/document.xml from the ZIP and stripping XML tags.
 * Uses jszip (MIT) to read the ZIP structure.
 */
export async function parseDocx(buffer: Buffer, _filename: string): Promise<TextParseResult> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('Invalid DOCX: word/document.xml not found');
  }

  let xmlContent = await docXml.async('string');

  // Replace paragraph and line break tags with newlines before stripping
  xmlContent = xmlContent.replace(/<\/w:p>/g, '\n');
  xmlContent = xmlContent.replace(/<w:br[^>]*\/>/g, '\n');
  xmlContent = xmlContent.replace(/<w:tab[^>]*\/>/g, '\t');

  // Strip all XML tags
  let text = xmlContent.replace(/<[^>]*>/g, '');

  // Decode XML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");

  // Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return { text: text.trim(), pageCount: 1 };
}

/**
 * Convert a TextParseResult to DoclingOutput format so the existing chunker works.
 */
export function textResultToDoclingOutput(result: TextParseResult, filename: string): DoclingOutput {
  return {
    pages: [
      {
        page_number: 1,
        sections: [
          {
            title: null,
            text: result.text,
            bbox: null,
          },
        ],
        tables: [],
      },
    ],
    total_pages: result.pageCount,
    filename,
  };
}
