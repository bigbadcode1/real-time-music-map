CREATE OR REPLACE FUNCTION get_hotspots(geohash_prefixes text[])
RETURNS TABLE (geohash varchar(8), count int) AS $$
BEGIN
    IF array_length(geohash_prefixes, 1) IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY 
    SELECT h.geohash, h.count
    FROM "Hotspots" h
    WHERE EXISTS (
        SELECT 1 
        FROM unnest(geohash_prefixes) prefix 
        WHERE h.geohash LIKE prefix || '%'
    );

END;
$$ LANGUAGE plpgsql;

                                           

CREATE OR REPLACE FUNCTION upsert_active_user(
    p_user_id TEXT,
    p_song_id TEXT,
    p_token_hash TEXT,
    p_expires_at TIMESTAMP,
    p_geohash VARCHAR(8) DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    auth_token_db TEXT;
    geohash_db TEXT;
BEGIN
    -- first check if auth token is valid
    SELECT auth_token_hash, geohash INTO auth_token_db, geohash_db
    FROM "Auth" a
    JOIN "Active Users" u ON a.user_id = u.id
    WHERE a.user_id = p_user_id;

    -- if there is no auth token for this user we are adding a new user with provided data
    IF NOT FOUND THEN 
        RAISE NOTICE 'Adding new user with id %', p_user_id;
        
        INSERT INTO "Active Users" (id, song_id, geohash, expires_at)
        VALUES (p_user_id, p_song_id, p_geohash, p_expires_at);

        INSERT INTO "Auth" (user_id, auth_token_hash, expires_at)
        VALUES (p_user_id, p_token_hash, p_expires_at);
        
        
        RETURN;
    END IF;

    -- if we find user - check if tokens match
    IF (auth_token_db != p_token_hash) THEN
        RAISE EXCEPTION 'Invalid token for user id %', p_user_id;
        RETURN;
    END IF;

    -- else token is valid so we just update data in Active Users
    UPDATE "Active Users"
    SET
        song_id = p_song_id,
        geohash = p_geohash,
        expires_at = p_expires_at
    WHERE id = p_user_id;

END;
$$ LANGUAGE plpgsql;