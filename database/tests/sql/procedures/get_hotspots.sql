BEGIN;
SELECT * FROM no_plan();

INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES
    ('gbc12345', 10, NOW()),
    ('gbc12346', 5, NOW()),
    ('def67890', 20, NOW()),
    ('def67891', 15, NOW()),
    ('gh190123', 30, NOW());

-- Test Case 1:  Basic Test with One Geohash Prefix
SELECT is(
    (SELECT count(*) FROM get_hotspots(ARRAY['gbc']))::integer,
    2,
    'Should return 2 rows for prefix "gbc"'
);

-- Test Case 2: Test with Multiple Geohash Prefixes
SELECT is(
    (SELECT count(*) FROM get_hotspots(ARRAY['gbc', 'def']))::integer,
    4,
    'Should return 4 rows for prefixes "gbc" and "def"'
);

-- Test Case 3: Test with No Matching Geohash Prefix
SELECT is(
    (SELECT count(*) FROM get_hotspots(ARRAY['xyz']))::integer,
    0,
    'Should return 0 rows for prefix "xyz"'
);

-- Test Case 4: Test with an Empty Array
SELECT is(
    (SELECT count(*) FROM get_hotspots(ARRAY[]::text[]))::integer,
    0,
    'Should return 0 rows for an empty array'
);

-- Test Case 5: Test if all columns are returned correctly
SELECT results_eq(
    $$SELECT geohash FROM get_hotspots(ARRAY['gbc']) ORDER BY geohash$$,
    $$SELECT 'gbc12345'::varchar as geohash UNION ALL SELECT 'gbc12346'::varchar as geohash ORDER BY 1$$,
    'Should return the correct geohashes'
);

SELECT * FROM finish();
ROLLBACK;
