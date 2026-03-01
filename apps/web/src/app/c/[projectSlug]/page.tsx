import { createDatabase, projectQueries, personalityQueries, themeQueries, documentQueries } from '@anima-ai/database';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChatClient } from './chat-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectSlug: string }>;
}): Promise<Metadata> {
  const { projectSlug } = await params;
  const db = createDatabase();
  const project = await projectQueries(db).findBySlug(projectSlug);

  if (!project) {
    return {
      title: 'Not Found | Anima AI',
    };
  }

  const title = `${project.name} | Anima AI`;
  const description = project.description
    ? project.description
    : `Chat with ${project.name} — powered by Anima AI`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;
  const db = createDatabase();

  const project = await projectQueries(db).findBySlug(projectSlug);
  if (!project) notFound();

  const [personality, theme, allDocuments] = await Promise.all([
    personalityQueries(db).findByProjectId(project.id),
    themeQueries(db).findByProjectId(project.id),
    documentQueries(db).findByProjectId(project.id),
  ]);

  // Only show completed (fully indexed) documents
  const documents = allDocuments
    .filter((d) => d.status === 'completed')
    .map((d) => ({ id: d.id, title: d.title || d.filename }));

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

  // Prefer detected entity name from the first completed document
  let entityName: string | null = null;
  for (const doc of allDocuments) {
    if (doc.detectedEntity) {
      entityName = doc.detectedEntity;
      break;
    }
  }

  // Build welcome message: use custom if set, otherwise default to "Hi! I'm {name}"
  const displayName = entityName || personality?.name || project.name;
  const welcomeMessage = theme?.welcomeMessage
    ? theme.welcomeMessage
    : `Hi! I'm ${displayName}`;

  return (
    <ChatClient
      projectSlug={projectSlug}
      projectName={project.name}
      welcomeMessage={welcomeMessage}
      personality={personality ? { name: entityName || personality.name } : entityName ? { name: entityName } : undefined}
      suggestedQuestions={suggestedQuestions}
      logoUrl={logoUrl}
      primaryColor={theme?.primaryColor ?? '#eab308'}
      backgroundColor={theme?.backgroundColor ?? '#fffdf9'}
      fontFamily={theme?.fontFamily ?? undefined}
      borderRadius={theme?.borderRadius ?? undefined}
      showDisclaimer={personality?.showDisclaimer ?? true}
      disclaimerText={personality?.disclaimerText ?? 'AI-generated responses may contain inaccuracies. Please verify important information.'}
      documents={documents}
      actionButtonLabel={theme?.actionButtonLabel ?? 'Open PDF'}
      mode={(project.mode as 'chat' | 'pdf' | 'both') ?? 'both'}
    />
  );
}
