CREATE OR REPLACE FUNCTION generate_random_active_users(num_users INTEGER DEFAULT 10)
RETURNS VOID AS $$
DECLARE
    user_id TEXT;
    song_id TEXT;
    user_name TEXT;
    geohash VARCHAR(7);
    token_hash TEXT;
    expires_at TIMESTAMP;
    chars TEXT := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    geohash_chars TEXT := '0123456789bcdefghjkmnpqrstuvwxyz';
    i INTEGER;
    song_counter INTEGER;
BEGIN
    -- Ensure we have some songs in the database
    FOR song_counter IN 1..10 LOOP
        -- Generate 22 character Spotify-like ID
        SELECT string_agg(substring(chars, ceil(random() * length(chars))::integer, 1), '') INTO song_id
        FROM generate_series(1, 22);
        
        INSERT INTO "Songs" (id, image_url, title, artist)
        VALUES (
            song_id,
            'https://example.com/image/' || song_counter || '.jpg',
            'Song Title ' || song_counter,
            'Artist ' || song_counter
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
    
    -- Get available song IDs
    CREATE TEMPORARY TABLE temp_songs AS
    SELECT id FROM "Songs";
    
    -- Generate and insert random users
    FOR i IN 1..num_users LOOP
        -- Generate random user ID (22-32 characters)
        SELECT string_agg(substring(chars, ceil(random() * length(chars))::integer, 1), '') INTO user_id
        FROM generate_series(1, 22 + floor(random() * 11)::integer);
        
        -- Select a random song ID
        SELECT id INTO song_id FROM temp_songs ORDER BY random() LIMIT 1;
        
        -- Generate random geohash (7 characters)
        SELECT string_agg(substring(geohash_chars, ceil(random() * length(geohash_chars))::integer, 1), '') INTO geohash
        FROM generate_series(1,7);
        
        -- Generate random token hash
        token_hash := md5(user_id || now()::text || random()::text);
        
        -- Generate random expiration time (between now and 3 hours from now)
        expires_at := now() + (random() * interval '3 hours');
        -- Generate random username
        user_name := 'user' || random()::text;
        
        -- Call the upsert function
        PERFORM add_new_user(user_id, user_name, token_hash, expires_at, geohash);
        PERFORM update_user_info(user_id, token_hash, geohash, song_id); 
        
        RAISE NOTICE 'Added user %: song=%, geohash=%', user_id, song_id, geohash;
    END LOOP;
    
    DROP TABLE IF EXISTS temp_songs;
    
    RAISE NOTICE 'Successfully generated % random active users', num_users;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT generate_random_active_users(50);  -- Generate 50 random users



CREATE OR REPLACE FUNCTION random_users_exitsing_hotspots(num_users INTEGER DEFAULT 10)
RETURNS VOID AS $$
DECLARE
    user_id TEXT;
    song_id TEXT;
    user_name TEXT;
    geohash VARCHAR(7);
    token_hash TEXT;
    expires_at TIMESTAMP;
    chars TEXT := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    geohash_chars TEXT := '0123456789bcdefghjkmnpqrstuvwxyz';
    i INTEGER;
    song_counter INTEGER;
BEGIN
    
    -- Get available song IDs
    CREATE TEMPORARY TABLE temp_songs AS
    SELECT id FROM "Songs";
    
    -- Generate and insert random users
    FOR i IN 1..num_users LOOP
        -- Generate random user ID (22-32 characters)
        SELECT string_agg(substring(chars, ceil(random() * length(chars))::integer, 1), '') INTO user_id
        FROM generate_series(1, 22 + floor(random() * 11)::integer);
        
        -- Select a random song ID
        SELECT id INTO song_id FROM temp_songs ORDER BY random() LIMIT 1;
        
        -- Generate random geohash (7 characters)
        SELECT h.geohash INTO geohash FROM "Hotspots" h ORDER BY random() LIMIT 1;
        RAISE NOTICE 'geohash: %', geohash;

        -- Generate random token hash
        token_hash := md5(user_id || now()::text || random()::text);
        
        -- Generate random expiration time (between now and 3 hours from now)
        expires_at := now() + (random() * interval '3 hours');
        -- Generate random username
        user_name := 'user' || random()::text;
        
        -- Call the upsert function
        PERFORM add_new_user(user_id, user_name, token_hash, expires_at, geohash);
        PERFORM update_user_info(user_id, token_hash, geohash, song_id);
        
        RAISE NOTICE 'Added user %: song=%, geohash=%', user_id, song_id, geohash;
    END LOOP;
    
    DROP TABLE IF EXISTS temp_songs;
    
    RAISE NOTICE 'Successfully inserted % random active users for existing Hotspots', num_users;
END;
$$ LANGUAGE plpgsql;
