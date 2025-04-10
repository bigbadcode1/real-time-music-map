BEGIN;
SELECT * FROM no_plan();

-- Setup: Create temporary tables and insert test data
CREATE TEMPORARY TABLE test_active_users AS SELECT * FROM "Active Users" WITH NO DATA;
CREATE TEMPORARY TABLE test_auth AS SELECT * FROM "Auth" WITH NO DATA;
CREATE TEMPORARY TABLE test_songs AS SELECT * FROM "Songs" WITH NO DATA;
CREATE TEMPORARY TABLE test_hotspots AS SELECT * FROM "Hotspots" WITH NO DATA;

INSERT INTO test_songs (id, image_url, title, artist) VALUES ('song1', 'url', 'title', 'artist');
INSERT INTO test_hotspots (geohash, count, last_updated) VALUES ('geo123', 1, NOW());
INSERT INTO test_active_users (id, song_id, geohash, expires_at) VALUES ('user1', 'song1', 'geo123', NOW() + INTERVAL '1 hour');
INSERT INTO test_auth (user_id, auth_token_hash, expires_at) VALUES ('user1', 'valid_token_hash', NOW() + INTERVAL '1 hour');

-- Test Case 1: Valid Update with Correct Token
CALL upsert_active_user('user1', 'song1', 'geo456', NOW() + INTERVAL '2 hour', 'valid_token_hash');
SELECT is(geohash, 'geo456', 'Should update geohash') FROM test_active_users WHERE id = 'user1';

-- Test Case 2: Insert New User with Valid Token
CALL upsert_active_user('user2', 'song1', 'geo789', NOW() + INTERVAL '1 hour', 'valid_token_hash');
SELECT is(count(*), 2::bigint, 'Should insert new user') FROM test_active_users;

-- Setup for Test Case 3
INSERT INTO test_auth (user_id, auth_token_hash, expires_at) VALUES ('user3', 'expired_token_hash', NOW() - INTERVAL '1 hour');

-- Test Case 3:  Expired Token
SELECT throws_ok(
    $$CALL upsert_active_user('user3', 'song1', 'geo111', NOW() + INTERVAL '1 hour', 'expired_token_hash');$$,
    '0A000',
    'Authentication token expired',
    'Should throw error for expired token'
);

-- Test Case 4: Invalid Token
SELECT throws_ok(
    $$CALL upsert_active_user('user1', 'song1', 'geo222', NOW() + INTERVAL '1 hour', 'invalid_token_hash');$$,
    '28000',
    'Invalid authentication token',
    'Should throw error for invalid token'
);

-- Teardown
DROP TABLE test_active_users;
DROP TABLE test_auth;
DROP TABLE test_songs;
DROP TABLE test_hotspots;

SELECT * FROM finish();
ROLLBACK;
