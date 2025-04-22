BEGIN;
SELECT * FROM no_plan();

-- Test Case 1: Valid Insert
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('0123bcde', 10, NOW());
SELECT is(count(*), 1::bigint, 'Valid insert should add one row') FROM "Hotspots" WHERE geohash = '0123bcde';

-- Test Case 4: Update count
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('fghj5678', 5, NOW());
UPDATE "Hotspots" SET count = 15 WHERE geohash = 'fghj5678';
SELECT is(count, 15, 'Count should be updated to 15') FROM "Hotspots" WHERE geohash = 'fghj5678';

-- Test Case 5: Delete a hotspot
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('kmnp9012', 20, NOW());
DELETE FROM "Hotspots" WHERE geohash = 'kmnp9012';
SELECT is(count(*), 0::bigint, 'Row should be deleted') FROM "Hotspots" WHERE geohash = 'kmnp9012';

-- New Test: Test geohash constraint (empty string)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('', 0)$$,
    '23514',  -- check_violation
    NULL,  -- We don't check the exact message as it may vary
    'Should throw error for empty geohash'
);

-- New Test: Test geohash constraint (invalid characters)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('invalid!', 0)$$,
    '23514',
    NULL,
    'Should throw error for invalid geohash characters'
);

-- New Test: Test geohash constraint (too long)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('tooo000olong', 0)$$,
    '22001',
    NULL,
    'Should throw error for geohash too long'
);

-- New Test: Test geohash constraint (too short)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('short', 0)$$,
    '23514',
    NULL,
    'Should throw error for geohash too short'
);

-- New Test: Test geohash constraint (contains invalid Base32 character 'a')
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('0123abcd', 0)$$,
    '23514',
    NULL,
    'Should throw error for geohash with invalid Base32 character'
);

-- New Test: Test count default value
INSERT INTO "Hotspots" (geohash) VALUES ('pqrst012');
SELECT is(count, 0, 'Count should default to 0') FROM "Hotspots" WHERE geohash = 'pqrst012';

-- New Test: Test count constraint (negative value)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('uvwx3456', -1)$$,
    '23514',
    NULL,
    'Should throw error for negative count'
);

-- New Test: Test last_updated is updated on insert
INSERT INTO "Hotspots" (geohash, count) VALUES ('yz789012', 1);
SELECT ok(last_updated > NOW() - INTERVAL '5 seconds', 'last_updated should be recent') FROM "Hotspots" WHERE geohash = 'yz789012';

-- New Test: Test last_updated is updated on update
UPDATE "Hotspots" SET count = 10 WHERE geohash = 'yz789012';
SELECT ok(last_updated > NOW() - INTERVAL '5 seconds', 'last_updated should be recent after update') FROM "Hotspots" WHERE geohash = 'yz789012';


SELECT * FROM finish();
ROLLBACK;
