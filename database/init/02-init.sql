-- Fixed Functions and Triggers - 02-init.sql

-- get hotspots by NorthEast and Southwest points of the box
CREATE OR REPLACE FUNCTION get_hotspots(
    ne_lat DOUBLE PRECISION,
    ne_long DOUBLE PRECISION,
    sw_lat DOUBLE PRECISION,
    sw_long DOUBLE PRECISION
)
RETURNS TABLE (geohash VARCHAR(7), longitude DOUBLE PRECISION, latitude DOUBLE PRECISION, count int) AS $$
BEGIN
    -- Validate input parameters
    IF NOT (ne_lat BETWEEN -90 AND 90 AND ne_long BETWEEN -180 AND 180) OR 
       NOT (sw_lat BETWEEN -90 AND 90 AND sw_long BETWEEN -180 AND 180) THEN
        RETURN;
    END IF;

    -- Handle International Date Line crossing
    IF sw_long > ne_long THEN
        RETURN QUERY 
        SELECT h.geohash, h.longitude, h.latitude, h.count
        FROM "Hotspots" h
        WHERE h.latitude BETWEEN sw_lat AND ne_lat
        AND (h.longitude >= sw_long OR h.longitude <= ne_long)
        ORDER BY h.count DESC
        LIMIT 20;
    ELSE
        RETURN QUERY 
        SELECT h.geohash, h.longitude, h.latitude, h.count
        FROM "Hotspots" h
        WHERE h.latitude BETWEEN sw_lat AND ne_lat
        AND h.longitude BETWEEN sw_long AND ne_long
        ORDER BY h.count DESC
        LIMIT 20;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Atomic hotspot management function
CREATE OR REPLACE FUNCTION manage_hotspot_count(
    p_geohash VARCHAR(7),
    p_increment INTEGER
) RETURNS VOID AS $$
DECLARE
    v_current_count INTEGER;
