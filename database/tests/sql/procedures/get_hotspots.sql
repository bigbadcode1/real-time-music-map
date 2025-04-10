BEGIN;
SELECT * FROM no_plan();

-- Setup: Create a temporary table and insert test data
CREATE TEMPORARY TABLE test_hotspots AS SELECT * FROM "Hotspots" WITH NO DATA;

INSERT INTO test_hotspots (geohash, count, last_updated) VALUES
    ('abc12345', 10, NOW()),
    ('abc12346', 5, NOW()),
    ('def67890', 20, NOW()),
    ('def67891', 15, NOW()),
    ('ghi90123', 30, NOW());

-- Test Case 1:  Basic Test with One Geohash Prefix
SELECT is(
    (SELECT count(*) FROM get_locations_by_geohashes(ARRAY['abc'])),
    2,
    'Should return 2 rows for prefix "abc"'
);

-- Test Case 2: Test with Multiple Geohash Prefixes
SELECT is(
    (SELECT count(*) FROM get_locations_by_geohashes(ARRAY['abc', 'def'])),
    4,
    'Should return 4 rows for prefixes "abc" and "def"'
);

-- Test Case 3: Test with No Matching Geohash Prefix
SELECT is(
    (SELECT count(*) FROM get_locations_by_geohashes(ARRAY['xyz'])),
    0::bigint,
    'Should return 0 rows for prefix "xyz"'
);

-- Test Case 4: Test with an Empty Array
SELECT is(
    (SELECT count(*) FROM get_locations_by_geohashes(ARRAY[]::text[])),
    0::bigint,
    'Should return 0 rows for an empty array'
);

-- Test Case 5: Test if all columns are returned correctly
SELECT results_eq(
    $$SELECT geohash FROM get_locations_by_geohashes(ARRAY['abc']) ORDER BY geohash$$,
    $$SELECT 'abc12345' UNION ALL SELECT 'abc12346' ORDER BY 1$$,
    'Should return the correct geohashes'
);

-- Teardown
DROP TABLE test_hotspots;

SELECT * FROM finish();
ROLLBACK;
