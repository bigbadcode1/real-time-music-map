BEGIN;
SELECT * FROM no_plan();

CREATE TEMPORARY TABLE test_songs AS SELECT * FROM "Songs" WITH NO DATA;

-- Test Case 1: Valid Song Insert
INSERT INTO test_songs (id, image_url, title, artist) VALUES ('abc123XYZabc123XYZab', 'http://example.com/image.jpg', 'My Song', 'The Artists');
SELECT is(count(*), 1::bigint, 'Valid insert should add one song') FROM test_songs WHERE id = 'abc123XYZabc123XYZab';

-- Test Case 2: Duplicate ID (Primary Key Violation)
SELECT throws_ok(
    $$INSERT INTO test_songs (id, image_url, title, artist) VALUES ('abc123XYZabc123XYZab', 'http://example.com/another.jpg', 'Another Song', 'Another Artist');$$,
    '23505',
    NULL,  -- Don't check exact message as it may vary
    'Duplicate song ID insert should throw an error'
);

-- Test Case 3: Select by Title (using LIKE)
INSERT INTO test_songs (id, image_url, title, artist) VALUES ('def456XYZdef456XYZde', 'http://example.com/image2.jpg', 'A Different Song', 'Some Band');
SELECT is(count(*), 1::bigint, 'Should find one song with "Song" in title') FROM test_songs WHERE title LIKE '%Different%';

-- Test Case 4: Update Artist
INSERT INTO test_songs (id, image_url, title, artist) VALUES ('ghi789XYZghi789XYZgh', 'http://example.com/image3.jpg', 'title', 'old artist');
UPDATE test_songs SET artist = 'New Artist' WHERE id = 'ghi789XYZghi789XYZgh';
SELECT is(artist, 'New Artist', 'Artist should be updated') FROM test_songs WHERE id = 'ghi789XYZghi789XYZgh';

-- Test Case 5: Delete a Song
INSERT INTO test_songs (id, image_url, title, artist) VALUES ('jkl012XYZjkl012XYZjk', 'http://example.com/image4.jpg', 'title', 'artist');
DELETE FROM test_songs WHERE id = 'jkl012XYZjkl012XYZjk';
SELECT is(count(*), 3::bigint, 'Three songs should remain after deletion') FROM test_songs;

-- Test Case 6: Invalid URL pattern
SELECT throws_ok(
    $$INSERT INTO test_songs (id, image_url, title, artist) VALUES ('mno345XYZmno345XYZmn', 'not-a-url', 'Invalid URL Test', 'Test Artist');$$,
    '23514',  -- check constraint violation
    NULL,
    'Invalid URL should throw error'
);

-- Test Case 7: Invalid ID pattern
SELECT throws_ok(
    $$INSERT INTO test_songs (id, image_url, title, artist) VALUES ('invalid!id', 'http://example.com/image5.jpg', 'Invalid ID Test', 'Test Artist');$$,
    '23514',  -- check constraint violation
    NULL,
    'Invalid ID pattern should throw error'
);

DROP TABLE test_songs;

SELECT * FROM finish();
ROLLBACK;
