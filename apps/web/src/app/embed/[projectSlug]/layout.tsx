import type { Viewport } from 'next';
import '@anima-ai/ui/globals.css';
import { createDatabase, projectQueries, themeQueries } from '@anima-ai/database';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

/**
 * Validates that a value is a CSS color (hex, rgb, rgba, hsl, hsla, or named).
 * Returns the value if valid, or the fallback if not.
 */
function sanitizeColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*[\d.]+)?\s*\)$/.test(trimmed)) {
    return trimmed;
  }
  if (/^hsla?\(\s*\d{1,3}\s*,\s*[\d.]+%\s*,\s*[\d.]+%(\s*,\s*[\d.]+)?\s*\)$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

/**
 * Sanitizes a font-family value. Strips dangerous patterns and restricts
 * to safe characters used in font names.
 */
function sanitizeFontFamily(value: string, fallback: string): string {
  const stripped = value
    .replace(/<\/style>/gi, '')
    .replace(/<script[\s\S]*?>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(/gi, '')
    .replace(/<[^>]*>/g, '');

  if (/^[a-zA-Z0-9 ,'"_\-./]+$/.test(stripped.trim())) {
    return stripped.trim();
  }
  return fallback;
}

export default async function EmbedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;
  const db = createDatabase();

  const project = await projectQueries(db).findBySlug(projectSlug);
  const theme = project
    ? await themeQueries(db).findByProjectId(project.id)
    : null;

  const primaryColor = sanitizeColor(theme?.primaryColor ?? '', '#eab308');
  const backgroundColor = sanitizeColor(theme?.backgroundColor ?? '', '#ffffff');
  const fontFamily = sanitizeFontFamily(theme?.fontFamily ?? '', 'Inter, system-ui, sans-serif');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --embed-primary: ${primaryColor};
                --embed-bg: ${backgroundColor};
                --embed-font: ${fontFamily};
              }
            `,
          }}
        />
      </head>
      <body
        className="bg-background font-sans antialiased"
        style={{
          fontFamily,
          margin: 0,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {children}
      </body>
    </html>
  );
}
