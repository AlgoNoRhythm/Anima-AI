import { createDatabase, projectQueries, projectMemberQueries, projectInvitationQueries, userQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { TeamManager } from './team-manager';

export const dynamic = 'force-dynamic';

export default async function TeamPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getUserId();
  const db = createDatabase();

  // Verify user has access (owner to manage, but any member can view)
  const project = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!project) notFound();

  const isOwner = project.role === 'owner';

  // Load members with user details
  const memberRows = await projectMemberQueries(db).findByProjectId(projectId);
  const memberUsers = await Promise.all(
    memberRows.map(async (m) => {
      const user = await userQueries(db).findById(m.userId);
      return {
        id: m.userId,
        email: user?.email ?? 'Unknown',
        name: user?.name ?? 'Unknown',
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      };
    }),
  );

  // Load pending invitations (only for owner)
  const invitations = isOwner
    ? (await projectInvitationQueries(db).findByProjectId(projectId))
        .filter((inv) => inv.status === 'pending')
        .map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          token: inv.token,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        }))
    : [];

  // Get owner details
  const owner = await userQueries(db).findById(project.project.userId);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground mt-1">Manage who has access to this project.</p>
      </div>
      <TeamManager
        projectId={projectId}
        isOwner={isOwner}
        owner={{
          id: project.project.userId,
          email: owner?.email ?? 'Unknown',
          name: owner?.name ?? 'Unknown',
        }}
        members={memberUsers}
        invitations={invitations}
      />
    </div>
  );
}
