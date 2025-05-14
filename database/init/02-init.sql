
-- get hotspots by NorthEast and Southwest points of the box
CREATE OR REPLACE FUNCTION get_hotspots(
    ne_lat DOUBLE PRECISION,
    ne_long DOUBLE PRECISION,
    sw_lat DOUBLE PRECISION,
    sw_long DOUBLE PRECISION
)
RETURNS TABLE (geohash VARCHAR(7), longitude DOUBLE PRECISION, latitude DOUBLE PRECISION, count int) AS $$
BEGIN
    IF NOT (ne_lat BETWEEN -90 AND 90 AND ne_long BETWEEN -180 AND 180) OR NOT (sw_lat BETWEEN -90 AND 90 AND sw_long BETWEEN -180 AND 180) THEN
        RETURN;
    END IF;

    RETURN QUERY 
    SELECT h.geohash, h.longitude, h.latitude , h.count
    FROM "Hotspots" h
    WHERE (h.latitude BETWEEN sw_lat AND ne_lat
    AND h.longitude BETWEEN sw_long AND ne_long)
    ORDER BY h.count DESC
    LIMIT 20;
    -- for now limited to 20 records for optimization  

END;
$$ LANGUAGE plpgsql;



-- CREATE OR REPLACE FUNCTION upsert_active_user(
--     p_user_id TEXT,
--     p_user_name TEXT,
--     p_song_id TEXT,
--     p_token_hash TEXT,
--     p_expires_at TIMESTAMPTZ,
--     p_geohash VARCHAR(8) DEFAULT NULL
-- ) RETURNS VOID AS $$
-- DECLARE
--     auth_token_db TEXT;
--     geohash_db TEXT;
--     auth_token_db_expires TIMESTAMPTZ;
-- BEGIN
--     IF p_expires_at < NOW() THEN
--         RAISE EXCEPTION 'Provided auth token is expired' USING ERRCODE = '23514';
--         RETURN;
--     END IF;

--     -- first check if auth token is valid
--     SELECT a.auth_token_hash, u.geohash, a.expires_at INTO auth_token_db, geohash_db, auth_token_db_expires
--     FROM "Auth" a
--     JOIN "Active Users" u ON a.user_id = u.id
--     WHERE a.user_id = p_user_id;

--     -- if there is no auth token for this user we are adding a new user with provided data
--     IF NOT FOUND THEN 

--         INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at)
--         VALUES (p_user_id, p_user_name, p_song_id, p_geohash, p_expires_at);


--         INSERT INTO "Auth" (user_id, auth_token_hash, expires_at)
--         VALUES (p_user_id, p_token_hash, p_expires_at);
        
        
--         RETURN;
--     END IF;

--     -- if we find user - check if tokens match
--     IF (auth_token_db != p_token_hash) THEN
--         RAISE EXCEPTION 'Invalid token for user id %', p_user_id USING ERRCODE = 'P0001';
--         RETURN;
--     END IF;

--     -- update expires at in db if differs from provided
--     IF (auth_token_db_expires != p_expires_at) THEN
--         UPDATE "Auth"
--         SET
--             expires_at = p_expires_at
--         WHERE user_id = p_user_id;
--     END IF;

--     -- else token is valid so we just update data in Active Users
--     UPDATE "Active Users"
--     SET
--         song_id = p_song_id,
--         geohash = p_geohash,
--         expires_at = NOW() + INTERVAL '1 hour'
--     WHERE id = p_user_id;

-- END;
-- $$ LANGUAGE plpgsql;






--------------------- INSTEAD OF UPSERT_USER ----------------------------------






-- Function 1: Update user location and/or song
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
  v_auth TEXT;
  v_old_geohash VARCHAR(7);
