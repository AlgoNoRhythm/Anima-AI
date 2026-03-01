import { createDatabase, projectQueries } from '@anima-ai/database';
import { getUserId } from './auth-helpers';

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

/**
 * Check that the current user has at least `requiredRole` access to a project.
 * Returns `{ project, role }` on success, or `{ error }` on failure.
 */
export async function requireProjectAccess(
  projectId: string,
  requiredRole: 'viewer' | 'editor' | 'owner',
): Promise<
  | { project: Awaited<ReturnType<ReturnType<typeof projectQueries>['findById']>>; role: 'owner' | 'editor' | 'viewer'; error?: undefined }
  | { project?: undefined; role?: undefined; error: string }
> {
  const userId = await getUserId();
  const db = createDatabase();
  const result = await projectQueries(db).findByIdAndMember(projectId, userId);

  if (!result) {
    return { error: 'Project not found' };
  }

  const userLevel = ROLE_HIERARCHY[result.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;

  if (userLevel < requiredLevel) {
    return { error: 'You do not have permission to perform this action' };
  }

  return { project: result.project, role: result.role };
}
