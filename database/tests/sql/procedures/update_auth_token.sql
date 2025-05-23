BEGIN;
SELECT * FROM no_plan();

-- Setup test tables and data
DELETE FROM "Auth";
DELETE FROM "Active Users";

-- Insert test user with auth token
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at)
VALUES ('user1', 'Test User', NULL, NULL, NOW() + INTERVAL '1 hour');

INSERT INTO "Auth" (user_id, auth_token_hash, expires_at)
VALUES ('user1', 'hash123', NOW() + INTERVAL '1 hour');

-- Test Case 1: Update with valid old token
SELECT lives_ok(
    $$SELECT update_auth_token('user1', 'hash123', 'newhash123', NOW() + INTERVAL '2 hours')$$,
    'Should successfully update auth token with valid old token'
);

SELECT is(
    (SELECT auth_token_hash FROM "Auth" WHERE user_id = 'user1'),
    'newhash123',
    'Auth token should be updated'
);

-- Test Case 3: Update for non-existent user
SELECT throws_ok(
    $$SELECT update_auth_token('nonexistent', 'somehash', 'newhash789', NOW() + INTERVAL '2 hours')$$,
    '23588',
    'User does not exist',
    'Should throw error when user does not exist'
);

-- Test Case 4: Verify expiration time is updated
SELECT is(
    (SELECT expires_at > NOW() + INTERVAL '1.9 hours' FROM "Auth" WHERE user_id = 'user1'),
    true,
    'Expiration time should be updated correctly'
);

-- Test Case 5: Verify Active Users expiration also updated
SELECT is(
    (SELECT expires_at > NOW() + INTERVAL '50 minutes' FROM "Active Users" WHERE id = 'user1'),
    true,
    'Active Users expiration time should also be updated'
);

-- Finish testing
SELECT * FROM finish();
ROLLBACK;
