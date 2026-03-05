-- =============================================================================
-- Acumen Playbook — PostgreSQL Initialization Script
-- =============================================================================
-- This script runs as the postgres superuser on first container start.
-- Run scripts/setup.sh before first boot — it auto-patches the passwords below.
-- Do NOT edit the passwords manually; setup.sh will overwrite them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Strapi Database
-- -----------------------------------------------------------------------------
CREATE USER strapi_user WITH PASSWORD 'STRAPI_USER_PASSWORD'; -- STRAPI

CREATE DATABASE acumen_strapi
    WITH OWNER = strapi_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TEMPLATE = template0;

-- Restrict public access
REVOKE CONNECT ON DATABASE acumen_strapi FROM PUBLIC;
GRANT CONNECT ON DATABASE acumen_strapi TO strapi_user;

-- Connect to strapi database and set up schema permissions
\connect acumen_strapi

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO strapi_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Return to default database
\connect postgres

-- -----------------------------------------------------------------------------
-- Wiki.js Database
-- -----------------------------------------------------------------------------
CREATE USER wikijs_user WITH PASSWORD 'WIKIJS_USER_PASSWORD'; -- WIKIJS

CREATE DATABASE acumen_wikijs
    WITH OWNER = wikijs_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TEMPLATE = template0;

-- Restrict public access
REVOKE CONNECT ON DATABASE acumen_wikijs FROM PUBLIC;
GRANT CONNECT ON DATABASE acumen_wikijs TO wikijs_user;

-- Connect to wikijs database and set up schema permissions
\connect acumen_wikijs

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO wikijs_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Return to default database
\connect postgres
