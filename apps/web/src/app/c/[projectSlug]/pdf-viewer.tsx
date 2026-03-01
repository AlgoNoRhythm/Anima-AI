'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// Self-hosted worker — avoids CDN issues and webpack Node canvas resolution
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerOverlayProps {
  url: string;
  title: string;
  initialPage?: number;
  highlightText?: string;
  onClose: () => void;
}

/**
 * Walk the text layer DOM and wrap any occurrence of `search` in a <mark>.
 * Works on the rendered <span> elements produced by react-pdf's text layer.
 */
function highlightTextInLayer(container: HTMLElement, search: string) {
  if (!search || search.length < 8) return; // skip very short strings to avoid noise

  const textLayer = container.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) return;

  // Normalize the search text: collapse whitespace
  const needle = search.replace(/\s+/g, ' ').trim().toLowerCase();
  // Take first ~120 chars for matching (long citations may span elements)
  const shortNeedle = needle.slice(0, 120);

  const spans = Array.from(textLayer.querySelectorAll('span'));
  // Build a concatenated text with span boundaries for substring matching
  const parts: { span: HTMLSpanElement; start: number; text: string }[] = [];
  let concat = '';
  for (const span of spans) {
    const text = span.textContent ?? '';
    parts.push({ span, start: concat.length, text });
    concat += text.toLowerCase();
  }

  const matchIdx = concat.indexOf(shortNeedle);
  if (matchIdx === -1) return;

  // Highlight all spans that overlap with the match range
  const matchEnd = matchIdx + shortNeedle.length;
  for (const part of parts) {
    const partEnd = part.start + part.text.length;
    if (part.start < matchEnd && partEnd > matchIdx) {
      part.span.style.backgroundColor = 'rgba(234, 179, 8, 0.35)';
      part.span.style.borderRadius = '2px';
    }
  }
}

export function PdfViewerOverlay({ url, title, initialPage = 1, highlightText, onClose }: PdfViewerOverlayProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width for responsive page rendering
  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  const onPageRenderSuccess = useCallback(() => {
    if (highlightText && containerRef.current) {
      // Small delay to ensure text layer spans are in DOM
      requestAnimationFrame(() => {
        if (containerRef.current) {
          highlightTextInLayer(containerRef.current, highlightText);
        }
      });
    }
  }, [highlightText]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close PDF viewer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{title}</p>
          {numPages > 0 && (
            <p className="text-xs text-white/50">Page {pageNumber} of {numPages}</p>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div ref={containerRef} className="flex-1 overflow-auto overscroll-contain bg-neutral-800">
        {containerWidth > 0 && (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-64 text-white/60 gap-2">
                <p className="text-sm">Failed to load PDF</p>
                <button type="button" onClick={onClose} className="text-xs text-white/40 underline">
                  Close
                </button>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={containerWidth}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              onRenderSuccess={onPageRenderSuccess}
              loading={
                <div className="flex items-center justify-center h-64">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              }
            />
          </Document>
        )}
      </div>

      {/* Page navigation */}
      {numPages > 1 && (
        <div
          className="flex items-center justify-center gap-6 py-3 bg-neutral-900 shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-default"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-white/70 tabular-nums">
            {pageNumber} / {numPages}
          </span>
          <button
            type="button"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-default"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
