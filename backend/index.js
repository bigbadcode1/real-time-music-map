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


// app.get('/login', function (req, res) {
//   const client_id = process.env.SPOTIFY_CLIENT_ID;
//   const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
//   const state = "4hdkjhgfjkldasj;l";
//   const scope = [
//     'user-read-private',
//     'user-read-email',
//     'user-read-currently-playing',
//     'user-read-playback-state',
//     'user-modify-playback-state',
//     'user-read-recently-played',
//     'user-library-read',
//     'playlist-read-private',
//     'playlist-read-collaborative',
//     'streaming'
//   ].join(' ');


//   res.redirect('https://accounts.spotify.com/authorize?' +
//     querystring.stringify({
//       response_type: 'code',
//       client_id: client_id,
//       scope: scope,
//       redirect_uri: redirect_uri,
//       state: state
//     }));
//   });



//   app.get('/callback', async function (req, res) {
//     console.log("callback")
//     const code = req.query.code;
//     const AccessTokenResponse = await getSpotifyAccessToken(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET, code, process.env.SPOTIFY_REDIRECT_URI);
//     const track = await getCurrentlyPlayingTrack(AccessTokenResponse.access_token);
//     console.log(track.track.name);

//   });



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

app.post('/exchange-token', async function(req, res) {
    try {
        const { code } = req.body;
        const spotifyTokens = await getSpotifyAccessToken(
          process.env.SPOTIFY_CLIENT_ID,
          process.env.SPOTIFY_CLIENT_SECRET,
          code,
          req.body.redirectUri
        );

        const userProfile = await getUserInfo(spotifyTokens.access_token);
        const userId = userProfile.id;
        const userName = userProfile.name;

        const appSessionToken = crypto.randomBytes(32).toString('hex');

        const hashedRefreshToken = hashToken(spotifyTokens.refresh_token);
        const expiresAt = Date.now() + spotifyTokens.expires_in * 1000;

        try {
            await Database.addNewUser(
                userId,
                userName,
                hashedRefreshToken,  
                expiresAt,
                null,
                userProfile.image_url
            );
            console.log(`[server.js /exchange-token] User ${userId} added/updated in DB.`);
        } catch (dbError) {
            console.error('[server.js /exchange-token] Error saving user to DB:', dbError);
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

app.post('/refresh-token', async function(req, res) {
    console.log('[Backend] Received POST request to /refresh-token');
    try {
      const { refresh_token, user_id } = req.body;
      
      if (!refresh_token || !user_id) {
        console.log('[Backend] Missing required fields');
        return res.status(400).json({ error: 'Refresh token and user_id are required' });
      }
      
      console.log('[Backend] Calling refreshSpotifyToken with plain token');
      const tokens = await refreshSpotifyToken(
        process.env.SPOTIFY_CLIENT_ID,
        process.env.SPOTIFY_CLIENT_SECRET,
        refresh_token
      );
      
      console.log('[Backend] Received new tokens from Spotify');

      const oldTokenHash = hashToken(refresh_token);
      const newTokenHash = hashToken(tokens.refresh_token);
      const expiresAt = Date.now() + tokens.expires_in * 1000;
      
      console.log('[Backend] Updating database with new token hash');
      await Database.updateAuthToken(
        user_id,
        oldTokenHash,           
        newTokenHash,           
        new Date(expiresAt)     
      );
      console.log(`[Backend] User ${user_id} auth token updated in DB.`);
      
      res.json({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in
      });
    } catch (error) {
      console.error('[Backend] Error in /refresh-token handler:', error);
      res.status(500).json({ error: 'Internal Server Error during token refresh.' });
    }
});


app.post('/update-user-info', async function (req, res) {
  try {
    const { access_token, refresh_token, user_id, geohash } = req.body;

    console.log('[/update-user-info] Debug - Received request body:', {
      user_id,
      has_refresh_token: !!refresh_token,
      geohash
    });

    if (!user_id || !access_token || !refresh_token) {
      return res.status(400).json({ error: 'Required data is missing' });
    }


    let track;
    try {
      const trackData = await getCurrentlyPlayingTrack(access_token);
      track = trackData?.track || null;
    } catch (error) {
      console.error('[/update-user-info] Error getting current track:', error);
      track = null;
    }

    const tokenHash = hashToken(refresh_token);
    console.log('[/update-user-info] Debug - Generated token hash for verification');

    try {

      await Database.updateUserInfo(
        user_id, 
        tokenHash,
        geohash, 
        track?.id || null, 
        track?.image || null, 
        track?.name || null, 
        track?.artist || null
      );
      console.log('[/update-user-info] Debug - Successfully updated user info');
    } catch (dbError) {
      console.error('[/update-user-info] Debug - Database error:', {
        error: dbError.message,
        code: dbError.code,
        detail: dbError.detail
      });
      throw dbError;
    }
    
    res.status(200).json({ track });
  } catch (error) {
    console.error('[/update-user-info] Error:', error);
    res.status(500).json({ error: 'Failed to update user info' });
  }
});



// ------------------- DATABASE QUERIES -------------------------------


// get hotspots from coordinates (provide two points NE and SW of the view box)
app.post('/get_hotspots', async function (req, res) {
  try {
    const { ne_lat, ne_long, sw_lat, sw_long } = req.body;

    if (isNaN(ne_lat) || isNaN(ne_long) || isNaN(sw_lat) || isNaN(sw_long)) {
      throw new Error("isNaN error for coordinates");
    }

    // test to get all hotspots (limited to top 20)
    // const result = await Database.getHotspots(90, 180, -90, -180);
    //

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

    if (!hotspots || !hotspots.length) {
      throw new Error("Invalid hotspots array");
    }


    let result = [];


    // example
    // result = await Database.getUsersFromHotspots(['xj', '4d1q', '6vw', 'd2zuqdt', 'kscwfkb']);
    //


    if (hotspots.length > 0) {
      result = await Database.getUsersFromHotspots(hotspots);
    }

    // console.log("result: ", result);
    res.status(200).json({ "users": result });
  } catch (error) {
    console.log("[/get_users_from_hotspots] Error: ", error);
    res.status(500).json({ error: "Failed to get users from hotspots" });
  }
});

app.post('/logout', async function(req, res) {
  console.log('[Backend] Received POST request to /logout');
  try {
    const { user_id } = req.body;

    if (!user_id) {
      console.log('[Backend] Logout: User ID is missing');
      return res.status(400).json({ error: 'User ID is required for logout' });
    }

    console.log(`[Backend] Logging out user: ${user_id}`);
    await Database.deleteUserOnLogout(user_id);

    console.log(`[Backend] User ${user_id} successfully logged out and data cleared.`);
    res.status(200).json({ message: 'Logout successful' });

  } catch (error) {
    console.error('[Backend] Error in /logout handler:', error);
    res.status(500).json({ error: 'Internal Server Error during logout.' });
  }
});

// ------------------- random testing

app.post('/db_test', async function (req, res) {
  try {


    //add new user test

    // now() + 1 hour
    const date = new Date(Date.now() + 60 * 60 * 1000);
    const secret_token = "mysecrettoekn123124";


    const hash = hashToken(secret_token);

    const user = {
      id: "userid1234123",
      name: "User Test 1234",
      token_hash: hash,
      expires_at: date,
      geohash: "eszbfxt"
    };

    const result = await Database.addNewUser(...Object.values(user));

    res.status(200).send("OK");
  } catch (error) {
    console.log("[/db_test] Error: ", error);
    res.status(500).json({ error: `Error ${error.code}` });
  }
});


app.listen(process.env.PORT);