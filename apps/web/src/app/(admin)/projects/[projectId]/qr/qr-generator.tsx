'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { saveQrConfig } from '@/lib/actions/qr';

const QR_COLOR_PRESETS = [
  '#000000', '#1e293b', '#334155', '#475569',
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
  '#ffffff', '#fef3c7', '#dbeafe', '#f3e8ff',
];

function QrColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [hexInput, setHexInput] = useState(value);
  const prevValue = useRef(value);
  if (prevValue.current !== value) {
    prevValue.current = value;
    setHexInput(value);
  }

  function isLight(hex: string): boolean {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return false;
    const r = parseInt(m[1]!, 16);
    const g = parseInt(m[2]!, 16);
    const b = parseInt(m[3]!, 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="grid grid-cols-8 gap-1.5 mb-2.5">
        {QR_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="group relative w-full aspect-square rounded-md border-2 transition-all duration-150 hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: value.toLowerCase() === color.toLowerCase()
                ? 'hsl(var(--foreground))'
                : color === '#ffffff' || color === '#f8fafc' || color === '#f1f5f9' || color === '#e2e8f0'
                  ? 'hsl(var(--border))'
                  : 'transparent',
            }}
            title={color}
          >
            {value.toLowerCase() === color.toLowerCase() && (
              <svg
                className="absolute inset-0 m-auto w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isLight(color) ? '#000' : '#fff'}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-lg border border-border shadow-sm flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            const v = e.target.value;
            setHexInput(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(hexInput)) setHexInput(value);
          }}
          className="h-9 w-24 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-mono shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={7}
          placeholder="#000000"
        />
        <button
          type="button"
          onClick={() => nativeRef.current?.click()}
          className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground transition-all"
        >
          Custom
        </button>
        <input
          ref={nativeRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
    </div>
  );
}

type DotType = 'square' | 'dots' | 'rounded';
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

interface QRGeneratorProps {
  projectId: string;
  projectSlug: string;
  initialConfig?: Record<string, unknown> | null;
  lanIp?: string | null;
}

const DOT_STYLE_MAP: Record<DotType, string> = {
  square: 'square',
  dots: 'dots',
  rounded: 'rounded',
};

