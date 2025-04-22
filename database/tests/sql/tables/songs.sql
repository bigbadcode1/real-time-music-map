BEGIN;
SELECT * FROM no_plan();

-- Test Case 1: Valid Song Insert
INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('01234567890123456789AB', 'http://example.com/image.jpg', 'My Song', 'The Artists');
SELECT is(count(*), 1::bigint, 'Valid insert should add one song') FROM "Songs" WHERE id = '01234567890123456789AB';

-- Test Case 2: Duplicate ID (Primary Key Violation)
SELECT throws_ok(
    $$INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('01234567890123456789AB', 'http://example.com/another.jpg', 'Another Song', 'Another Artist');$$,
    '23505',
    NULL,  -- Don't check exact message as it may vary
    'Duplicate song ID insert should throw an error'
);

-- Test Case 3: Select by Title (using LIKE)
INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('BCDEFGHIJKLMNOPQRST01', 'http://example.com/image2.jpg', 'A Different Song', 'Some Band');
SELECT is(count(*), 1::bigint, 'Should find one song with "Song" in title') FROM "Songs" WHERE title LIKE '%Different%';

-- Test Case 4: Update Artist
INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('BCDEFGHIJKLMNOPQRST02', 'http://example.com/image3.jpg', 'title', 'old artist');
UPDATE "Songs" SET artist = 'New Artist' WHERE id = 'BCDEFGHIJKLMNOPQRST02';
SELECT is(artist, 'New Artist', 'Artist should be updated') FROM "Songs" WHERE id = 'BCDEFGHIJKLMNOPQRST02';

-- Test Case 5: Delete a Song
INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('BCDEFGHIJKLMNOPQRST03', 'http://example.com/image4.jpg', 'title', 'artist');
DELETE FROM "Songs" WHERE id = 'BCDEFGHIJKLMNOPQRST03';
SELECT is(count(*), 3::bigint, 'Three songs should remain after deletion') FROM "Songs";

-- Test Case 6: Invalid URL pattern
SELECT throws_ok(
    $$INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('BCDEFGHIJKLMNOPQRST04', 'not-a-url', 'Invalid URL Test', 'Test Artist');$$,
    '23514',  -- check constraint violation
    NULL,
    'Invalid URL should throw error'
);

-- Test Case 7: Invalid ID pattern
SELECT throws_ok(
    $$INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('invalid!id', 'http://example.com/image5.jpg', 'Invalid ID Test', 'Test Artist');$$,
    '23514',  -- check constraint violation
    NULL,
    'Invalid ID pattern should throw error'
);

SELECT * FROM finish();
ROLLBACK;
