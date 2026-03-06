-- Add unique index on personalities.project_id (enables ON CONFLICT upsert + fast lookups)
CREATE UNIQUE INDEX IF NOT EXISTS personalities_project_id_idx ON personalities (project_id);

-- Upgrade feedback_configs index to unique (enables ON CONFLICT upsert)
DROP INDEX IF EXISTS feedback_configs_project_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_configs_project_id_idx ON feedback_configs (project_id);
