-- Hotspots: Add a timestamp for last activity
CREATE TABLE "Hotspots" (
  geohash VARCHAR(8) PRIMARY KEY NOT NULL CHECK(geohash ~ '^[0123456789bcdefghjkmnpqrstuvwxyz]{8}$'),
  count INT NOT NULL DEFAULT 0 CHECK (count >= 0),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- table with spotify songs to reduce api calls
CREATE TABLE "Songs" (
  id TEXT PRIMARY KEY NOT NULL CHECK(id ~ '^[0-9A-Za-z]{10,80}$'),
  image_url TEXT NOT NULL CHECK(image_url ~ '^https?://[^\s/$.?#].[^\s]*$'),
  title TEXT,
  artist TEXT
);

CREATE TABLE "Active Users" (
  id TEXT PRIMARY KEY NOT NULL CHECK(id ~ '^[0-9A-Za-z]{10,80}$'),
  name TEXT NOT NULL,
  song_id TEXT NOT NULL REFERENCES "Songs"(id),
  geohash VARCHAR(8) REFERENCES "Hotspots"(geohash) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- add token expiration and hashing
CREATE TABLE "Auth" (
  user_id TEXT PRIMARY KEY REFERENCES "Active Users"(id),
  auth_token_hash TEXT NOT NULL,  -- Hashed version
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

