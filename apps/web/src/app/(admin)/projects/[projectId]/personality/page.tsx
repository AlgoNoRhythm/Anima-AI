import { createDatabase, projectQueries, personalityQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { PersonalityForm } from './personality-form';
import { getApiKeyStatus } from '@/lib/actions/api-keys';

export const dynamic = 'force-dynamic';

export default async function PersonalityPage({
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

  const personality = await personalityQueries(db).findByProjectId(projectId);
  const keyStatus = await getApiKeyStatus();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Personality</h1>
        <p className="text-muted-foreground mt-1">Configure how your chatbot behaves and responds.</p>
      </div>
      <PersonalityForm
        projectId={projectId}
        personality={personality ? {
          name: personality.name,
          systemPrompt: personality.systemPrompt,
          tone: personality.tone,
          temperature: personality.temperature,
          modelProvider: personality.modelProvider,
          modelName: personality.modelName,
          guardrails: personality.guardrails as Record<string, unknown>,
          showDisclaimer: personality.showDisclaimer,
          disclaimerText: personality.disclaimerText,
          translations: (personality.translations as Record<string, Record<string, unknown>>) ?? {},
        } : null}
        apiKeyStatus={keyStatus}
      />
    </div>
  );
}
