import { createDatabase, projectQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { ProjectSettingsForm } from './settings-form';
import { CloneProjectButton } from './clone-project-button';

export const dynamic = 'force-dynamic';

export default async function ProjectSettingsPage({
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

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground mt-1">Configure limits, permissions, and advanced options.</p>
      </div>
      <ProjectSettingsForm
        projectId={projectId}
        settings={project.settings as Record<string, unknown>}
      />

      {/* Clone / Duplicate section */}
      <div className="rounded-xl border bg-card p-8 shadow-elevated mt-6">
        <h3 className="text-sm font-semibold mb-1">Duplicate Project</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Create a copy of this project with the same personality and theme settings.
          Documents, chat sessions, and analytics are not copied.
        </p>
        <CloneProjectButton projectId={projectId} />
      </div>
    </div>
  );
}