BEGIN

  -- Check if user exists
  IF NOT EXISTS (SELECT auth_token_hash INTO v_auth FROM "Auth" WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist' USING ERRCODE = '23505';
  END IF;

  IF v_auth != p_user_token THEN
    RAISE EXCEPTION 'Auth token invalid' USING ERRCODE = 'UE001';
  END IF;
  
  -- Get the old geohash
  SELECT geohash INTO v_old_geohash FROM "Active Users" WHERE id = p_user_id;
  
  -- Check if song exists (if provided)
  IF p_song_id IS NOT NULL THEN
    INSERT INTO "Songs" (id, image_url, title, artist) 
    VALUES (p_song_id, p_song_image, p_song_title, p_song_artist);
  END IF;
  
  -- Update user info
  UPDATE "Active Users"
  SET 
    geohash = COALESCE(p_geohash, geohash),
    song_id = COALESCE(p_song_id, song_id),
    expires_at = NOW() + INTERVAL '1 hour'
  WHERE id = p_user_id;
  
END;
$$ LANGUAGE plpgsql;




-- Function 2: Update user's auth token (only if expired)
CREATE OR REPLACE FUNCTION update_auth_token(
  p_user_id TEXT,
  p_old_token TEXT,
  p_new_token_hash TEXT,
  p_token_expires_at TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Check if user exists in Auth table
  SELECT 
    auth_token_hash
  INTO 
    v_token
  FROM "Auth"
  WHERE user_id = p_user_id;
  
  -- If user not found in Auth table
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'User does not exist' USING ERRCODE = '23505';
  END IF;

  -- Verify if old token matches
  IF v_token != p_old_token THEN
    RAISE EXCEPTION 'Old auth token invalid' USING ERRCODE = '23505'; 
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





-- Function 3: Add new user with auth token
CREATE OR REPLACE FUNCTION add_new_user(
  p_user_id TEXT,
  p_name TEXT,
  p_auth_token_hash TEXT,
  p_token_expires_at TIMESTAMPTZ,
  p_geohash VARCHAR(7) DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_transaction_successful BOOLEAN := FALSE;
  v_user_expires_at TIMESTAMPTZ;
BEGIN
  -- Start transaction
  BEGIN

    SELECT expires_at INTO v_user_expires_at FROM "Active Users" WHERE id = p_user_id;
  
    -- Check if user already exists
    IF FOUND THEN
      IF (v_user_expires_at > NOW()) THEN
        RAISE EXCEPTION 'User already exists' USING ERRCODE = '23505';
      END IF;
      -- Delete user if IS expired
      DELETE FROM "Active Users" WHERE id = p_user_id;
    END IF;
  

    
    -- Insert into Active Users with default null song
    INSERT INTO "Active Users" (id, name, song_id, geohash, expires_at)
    VALUES (p_user_id, p_name, NULL, p_geohash, NOW() + INTERVAL '1 hour');
    
    -- Insert authentication info
    INSERT INTO "Auth" (user_id, auth_token_hash, expires_at)
    VALUES (p_user_id, p_auth_token_hash, p_token_expires_at);
        
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
  
END;
$$ LANGUAGE plpgsql;





-- Bonus: Function to clean up expired users and update hotspot counts
CREATE OR REPLACE FUNCTION cleanup_expired_users() 
RETURNS VOID AS $$
DECLARE
  -- v_expired_user RECORD;
BEGIN
  -- Loop through expired users
  DELETE FROM "Active Users" WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;





CREATE OR REPLACE FUNCTION get_users_from_hotspots(hotspot_prefixes text[])
RETURNS TABLE (
    id TEXT,
    name TEXT,
    song_id TEXT,
    song_title TEXT,
    song_image TEXT,
    song_artist TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.name, u.song_id, s.title, s.image_url, s.artist
    FROM "Active Users" u
    JOIN "Hotspots" h ON u.geohash = h.geohash
    JOIN "Songs" s ON u.song_id = s.id 
    WHERE (
        array_length(hotspot_prefixes, 1) IS NULL OR
        EXISTS (
            SELECT 1
            FROM unnest(hotspot_prefixes) AS prefix
            WHERE h.geohash LIKE (prefix || '%')
        )
    );
END;
$$ LANGUAGE plpgsql;



---------------------- TRIGGERS -----------------------------




CREATE OR REPLACE FUNCTION update_hotspots_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.geohash IS DISTINCT FROM NEW.geohash THEN
        -- Decrement count in the old hotspot if it existed
        IF OLD.geohash IS NOT NULL THEN
            UPDATE "Hotspots"
            SET count = count - 1,
                last_updated = NOW()
            WHERE geohash = OLD.geohash;
            
            -- Delete the hotspot if count reaches 0
            DELETE FROM "Hotspots"
            WHERE geohash = OLD.geohash AND count <= 0;
        END IF;

        -- Increment count in the new hotspot if it exists
        IF NEW.geohash IS NOT NULL THEN
            INSERT INTO "Hotspots" (geohash, count, last_updated)
            VALUES (NEW.geohash, 1, NOW())
            ON CONFLICT (geohash) DO UPDATE
            SET count = "Hotspots".count + 1,
                last_updated = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger for when acitve user data is updated and hotspots need to update as well
CREATE OR REPLACE TRIGGER update_hotspots_after_user_change
BEFORE UPDATE ON "Active Users"
FOR EACH ROW
EXECUTE FUNCTION update_hotspots_count();


-------- ADD USER / CHANGE USER HOTSPOT

CREATE OR REPLACE FUNCTION increment_hotspot()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment count in the new hotspot if it exists
    IF NEW.geohash IS NOT NULL THEN
        INSERT INTO "Hotspots" (geohash, count, last_updated)
        VALUES (NEW.geohash, 1, NOW())
        ON CONFLICT (geohash) DO UPDATE
        SET count = "Hotspots".count + 1,
            last_updated = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER update_hotspot_new_user
BEFORE INSERT 
ON "Active Users"
FOR EACH ROW
EXECUTE FUNCTION increment_hotspot();



-- ON DELTE USER
CREATE OR REPLACE FUNCTION decrement_hotspots_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrement count in the hotspot when a user is deleted
    IF OLD.geohash IS NOT NULL THEN
        UPDATE "Hotspots"
        SET count = count - 1,
            last_updated = NOW()
        WHERE geohash = OLD.geohash;
        
        -- Delete the hotspot if count reaches 0
        DELETE FROM "Hotspots"
        WHERE geohash = OLD.geohash AND count <= 0;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER decrement_hotspots_on_user_delete
AFTER DELETE ON "Active Users"
FOR EACH ROW
EXECUTE FUNCTION decrement_hotspots_on_delete();



----------------- HOTSPOTS GEOHASH TO LAT AND LONG




-- calculate lat and long from geohash after insert

CREATE OR REPLACE FUNCTION update_coordinates_from_geohash()
RETURNS TRIGGER AS $$
DECLARE
    point_geom GEOMETRY;
BEGIN

    IF NEW.geohash ~ '^[0123456789bcdefghjkmnpqrstuvwxyz]{7}$' THEN
        point_geom := ST_Centroid(ST_GeomFromGeoHash(NEW.geohash));
        NEW.longitude := ST_X(point_geom);
        NEW.latitude := ST_Y(point_geom);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'An error occurred in update_coordinates_from_geohash: % %', SQLERRM, SQLSTATE;
        RETURN NULL;  -- Or RAISE; depending on desired behavior
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call this function before insert or update
CREATE OR REPLACE TRIGGER trigger_update_coordinates
BEFORE INSERT OR UPDATE OF geohash ON "Hotspots"
FOR EACH ROW
EXECUTE FUNCTION update_coordinates_from_geohash();
