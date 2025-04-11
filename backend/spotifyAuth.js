const axios = require('axios');
const querystring = require('querystring');

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

async function getAccessToken(code) {
    /*
    const body = querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
    });

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
            'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64'),
    };

    const response = await axios.post('https://accounts.spotify.com/api/token', body, { headers });

    return response.data;

     */
}

module.exports = { getAccessToken };
