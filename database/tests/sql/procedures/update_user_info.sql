BEGIN;
SELECT * FROM no_plan();

-- Setup test tables and data
DELETE FROM "Auth";
DELETE FROM "Active Users";
DELETE FROM "Songs";
DELETE FROM "Hotspots";

-- Insert test hotspot
INSERT INTO "Hotspots" (geohash, count, longitude, latitude) VALUES
    ('dr72h56', 1, -73.9857, 40.7986),  -- New York area
    ('9q8yykv', 1, -122.4194, 37.7749);  -- San Francisco area

-- Insert test songs
INSERT INTO "Songs" (id, image_url, title, artist) VALUES
    ('spotify123', 'https://example.com/image.jpg', 'Test Song', 'Test Artist'),
    ('newsong123', 'https://example.com/newsong.jpg', 'New Song', 'New Artist');

-- Insert test user with auth token
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at)
VALUES ('user1', 'Test User', 'spotify123', 'dr72h56', NOW() + INTERVAL '1 hour');

INSERT INTO "Auth" (user_id, auth_token_hash, expires_at)
VALUES ('user1', 'hash123', NOW() + INTERVAL '1 hour');

-- Test Case 1: Basic update with valid token
SELECT lives_ok(
    $$SELECT update_user_info('user1', 'hash123', '9q8yykv', 'spotify123', 'https://example.com/image.jpg', 'Updated Song', 'Updated Artist')$$,
    'Should successfully update user info with valid token'
);

SELECT is(
    (SELECT geohash FROM "Active Users" WHERE id = 'user1'),
    '9q8yykv',
    'User geohash should be updated'
);

SELECT is(
    (SELECT song_id FROM "Active Users" WHERE id = 'user1'),
    'spotify123',
    'User song should remain the same'
);

-- Test Case 2: Update with non-existent user
SELECT throws_ok(
    $$SELECT update_user_info('nonexistent', 'somehash', '9q8yykv', 'spotify123', 'https://example.com/image.jpg', 'Some Song', 'Some Artist')$$,
    '23505',
    'Should throw error when user does not exist'
);

-- Test Case 3: Update with invalid token
SELECT throws_ok(
    $$SELECT update_user_info('user1', 'wronghash', '9q8yykv', 'spotify123', 'https://example.com/image.jpg', 'Some Song', 'Some Artist')$$,
    'UE001',
    'Should throw error when token is invalid'
);

-- Test Case 4: Update with new song
SELECT lives_ok(
    $$SELECT update_user_info('user1', 'hash123', NULL, 'newsong123', 'https://example.com/newsong.jpg', 'Brand New Song', 'Brand New Artist')$$,
    'Should successfully update user with new song'
);

SELECT is(
    (SELECT song_id FROM "Active Users" WHERE id = 'user1'),
    'newsong123',
    'User song should be updated to new song'
);

-- Test Case 5: Update with completely new song not in database
SELECT lives_ok(
    $$SELECT update_user_info('user1', 'hash123', NULL, 'completelynew', 'https://example.com/brand-new.jpg', 'Brand New Track', 'Brand New Artist')$$,
    'Should successfully update user with completely new song'
);

-- Verify song was added to Songs table
SELECT is(
    (SELECT count(*) FROM "Songs" WHERE id = 'completelynew')::integer,
    1,
    'New song should be added to Songs table'
);

SELECT is(
    (SELECT title FROM "Songs" WHERE id = 'completelynew'),
    'Brand New Track',
    'New song title should be correct'
);

-- Test Case 6: Check expire time updated
SELECT is(
    (SELECT expires_at > NOW() + INTERVAL '50 minutes' FROM "Active Users" WHERE id = 'user1'),
    true,
    'Expiration time should be updated'
);

-- Finish testing
SELECT * FROM finish();
ROLLBACK;
