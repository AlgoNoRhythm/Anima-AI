import { createDatabase, projectInvitationQueries, projectQueries } from '@anima-ai/database';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AcceptInvitation } from './accept-invitation';

export const dynamic = 'force-dynamic';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = createDatabase();

  const invitation = await projectInvitationQueries(db).findByToken(token);
  if (!invitation) notFound();

  if (invitation.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invitation Unavailable</h1>
          <p className="text-muted-foreground">This invitation has already been used or has expired.</p>
        </div>
      </div>
    );
  }

  if (new Date() > invitation.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invitation Expired</h1>
          <p className="text-muted-foreground">This invitation has expired. Please ask the project owner for a new invite.</p>
        </div>
      </div>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/register?token=${token}`);
  }

  const project = await projectQueries(db).findById(invitation.projectId);
  if (!project) notFound();

  const emailMatch = session.user.email === invitation.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold mb-2">Project Invitation</h1>
        <p className="text-muted-foreground mb-6">
          You&apos;ve been invited to join <strong>{project.name}</strong> as {invitation.role === 'editor' ? 'an' : 'a'} <strong>{invitation.role}</strong>.
        </p>
        {!emailMatch && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            This invitation was sent to <strong>{invitation.email}</strong>, but you are logged in as <strong>{session.user.email}</strong>. You can still accept it.
          </div>
        )}
        <AcceptInvitation token={token} projectName={project.name} />
      </div>
    </div>
  );
}
