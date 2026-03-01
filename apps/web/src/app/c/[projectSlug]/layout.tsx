import type { Viewport } from 'next';
import { createDatabase, projectQueries, themeQueries } from '@anima-ai/database';
import { hexToHsl } from '@anima-ai/shared';
import { PublicChatThemeIsolation } from './theme-isolation';

export const dynamic = 'force-dynamic';

/** Prevent iOS Safari auto-zoom on input focus and disable user scaling for app-like feel */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;
  const db = createDatabase();

  const project = await projectQueries(db).findBySlug(projectSlug);
  const theme = project ? await themeQueries(db).findByProjectId(project.id) : null;

  // Determine if theme background is dark (default is light)
  const bgHex = theme?.backgroundColor ?? '#fffdf9';
  const bgHsl = hexToHsl(bgHex);
  const isDark = bgHsl ? parseInt(bgHsl.split('%')[0]!.split(' ').pop()!, 10) <= 60 : false;

  return (
    <PublicChatThemeIsolation isDark={isDark}>
      {children}
    </PublicChatThemeIsolation>
  );
}
