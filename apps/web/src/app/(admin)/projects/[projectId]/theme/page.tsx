import { createDatabase, projectQueries, themeQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { ThemeEditor } from './theme-editor';

export const dynamic = 'force-dynamic';

export default async function ThemePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getUserId();
  const db = createDatabase();

  const result = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!result) notFound();
  const project = result.project;

  const theme = await themeQueries(db).findByProjectId(projectId);

  // Resolve logoUrl for display
  const rawLogoUrl = theme?.logoUrl ?? null;
  const logoUrl = rawLogoUrl?.startsWith('storage:')
    ? `/api/projects/${projectId}/avatar`
    : rawLogoUrl;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Theme</h1>
        <p className="text-muted-foreground mt-1">Customize the look and feel of your public chatbot.</p>
      </div>
      <ThemeEditor
        projectId={projectId}
        projectName={project.name}
        theme={theme ? {
          primaryColor: theme.primaryColor,
          backgroundColor: theme.backgroundColor,
          fontFamily: theme.fontFamily,
          welcomeMessage: theme.welcomeMessage,
          logoUrl,
          borderRadius: theme.borderRadius,
          actionButtonLabel: theme.actionButtonLabel,
          suggestedQuestions: (theme.suggestedQuestions as string[]) ?? [],
          translations: (theme.translations as Record<string, Record<string, unknown>>) ?? {},
        } : null}
      />
    </div>
  );
}
