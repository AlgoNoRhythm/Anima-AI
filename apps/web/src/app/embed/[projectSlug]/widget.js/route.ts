import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  const { projectSlug } = await params;
  const origin = request.nextUrl.origin;
  const embedUrl = `${origin}/embed/${projectSlug}`;

  const js = `
(function() {
  if (document.getElementById('anima-ai-widget')) return;

  var EMBED_URL = ${JSON.stringify(embedUrl)};

  // Create styles
  var style = document.createElement('style');
  style.textContent = \`
    #anima-ai-widget-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, hsl(43, 74%, 49%), hsl(45, 93%, 58%));
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 99998;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #anima-ai-widget-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    #anima-ai-widget-btn svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    #anima-ai-widget-overlay {
      position: fixed;
      bottom: 88px;
      right: 20px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 108px);
      border: none;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 99999;
      display: none;
    }
    #anima-ai-widget-overlay.open {
      display: block;
    }
    #anima-ai-widget-overlay iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  \`;
  document.head.appendChild(style);

  // Create chat button
  var btn = document.createElement('button');
  btn.id = 'anima-ai-widget-btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  document.body.appendChild(btn);

  // Create overlay container
  var overlay = document.createElement('div');
  overlay.id = 'anima-ai-widget-overlay';
  document.body.appendChild(overlay);

  // Create iframe (lazy load on first open)
  var iframe = null;
  var isOpen = false;

  btn.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.src = EMBED_URL;
        iframe.setAttribute('allow', 'clipboard-write');
        iframe.setAttribute('title', 'Anima AI Chat');
        overlay.appendChild(iframe);
      }
      overlay.classList.add('open');
      btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/></svg>';
    } else {
      overlay.classList.remove('open');
      btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
    }
  });
})();
`.trim();

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
