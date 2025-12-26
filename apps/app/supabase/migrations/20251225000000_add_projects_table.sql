-- Migration: Add projects table for multi-project support
-- Created: 2025-12-25

-- Create projects table
CREATE TABLE public.projects (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name            text NOT NULL DEFAULT 'Nowy projekt',
    description     text,
    thumbnail_url   text,
    project_data    jsonb NOT NULL DEFAULT '{}',
    schema_version  integer NOT NULL DEFAULT 1,
    revision        integer NOT NULL DEFAULT 1,
    data_size_bytes integer GENERATED ALWAYS AS (octet_length(project_data::text)) STORED,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    last_opened_at  timestamptz DEFAULT now(),
    is_archived     boolean DEFAULT false,

    CONSTRAINT project_data_size_limit CHECK (octet_length(project_data::text) < 10485760)
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX idx_projects_user_archived ON public.projects(user_id, is_archived);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own projects
CREATE POLICY "Users can view own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-increment revision and update timestamp on update
CREATE OR REPLACE FUNCTION increment_project_revision()
RETURNS TRIGGER AS $$
BEGIN
    NEW.revision := OLD.revision + 1;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_revision_trigger
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION increment_project_revision();

-- Create project_local_backup table for crash recovery
CREATE TABLE public.project_local_backup (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    project_data    jsonb NOT NULL,
    source          text NOT NULL DEFAULT 'autosave',
    created_at      timestamptz DEFAULT now(),
    UNIQUE(project_id)
);

-- Enable RLS on backup table
ALTER TABLE public.project_local_backup ENABLE ROW LEVEL SECURITY;

-- RLS policy for backup table
CREATE POLICY "Users can access own backups"
    ON public.project_local_backup FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_local_backup.project_id
            AND user_id = auth.uid()
        )
    );

-- Comments for documentation
COMMENT ON TABLE public.projects IS 'User furniture design projects with cloud sync support';
COMMENT ON COLUMN public.projects.schema_version IS 'Data schema version for migrations';
COMMENT ON COLUMN public.projects.revision IS 'Auto-incremented on each save for optimistic locking';
COMMENT ON COLUMN public.projects.data_size_bytes IS 'Computed size of project_data for monitoring';
COMMENT ON TABLE public.project_local_backup IS 'Single backup slot per project for crash recovery';
