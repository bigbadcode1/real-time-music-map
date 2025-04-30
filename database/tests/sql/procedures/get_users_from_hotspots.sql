BEGIN;
SELECT * FROM no_plan();

-- Setup test data
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES
    ('gbc12345', 10, NOW()),
    ('gbc12346', 5, NOW()),
    ('def67890', 20, NOW()),
    ('def67891', 15, NOW()),
    ('gh190123', 30, NOW());

INSERT INTO "Songs" (id, image_url, title, artist) VALUES
    ('song1234567890', 'http://example.com/image1.jpg', 'Song 1', 'Artist 1'),
    ('song7392810312', 'http://example.com/image2.jpg', 'Song 2', 'Artist 2'),
    ('song3928103129', 'http://example.com/image3.jpg', 'Song 3', 'Artist 3');

INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) VALUES
    ('user1', 'User One', 'song1234567890', 'gbc12345', NOW() + INTERVAL '2 hours'),
    ('user2', 'User Two', 'song7392810312', 'gbc12346', NOW() + INTERVAL '2 hours'),
    ('user3', 'User Three', 'song3928103129', 'def67890', NOW() + INTERVAL '2 hours'),
    ('user4', 'User Four', 'song1234567890', 'def67891', NOW() + INTERVAL '2 hours'),
    ('user5', 'User Five', 'song7392810312', 'gh190123', NOW() + INTERVAL '2 hours'),
    ('user6', 'User 123', 'song7392810312', 'gh190123', NOW() + INTERVAL '2 hours'),
    ('user7', 'User rob', 'song3928103129', 'gh190123', NOW() + INTERVAL '2 hours'),
    ('user8', 'User asdf', 'song1234567890', 'gh190123', NOW() + INTERVAL '2 hours');
    
-- Test Case 1: Basic Test with One Geohash Prefix
SELECT is(
    (SELECT count(*) FROM get_users_from_hotspots(ARRAY['gbc']))::integer,
    2,
    'Should return 2 active users for prefix "gbc"'
);

-- Test Case 2: Test with Multiple Geohash Prefixes
SELECT is(
    (SELECT count(*) FROM get_users_from_hotspots(ARRAY['gbc', 'def']))::integer,
    4,
    'Should return 4 active users for prefixes "gbc" and "def"'
);

-- Test Case 3: Test with No Matching Geohash Prefix
SELECT is(
    (SELECT count(*) FROM get_users_from_hotspots(ARRAY['xyz']))::integer,
    0,
    'Should return 0 users for prefix "xyz"'
);

-- Test Case 4: Test with an Empty Array
SELECT is(
    (SELECT count(*) FROM get_users_from_hotspots(ARRAY[]::text[]))::integer,
    8,
    'Should return all active users (8) for an empty array'
);

-- Test Case 5: Test if only active users are returned
SELECT is(
    (SELECT count(*) FROM get_users_from_hotspots(ARRAY['gbc']) WHERE id = 'expired_user')::integer,
    0,
    'Should not return expired users'
);

-- Test Case 6: Test if all columns are returned correctly
SELECT results_eq(
    $$SELECT id FROM get_users_from_hotspots(ARRAY['gbc']) ORDER BY id$$,
    $$SELECT 'user1'::text as id UNION ALL SELECT 'user2'::text as id ORDER BY 1$$,
    'Should return the correct user IDs'
);

-- Test Case 7: Get users from one hotspot
SELECT is(
    (SELECT count(*) FROM get_users_from_hotspots(ARRAY['gh190123']))::integer,
    4,
    'Should return 4 active users for hotspot "gh190123"'
);


SELECT * FROM finish();
ROLLBACK;
