import { describe, it, expect } from 'vitest';
import {
  parseTxt,
  parseMarkdown,
  parseHtml,
  textResultToDoclingOutput,
} from '../text-parser.js';

function buf(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

describe('parseTxt', () => {
  it('returns the text content verbatim', () => {
    const result = parseTxt(buf('Hello, world!'), 'file.txt');
    expect(result.text).toBe('Hello, world!');
  });

  it('always reports pageCount of 1', () => {
    const result = parseTxt(buf('Some text'), 'file.txt');
    expect(result.pageCount).toBe(1);
  });

  it('preserves multi-line content', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const result = parseTxt(buf(content), 'multi.txt');
    expect(result.text).toBe(content);
  });

  it('handles empty file', () => {
    const result = parseTxt(buf(''), 'empty.txt');
    expect(result.text).toBe('');
    expect(result.pageCount).toBe(1);
  });

  it('handles UTF-8 characters correctly', () => {
    const content = 'Héllo Wörld 日本語';
    const result = parseTxt(buf(content), 'unicode.txt');
    expect(result.text).toBe(content);
  });
});

describe('parseMarkdown', () => {
  it('strips heading markers', () => {
    const result = parseMarkdown(buf('# Heading 1\n## Heading 2\n### Sub'), 'doc.md');
    expect(result.text).not.toContain('#');
    expect(result.text).toContain('Heading 1');
    expect(result.text).toContain('Heading 2');
    expect(result.text).toContain('Sub');
  });

  it('strips bold syntax', () => {
    const result = parseMarkdown(buf('This is **bold** text'), 'doc.md');
    expect(result.text).toContain('bold');
    expect(result.text).not.toContain('**');
  });

  it('strips italic syntax', () => {
    const result = parseMarkdown(buf('This is *italic* text'), 'doc.md');
    expect(result.text).toContain('italic');
    expect(result.text).not.toContain('*italic*');
  });

  it('strips inline code syntax', () => {
    const result = parseMarkdown(buf('Use `npm install` to install'), 'doc.md');
    expect(result.text).toContain('npm install');
    expect(result.text).not.toContain('`');
  });

  it('strips code blocks', () => {
    const result = parseMarkdown(buf('Before\n```\nconst x = 1;\n```\nAfter'), 'doc.md');
    expect(result.text).not.toContain('```');
    expect(result.text).not.toContain('const x');
    expect(result.text).toContain('Before');
    expect(result.text).toContain('After');
  });

  it('strips links but keeps link text', () => {
    const result = parseMarkdown(buf('Visit [Google](https://google.com) now'), 'doc.md');
    expect(result.text).toContain('Google');
    expect(result.text).not.toContain('https://google.com');
  });

  it('strips images but keeps alt text', () => {
    const result = parseMarkdown(buf('![Alt text](image.png)'), 'doc.md');
    expect(result.text).toContain('Alt text');
    expect(result.text).not.toContain('image.png');
  });

  it('strips blockquote markers', () => {
    const result = parseMarkdown(buf('> This is a quote'), 'doc.md');
    expect(result.text).toContain('This is a quote');
    expect(result.text).not.toContain('>');
  });

  it('strips strikethrough syntax', () => {
    const result = parseMarkdown(buf('~~deleted~~'), 'doc.md');
    expect(result.text).toContain('deleted');
    expect(result.text).not.toContain('~~');
  });

  it('always reports pageCount of 1', () => {
    const result = parseMarkdown(buf('# Title\nSome text.'), 'doc.md');
    expect(result.pageCount).toBe(1);
  });

  it('trims leading and trailing whitespace', () => {
    const result = parseMarkdown(buf('  \n\n# Title\n\n  '), 'doc.md');
    expect(result.text).toBe('Title');
  });
});

