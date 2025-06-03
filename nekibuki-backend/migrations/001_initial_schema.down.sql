-- Drop initial schema for Nekibuki MVP

-- Drop indexes first
DROP INDEX IF EXISTS idx_recognition_sessions_created_at;
DROP INDEX IF EXISTS idx_recognition_sessions_image_hash;
DROP INDEX IF EXISTS idx_recognition_sessions_status;

-- Drop tables
DROP TABLE IF EXISTS recognition_sessions;

-- Drop extension (only if no other objects depend on it)
-- DROP EXTENSION IF EXISTS "uuid-ossp"; 