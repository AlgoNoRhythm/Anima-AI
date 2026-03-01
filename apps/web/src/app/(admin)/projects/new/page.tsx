import { NewProjectForm } from './new-project-form';

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground mt-1">Set up a new AI-powered chatbot for your documents.</p>
      </div>
      <NewProjectForm serverError={error} />
    </div>
  );
}
