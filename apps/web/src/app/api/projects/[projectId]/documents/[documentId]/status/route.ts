import { NextResponse } from 'next/server';
import { waitForDb, documentQueries, projectQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:document-status');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, documentId } = await params;
    const db = await waitForDb();

    // Verify project membership (fixes auth hole)
    const memberResult = await projectQueries(db).findByIdAndMember(projectId, session.user.id);
    if (!memberResult) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const project = memberResult.project;

    const doc = await documentQueries(db).findById(documentId);

    if (!doc || doc.projectId !== projectId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: doc.id,
      status: doc.status,
      errorMessage: doc.errorMessage,
      totalPages: doc.totalPages,
    });
  } catch (error) {
    log.error('GET /api/projects/[id]/documents/[id]/status error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
