import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getCurrentlyPlayingTrack } from "./utils/spotify/spotifyPlayer.js";
import { getSpotifyAccessToken, refreshSpotifyToken } from "./utils/spotify/spotifyAuth.js";
import { getUserInfo } from "./utils/spotify/spotifyUserInfo.js";
import Database from "./database/Postgres.database.js";
import { hashToken } from "#utils/hashToken.js";
import crypto from 'crypto'
import { Console } from "console";

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



// update user location and fetch current song
app.post('/update-user-info', async function (req, res) {
  console.log('\n[/update-user-info] Request received');
  try {
    const { access_token, refresh_token, user_id, geohash, expires_in = 3600 } = req.body;

    // console.log('[/update-user-info] Debug - Received request body:', {
    //   user_id,
    //   access_token: access_token,
    //   refresh_token: refresh_token,
    //   geohash
    // });
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
    
    //hash token
    const tokenHash = hashToken(refresh_token);
    // console.log('[/update-user-info] Debug - Generated token hash:', tokenHash);

  
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
      // user does not exist in db
      // => add user to db
      if (dbError.code === '23588') {
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
    
    //return song data
    res.status(200).json({ track: isPlaying && track ? track : null, isPlaying: isPlaying });
  } catch (error) {
    console.error('[/update-user-info] Error:', error);
    res.status(500).json({ error: 'Failed to update user info' });
  }
});


// exchange token
app.post('/exchange-token', async function (req, res) {
  console.log('\n[/exchange-token] Request received');
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
        null,
        userProfile.image_url
      );
      console.log(`[/exchange-token] User ${userId} added/updated in DB.`);
    } catch (dbError) {
      console.error('[/exchange-token] Error saving user to DB:', dbError);
    }

    // console.log("object returned: ", {
    //   access_token: spotifyTokens.access_token,
    //   refresh_token: spotifyTokens.refresh_token,
    //   expires_in: spotifyTokens.expires_in,
    //   app_session_token: appSessionToken,
    //   user_id: userId
    // })


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
  console.log('\n[/refresh-token] Request received');
  try {
    const { refresh_token, user_id } = req.body;
    
    if (!refresh_token || !user_id) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // get new tokens from spotify
    const tokens = await refreshSpotifyToken(
      user_id,
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET,
      refresh_token
    );


    // if new refresh_token is returned change data in db 
    if (tokens.refresh_token) {
      const newTokenHash = hashToken(tokens.refresh_token);
      const expiresAt = Date.now() + tokens.expires_in * 1000;

      await Database.updateAuthToken(
        user_id,
        hashToken(refresh_token),
        newTokenHash,
        new Date(expiresAt)
      );
    } else {
      console.log('[/refresh-token] tokens.refresh_token == null');
    }

    res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
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

    // console.log("result: ", result);received
    res.status(200).json({ "users": result });
  } catch (error) {
    console.log("[/get_users_from_hotspots] Error: ", error);
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

app.get('/test', async function (req, res) {
  try {
    await Database.testConnection();

    res.status(200).send("OK");
  } catch (error) {
    console.log("[/test_connection_to_db] Error", error);
    res.status(500).json({ error: `Error ${error.code}` });
  }
});





app.listen(process.env.PORT);