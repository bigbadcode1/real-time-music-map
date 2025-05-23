import dotenv from 'dotenv';
dotenv.config();

const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

export async function getSpotifyAccessToken(client_id, client_secret, code, redirect_uri) {
  try {
      const tokenUrl = SPOTIFY_TOKEN_ENDPOINT;
      
      // Encode client ID and secret in base64
      const authString = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
      
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', redirect_uri);
      
      const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params
      });
      
      if (!response.ok) {
          const errorData = await response.text();
          console.error(`Spotify Token exchange error details: ${errorData}`);
          throw new Error(`Token exchange error: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
  } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
  }
}

export async function refreshSpotifyToken(client_id, client_secret, refresh_token) {
  try {
    console.log('[spotifyAuth] Attempting to refresh Spotify token');
    console.log('[spotifyAuth] Using client_id:', client_id?.substring(0, 10) + '...');
    console.log('[spotifyAuth] Using refresh_token:', refresh_token?.substring(0, 20) + '...');
    
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
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

    console.log('[spotifyAuth] Spotify API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[spotifyAuth] Spotify Refresh token error details: ${errorData}`);
      throw new Error(`Refresh token error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('[spotifyAuth] Successfully refreshed token from Spotify');
    
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token || refresh_token
    };
  } catch (error) {
    console.error('[spotifyAuth] Error refreshing token:', error);
    throw error;
  }
}