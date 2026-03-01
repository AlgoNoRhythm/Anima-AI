import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from './settings-form';
import { getApiKeyStatus } from '@/lib/actions/api-keys';

export default async function GlobalSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const keyStatus = await getApiKeyStatus();

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your API keys and profile.</p>
      </div>
      <SettingsForm
        userName={session.user.name || ''}
        userEmail={session.user.email || ''}
        initialKeyStatus={keyStatus}
      />
    </div>
  );
}
