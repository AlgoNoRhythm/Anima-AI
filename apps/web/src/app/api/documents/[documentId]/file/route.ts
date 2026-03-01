import { NextRequest, NextResponse } from 'next/server';
import { createDatabase, documentQueries, projectQueries } from '@anima-ai/database';
import { createStorageClient } from '@anima-ai/storage';
import { auth } from '@/lib/auth';

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { documentId } = await params;

  const db = createDatabase();
  const doc = await documentQueries(db).findById(documentId);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Verify user has access to the document's project
  const memberResult = await projectQueries(db).findByIdAndMember(doc.projectId, session.user.id);
  if (!memberResult) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const storage = createStorageClient();
  const buffer = await storage.get(doc.storageUrl);

  if (!buffer) {
    return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
  }

  const filename = doc.title || doc.filename;
  const ext = doc.filename.split('.').pop()?.toLowerCase() ?? 'pdf';
  const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

  // ?download=1 forces a download (used by mobile clients)
  const download = request.nextUrl.searchParams.get('download') === '1';
  const disposition = download ? 'attachment' : 'inline';

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${disposition}; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