describe('parseHtml', () => {
  it('strips HTML tags', () => {
    const result = parseHtml(buf('<h1>Title</h1><p>Paragraph</p>'), 'page.html');
    expect(result.text).not.toContain('<h1>');
    expect(result.text).not.toContain('<p>');
    expect(result.text).toContain('Title');
    expect(result.text).toContain('Paragraph');
  });

  it('removes <script> blocks entirely', () => {
    const result = parseHtml(buf('<p>Text</p><script>alert("xss")</script><p>More</p>'), 'page.html');
    expect(result.text).not.toContain('alert');
    expect(result.text).not.toContain('xss');
    expect(result.text).toContain('Text');
    expect(result.text).toContain('More');
  });

  it('removes <style> blocks entirely', () => {
    const result = parseHtml(buf('<style>body{color:red}</style><p>Hello</p>'), 'page.html');
    expect(result.text).not.toContain('color:red');
    expect(result.text).toContain('Hello');
  });

  it('decodes &amp; entity', () => {
    const result = parseHtml(buf('<p>Fish &amp; Chips</p>'), 'page.html');
    expect(result.text).toContain('Fish & Chips');
  });

  it('decodes &lt; and &gt; entities', () => {
    const result = parseHtml(buf('<p>a &lt; b &gt; c</p>'), 'page.html');
    expect(result.text).toContain('a < b > c');
  });

  it('decodes &quot; entity', () => {
    const result = parseHtml(buf('<p>Say &quot;hello&quot;</p>'), 'page.html');
    expect(result.text).toContain('"hello"');
  });

  it('decodes &#39; entity', () => {
    const result = parseHtml(buf("<p>It&#39;s fine</p>"), 'page.html');
    expect(result.text).toContain("It's fine");
  });

  it('decodes &nbsp; entity', () => {
    const result = parseHtml(buf('<p>Hello&nbsp;World</p>'), 'page.html');
    expect(result.text).toContain('Hello World');
  });

  it('always reports pageCount of 1', () => {
    const result = parseHtml(buf('<html><body><p>Content</p></body></html>'), 'page.html');
    expect(result.pageCount).toBe(1);
  });

  it('trims leading and trailing whitespace', () => {
    const result = parseHtml(buf('  <p>Hello</p>  '), 'page.html');
    expect(result.text.startsWith(' ')).toBe(false);
    expect(result.text.endsWith(' ')).toBe(false);
  });

  it('handles empty HTML document', () => {
    const result = parseHtml(buf(''), 'empty.html');
    expect(result.text).toBe('');
    expect(result.pageCount).toBe(1);
  });
});

describe('textResultToDoclingOutput', () => {
  it('converts result to DoclingOutput with correct structure', () => {
    const result = { text: 'Hello world', pageCount: 1 };
    const output = textResultToDoclingOutput(result, 'test.txt');

    expect(output.filename).toBe('test.txt');
    expect(output.total_pages).toBe(1);
    expect(output.pages).toHaveLength(1);
  });

  it('wraps text in a single section on page 1', () => {
    const result = { text: 'Document content here', pageCount: 1 };
    const output = textResultToDoclingOutput(result, 'doc.txt');

    const page = output.pages[0]!;
    expect(page.page_number).toBe(1);
    expect(page.sections).toHaveLength(1);
    expect(page.sections[0]!.text).toBe('Document content here');
    expect(page.sections[0]!.title).toBeNull();
    expect(page.sections[0]!.bbox).toBeNull();
  });

  it('sets tables to an empty array', () => {
    const result = { text: 'Some text', pageCount: 1 };
    const output = textResultToDoclingOutput(result, 'file.txt');

    expect(output.pages[0]!.tables).toEqual([]);
  });

  it('uses the correct filename', () => {
    const result = { text: 'Content', pageCount: 1 };
    const output = textResultToDoclingOutput(result, 'my-file.md');

    expect(output.filename).toBe('my-file.md');
  });

  it('uses pageCount as total_pages', () => {
    // Even though text parser always returns pageCount=1, the conversion should be faithful
    const result = { text: 'Content', pageCount: 3 };
    const output = textResultToDoclingOutput(result, 'multi.txt');

    expect(output.total_pages).toBe(3);
  });

  it('handles empty text content', () => {
    const result = { text: '', pageCount: 1 };
    const output = textResultToDoclingOutput(result, 'empty.txt');

    expect(output.pages[0]!.sections[0]!.text).toBe('');
  });
});