BEGIN
    -- Lock and get current count
    SELECT count INTO v_current_count
    FROM "Hotspots"
    WHERE geohash = p_geohash
    FOR UPDATE;
    
    IF FOUND THEN
        IF v_current_count + p_increment <= 0 THEN
            -- Delete hotspot if count would be 0 or negative
            DELETE FROM "Hotspots" WHERE geohash = p_geohash;
        ELSE
            -- Update count
            UPDATE "Hotspots"
            SET count = count + p_increment,
                last_updated = NOW()
            WHERE geohash = p_geohash;
        END IF;
    ELSIF p_increment > 0 THEN
        -- Create new hotspot with coordinates
        INSERT INTO "Hotspots" (geohash, count, last_updated)
        VALUES (p_geohash, p_increment, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function 1: Update user location and/or song with proper auth validation
CREATE OR REPLACE FUNCTION update_user_info(
  p_user_id TEXT,
  p_user_token TEXT,
  p_geohash VARCHAR(7) DEFAULT NULL,
  p_song_id TEXT DEFAULT NULL,
  p_song_image TEXT DEFAULT NULL,
  p_song_title TEXT DEFAULT NULL,
  p_song_artist TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_current_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_old_geohash VARCHAR(7);
BEGIN
    -- Get current auth info
    SELECT auth_token_hash, expires_at INTO v_current_token, v_expires_at 
    FROM "Auth" 
    WHERE user_id = p_user_id;

    -- Check if user exists
    IF v_current_token IS NULL THEN
        RAISE EXCEPTION 'User does not exist' USING ERRCODE = '42704';
    END IF;

    -- Validate token (either current token or allow new token if expired)
    IF v_expires_at > NOW() AND v_current_token != p_user_token THEN
        RAISE EXCEPTION 'Invalid authentication token' USING ERRCODE = '42501';
    ELSIF v_expires_at <= NOW() THEN
        -- Update expired token
        UPDATE "Auth" SET 
            auth_token_hash = p_user_token,
            expires_at = NOW() + INTERVAL '30 minutes'
        WHERE user_id = p_user_id;
    END IF;
  
    -- Add song to database if provided
    IF p_song_id IS NOT NULL AND p_song_image IS NOT NULL AND 
       p_song_title IS NOT NULL AND p_song_artist IS NOT NULL THEN
        INSERT INTO "Songs" (id, image_url, title, artist) 
        VALUES (p_song_id, p_song_image, p_song_title, p_song_artist)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- Get current geohash for hotspot management
    SELECT geohash INTO v_old_geohash 
    FROM "Active Users" 
    WHERE id = p_user_id;
    
    -- Update user info
    UPDATE "Active Users"
    SET 
        geohash = COALESCE(p_geohash, geohash),
        song_id = COALESCE(p_song_id, song_id),
        expires_at = NOW() + INTERVAL '1 hour'
    WHERE id = p_user_id;
    
    -- Handle hotspot count changes if geohash changed
    IF v_old_geohash IS DISTINCT FROM COALESCE(p_geohash, v_old_geohash) THEN
        -- Decrement old hotspot
        IF v_old_geohash IS NOT NULL THEN
            PERFORM manage_hotspot_count(v_old_geohash, -1);
        END IF;
        
        -- Increment new hotspot
        IF COALESCE(p_geohash, v_old_geohash) IS NOT NULL THEN
            PERFORM manage_hotspot_count(COALESCE(p_geohash, v_old_geohash), 1);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Update user's auth token (only if expired or matches current)
CREATE OR REPLACE FUNCTION update_auth_token(
  p_user_id TEXT,
  p_old_token TEXT,
  p_new_token_hash TEXT,
  p_token_expires_at TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_current_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get current token info
    SELECT auth_token_hash, expires_at INTO v_current_token, v_expires_at
    FROM "Auth" 
    WHERE user_id = p_user_id;
    
    -- If user not found
    IF v_current_token IS NULL THEN
        RAISE EXCEPTION 'User does not exist' USING ERRCODE = '42704';
    END IF;

    -- Validate old token
    IF v_expires_at > NOW() AND v_current_token != p_old_token THEN
        RAISE EXCEPTION 'Invalid current authentication token' USING ERRCODE = '42501';
    END IF;

    -- Update token and extend expiration
    UPDATE "Auth"
    SET 
        auth_token_hash = p_new_token_hash,
        expires_at = p_token_expires_at
    WHERE user_id = p_user_id;
    
    -- Also extend Active Users expiration
    UPDATE "Active Users"
    SET expires_at = NOW() + INTERVAL '1 hour'
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Add new user with auth token (with proper cleanup)
CREATE OR REPLACE FUNCTION add_new_user(
  p_user_id TEXT,
  p_name TEXT,
  p_auth_token_hash TEXT,
  p_token_expires_at TIMESTAMPTZ,
  p_geohash VARCHAR(7) DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_old_geohash VARCHAR(7);
BEGIN
    -- Check if user already exists and get their geohash
    SELECT geohash INTO v_old_geohash 
    FROM "Active Users" 
    WHERE id = p_user_id;
    
    IF FOUND THEN
        -- Clean up old user's hotspot count
        IF v_old_geohash IS NOT NULL THEN
            PERFORM manage_hotspot_count(v_old_geohash, -1);
        END IF;
        
        -- Delete existing user and auth records
        DELETE FROM "Active Users" WHERE id = p_user_id;
        -- Auth will be deleted by CASCADE
    END IF;
    
    -- Insert new user
    INSERT INTO "Active Users" (id, name, image_url, song_id, geohash, expires_at)
    VALUES (p_user_id, p_name, p_image_url, NULL, p_geohash, NOW() + INTERVAL '1 hour');
    
    -- Insert authentication info
    INSERT INTO "Auth" (user_id, auth_token_hash, expires_at)
    VALUES (p_user_id, p_auth_token_hash, p_token_expires_at);
    
    -- Increment hotspot count for new location
    IF p_geohash IS NOT NULL THEN
        PERFORM manage_hotspot_count(p_geohash, 1);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function with proper hotspot management
CREATE OR REPLACE FUNCTION cleanup_expired_users() 
RETURNS VOID AS $$
DECLARE
    expired_user RECORD;
BEGIN
    -- Get all expired users with their geohashes
    FOR expired_user IN 
        SELECT id, geohash 
        FROM "Active Users" 
        WHERE expires_at < NOW()
    LOOP
        -- Decrement hotspot count if user had a location
        IF expired_user.geohash IS NOT NULL THEN
            PERFORM manage_hotspot_count(expired_user.geohash, -1);
        END IF;
        
        -- Delete the user (Auth will be deleted by CASCADE)
        DELETE FROM "Active Users" WHERE id = expired_user.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_user(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_geohash VARCHAR(7);
BEGIN
  SELECT geohash INTO v_geohash FROM "Active Users" WHERE id = p_user_id;
  IF FOUND THEN
    DELETE FROM "Active Users" WHERE id = p_user_id;
    -- update hotspot count
    IF v_geohash IS NOT NULL THEN
      PERFORM manage_hotspot_count(v_geohash, -1);
    END IF;
  END IF;

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_all_users()
RETURNS VOID AS $$
BEGIN
  DELETE FROM "Active Users";
  DELETE FROM "Hotspots";
END;
$$ LANGUAGE plpgsql;

-- Get users from hotspots function (unchanged but cleaner)
CREATE OR REPLACE FUNCTION get_users_from_hotspots(hotspot_prefixes text[])
RETURNS TABLE (
    id TEXT,
    name TEXT,
    image TEXT,
    song_id TEXT,
    song_title TEXT,
    song_image TEXT,
    song_artist TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.image_url, u.song_id, s.title, s.image_url, s.artist
    FROM "Active Users" u
    LEFT JOIN "Songs" s ON u.song_id = s.id 
    WHERE u.geohash IS NOT NULL
    AND (
        array_length(hotspot_prefixes, 1) IS NULL OR
        EXISTS (
            SELECT 1
            FROM unnest(hotspot_prefixes) AS prefix
            WHERE u.geohash LIKE (prefix || '%')
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Calculate lat and long from geohash after insert/update
CREATE OR REPLACE FUNCTION update_coordinates_from_geohash()
RETURNS TRIGGER AS $$
DECLARE
    point_geom GEOMETRY;
BEGIN
    -- Validate geohash format
    IF NEW.geohash ~ '^[0123456789bcdefghjkmnpqrstuvwxyz]{7}$' THEN
        BEGIN
            point_geom := ST_Centroid(ST_GeomFromGeoHash(NEW.geohash));
            NEW.longitude := ST_X(point_geom);
            NEW.latitude := ST_Y(point_geom);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error converting geohash % to coordinates: %', NEW.geohash, SQLERRM;
                -- Set to NULL if conversion fails
                NEW.longitude := NULL;
                NEW.latitude := NULL;
        END;
    ELSE
        -- Invalid geohash format
        NEW.longitude := NULL;
        NEW.latitude := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for coordinate calculation
CREATE OR REPLACE TRIGGER trigger_update_coordinates
    BEFORE INSERT OR UPDATE OF geohash ON "Hotspots"
    FOR EACH ROW
    EXECUTE FUNCTION update_coordinates_from_geohash();

-- Clean up expired auth tokens periodically
CREATE OR REPLACE FUNCTION cleanup_expired_auth() 
RETURNS VOID AS $$
BEGIN
    -- Remove expired auth tokens (this will cascade to users)
    DELETE FROM "Auth" WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;