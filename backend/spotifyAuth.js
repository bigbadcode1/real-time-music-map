import axios from 'axios';
import queryString from 'querystring';
import dotenv from 'dotenv';
dotenv.config();

export async function getSpotifyAccessToken(clientId, clientSecret, code, redirectUri) {
    try {
        const tokenUrl = 'https://accounts.spotify.com/api/token';

        // Encode client ID and secret in base64
        const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');



        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        return response.data; // Contains access_token, refresh_token, etc.
    } catch (error) {
        console.error('Error exchanging code for token:', error.response?.data || error.message);
        throw error;
    }
}
