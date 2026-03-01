import { createDatabase, projectQueries, documentQueries, sessionQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = await getUserId();
  const db = createDatabase();

  const [projectCount, documentCount, sessionCount] = await Promise.all([
    projectQueries(db).count(userId),
    documentQueries(db).countAll(userId),
    sessionQueries(db).countAll(userId),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your Anima AI workspace.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/projects" className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:border-gold/30 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Projects</h3>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{projectCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {projectCount === 0 ? 'Create your first project to get started' : `${projectCount} project${projectCount !== 1 ? 's' : ''} active`}
          </p>
        </Link>
        <Link href="/projects" className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:border-gold/30 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Documents</h3>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{documentCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {documentCount === 0 ? 'Upload PDFs to start chatting' : `${documentCount} document${documentCount !== 1 ? 's' : ''} uploaded`}
          </p>
        </Link>
        <Link href="/projects" className="rounded-xl border bg-card p-6 shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:border-gold/30 cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Chat Sessions</h3>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-bold">{sessionCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Total chat sessions</p>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border bg-card p-6 shadow-elevated">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/projects/new" className="flex items-center gap-3 rounded-lg border p-4 transition-all duration-200 hover:shadow-elevated hover:border-gold/30 group">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center text-white shadow-gold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <p className="font-medium text-sm">Create New Project</p>
              <p className="text-xs text-muted-foreground">Set up a new chatbot for your documents</p>
            </div>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 rounded-lg border p-4 transition-all duration-200 hover:shadow-elevated hover:border-gold/30 group">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <div>
              <p className="font-medium text-sm">Configure API Keys</p>
              <p className="text-xs text-muted-foreground">Add your API key to get started</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
