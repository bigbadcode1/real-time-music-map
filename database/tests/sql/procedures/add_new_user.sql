BEGIN;
SELECT * FROM no_plan();

-- Insert test hotspot
INSERT INTO "Hotspots" (geohash, count, longitude, latitude) VALUES
    ('dr72h56', 1, -73.9857, 40.7986);  -- New York area

-- Test Case 1: Basic new user creation
SELECT lives_ok(
    $$SELECT add_new_user('user12039812358', 'Test User', 'hash123123421498271', (NOW() + INTERVAL '1 hour'), 'dr72h56')$$,
    'Should successfully add a new user'
);

-- Verify the user was added correctly
SELECT is(
    (SELECT count(*) FROM "Active Users" WHERE id = 'user12039812358')::integer,
    1,
    'User should exist in Active Users table'
);

SELECT is(
    (SELECT count(*) FROM "Auth" WHERE user_id = 'user12039812358')::integer,
    1,
    'User should exist in Auth table'
);

SELECT is(
    (SELECT count FROM "Hotspots" WHERE geohash = 'dr72h56')::integer,
    2,  -- It was 1 before, should now be 2
    'Hotspot count should be incremented'
);

-- Test Case 2: Create a user without a geohash
SELECT lives_ok(
    $$SELECT add_new_user('user2', 'Test User 2', 'hash456', (NOW() + INTERVAL '1 hour'), NULL)$$,
    'Should successfully add a user without a geohash'
);

SELECT is(
    (SELECT geohash FROM "Active Users" WHERE id = 'user2'),
    NULL,
    'New user should have NULL geohash'
);

-- Test Case 3: Create a user with expired token
SELECT throws_ok(
    $$SELECT add_new_user('user3', 'Test User 3', 'hash789', NOW() - INTERVAL '1 hour', NULL)$$,
    NULL,
    'User with expired token should not be added'
);

-- Test Case 4: Create a duplicate user
SELECT throws_ok(
    $$SELECT add_new_user('user12039812358', 'Duplicate User', 'hash999', (NOW() + INTERVAL '1 hour'), NULL)$$,
    '23505',
    'Should throw error when adding duplicate user'
);

-- Test Case 5: Create a user with an expired user record
-- First, manually insert an expired user to simulate the scenario
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at)
VALUES ('expireduser123', 'Will Expire', NULL, NULL, (NOW() - INTERVAL '2 hour'));

SELECT lives_ok(
    $$SELECT add_new_user('expireduser123', 'Renewed User', 'hash101', (NOW() + INTERVAL '1 hour'), NULL)$$,
    'Should successfully add a user replacing an expired user'
);

-- Finish testing
SELECT * FROM finish();
ROLLBACK;
