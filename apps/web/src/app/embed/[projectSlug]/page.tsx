import { createDatabase, projectQueries, personalityQueries, themeQueries } from '@anima-ai/database';
import { notFound } from 'next/navigation';
import { EmbedChat } from './embed-chat';

export const dynamic = 'force-dynamic';

export default async function EmbedProjectPage({
  params,
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;
  const db = createDatabase();

  const project = await projectQueries(db).findBySlug(projectSlug);
  if (!project) notFound();

  const [personality, theme] = await Promise.all([
    personalityQueries(db).findByProjectId(project.id),
    themeQueries(db).findByProjectId(project.id),
  ]);

  // Extract suggested questions from personality guardrails if available
  const guardrails = personality?.guardrails as Record<string, unknown> | null;
  const suggestedQuestions = Array.isArray(guardrails?.suggestedQuestions)
    ? (guardrails.suggestedQuestions as string[])
    : undefined;

  // Resolve logoUrl: storage:-prefixed values go through the avatar API route
  const rawLogoUrl = theme?.logoUrl ?? null;
  const logoUrl = rawLogoUrl?.startsWith('storage:')
    ? `/api/projects/${project.id}/avatar`
    : rawLogoUrl;

  // Build welcome message: use custom if set, otherwise default to "Hi! I'm {name}"
  const displayName = personality?.name || project.name;
  const welcomeMessage = theme?.welcomeMessage
    ? theme.welcomeMessage
    : `Hi! I'm ${displayName}`;

  if (project.mode === 'pdf') {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center p-8">
          <p className="text-lg font-medium">{project.name}</p>
          <p className="text-sm text-muted-foreground mt-1">This project is configured for document viewing only.</p>
        </div>
      </div>
    );
  }

  return (
    <EmbedChat
      projectSlug={projectSlug}
      projectName={project.name}
      welcomeMessage={welcomeMessage}
      personality={personality ? { name: personality.name } : undefined}
      suggestedQuestions={suggestedQuestions}
      logoUrl={logoUrl}
      primaryColor={theme?.primaryColor ?? undefined}
    />
  );
}
