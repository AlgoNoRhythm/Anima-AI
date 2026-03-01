import { auth } from './auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return session;
}

export async function getUserId(): Promise<string> {
  const session = await requireAuth();
  return session.user!.id as string;
}

export async function getOptionalSession() {
  return auth();
}
