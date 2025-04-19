BEGIN;
SELECT * FROM no_plan();

-- Insert valid test data
INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('01234567890123456789AB', 'http://example.com/image.jpg', 'title', 'artist');
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('bcdefg12', 1, NOW());

-- Test Case 1: Valid Active User Insert
INSERT INTO "Active Users" (id, song_id, geohash, expires_at) VALUES ('01234567890123456789012345678901', '01234567890123456789AB', 'bcdefg12', NOW() + INTERVAL '1 hour');
SELECT is(count(*), 1::bigint, 'Valid insert') FROM "Active Users" WHERE id = '01234567890123456789012345678901';

-- Test Case 2: Foreign Key Violation (song_id)
SELECT throws_ok(
    $$INSERT INTO "Active Users" (id, song_id, geohash, expires_at) VALUES ('01234567890123456789012345678902', 'invalid_song', 'bcdefg12', NOW() + INTERVAL '1 hour');$$,
    '23503', -- foreign_key_violation
    NULL,  -- Don't check exact message as it may vary
    'Invalid song_id should throw FK error'
);

-- Test Case 3: Foreign Key Violation (geohash)
SELECT throws_ok(
    $$INSERT INTO "Active Users" (id, song_id, geohash, expires_at) VALUES ('01234567890123456789012345678903', '01234567890123456789AB', 'invalid0', NOW() + INTERVAL '1 hour');$$,
    '23503',
    NULL,
    'Invalid geohash should throw FK error'
);

-- Test Case 4: Select by geohash
INSERT INTO "Active Users" (id, song_id, geohash, expires_at) VALUES ('01234567890123456789012345678904', '01234567890123456789AB', 'bcdefg12', NOW() + INTERVAL '1 hour');
SELECT is(count(*), 2::bigint, 'Should find two users in bcdefg12') FROM "Active Users" WHERE geohash = 'bcdefg12';

-- Test Case 6: Select expired users
INSERT INTO "Active Users" (id, song_id, geohash, expires_at) VALUES ('01234567890123456789012345678905', '01234567890123456789AB', 'bcdefg12', NOW() - INTERVAL '1 hour');
SELECT is(count(*), 1::bigint, 'Should find one expired user') FROM "Active Users" WHERE expires_at < NOW();

SELECT * FROM finish();
ROLLBACK;
