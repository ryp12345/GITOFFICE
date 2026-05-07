-- Migration: create scheduled_job_runs table
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sjr_started_at ON scheduled_job_runs(started_at);
