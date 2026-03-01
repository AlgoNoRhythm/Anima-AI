'use server';

import { redirect } from 'next/navigation';
import { createDatabase, projectQueries, personalityQueries, themeQueries } from '@anima-ai/database';
import { DEFAULT_MODEL_PROVIDER, DEFAULT_MODEL_NAME, createLogger } from '@anima-ai/shared';
import { getUserId } from '../auth-helpers';
import { requireProjectAccess } from '../project-auth';
import { z } from 'zod';

const log = createLogger('action:projects');

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  mode: z.enum(['chat', 'pdf', 'both']).default('both'),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  mode: z.enum(['chat', 'pdf', 'both']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export async function createProject(formData: FormData): Promise<void> {
  const userId = await getUserId();
  const db = createDatabase();

  const parsed = createProjectSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    mode: formData.get('mode') || 'both',
    description: formData.get('description') || undefined,
  });

  if (!parsed.success) {
    redirect(`/projects/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? 'Validation failed')}`);
  }

  const projects = projectQueries(db);

  // Check slug uniqueness
  const existing = await projects.findBySlug(parsed.data.slug);
  if (existing) {
    redirect(`/projects/new?error=${encodeURIComponent('A project with this slug already exists')}`);
  }

  const project = await projects.create({
    userId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    mode: parsed.data.mode,
    description: parsed.data.description,
  });

  // Create default personality
  await personalityQueries(db).upsert(project.id, {
    name: 'Default Assistant',
    systemPrompt: `You ARE the product described in your knowledge base. Speak in first person.
- Say "I can brew up to 12 cups" not "The manual says the machine brews 12 cups"
- Say "My filter should be cleaned monthly" not "According to the document, clean the filter monthly"
- Say "I support Bluetooth 5.0" not "The spec sheet mentions Bluetooth 5.0"
Stay in character. Cite page numbers when referencing specific details.`,
    tone: 'professional',
    temperature: 0.7,
    modelProvider: DEFAULT_MODEL_PROVIDER,
    modelName: DEFAULT_MODEL_NAME,
    guardrails: {
      blockedTopics: [],
      maxResponseLength: 2000,
      requireCitations: true,
      allowOffTopic: false,
      customInstructions: null,
    },
  });

  // Create default theme
  await themeQueries(db).upsert(project.id, {});

  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, data: Record<string, unknown>) {
  try {
    const access = await requireProjectAccess(projectId, 'owner');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const parsed = updateProjectSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' };
    }

    const db = createDatabase();
    await projectQueries(db).update(projectId, parsed.data);
    return { success: true };
  } catch (error) {
    log.error('updateProject error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteProject(projectId: string) {
  try {
    const access = await requireProjectAccess(projectId, 'owner');
    if (access.error) {
      return { success: false, error: access.error };
    }

    const db = createDatabase();
    await projectQueries(db).delete(projectId);
  } catch (error) {
    log.error('deleteProject error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }

  redirect('/projects');
}
