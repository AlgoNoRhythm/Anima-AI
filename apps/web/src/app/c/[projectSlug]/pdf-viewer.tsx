'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, X, List } from 'lucide-react';
import type { ChatUITranslations } from '@/lib/locale/types';

// Self-hosted worker — avoids CDN issues and webpack Node canvas resolution
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface StackedDocument {
  id: string;
  title: string;
  totalPages: number;
  url: string;
}

interface PdfViewerOverlayProps {
  documents: StackedDocument[];
  initialAbsolutePage?: number;
  highlightText?: string;
  onClose: () => void;
  t?: ChatUITranslations;
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

export function PdfViewerOverlay({ documents, initialAbsolutePage = 1, highlightText, onClose, t }: PdfViewerOverlayProps) {
  const [absolutePage, setAbsolutePage] = useState(initialAbsolutePage);
  const [confirmedCounts, setConfirmedCounts] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const doc of documents) {
      m.set(doc.id, doc.totalPages);
    }
    return m;
  });
  const [tocOpen, setTocOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build offset map: for each document, cumulative start page (1-indexed)
  const { offsetMap, totalPages } = useMemo(() => {
    const map: { docIndex: number; startPage: number; pageCount: number }[] = [];
    let cumulative = 0;
    for (let i = 0; i < documents.length; i++) {
      const count = confirmedCounts.get(documents[i]!.id) || 0;
      map.push({ docIndex: i, startPage: cumulative + 1, pageCount: count });
      cumulative += count;
    }
    return { offsetMap: map, totalPages: cumulative };
  }, [documents, confirmedCounts]);

  // Derive which document is active and the page within that document
  const { activeDocIndex, pageWithinDoc } = useMemo(() => {
    for (let i = offsetMap.length - 1; i >= 0; i--) {
      const entry = offsetMap[i]!;
      if (absolutePage >= entry.startPage) {
        return { activeDocIndex: i, pageWithinDoc: absolutePage - entry.startPage + 1 };
      }
    }
    return { activeDocIndex: 0, pageWithinDoc: 1 };
  }, [absolutePage, offsetMap]);

  const activeDoc = documents[activeDocIndex]!;

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

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setConfirmedCounts((prev) => {
        if (prev.get(activeDoc.id) === n) return prev;
        const next = new Map(prev);
        next.set(activeDoc.id, n);
        return next;
      });
    },
    [activeDoc.id],
  );

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

  const hasMultipleDocs = documents.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={t?.closePdfViewer ?? 'Close PDF viewer'}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{activeDoc.title}</p>
          {totalPages > 0 && (
            <p className="text-xs text-white/50">{(t?.pageXOfY ?? 'Page {x} of {y}').replace('{x}', String(absolutePage)).replace('{y}', String(totalPages))}</p>
          )}
        </div>
        {hasMultipleDocs && (
          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t?.tableOfContents ?? 'Table of contents'}
          >
            <List className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* PDF Content */}
      <div ref={containerRef} className="flex-1 overflow-auto overscroll-contain bg-neutral-800 relative">
        {containerWidth > 0 && (
          <Document
            key={activeDoc.id}
            file={activeDoc.url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-64 text-white/60 gap-2">
                <p className="text-sm">{t?.failedToLoadPdf ?? 'Failed to load PDF'}</p>
                <button type="button" onClick={onClose} className="text-xs text-white/40 underline">
                  {t?.close ?? 'Close'}
                </button>
              </div>
            }
          >
            <Page
              pageNumber={pageWithinDoc}
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

        {/* TOC Bottom Sheet */}
        {tocOpen && hasMultipleDocs && (
          <>
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50 z-10"
              onClick={() => setTocOpen(false)}
              aria-label={t?.close ?? 'Close table of contents'}
            />
            {/* Sheet */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-neutral-900 rounded-t-2xl max-h-[60vh] overflow-y-auto animate-sheet-up">
              <div className="sticky top-0 bg-neutral-900 px-4 pt-4 pb-2 border-b border-white/10">
                <p className="text-sm font-medium text-white">{t?.documents ?? 'Documents'}</p>
              </div>
              <div className="px-2 py-2 space-y-1">
                {documents.map((doc, i) => {
                  const entry = offsetMap[i]!;
                  const endPage = entry.startPage + entry.pageCount - 1;
                  const isActive = i === activeDocIndex;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setAbsolutePage(entry.startPage);
                        setTocOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {(t?.pagesRange ?? 'Pages {start}–{end}').replace('{start}', String(entry.startPage)).replace('{end}', String(endPage > 0 ? endPage : entry.startPage))}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-6 py-3 bg-neutral-900 shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            disabled={absolutePage <= 1}
            onClick={() => setAbsolutePage((p) => p - 1)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-default"
            aria-label={t?.previousPage ?? 'Previous page'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-white/70 tabular-nums">
            {absolutePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={absolutePage >= totalPages}
            onClick={() => setAbsolutePage((p) => p + 1)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-default"
            aria-label={t?.nextPage ?? 'Next page'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
