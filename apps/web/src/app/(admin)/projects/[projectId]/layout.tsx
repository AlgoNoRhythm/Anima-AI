import { ProjectNav } from '@/components/project-nav';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div>
      <ProjectNav projectId={projectId} />
      {children}
    </div>
  );
}
