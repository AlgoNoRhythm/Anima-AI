import { NextRequest, NextResponse } from 'next/server';
import { createDatabase, projectQueries, themeQueries } from '@anima-ai/database';
import { createStorageClient } from '@anima-ai/storage';
import { auth } from '@/lib/auth';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/** POST — Upload a new avatar image */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const db = createDatabase();

  const memberResult = await projectQueries(db).findByIdAndMember(projectId, session.user.id);
  if (!memberResult) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  if (memberResult.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPG, WebP, and SVG images are allowed' }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json({ error: 'Avatar must be under 2MB' }, { status: 400 });
  }

  // Determine file extension from mime type
  const ext = file.type === 'image/svg+xml' ? 'svg'
    : file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : 'jpg';

  const storageKey = `projects/${projectId}/avatar/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = createStorageClient();
  await storage.put(storageKey, buffer, file.type);

  // The serving URL goes through our own GET route
  const servingUrl = `/api/projects/${projectId}/avatar`;

  // Save the storage key in the theme's logoUrl so GET can find it.
  // We store the internal storage key prefixed with "storage:" so GET knows
  // to read from storage instead of treating it as an external URL.
  await themeQueries(db).upsert(projectId, {
    logoUrl: `storage:${storageKey}`,
  });

  return NextResponse.json({ url: servingUrl }, { status: 200 });
}

/** GET — Serve the stored avatar image */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const db = createDatabase();

  const theme = await themeQueries(db).findByProjectId(projectId);
  if (!theme?.logoUrl || !theme.logoUrl.startsWith('storage:')) {
    return NextResponse.json({ error: 'No avatar' }, { status: 404 });
  }

  const storageKey = theme.logoUrl.slice('storage:'.length);
  const storage = createStorageClient();
  const buffer = await storage.get(storageKey);

  if (!buffer) {
    return NextResponse.json({ error: 'Avatar file not found' }, { status: 404 });
  }

  // Determine content type from extension
  const ext = storageKey.split('.').pop() ?? '';
  const contentType = ext === 'svg' ? 'image/svg+xml'
    : ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : 'image/jpeg';

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
