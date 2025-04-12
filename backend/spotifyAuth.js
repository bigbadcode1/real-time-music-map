import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function getSpotifyAccessToken(client_id, client_secret, code, redirect_uri) {
    try {
        const tokenUrl = 'https://accounts.spotify.com/api/token';

        // Encode client ID and secret in base64
        const authString = Buffer.from(`${client_id}:${client_secret}`).toString('base64');



        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirect_uri);

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

export async function refreshSpotifyToken(client_id, client_secret, refresh_token) {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        }).toString()
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Refresh token error: ${response.status} - ${errorData}`);
      }
  
      const data = await response.json();
      return {
        access_token: data.access_token,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token || refresh_token 
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
