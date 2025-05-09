BEGIN;
SELECT * FROM no_plan();

-- Insert valid test data
INSERT INTO "Songs" (id, image_url, title, artist) 
VALUES ('01234567890123456789AB', 'http://example.com/image.jpg', 'title', 'artist');

INSERT INTO "Hotspots" (geohash, count, last_updated) 
VALUES ('bcdefg1', 1, NOW());

-- Test Case 1: Valid Active User Insert
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) 
VALUES ('01234567890123456789012345678901', 'Test User 1', '01234567890123456789AB', 'bcdefg1', NOW() + INTERVAL '1 hour');

SELECT is(count(*), 1::bigint, 'Valid insert') 
FROM "Active Users" 
WHERE id = '01234567890123456789012345678901';

-- Test Case 2: Foreign Key Violation (song_id)
SELECT throws_ok(
    $$INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) 
      VALUES ('01234567890123456789012345678902', 'Test User 2', 'invalid_song', 'bcdefg1', NOW() + INTERVAL '1 hour')$$,
    '23503', -- foreign_key_violation
    NULL,  -- Don't check exact message as it may vary
    'Invalid song_id should throw FK error'
);

-- Test Case 3: NOT NULL Constraint for name
SELECT throws_ok(
    $$INSERT INTO "Active Users" (id, song_id, geohash, expires_at) 
      VALUES ('01234567890123456789012345678903', '01234567890123456789AB', 'bcdefg1', NOW() + INTERVAL '1 hour')$$,
    '23502', -- not_null_violation
    NULL,
    'Missing name should throw NOT NULL error'
);

-- Test Case 4: Select by geohash
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) 
VALUES ('01234567890123456789012345678904', 'Test User 4', '01234567890123456789AB', 'bcdefg1', NOW() + INTERVAL '1 hour');

SELECT is(count(*), 2::bigint, 'Should find two users in bcdefg1') 
FROM "Active Users" 
WHERE geohash = 'bcdefg1';

-- Test Case 5: Select expired users
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) 
VALUES ('01234567890123456789012345678905', 'Test User 5', '01234567890123456789AB', 'bcdefg1', NOW() - INTERVAL '1 hour');

SELECT is(count(*), 1::bigint, 'Should find one expired user') 
FROM "Active Users" 
WHERE expires_at < NOW();

SELECT * FROM finish();
ROLLBACK;
