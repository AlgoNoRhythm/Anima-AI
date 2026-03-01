import Link from 'next/link';
import { createDatabase, projectQueries, projectMemberQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { ProjectList } from './project-list';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const userId = await getUserId();
  const db = createDatabase();
  const projects = await projectQueries(db).findByUserId(userId);

  // Build a map of project roles for the current user
  const memberRows = await projectMemberQueries(db).findByUserId(userId);
  const roleMap: Record<string, string> = {};
  for (const m of memberRows) {
    roleMap[m.projectId] = m.role;
  }
  for (const p of projects) {
    if (p.userId === userId && !roleMap[p.id]) {
      roleMap[p.id] = 'owner';
    }
  }

  // Serialize for client component
  const serializedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    mode: p.mode,
    userId: p.userId,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your document chatbots.</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-elevated">
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            </div>
            <h3 className="font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first project to get started.</p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded-lg gold-gradient px-5 py-2.5 text-sm font-medium text-white shadow-gold transition-all duration-200 hover:shadow-gold-lg hover:brightness-110 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create First Project
            </Link>
          </div>
        </div>
      ) : (
        <ProjectList projects={serializedProjects} roleMap={roleMap} />
      )}
    </div>
  );
}