export function QRGenerator({ projectId, projectSlug, initialConfig, lanIp }: QRGeneratorProps) {
  const [dotStyle, setDotStyle] = useState<DotType>(
    (initialConfig?.dotStyle as DotType) ?? 'square',
  );
  const [dotColor, setDotColor] = useState<string>(
    (initialConfig?.dotColor as string) ?? '#000000',
  );
  const [bgColor, setBgColor] = useState<string>(
    (initialConfig?.bgColor as string) ?? '#ffffff',
  );
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>(
    (initialConfig?.errorCorrection as ErrorCorrectionLevel) ?? 'M',
  );
  const [size, setSize] = useState<number>(
    (initialConfig?.size as number) ?? 300,
  );
  const [title, setTitle] = useState<string>(
    (initialConfig?.title as string) ?? 'Scan and chat with me!',
  );
  const [subtitle, setSubtitle] = useState<string>(
    (initialConfig?.subtitle as string) ?? 'Or have a look at the manual',
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const QRCodeStylingRef = useRef<any>(null);

  const getChatUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const { hostname, port, protocol } = window.location;
    // On localhost, substitute the LAN IP so phones can reach the dev server
    if (lanIp && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      const portSuffix = port ? `:${port}` : '';
      return `${protocol}//${lanIp}${portSuffix}/c/${projectSlug}`;
    }
    return `${window.location.origin}/c/${projectSlug}`;
  }, [projectSlug, lanIp]);

  // Dynamically import QRCodeStyling, then auto-generate
  useEffect(() => {
    let mounted = true;

    async function loadQRCodeStyling() {
      const mod = await import('qr-code-styling');
      if (mounted) {
        QRCodeStylingRef.current = mod.default;
        setReady(true);
      }
    }

    loadQRCodeStyling();

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-generate/update QR whenever ready or settings change
  useEffect(() => {
    if (!ready || !QRCodeStylingRef.current || !qrRef.current) return;

    const opts = {
      width: size,
      height: size,
      data: getChatUrl(),
      type: 'svg' as const,
      dotsOptions: {
        color: dotColor,
        type: DOT_STYLE_MAP[dotStyle],
      },
      backgroundOptions: {
        color: bgColor,
      },
      cornersSquareOptions: {
        type: dotStyle === 'rounded' ? 'extra-rounded' as const : 'square' as const,
      },
      cornersDotOptions: {
        type: dotStyle === 'dots' ? 'dot' as const : 'square' as const,
      },
      qrOptions: {
        errorCorrectionLevel: errorCorrection,
      },
    };

    if (qrInstanceRef.current) {
      qrInstanceRef.current.update(opts);
    } else {
      const QRCodeStyling = QRCodeStylingRef.current;
      const qrCode = new QRCodeStyling(opts);
      qrRef.current.innerHTML = '';
      qrCode.append(qrRef.current);
      qrInstanceRef.current = qrCode;
    }
  }, [ready, dotStyle, dotColor, bgColor, errorCorrection, size, getChatUrl]);

  const handleDownloadSVG = useCallback(() => {
    if (!qrInstanceRef.current) return;
    qrInstanceRef.current.download({
      name: `qr-${projectSlug}`,
      extension: 'svg',
    });
  }, [projectSlug]);

  const handleDownloadPNG = useCallback(() => {
    if (!qrInstanceRef.current) return;
    qrInstanceRef.current.download({
      name: `qr-${projectSlug}`,
      extension: 'png',
    });
  }, [projectSlug]);

  const handleSaveConfig = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);

    const config: Record<string, unknown> = {
      dotStyle,
      dotColor,
      bgColor,
      errorCorrection,
      size,
      title,
      subtitle,
    };

    const result = await saveQrConfig(projectId, config);

    if (result.success) {
      setSaveMessage('Configuration saved.');
    } else {
      setSaveMessage(result.error ?? 'Failed to save configuration.');
    }

    setSaving(false);
    setTimeout(() => setSaveMessage(null), 3000);
  }, [projectId, dotStyle, dotColor, bgColor, errorCorrection, size, title, subtitle]);

  const selectClasses =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10">
      {/* Settings — left side */}
      <div className="space-y-8">
        {/* Text */}
        <section>
          <h3 className="text-sm font-semibold mb-4">Text</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Scan and chat with me!"
                className={selectClasses}
                maxLength={60}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Or have a look at the manual"
                className={selectClasses}
                maxLength={100}
              />
            </div>
          </div>
        </section>

        {/* Style */}
        <section className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4">Style</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1.5">Dot Pattern</label>
              <select
                className={selectClasses}
                value={dotStyle}
                onChange={(e) => setDotStyle(e.target.value as DotType)}
              >
                <option value="square">Square</option>
                <option value="dots">Dots</option>
                <option value="rounded">Rounded</option>
              </select>
            </div>

            <QrColorPicker
              label="Dot Color"
              value={dotColor}
              onChange={setDotColor}
            />
            <QrColorPicker
              label="Background"
              value={bgColor}
              onChange={setBgColor}
            />
          </div>
        </section>

        {/* Advanced */}
        <section className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4">Advanced</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Error Correction</label>
              <select
                className={selectClasses}
                value={errorCorrection}
                onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrectionLevel)}
              >
                <option value="L">Low</option>
                <option value="M">Medium</option>
                <option value="Q">Quartile</option>
                <option value="H">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Size</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={200}
                  max={600}
                  step={50}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-mono text-muted-foreground w-14 text-right">
                  {size}px
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* URL */}
        <section className="border-t pt-6">
          <div className="rounded-lg border bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Chat URL (encoded in QR)</p>
            <p className="text-sm font-mono truncate">
              {getChatUrl() || `/c/${projectSlug}`}
            </p>
          </div>
        </section>

        {/* Save */}
        <div className="sticky bottom-4 pt-2 flex flex-col gap-2">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? 'Saving...' : 'Save Config'}
          </button>
          {saveMessage && (
            <p className="text-sm text-center text-muted-foreground animate-fade-in">
              {saveMessage}
            </p>
          )}
        </div>
      </div>

      {/* Preview — right side, sticky */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/40">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
            </div>
            <span className="text-[10px] text-muted-foreground/60 ml-2">QR Preview</span>
          </div>

          {/* QR display area */}
          <div className="flex flex-col items-center justify-center p-8 min-h-[400px] bg-background">
            {ready ? (
              <>
                {title && (
                  <h2 className="text-xl font-bold mb-1 text-center">{title}</h2>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground mb-4 text-center">{subtitle}</p>
                )}
                <div
                  ref={qrRef}
                  className="flex items-center justify-center"
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleDownloadSVG}
                    className="rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition-all duration-200 hover:bg-accent active:scale-[0.98]"
                  >
                    Download SVG
                  </button>
                  <button
                    onClick={handleDownloadPNG}
                    className="rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition-all duration-200 hover:bg-accent active:scale-[0.98]"
                  >
                    Download PNG
                  </button>
                </div>
              </>
            ) : (
              <>
                <div ref={qrRef} className="hidden" />
                <div className="w-48 h-48 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center mb-4">
                  <svg
                    className="w-12 h-12 text-muted-foreground/30 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Loading QR generator...</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
