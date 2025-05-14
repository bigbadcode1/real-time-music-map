--  Essential: Stop on any error
\set ON_ERROR_STOP 1 
\set QUIET 1

-- Setup for cleaner output
\pset format unaligned
\pset tuples_only on

--  If you use a separate test schema:
CREATE SCHEMA IF NOT EXISTS test;
SET search_path TO test, public;

--  Create the pgTAP extension (if not already created)
CREATE EXTENSION IF NOT EXISTS pgtap;

--  Execute your test files in the desired order
\echo 'Running tests...'
SELECT plan(NULL);

\echo -e '\n\033[35mTesting hotspots...\033[0m\n'

\! pwd
\i ./docker-entrypoint-initdb.d/tables/hotspots.sql

\echo -e '\n\033[35mTesting songs...\033[0m\n'
\i ./docker-entrypoint-initdb.d/tables/songs.sql

\echo -e '\n\033[35mTesting users...\033[0m\n'
\i ./docker-entrypoint-initdb.d/tables/users.sql

\echo -e '\n\033[35mTesting auth...\033[0m\n'
\i ./docker-entrypoint-initdb.d/tables/auth.sql

\echo -e '\n\033[35mTesting get_hotspots()...\033[0m\n'
\i ./docker-entrypoint-initdb.d/procedures/get_hotspots.sql


\echo -e '\n\033[35mTesting get_users_from_hotspots()...\033[0m\n'
\i ./docker-entrypoint-initdb.d/procedures/get_users_from_hotspots.sql

\echo -e '\n\033[35mTesting add_new_user()...\033[0m\n'
\i ./docker-entrypoint-initdb.d/procedures/add_new_user.sql

\echo -e '\n\033[35mTesting update_auth_token()...\033[0m\n'
\i ./docker-entrypoint-initdb.d/procedures/update_auth_token.sql

\echo -e '\n\033[35mTesting update_user_info()...\033[0m\n'
\i ./docker-entrypoint-initdb.d/procedures/update_user_info.sql


--  (Optional: Cleanp the test schema, but rollback usually handles this)
DROP SCHEMA test CASCADE;

\echo -e '\n\033[32mAll tests completed!\033[0m\n'


