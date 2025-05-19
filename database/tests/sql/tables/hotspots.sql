BEGIN;
SELECT * FROM no_plan();

-- Test Case 1: Valid Insert
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('0123bcd', 10, NOW()); 
SELECT is(count(*), 1::bigint, 'Valid insert should add one row') FROM "Hotspots" WHERE geohash = '0123bcd'; 

-- Test Case 4: Update count
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('fghj567', 5, NOW()); 
UPDATE "Hotspots" SET count = 15 WHERE geohash = 'fghj567'; 
SELECT is(count, 15, 'Count should be updated to 15') FROM "Hotspots" WHERE geohash = 'fghj567'; 

-- Test Case 5: Delete a hotspot
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('kmnp901', 20, NOW()); 
DELETE FROM "Hotspots" WHERE geohash = 'kmnp901';
SELECT is(count(*), 0::bigint, 'Row should be deleted') FROM "Hotspots" WHERE geohash = 'kmnp901';

--  Test: Test geohash constraint (empty string)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('', 0)$$,
    '23514',  -- check_violation
    NULL,
    'Should throw error for empty geohash'
);

--  Test: Test geohash constraint (invalid characters)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('inval!d', 0)$$,
    '23514',
    NULL,
    'Should throw error for invalid geohash characters'
);

--  Test: Test geohash constraint (too long)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('tooo000olong', 0)$$,
    '22001',
    NULL,
    'Should throw error for geohash too long'
);

--  Test: Test geohash constraint (too short)
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('short', 0)$$,
    '23514',
    NULL,
    'Should throw error for geohash too short'
);

--  Test: Test geohash constraint (contains invalid Base32 character 'a')
SELECT throws_ok(
    $$INSERT INTO "Hotspots" (geohash, count) VALUES ('012a345', 0)$$,
    '23514',
    NULL,
    'Should throw error for geohash with invalid Base32 character'
);


-- Test: Test count default value
INSERT INTO "Hotspots" (geohash) VALUES ('pqrst01');
SELECT is(count, 0, 'Count should default to 0') FROM "Hotspots" WHERE geohash = 'pqrst01';


-- Test: Verify coordinates were calculated
-- around 1m error

SELECT ok(ABS(longitude - (-179.6120452880)) < 0.000001 AND
          ABS(latitude - (-82.6522064208)) < 0.000001,
          'Coordinates for 0123bcd should be calculated correctly') 
FROM "Hotspots" WHERE geohash = '0123bcd';

SELECT ok(ABS(longitude - (-50.47737121582)) < 0.000001 AND
          ABS(latitude - (62.76695251464)) < 0.000001,
          'Coordinates for fghj567 should be calculated correctly') 
FROM "Hotspots" WHERE geohash = 'fghj567';

SELECT ok(ABS(longitude - (157.01866149902)) < 0.000001 AND
          ABS(latitude - (-54.05204772949)) < 0.000001,
          'Coordinates for pqrst01 should be calculated correctly') 
FROM "Hotspots" WHERE geohash = 'pqrst01';


-- Test: Test last_updated is updated on insert
INSERT INTO "Hotspots" (geohash, count) VALUES ('yz78901', 1);
SELECT ok(last_updated > NOW() - INTERVAL '5 seconds', 'last_updated should be recent') FROM "Hotspots" WHERE geohash = 'yz78901';

-- Test: Test last_updated is updated on update
UPDATE "Hotspots" SET count = 10 WHERE geohash = 'yz78901'; 
SELECT ok(last_updated > NOW() - INTERVAL '5 seconds', 'last_updated should be recent after update') FROM "Hotspots" WHERE geohash = 'yz78901';


SELECT * FROM finish();
ROLLBACK;
