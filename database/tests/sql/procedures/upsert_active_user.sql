BEGIN;
SELECT * FROM no_plan();

INSERT INTO "Songs" (id, image_url, title, artist) VALUES ('song11234908', 'http://example.com/image.jpg', 'title', 'artist');
INSERT INTO "Hotspots" (geohash, count, last_updated) VALUES ('ge012345', 1, NOW());
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) VALUES ('user123456789', 'rat', 'song11234908', 'ge012345', NOW() + INTERVAL '1 hour');
INSERT INTO "Auth" (user_id, auth_token_hash, expires_at) VALUES ('user123456789', 'valid_token_hash', NOW() + INTERVAL '1 hour');

SELECT upsert_active_user(
    'user123456789'::text,
    'tom123'::text,
    'song11234908'::text, 
    'valid_token_hash'::text, 
    (NOW() + INTERVAL '2 hour')::timestamp without time zone, 
    'ge045678'::varchar
);

SELECT is(geohash, 'ge045678'::varchar, 'Should update geohash') FROM "Active Users" WHERE id = 'user123456789'::text;

-- Test Case 2: Insert New User with Valid Token
SELECT upsert_active_user(
    'user2123456669696'::text, 
    'rob1324'::text,
    'song11234908'::text, 
    'valid_token_hash'::text, 
    (NOW() + INTERVAL '1 hour')::timestamp without time zone, 
    'ge789123'::varchar
);
SELECT is(count(*)::bigint, 2::bigint, 'Should insert new user') FROM "Active Users";

-- Setup for Test Case 3
INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at) VALUES ('user3333333333', 'fungus12', 'song11234908', 'ge012345', NOW() + INTERVAL '1 hour');
INSERT INTO "Auth" (user_id, auth_token_hash, expires_at) VALUES ('user3333333333'::text, 'expired_token_hash'::text, NOW() - INTERVAL '1 hour');

-- Test Case 3: Expired Token
SELECT throws_ok(
    $$SELECT upsert_active_user(
        'user3333333333'::text,
        'bbb1'::text,
        'song11234908'::text, 
        'expired_token_hash'::text, 
        (NOW() - INTERVAL '1 hour')::timestamp without time zone, 
        'ge111111'::varchar
    );$$,
    '23514',
    'Provided auth token is expired',
    'Should throw error for expired token'
);

-- Test Case 4: Invalid Token
SELECT throws_ok(
    $$SELECT upsert_active_user(
        'user123456789'::text, 
        'eve'::text,
        'song11234908'::text, 
        'invalid_token_hash'::text, 
        (NOW() + INTERVAL '1 hour')::timestamp without time zone, 
        'ge222222'::varchar
    );$$,
    'P0001',
    'Invalid token for user id user123456789',
    'Should throw error for invalid token'
);

SELECT * FROM finish();
ROLLBACK;
