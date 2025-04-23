BEGIN;
SELECT * FROM no_plan();

-- Insert valid test data
INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('01234567890123456789CD', 'http://example.com/image.jpg', 'title', 'artist');
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('bcdefg12', 1, NOW());
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) VALUES 
    ('01234567890123456789012345678901', 'rob', '01234567890123456789CD', 'bcdefg12', NOW() + INTERVAL '1 hour'),
    ('01234567890123456789012345678902', 'tom', '01234567890123456789CD', 'bcdefg12', NOW() + INTERVAL '1 hour');

-- Test Case 1: Valid Auth Token Insert
INSERT INTO "Auth" (user_id, auth_token_hash, expires_at) VALUES ('01234567890123456789012345678901', 'hashed_token', NOW() + INTERVAL '1 hour');
SELECT is(count(*), 1::bigint, 'Valid insert') FROM "Auth" WHERE user_id = '01234567890123456789012345678901';

-- Test Case 2: Foreign Key Violation (user_id)
SELECT throws_ok(
    $$INSERT INTO "Auth" (user_id, auth_token_hash, expires_at) VALUES ('invalid_user', 'hashed_token', NOW() + INTERVAL '1 hour');$$,
    '23503',
    NULL,  -- Don't check exact message as it may vary
    'Invalid user_id should throw FK error'
);

-- Test Case 3: Select Auth Token
SELECT is(auth_token_hash, 'hashed_token', 'Should retrieve the hashed token') FROM "Auth" WHERE user_id = '01234567890123456789012345678901';

-- Test Case 4: Update auth_token_hash
UPDATE "Auth" SET auth_token_hash = 'new_hashed_token' WHERE user_id = '01234567890123456789012345678901';
SELECT is(auth_token_hash, 'new_hashed_token', 'Token hash should be updated') FROM "Auth" WHERE user_id = '01234567890123456789012345678901';

-- Test Case 6: Primary key constraint - duplicate user_id
SELECT throws_ok(
    $$INSERT INTO "Auth" (user_id, auth_token_hash, expires_at) VALUES ('01234567890123456789012345678901', 'another_token', NOW() + INTERVAL '1 hour');$$,
    '23505',  -- unique_violation
    NULL,
    'Duplicate user_id should throw unique constraint error'
);

-- Test Case 7: NULL auth_token_hash
SELECT throws_ok(
    $$INSERT INTO "Auth" (user_id, auth_token_hash, expires_at) VALUES ('01234567890123456789012345678902', NULL, NOW() + INTERVAL '1 hour');$$,
    '23502',  -- not_null_violation
    NULL,
    'NULL auth_token_hash should throw not null constraint error'
);

SELECT * FROM finish();
ROLLBACK;
