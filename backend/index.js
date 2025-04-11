import express from "express";
import * as querystring from "node:querystring";
import dotenv from "dotenv";
import {getSpotifyAccessToken} from "./spotifyAuth.js";
import {getCurrentlyPlayingTrack} from "./spotifyPlayer.js";

dotenv.config();


var app = express();
app.use(express.json());

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



app.listen(8888)

