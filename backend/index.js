import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getCurrentlyPlayingTrack } from "./utils/spotify/spotifyPlayer.js";
import { getSpotifyAccessToken, refreshSpotifyToken } from "./utils/spotify/spotifyAuth.js";
import { getUserInfo } from "./utils/spotify/spotifyUserInfo.js";
import Database from "./database/Postgres.database.js";
import { hashToken } from "#utils/hashToken.js";
import crypto from 'crypto'

dotenv.config();

var app = express();

app.use(express.json());
app.use(cors());

// --------------------- SPOTIFY API -------------------------

// get currently playing track
app.get('/currentTrack', async function (req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    const accessToken = authHeader.split(' ')[1];
    const track = await getCurrentlyPlayingTrack(accessToken);

    if (!track) {
      return res.status(204).send();
    }

    res.json(track);
  } catch (error) {
    console.error('[/currentTrack] Error', error);
    res.status(500).json({ error: 'Failed to get current track' });
  }
});

// update user location and fetch current song
app.post('/update-user-info', async function (req, res) {
  try {
    const { access_token, refresh_token, user_id, geohash, expires_in = 3600 } = req.body;

    if (!user_id || !access_token || !refresh_token) {
      return res.status(400).json({ error: 'Required data is missing' });
    }

    // fetch current song data
    let track = null;
    let isPlaying = false;
    try {
      const trackData = await getCurrentlyPlayingTrack(access_token);
      if(trackData && trackData.track) {
        track = trackData.track;
        isPlaying = trackData.isPlaying
      } else {
        console.log('[/update-user-info] No track currently playing for user, or track data is empty.');
      }
    } catch (error) {
      console.error('[/update-user-info] Error getting current track:', error);
    }

    // hash token
    const tokenHash = hashToken(refresh_token);

    // send user data to db
    try {
      await Database.updateUserInfo(
        user_id,
        tokenHash,
        geohash,
        track ? track.id : null,
        track ? track.image : null,
        track ? track.name : null,
        track ? track.artist : null,
      );
      console.log('[/update-user-info] Debug - Successfully updated user info');

    } catch (dbError) {
      // Check if user does not exist (error code for user not found)
      if (dbError.code === '42704') {
        try {
          // fetch user profile info 
          const userProfile = await getUserInfo(access_token);
          const userId = userProfile.id;
          const userName = userProfile.name;

          const hashedRefreshToken = hashToken(refresh_token);
          const expiresAt = Date.now() + expires_in * 1000;

          // add user
          await Database.addNewUser(
            userId,
            userName,
            hashedRefreshToken,
            expiresAt,
            geohash,
            userProfile.image_url
          );
          console.log(`[/update-user-info] User ${userId} added to DB.`);
        } catch (userCreationError) {
          console.error('[/update-user-info] Error adding user to DB:', userCreationError);
          throw userCreationError;
        }
      } else {
        console.error('[/update-user-info] Debug - Database error:', {
          error: dbError.message,
          code: dbError.code,
          detail: dbError.detail
        });
        throw dbError;
      }
    }

    // return song data
    res.status(200).json({ track: isPlaying && track ? track : null, isPlaying: isPlaying });
  } catch (error) {
    console.error('[/update-user-info] Error:', error);
    res.status(500).json({ error: 'Failed to update user info' });
  }
});

// exchange token
app.post('/exchange-token', async function (req, res) {
  try {
    // get tokens
    const { code } = req.body;
    const spotifyTokens = await getSpotifyAccessToken(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET,
      code,
      req.body.redirectUri
    );

    // get user profile info
    const userProfile = await getUserInfo(spotifyTokens.access_token);
    const userId = userProfile.id;
    const userName = userProfile.name;

    const appSessionToken = crypto.randomBytes(32).toString('hex');

    const hashedRefreshToken = hashToken(spotifyTokens.refresh_token);
    const expiresAt = Date.now() + spotifyTokens.expires_in * 1000;

    // add/update user to db 
    try {
      await Database.addNewUser(
        userId,
        userName,
        hashedRefreshToken,
        expiresAt,
        null, // no geohash initially
        userProfile.image_url
      );
      console.log(`[/exchange-token] User ${userId} added/updated in DB.`);
    } catch (dbError) {
      console.error('[/exchange-token] Error saving user to DB:', dbError);
      return res.status(500).json({ error: 'Failed to save user to database' });
    }

    res.json({
      access_token: spotifyTokens.access_token,
      refresh_token: spotifyTokens.refresh_token,
      expires_in: spotifyTokens.expires_in,
      app_session_token: appSessionToken,
      user_id: userId
    });

  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).json({ error: 'Failed to exchange code for token or fetch user profile' });
  }
});

