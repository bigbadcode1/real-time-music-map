BEGIN;
SELECT * FROM no_plan();

-- Setup: Create a temporary table (or use a test schema and insert into real table)
CREATE TEMPORARY TABLE test_hotspots AS SELECT * FROM "Hotspots" WITH NO DATA;

-- Test Case 1: Valid Insert
INSERT INTO test_hotspots (geohash, count, last_updated) VALUES ('abc12345', 10, NOW());
SELECT is(count(*), 1::bigint, 'Valid insert should add one row') FROM test_hotspots WHERE geohash = 'abc12345';

-- Test Case 4:  Update count
INSERT INTO test_hotspots (geohash, count, last_updated) VALUES ('ghi12345', 5, NOW());
UPDATE test_hotspots SET count = 15 WHERE geohash = 'ghi12345';
SELECT is(count, 15, 'Count should be updated to 15') FROM test_hotspots WHERE geohash = 'ghi12345';

-- Test Case 5:  Delete a hotspot
INSERT INTO test_hotspots (geohash, count, last_updated) VALUES ('jkl12345', 20, NOW());
DELETE FROM test_hotspots WHERE geohash = 'jkl12345';
SELECT is(count(*), 0::bigint, 'Row should be deleted') FROM test_hotspots WHERE geohash = 'jkl12345';

-- New Test: Test geohash constraint (empty string)
SELECT throws_ok(
    $$INSERT INTO test_hotspots (geohash, count) VALUES ('', 0)$$,
    '23514',  -- check_violation
    NULL,  -- We don't check the exact message as it may vary
    'Should throw error for empty geohash'
);

-- New Test: Test geohash constraint (invalid characters)
SELECT throws_ok(
    $$INSERT INTO test_hotspots (geohash, count) VALUES ('invalid!', 0)$$,
    '23514',
    NULL,
    'Should throw error for invalid geohash characters'
);

-- New Test: Test geohash constraint (too long)
SELECT throws_ok(
    $$INSERT INTO test_hotspots (geohash, count) VALUES ('tooooolong12345', 0)$$,
    '23514',
    NULL,
    'Should throw error for geohash too long'
);

-- New Test: Test count default value
INSERT INTO test_hotspots (geohash) VALUES ('testgeo8');
SELECT is(count, 0, 'Count should default to 0') FROM test_hotspots WHERE geohash = 'testgeo8';

-- New Test: Test count constraint (negative value)
SELECT throws_ok(
    $$INSERT INTO test_hotspots (geohash, count) VALUES ('neg45678', -1)$$,
    '23514',
    NULL,
    'Should throw error for negative count'
);

-- New Test: Test last_updated is updated on insert
INSERT INTO test_hotspots (geohash, count) VALUES ('lastupd8', 1);
SELECT ok(last_updated > NOW() - INTERVAL '5 seconds', 'last_updated should be recent') FROM test_hotspots WHERE geohash = 'lastupd';

-- New Test: Test last_updated is updated on update
UPDATE test_hotspots SET count = 10 WHERE geohash = 'lastupd8';
SELECT ok(last_updated > NOW() - INTERVAL '5 seconds', 'last_updated should be recent after update') FROM test_hotspots WHERE geohash = 'lastupd8';

-- Teardown
DROP TABLE test_hotspots;

SELECT * FROM finish();
ROLLBACK;
