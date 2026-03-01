import { createDatabase, projectQueries, qrCodeQueries } from '@anima-ai/database';
import { getUserId } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import { QRGenerator } from './qr-generator';
import { EmbedCodeGenerator } from './embed-code-generator';
import { getLanIp } from '@/lib/lan-ip';

export const dynamic = 'force-dynamic';

export default async function QRPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getUserId();
  const db = createDatabase();

  const result = await projectQueries(db).findByIdAndMember(projectId, userId);
  if (!result) notFound();
  const project = result.project;

  const qrCode = await qrCodeQueries(db).findByProjectId(projectId);
  const qrConfig = qrCode?.config ?? null;
  const lanIp = getLanIp();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">QR Code</h1>
        <p className="text-muted-foreground mt-1">Generate a QR code that links to your public chatbot.</p>
      </div>
      <QRGenerator
        projectId={projectId}
        projectSlug={project.slug}
        initialConfig={qrConfig as Record<string, unknown> | null}
        lanIp={lanIp}
      />

      <div className="mt-12">
        <EmbedCodeGenerator projectSlug={project.slug} />
      </div>
    </div>
  );
}
