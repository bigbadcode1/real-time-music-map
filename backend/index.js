import express from "express";
import * as querystring from "node:querystring";
import cors from "cors";
import dotenv from "dotenv";
import { getSpotifyAccessToken } from "./utils/spotify/spotifyAuth.js";
import { getCurrentlyPlayingTrack } from "./utils/spotify/spotifyPlayer.js";
import Database from "./database/Postgres.database.js";
import { hashToken } from "#utils/hashToken.js";


dotenv.config();





var app = express();

app.use(express.json());
app.use(cors());


// --------------------- SPOTIFY API -------------------------
app.get('/login', function (req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;
  const state = "4hdkjhgfjkldasj;l";
  const scope = [
    'user-read-private',
    'user-read-email',
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-recently-played',
    'user-library-read',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ');


  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});




app.get('/callback', async function (req, res) {
  console.log("callback")
  const code = req.query.code;
  const AccessTokenResponse = await getSpotifyAccessToken(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET, code, process.env.SPOTIFY_REDIRECT_URI);
  const track = await getCurrentlyPlayingTrack(AccessTokenResponse.access_token);
  console.log(track.track.name);

});

app.get('/currentTrack', async function (req, res) {
  const track = await getCurrentlyPlayingTrack(req.session.accessToken);
  console.log(track.track.name);

})

app.post('/exchange-token', async function (req, res) {
  try {
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

    res.status(200).json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in
    });


  } catch (error) {
    console.error('Error exchanging code for token:', error);
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