// refresh user token after it expired
app.post('/refresh-token', async function (req, res) {
  try {
    const { refresh_token, user_id } = req.body;

    if (!refresh_token || !user_id) {
      return res.status(400).json({ error: 'Refresh token and user ID are required' });
    }

    // get new tokens from spotify
    const tokens = await refreshSpotifyToken(
      user_id,
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET,
      refresh_token
    );

    // if new refresh_token is returned, update data in db 
    if (tokens.refresh_token) {
      const newTokenHash = hashToken(tokens.refresh_token);
      const expiresAt = Date.now() + tokens.expires_in * 1000;

      try {
        await Database.updateAuthToken(
          user_id,
          hashToken(refresh_token), // old token hash
          newTokenHash,             // new token hash
          new Date(expiresAt)       // new expiration
        );
        console.log(`[/refresh-token] Updated auth token for user ${user_id}`);
      } catch (dbError) {
        console.error('[/refresh-token] Error updating auth token:', dbError);
        // Continue anyway since we got valid tokens from Spotify
      }
    } else {
      console.log('[/refresh-token] No new refresh token received from Spotify');
    }

    res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refresh_token, // fallback to old token
      expires_in: tokens.expires_in
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// ------------------- DATABASE QUERIES -------------------------------

// get hotspots from coordinates (provide two points NE and SW of the view box)
app.post('/get_hotspots', async function (req, res) {
  try {
    const { ne_lat, ne_long, sw_lat, sw_long } = req.body;

    if (isNaN(ne_lat) || isNaN(ne_long) || isNaN(sw_lat) || isNaN(sw_long)) {
      return res.status(400).json({ error: "Invalid coordinates provided" });
    }

    // Validate coordinate ranges
    if (ne_lat < -90 || ne_lat > 90 || sw_lat < -90 || sw_lat > 90 ||
        ne_long < -180 || ne_long > 180 || sw_long < -180 || sw_long > 180) {
      return res.status(400).json({ error: "Coordinates out of valid range" });
    }

    const result = await Database.getHotspots(ne_lat, ne_long, sw_lat, sw_long);

    res.status(200).json({ "hotspots": result })
  } catch (error) {
    console.error("[/get_hotspots] Error ", error)
    res.status(500).json({ error: "Failed to get hotspots" });
  }
});

// get users from an array of hotspots (geohashes)
app.post('/get_users_from_hotspots', async function (req, res) {
  try {
    const { hotspots } = req.body;

    if (!hotspots || !Array.isArray(hotspots)) {
      return res.status(400).json({ error: "Invalid hotspots array" });
    }

    let result = [];

    if (hotspots.length > 0) {
      // Validate geohash format
      const validGeohashes = hotspots.filter(geohash => 
        typeof geohash === 'string' && 
        geohash.length > 0 && 
        geohash.length <= 7 &&
        /^[0123456789bcdefghjkmnpqrstuvwxyz]+$/i.test(geohash)
      );

      if (validGeohashes.length > 0) {
        result = await Database.getUsersFromHotspots(validGeohashes);
      }
    }

    res.status(200).json({ "users": result });
  } catch (error) {
    console.error("[/get_users_from_hotspots] Error: ", error);
    res.status(500).json({ error: "Failed to get users from hotspots" });
  }
});

app.post('/logout', async function (req, res) {
  console.log('[Backend] Received POST request to /logout');
  try {
    const { user_id } = req.body;

    if (!user_id) {
      console.log('[Backend] Logout: User ID is missing');
      return res.status(400).json({ error: 'User ID is required for logout' });
    }

    console.log(`[Backend] Logging out user: ${user_id}`);
    
    // Use the delete_user function which properly handles hotspot cleanup
    await Database.deleteUser(user_id);

    console.log(`[Backend] User ${user_id} successfully logged out and data cleared.`);
    res.status(200).json({ message: 'Logout successful' });

  } catch (error) {
    console.error('[Backend] Error in /logout handler:', error);
    res.status(500).json({ error: 'Internal Server Error during logout.' });
  }
});

// ------------------- TESTING ENDPOINTS

app.post('/db_test', async function (req, res) {
  try {
    // now() + 1 hour
    const date = new Date(Date.now() + 60 * 60 * 1000);
    const secret_token = "mysecrettoken123124";
    const hash = hashToken(secret_token);

    const user = {
      id: "userid1234123",
      name: "User Test 1234",
      token_hash: hash,
      expires_at: date.getTime(), // Use timestamp
      geohash: "9q8yy", // Valid geohash format
      image_url: "https://example.com/image.jpg"
    };

    await Database.addNewUser(...Object.values(user));
    console.log('[/db_test] Test user added successfully');

    res.status(200).json({ message: "Test user added successfully" });
  } catch (error) {
    console.error("[/db_test] Error: ", error);
    res.status(500).json({ error: `Error ${error.code}: ${error.message}` });
  }
});

app.get('/test', async function (req, res) {
  try {
    await Database.testConnection();
    res.status(200).json({ message: "Database connection successful" });
  } catch (error) {
    console.error("[/test] Database connection error:", error);
    res.status(500).json({ error: `Database connection failed: ${error.message}` });
  }
});

// Cleanup endpoint (for testing/maintenance)
app.post('/cleanup', async function (req, res) {
  try {
    await Database.cleanupExpiredUsers();
    res.status(200).json({ message: "Cleanup completed successfully" });
  } catch (error) {
    console.error("[/cleanup] Error:", error);
    res.status(500).json({ error: "Failed to cleanup expired users" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});