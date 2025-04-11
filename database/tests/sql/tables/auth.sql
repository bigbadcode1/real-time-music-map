BEGIN;
SELECT * FROM no_plan();

CREATE TEMPORARY TABLE test_auth AS SELECT * FROM "Auth" WITH NO DATA;
CREATE TEMPORARY TABLE test_active_users AS SELECT * FROM "Active Users" WITH NO DATA;
INSERT INTO test_active_users (id, song_id, geohash, expires_at) VALUES 
    ('auth_user1', 'song1', 'geo123', NOW() + INTERVAL '1 hour'),
    ('auth_user2', 'song1', 'geo123', NOW() + INTERVAL '1 hour');  -- Added another test user

-- Test Case 1: Valid Auth Token Insert
INSERT INTO test_auth (user_id, auth_token_hash, expires_at) VALUES ('auth_user1', 'hashed_token', NOW() + INTERVAL '1 hour');
SELECT is(count(*), 1::bigint, 'Valid insert') FROM test_auth WHERE user_id = 'auth_user1';

-- Test Case 2: Foreign Key Violation (user_id)
SELECT throws_ok(
    $$INSERT INTO test_auth (user_id, auth_token_hash, expires_at) VALUES ('invalid_user', 'hashed_token', NOW() + INTERVAL '1 hour');$$,
    '23503',
    NULL,  -- Don't check exact message as it may vary
    'Invalid user_id should throw FK error'
);

-- Test Case 3: Select Auth Token
SELECT is(auth_token_hash, 'hashed_token', 'Should retrieve the hashed token') FROM test_auth WHERE user_id = 'auth_user1';

-- Test Case 4: Update auth_token_hash
UPDATE test_auth SET auth_token_hash = 'new_hashed_token' WHERE user_id = 'auth_user1';
SELECT is(auth_token_hash, 'new_hashed_token', 'Token hash should be updated') FROM test_auth WHERE user_id = 'auth_user1';

-- Test Case 6: Primary key constraint - duplicate user_id
SELECT throws_ok(
    $$INSERT INTO test_auth (user_id, auth_token_hash, expires_at) VALUES ('auth_user1', 'another_token', NOW() + INTERVAL '1 hour');$$,
    '23505',  -- unique_violation
    NULL,
    'Duplicate user_id should throw unique constraint error'
);

-- Test Case 7: NULL auth_token_hash
SELECT throws_ok(
    $$INSERT INTO test_auth (user_id, auth_token_hash, expires_at) VALUES ('auth_user2', NULL, NOW() + INTERVAL '1 hour');$$,
    '23502',  -- not_null_violation
    NULL,
    'NULL auth_token_hash should throw not null constraint error'
);

DROP TABLE test_auth;
DROP TABLE test_active_users;

SELECT * FROM finish();
ROLLBACK;
