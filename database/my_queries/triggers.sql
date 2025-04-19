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
AFTER UPDATE ON "Active Users"
FOR EACH ROW
EXECUTE FUNCTION update_hotspots_count();



-- when adding a new user
----------------------------------------

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