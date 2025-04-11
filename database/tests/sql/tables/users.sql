BEGIN;
SELECT * FROM no_plan();

CREATE TEMPORARY TABLE test_active_users AS SELECT * FROM "Active Users" WITH NO DATA;
CREATE TEMPORARY TABLE test_songs AS SELECT * FROM "Songs" WITH NO DATA;
CREATE TEMPORARY TABLE test_hotspots AS SELECT * FROM "Hotspots" WITH NO DATA;

INSERT INTO test_songs (id, image_url, title, artist) VALUES ('song1', 'http://example.com/image.jpg', 'title', 'artist');
INSERT INTO test_hotspots (geohash, count, last_updated) VALUES ('geo12345', 1, NOW());

-- Test Case 1: Valid Active User Insert
INSERT INTO test_active_users (id, song_id, geohash, expires_at) VALUES ('user1', 'song1', 'geo12345', NOW() + INTERVAL '1 hour');
SELECT is(count(*), 1::bigint, 'Valid insert') FROM test_active_users WHERE id = 'user1';

-- Test Case 2: Foreign Key Violation (song_id)
SELECT throws_ok(
    $$INSERT INTO test_active_users (id, song_id, geohash, expires_at) VALUES ('user2', 'invalid_song', 'geo12345', NOW() + INTERVAL '1 hour');$$,
    '23503', -- foreign_key_violation
    NULL,  -- Don't check exact message as it may vary
    'Invalid song_id should throw FK error'
);

-- Test Case 3: Foreign Key Violation (geohash)
SELECT throws_ok(
    $$INSERT INTO test_active_users (id, song_id, geohash, expires_at) VALUES ('user3', 'song1', 'invalid_geohash', NOW() + INTERVAL '1 hour');$$,
    '23503',
    NULL,
    'Invalid geohash should throw FK error'
);

-- Test Case 4: Select by geohash
INSERT INTO test_active_users (id, song_id, geohash, expires_at) VALUES ('user4', 'song1', 'geo12345', NOW() + INTERVAL '1 hour');
SELECT is(count(*), 2::bigint, 'Should find two users in geo12345') FROM test_active_users WHERE geohash = 'geo12345';

-- Test Case 6: Select expired users
INSERT INTO test_active_users (id, song_id, geohash, expires_at) VALUES ('user5', 'song1', 'geo12345', NOW() - INTERVAL '1 hour');
SELECT is(count(*), 1::bigint, 'Should find one expired user') FROM test_active_users WHERE expires_at < NOW();


DROP TABLE test_active_users;
DROP TABLE test_songs;
DROP TABLE test_hotspots;

SELECT * FROM finish();
ROLLBACK;
