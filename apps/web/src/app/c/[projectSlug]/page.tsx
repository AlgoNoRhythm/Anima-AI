import { createDatabase, projectQueries, personalityQueries, themeQueries, documentQueries, feedbackConfigQueries } from '@anima-ai/database';
import { createCacheClient, getCachedPageData, setCachedPageData } from '@anima-ai/cache';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChatClient } from './chat-client';
import { resolveLocale, getUITranslations, resolveField } from '@/lib/locale';

export const dynamic = 'force-dynamic';

interface CachedPageData {
  project: Record<string, unknown>;
  personality: Record<string, unknown> | null;
  theme: Record<string, unknown> | null;
  allDocuments: Array<Record<string, unknown>>;
  feedbackConfigRow: Record<string, unknown> | null;
}

async function loadPageData(projectSlug: string, locale: string): Promise<CachedPageData | null> {
  const cache = createCacheClient();
  const cached = await getCachedPageData<CachedPageData>(cache, projectSlug, locale);
  if (cached) return cached;

  const db = createDatabase();
  const project = await projectQueries(db).findBySlug(projectSlug);
  if (!project) return null;

  const [personality, theme, allDocuments, feedbackConfigRow] = await Promise.all([
    personalityQueries(db).findByProjectId(project.id),
    themeQueries(db).findByProjectId(project.id),
    documentQueries(db).findByProjectId(project.id),
    feedbackConfigQueries(db).findByProjectId(project.id),
  ]);

  const data: CachedPageData = {
    project: project as unknown as Record<string, unknown>,
    personality: personality as Record<string, unknown> | null,
    theme: theme as Record<string, unknown> | null,
    allDocuments: allDocuments as unknown as Array<Record<string, unknown>>,
    feedbackConfigRow: feedbackConfigRow as Record<string, unknown> | null,
  };

  await setCachedPageData(cache, projectSlug, locale, data);
  return data;
}

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
  searchParams,
}: {
  params: Promise<{ projectSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectSlug } = await params;
  const locale = await resolveLocale(searchParams);
  const t = getUITranslations(locale);

  const pageData = await loadPageData(projectSlug, locale);
  if (!pageData) notFound();

  // Cache returns serialized JSON — use `any` for cached data shapes
  const project = pageData.project as any;
  const personality = pageData.personality as any;
  const theme = pageData.theme as any;
  const allDocuments = pageData.allDocuments as any[];
  const feedbackConfigRow = pageData.feedbackConfigRow as any;

  // Only show completed (fully indexed) documents
  const documents = allDocuments
    .filter((d) => d.status === 'completed')
    .map((d) => ({ id: d.id, title: d.title || d.filename, totalPages: d.totalPages ?? 0 }));

  // Theme-level suggested questions take priority, then fall back to personality guardrails
  const themeSuggestions = Array.isArray(theme?.suggestedQuestions) && (theme.suggestedQuestions as string[]).length > 0
    ? (theme.suggestedQuestions as string[])
    : null;
  const guardrails = personality?.guardrails as Record<string, unknown> | null;
  const suggestedQuestions = themeSuggestions
    ?? (Array.isArray(guardrails?.suggestedQuestions)
      ? (guardrails.suggestedQuestions as string[])
      : undefined);

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

  // Resolve translatable DB fields
  const themeTranslations = (theme?.translations ?? {}) as Record<string, Record<string, unknown>>;
  const personalityTranslations = (personality?.translations ?? {}) as Record<string, Record<string, unknown>>;

  // Resolve personality name with locale
  const rawPersonalityName = entityName || personality?.name || project.name;
  const displayName = resolveField(rawPersonalityName, personalityTranslations, locale, 'name');

  // Build welcome message: use custom if set, otherwise default to "Hi! I'm {name}"
  const rawWelcomeMessage = theme?.welcomeMessage
    ? theme.welcomeMessage
    : `Hi! I'm ${rawPersonalityName}`;
  const welcomeMessage = resolveField(rawWelcomeMessage, themeTranslations, locale, 'welcomeMessage');

  // Resolve action button label
  const actionButtonLabel = resolveField(
    theme?.actionButtonLabel ?? 'Open PDF',
    themeTranslations,
    locale,
    'actionButtonLabel',
  );

  // Resolve suggested questions
  const resolvedSuggestions = resolveField(
    suggestedQuestions ?? [],
    themeTranslations,
    locale,
    'suggestedQuestions',
  );

  // Resolve disclaimer text
  const disclaimerText = resolveField(
    personality?.disclaimerText ?? 'AI-generated responses may contain inaccuracies. Please verify important information.',
    personalityTranslations,
    locale,
    'disclaimerText',
  );

  // Build feedback config for the chat client
  const feedbackTranslations = (feedbackConfigRow?.translations ?? {}) as Record<string, Record<string, unknown>>;
  const feedbackConfig = feedbackConfigRow?.enabled
    ? {
        enabled: true as const,
        ratings: ((feedbackConfigRow.ratings as Array<{ id: string; label: string; required: boolean }>) ?? []).map((r) => ({
          ...r,
          label: resolveField(r.label, feedbackTranslations, locale, 'ratingLabels') !== r.label
            ? (((feedbackTranslations[locale] as Record<string, unknown> | undefined)?.ratingLabels as Record<string, string> | undefined)?.[r.id] ?? r.label)
            : r.label,
        })),
        questions: ((feedbackConfigRow.questions as Array<{ id: string; label: string; type: 'text'; required: boolean }>) ?? []).map((q) => ({
          ...q,
          label: (((feedbackTranslations[locale] as Record<string, unknown> | undefined)?.questionLabels as Record<string, string> | undefined)?.[q.id] ?? q.label),
        })),
        submitButtonLabel: resolveField(feedbackConfigRow.submitButtonLabel, feedbackTranslations, locale, 'submitButtonLabel'),
        thankYouMessage: resolveField(feedbackConfigRow.thankYouMessage, feedbackTranslations, locale, 'thankYouMessage'),
      }
    : null;

  return (
    <ChatClient
      projectSlug={projectSlug}
      projectName={project.name}
      welcomeMessage={welcomeMessage}
      personality={personality ? { name: displayName } : entityName ? { name: displayName } : undefined}
      suggestedQuestions={resolvedSuggestions as string[]}
      logoUrl={logoUrl}
      primaryColor={theme?.primaryColor ?? '#eab308'}
      backgroundColor={theme?.backgroundColor ?? '#fffdf9'}
      fontFamily={theme?.fontFamily ?? undefined}
      borderRadius={theme?.borderRadius ?? undefined}
      showDisclaimer={personality?.showDisclaimer ?? true}
      disclaimerText={disclaimerText}
      documents={documents}
      actionButtonLabel={actionButtonLabel}
      mode={(project.mode as 'chat' | 'pdf' | 'both') ?? 'both'}
      feedbackConfig={feedbackConfig}
      t={t}
      locale={locale}
    />
  );
}
