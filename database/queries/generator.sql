----------------- EXAMPLE --------------------
-- SELECT generate_random_active_users(40);
-- SELECT random_users_exitsing_hotspots(1000);

-- ^ generates 1040 users within max 40 hotspots

----------------- EXAMPLE --------------------
-- Krakow/ruczaj prefix

-- SELECT generate_random_active_users(30, 'u2yht');
-- SELECT random_users_exitsing_hotspots(200);





CREATE OR REPLACE FUNCTION generate_random_active_users(
    num_users INTEGER DEFAULT 10,
    geohash_prefix VARCHAR(7) DEFAULT ''
)
RETURNS VOID AS $$
DECLARE
    user_id TEXT;
    song_id TEXT;
    user_name TEXT;
    geohash VARCHAR(7);
    remaining_length INTEGER;
    token_hash TEXT;
    expires_at TIMESTAMP;
    chars TEXT := '0123456789abcdefghijklmnxopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    geohash_chars TEXT := '0123456789bcdefghjkmnpqrstuvwxyz';
    i INTEGER;
    song_counter INTEGER;
BEGIN
    -- Ensure the prefix is valid
    IF geohash_prefix ~ '[^0123456789bcdefghjkmnpqrstuvwxyz]' THEN
        RAISE EXCEPTION 'Geohash prefix contains invalid characters. Only characters from "0123456789bcdefghjkmnpqrstuvwxyz" are allowed.';
    END IF;
    
    -- Calculate remaining length needed for the geohash
    remaining_length := 7 - LENGTH(geohash_prefix);
    IF remaining_length < 0 THEN
        RAISE EXCEPTION 'Geohash prefix cannot be longer than 7 characters';
    END IF;
    
    -- Ensure we have some songs in the database
    FOR song_counter IN 1..10 LOOP
        -- Generate 22 character Spotify-like ID
        SELECT string_agg(substring(chars, ceil(random() * length(chars))::integer, 1), '') INTO song_id
        FROM generate_series(1, 22);
        
        INSERT INTO "Songs" (id, image_url, title, artist)
        VALUES (
            song_id,
            'https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228',
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
        
        -- Generate random geohash with the specified prefix
        IF remaining_length > 0 THEN
            SELECT geohash_prefix || string_agg(substring(geohash_chars, ceil(random() * length(geohash_chars))::integer, 1), '') INTO geohash
            FROM generate_series(1, remaining_length);
        ELSE
            geohash := geohash_prefix;
        END IF;
        
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
    
    RAISE NOTICE 'Successfully generated % random active users with geohash prefix "%"', num_users, geohash_prefix;
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
