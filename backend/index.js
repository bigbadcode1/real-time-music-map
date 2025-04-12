import express from "express";
import * as querystring from "node:querystring";
import cors from "cors";
import dotenv from "dotenv";
import {getSpotifyAccessToken} from "./spotifyAuth.js";
import {getCurrentlyPlayingTrack} from "./spotifyPlayer.js";

dotenv.config();


var app = express();
app.use(express.json());
app.use(cors());
app.get('/login', function(req, res) {
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

app.post('/exchange-token', async function(req, res) {
    try {
        const { code } = req.body;
        const tokens = await getSpotifyAccessToken(
          process.env.SPOTIFY_CLIENT_ID, 
          process.env.SPOTIFY_CLIENT_SECRET, 
          code, 
          req.body.redirectUri
        );

        // return token to client
        res.json({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in
        });
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        res.status(500).json({ error: 'Failed to exchange code for token' });
    }
});

app.post('/refresh-token', async function(req, res) {
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

app.listen(8888)

