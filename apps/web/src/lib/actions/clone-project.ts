'use server';

import {
  createDatabase,
  projectQueries,
  personalityQueries,
  themeQueries,
} from '@anima-ai/database';
import { createLogger } from '@anima-ai/shared';
import { getUserId } from '../auth-helpers';
import { requireProjectAccess } from '../project-auth';

const log = createLogger('action:clone-project');

/**
 * Duplicate an existing project.
 *
 * Copies:
 *   - Project metadata (name suffixed with " (Copy)", slug made unique)
 *   - Personality settings
 *   - Theme settings
 *
 * Does NOT copy:
 *   - Documents (project-specific data)
 *   - Chat sessions / messages
 *   - Analytics events
 */
export async function cloneProject(sourceProjectId: string) {
  try {
    const access = await requireProjectAccess(sourceProjectId, 'editor');
    if (access.error) {
      return { success: false, error: access.error };
    }
    const source = access.project!;
    const userId = await getUserId();
    const db = createDatabase();
    const projects = projectQueries(db);

    // Build a unique slug: append "-copy", then "-copy-2", "-copy-3", … as needed
    let newSlug = `${source.slug}-copy`;
    let attempt = 1;
    while (await projects.findBySlug(newSlug)) {
      attempt += 1;
      newSlug = `${source.slug}-copy-${attempt}`;
    }

    const newName = `${source.name} (Copy)`;

    // Create the new project
    const newProject = await projects.create({
      userId,
      name: newName,
      slug: newSlug,
      description: source.description ?? undefined,
      mode: source.mode,
      settings: source.settings as Record<string, unknown>,
    });

    // Copy personality if one exists on the source
    const sourcePersonality = await personalityQueries(db).findByProjectId(sourceProjectId);
    if (sourcePersonality) {
      await personalityQueries(db).upsert(newProject.id, {
        name: sourcePersonality.name,
        systemPrompt: sourcePersonality.systemPrompt,
        tone: sourcePersonality.tone as 'professional' | 'friendly' | 'casual' | 'formal' | 'technical',
        temperature: sourcePersonality.temperature,
        modelProvider: sourcePersonality.modelProvider,
        modelName: sourcePersonality.modelName,
        guardrails: sourcePersonality.guardrails as Record<string, unknown>,
        showDisclaimer: sourcePersonality.showDisclaimer,
        disclaimerText: sourcePersonality.disclaimerText ?? undefined,
        enableImageSupport: sourcePersonality.enableImageSupport,
      });
    } else {
      // Always ensure a personality exists
      await personalityQueries(db).upsert(newProject.id, {});
    }

    // Copy theme if one exists on the source
    const sourceTheme = await themeQueries(db).findByProjectId(sourceProjectId);
    if (sourceTheme) {
      await themeQueries(db).upsert(newProject.id, {
        primaryColor: sourceTheme.primaryColor,
        backgroundColor: sourceTheme.backgroundColor,
        fontFamily: sourceTheme.fontFamily,
        logoUrl: sourceTheme.logoUrl,
        welcomeMessage: sourceTheme.welcomeMessage,
      });
    } else {
      await themeQueries(db).upsert(newProject.id, {});
    }

    return { success: true, projectId: newProject.id };
  } catch (error) {
    log.error('cloneProject error', { error: error instanceof Error ? error.message : error });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
