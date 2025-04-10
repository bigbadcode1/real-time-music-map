--  Essential: Stop on any error
\set ON_ERROR_STOP 1 
\set QUIET 1
--  If you use a separate test schema:
CREATE SCHEMA IF NOT EXISTS test;
SET search_path TO test, public;

--  Create the pgTAP extension (if not already created)
CREATE EXTENSION IF NOT EXISTS pgtap;

--  Execute your test files in the desired order
\echo 'Running tests...'
BEGIN;
SELECT plan(NULL);

\echo 'Testing hotspots...'
\! pwd
\i ./docker-entrypoint-initdb.d/tables/hotspots.sql

\echo 'Testing songs...'
\i ./docker-entrypoint-initdb.d/tables/songs.sql

\echo 'Testing users...'
\i ./docker-entrypoint-initdb.d/tables/users.sql

\echo 'Testing auth...'
\i ./docker-entrypoint-initdb.d/tables/auth.sql

\echo 'Testing get_hotspots procedure...'
\i ./docker-entrypoint-initdb.d/procedures/get_hotspots.sql

\echo 'Testing update_user procedure...'
\i ./docker-entrypoint-initdb.d/procedures/update_user.sql

SELECT * FROM finish();
ROLLBACK;

--  (Optional: Clean up the test schema, but rollback usually handles this)
DROP SCHEMA test CASCADE;

\echo 'All tests completed!'

