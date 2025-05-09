BEGIN;
SELECT * FROM no_plan();

-- Insert test data with geohashes that will generate valid coordinates
INSERT INTO "Hotspots" (geohash, count) VALUES
    ('dr72h56', 10),  -- New York area
    ('u10j812', 5),   -- London area 
    ('9q8yykv', 20),  -- San Francisco area 
    ('9q5c77k', 15),  -- Los Angeles area 
    ('r3gx2fe', 30);  -- Sydney area 

-- Test Case 1: Basic Test with valid bounding box
SELECT is(
    (SELECT count(*) FROM get_hotspots(40.801, -73.999, 40.798, -74.002))::integer,
    1,
    'Should return 1 row for New York bounding box'
);

-- Test Case 2: Test with larger bounding box
SELECT is(
    (SELECT count(*) FROM get_hotspots(51.6, 0.1, 51.4, -0.2))::integer,
    1,
    'Should return 1 row for London bounding box'
);

-- Test Case 3: Test with no matching coordinates (Nigeria area)
SELECT is(
    (SELECT count(*) FROM get_hotspots(10.0, 10.0, 9.0, 9.0))::integer,
    0,
    'Should return 0 rows for area with no hotspots'
);

-- Test Case 4: Test with invalid coordinates
SELECT is(
    (SELECT count(*) FROM get_hotspots(200.0, -200.0, -200.0, 200.0))::integer,
    0,
    'Should return 0 rows for invalid coordinates'
);

-- Test Case 5: Test if all columns are returned correctly
SELECT results_eq(
    $$SELECT geohash, count FROM get_hotspots(34.1, -118.3, 33.9, -118.5)$$,
    $$SELECT '9q5c77k'::varchar as geohash, 15 as count$$,
    'Should return the correct hotspot data for Los Angeles'
);

-- Test Case 6: Test limit of 20 records
INSERT INTO "Hotspots" (geohash, count)
SELECT '9q5k1' || LPAD(i::text, 2, '0'), i
FROM generate_series(1, 25) AS i;

SELECT is(
    (SELECT count(*) FROM get_hotspots(34.519, -119.07, 34.431, -119.158))::integer,
    20,
    'Should return only 20 rows due to limit'
);

SELECT * FROM finish();
ROLLBACK;
