import express from "express";
import * as querystring from "node:querystring";
import cors from "cors";
import dotenv from "dotenv";
import { getSpotifyAccessToken } from "./utils/spotify/spotifyAuth.js";
import { getCurrentlyPlayingTrack } from "./utils/spotify/spotifyPlayer.js";
import { getUserInfo } from "#utils/spotify/spotifyUserInfo.js";
import Database from "./database/Postgres.database.js";
import { hashToken } from "#utils/hashToken.js";
import geohash from 'ngeohash';

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
  
  app.get('/currentTrack', async function (req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    const accessToken = authHeader.split(' ')[1];
    const track = await getCurrentlyPlayingTrack(accessToken);
    
    if (!track) {
      return res.status(204).send(); // No track playing
    }

    

    res.json(track);
  } catch (error) {
    console.error('Error in /currentTrack:', error);
    res.status(500).json({ error: 'Failed to get current track' });
  }
});


app.post('/exchange-token', async function (req, res) {
  try {
    console.log("req.body:", req.body);

    const { code } = req.body;    
    
    const tokens = await getSpotifyAccessToken(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET,
      code,
      req.body.redirectUri
    );

    // undefined check
    if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
      throw new Error("Error fetching tokens");
    }

    // fetch profile data for the user and hash token
    const user = await getUserInfo(tokens.access_token);
    const token_hash = hashToken(tokens.access_token);

    // add user to the database
    await Database.addNewUser(user.id, user.name, token_hash);

    res.status(200).json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in
    });


  } catch (error) {
    console.log('Error exchanging code for token:', error);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

app.post('/refresh-token', async function (req, res) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokens = await refreshSpotifyToken(
      process.env.SPOTIFY_CLIENT_ID,
      process.env.SPOTIFY_CLIENT_SECRET,
      refresh_token
    );


    res.status(200).json({
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

async function getUserIdFromAccessToken(accessToken) {
  try {
    const hashedToken = hashToken(accessToken);
    const result = await Database.query('SELECT user_id FROM "Auth" WHERE auth_token_hash = $1', [hashedToken]);
    if (result.rows.length > 0) {
      return result.rows[0].user_id;
    }
  } catch (error) {
    console.error('Error getting user ID from access token:', error);
  }
  return null;
}

app.post('/update-user-location', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    const accessToken = authHeader.split(' ')[1];
    const userId = await getUserIdFromAccessToken(accessToken); // Securely get user ID
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    const { latitude, longitude, song } = req.body;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const geohashValue = geohash.encode(latitude, longitude, 7); // Ensure geohash is consistent

    let songId = null;
    let songImage = null;
    let songTitle = null;
    let songArtist = null;

    if (song && song.track) {
      songId = song.track.uri ? song.track.uri.split(':').pop() : null; // Extract ID from Spotify URI
      songImage = song.track.image || null;
      songTitle = song.track.name || null;
      songArtist = song.track.artist || null;
    }

    // Call your database function to update user info
    await Database.updateUserInfo(
      userId,
      hashToken(accessToken), // Always pass the hashed token for verification
      geohashValue,
      songId,
      songImage,
      songTitle,
      songArtist
    );

    res.status(200).json({ message: 'User location and track updated successfully' });
  } catch (error) {
    console.error('Error in /update-user-location:', error);
    // Handle specific database errors (e.g., 'UE001' for invalid token)
    if (error.code === 'UE001') { // Example custom error code from your DB function
      return res.status(401).json({ error: 'Authentication token invalid' });
    }
    if (error.code === '23505') { // Example specific error code for 'User does not exist' from your DB function
      return res.status(404).json({ error: 'User not found or already logged out' });
    }
    res.status(500).json({ error: 'Failed to update user location and track' });
  }
});


// Endpoint to get hotspots based on a given location and radius
// Your frontend sends latitude, longitude, geohash, and radius.
// Your getHotspots DB function takes NE_lat, NE_long, SW_lat, SW_long.
app.post('/nearby-hotspots', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body; // radius in meters

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
      return res.status(400).json({ error: 'Invalid coordinates or radius' });
    }

    // Calculate bounding box based on center (latitude, longitude) and radius
    // This is a simplified calculation and might not be perfectly accurate for large radii
    // More accurate would involve PostGIS ST_Expand or similar geographical calculations.
    // For smaller radii, this approximation is usually fine.
    const latDegreesPerKm = 1 / 111.32; // Approx. 1 degree latitude = 111.32 km
    const longDegreesPerKm = 1 / (111.32 * Math.cos(latitude * (Math.PI / 180))); // Varies with latitude

    const latDelta = (radius / 1000) * latDegreesPerKm;
    const longDelta = (radius / 1000) * longDegreesPerKm;

    const ne_lat = latitude + latDelta;
    const ne_long = longitude + longDelta;
    const sw_lat = latitude - latDelta;
    const sw_long = longitude - longDelta;

    const hotspots = await Database.getHotspots(ne_lat, ne_long, sw_lat, sw_long);
    console.log("backend, hotspots: ", hotspots);
    // Frontend HotspotData has more fields than returned by your getHotspots function.
    // You'll need to decide how to populate these extra fields ('size', 'activity', etc.)
    // For now, let's map the basic data.
    const formattedHotspots = hotspots.map(h => ({
      id: h.geohash, // Use geohash as ID
      coordinate: { latitude: h.latitude, longitude: h.longitude },
      size: 'medium', // Placeholder, calculate based on count
      activity: 'medium', // Placeholder, calculate based on count/last_updated
      userCount: h.count,
      songCount: 0, // Placeholder, requires more data
      dominantGenre: null, // Placeholder
      locationName: `Hotspot ${h.geohash}`, // Placeholder
      geohash: h.geohash,
      topTracks: [], // Placeholder, fetch with get_users_from_hotspots later
      topAlbums: [],
      topArtists: [],
      topGenres: [],
      recentListeners: [],
      timestamp: new Date().toISOString()
    }));


    res.status(200).json({ hotspots: formattedHotspots });
  } catch (error) {
    console.error('Error in /nearby-hotspots:', error);
    res.status(500).json({ error: 'Failed to get nearby hotspots' });
  }
});

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
    console.log("Error ", error.code)
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
    console.log(error);
    res.status(500).json({ error: "Failed to get users from hotspots" });
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
    console.log("error in /db_test -", "Error", error.code)
    res.status(500).json({ error: `Error ${error.code}` });
  }
});


app.listen(process.env.PORT);