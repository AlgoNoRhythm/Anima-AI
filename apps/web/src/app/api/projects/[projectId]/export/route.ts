import { NextResponse } from 'next/server';
import { createDatabase, projectQueries, sessionQueries, messageQueries } from '@anima-ai/database';
import { auth } from '@/lib/auth';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('api:export');

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const db = createDatabase();

    // Verify project ownership — only owners can export conversation data
    const memberResult = await projectQueries(db).findByIdAndMember(projectId, session.user.id);
    if (!memberResult) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (memberResult.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const project = memberResult.project;

    // Query all chat sessions for this project
    const sessions = await sessionQueries(db).findByProjectId(projectId);

    // Build CSV rows
    const csvHeader = 'timestamp,session_id,role,content,feedback';
    const csvRows: string[] = [csvHeader];

    for (const chatSession of sessions) {
      // Query all messages for each session (use a high limit to get all)
      const msgs = await messageQueries(db).findBySessionId(chatSession.id, { limit: 10000 });

      for (const msg of msgs) {
        const timestamp = msg.createdAt instanceof Date
          ? msg.createdAt.toISOString()
          : new Date(msg.createdAt).toISOString();

        const row = [
          escapeCSVField(timestamp),
          escapeCSVField(chatSession.id),
          escapeCSVField(msg.role),
          escapeCSVField(msg.content),
          escapeCSVField(msg.feedback ?? ''),
        ].join(',');

        csvRows.push(row);
      }
    }

    const csvContent = csvRows.join('\n');
    const filename = `conversations-${project.slug || projectId}-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    log.error('GET /api/projects/[id]/export error', { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
