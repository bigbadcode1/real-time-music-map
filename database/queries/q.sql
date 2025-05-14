-- SELECT generate_random_active_users(40);
-- SELECT random_users_exitsing_hotspots(1000);
-- SELECT * FROM "Hotspots";
SELECT * FROM "Active Users";
SELECT * FROM "Auth";

-- DELETE FROM "Active Users";

-- Function 3: Add new user with auth token
-- CREATE OR REPLACE FUNCTION add_new_user(
--   p_user_id TEXT,
--   p_name TEXT,
--   p_auth_token_hash TEXT,
--   p_token_expires_at TIMESTAMP,
--   p_geohash VARCHAR(7) DEFAULT NULL
-- ) RETURNS VOID AS $$



-- BEGIN;

--     SELECT * FROM "Hotspots";
--     SELECT add_new_user('user12039812358', 'Test User', 'hash123123421498271', (NOW() - INTERVAL '1 hour')::TIMESTAMP, 'dr72h56');
--     SELECT * FROM "Hotspots";
--     SELECT * FROM "Active Users";

-- ROLLBACK;


/*


BEGIN;
-- SELECT * FROM "Songs";
SELECT * FROM "Hotspots" WHERE geohash = 'w11r9vp';
SELECT * FROM "Active Users" WHERE id = 'vFaWX3YFT4nu2Q1ZQmTgpN4S';



SELECT * FROM "Hotspots" WHERE geohash = 'w11r9vp';
SELECT * FROM "Active Users" WHERE id = 'vFaWX3YFT4nu2Q1ZQmTgpN4S';
ROLLBACK;

-- user0.29627387530738103
-- 4d1q6vw
-- SELECT * FROM get_hotspots(90, 180, -90, -180);
*/