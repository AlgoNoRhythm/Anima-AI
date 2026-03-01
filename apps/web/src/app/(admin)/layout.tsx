import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createDatabase, userQueries } from '@anima-ai/database';
import { AdminSidebar } from '@/components/admin-sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Verify the user still exists in DB (JWT may reference a stale user after DB reset)
  const db = createDatabase();
  const user = await userQueries(db).findById(session.user.id);
  if (!user) {
    redirect('/api/auth/signout?callbackUrl=/login');
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        userName={session.user.name}
        userEmail={session.user.email}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
