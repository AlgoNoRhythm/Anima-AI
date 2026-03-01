import { createDatabase, userQueries, projectInvitationQueries } from '@anima-ai/database';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; token?: string }>;
}) {
  const { callbackUrl, token } = await searchParams;
  const db = createDatabase();
  const users = userQueries(db);
  const userCount = await users.count();

  // Allow registration if no users exist (initial setup) or if user has a valid invite token
  let validInvite = false;
  let inviteEmail: string | undefined;
  if (token) {
    const invitation = await projectInvitationQueries(db).findByToken(token);
    if (invitation && invitation.status === 'pending' && new Date() <= invitation.expiresAt) {
      validInvite = true;
      inviteEmail = invitation.email;
    }
  }

  if (userCount > 0 && !validInvite) {
    redirect('/login');
  }

  const isInviteFlow = validInvite;
  // Auto sign-in happens in the form, so redirect straight to the destination
  const redirectAfter = callbackUrl || '/dashboard';

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <Image
            src="/anima-ai.svg"
            alt="Anima AI"
            width={80}
            height={80}
            className="mx-auto mb-3"
            priority
          />
          <h1 className="text-2xl font-bold">Anima AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isInviteFlow ? 'Create an account to accept your invitation' : 'Create your admin account'}
          </p>
        </div>
        <RegisterForm redirectTo={redirectAfter} token={token} lockedEmail={inviteEmail} />
        {isInviteFlow && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
