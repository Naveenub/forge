-- Forge PostgreSQL initialization script
-- Runs once when the container first starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Replication user for replica
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'replicator') THEN
    CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator_secret';
  END IF;
END
$$;

-- Performance settings comment (applied via postgres command args in docker-compose)
-- max_connections=200, shared_buffers=256MB, etc.

-- Create read-only user for app read replica sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forge_readonly') THEN
    CREATE USER forge_readonly WITH ENCRYPTED PASSWORD 'forge_readonly_secret';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE forge_db TO forge_readonly;
GRANT USAGE ON SCHEMA public TO forge_readonly;

-- Grant read access to all future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO forge_readonly;

-- Grant read on existing tables (post-migration)
DO $$
BEGIN
  EXECUTE (
    SELECT string_agg('GRANT SELECT ON TABLE ' || tablename || ' TO forge_readonly;', ' ')
    FROM pg_tables WHERE schemaname = 'public'
  );
END
$$;

-- Audit log policy: prevent deletes/updates (append-only)
-- This is enforced in application code; add DB-level protection here
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY; -- uncomment post-migration

COMMENT ON DATABASE forge_db IS 'Forge — Autonomous SDLC Platform';
