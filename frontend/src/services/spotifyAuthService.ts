// src/services/spotifyAuthService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

interface ExchangeResult {
  success: boolean;
  error?: string;
  appSessionToken?: string;
  // Other fields if you want to return Spotify tokens directly from this service
  // spotifyAccessToken?: string;
  // spotifyRefreshToken?: string;
  // userId?: string;
}

export const exchangeCodeForTokens = async (
  code: string,
  redirectUri: string
): Promise<ExchangeResult> => {
  try {
    console.log('[spotifyAuthService] Exchanging code for tokens with backend...');
    const backendAuthEndpoint = `${process.env.EXPO_PUBLIC_BACKEND_URL}/exchange-token`; // <--- UPDATE THIS URL
    // For example, if your backend handles it at '/api/auth/spotify', use that.
    // It MUST be an endpoint on your backend that securely exchanges the code.

    const response = await fetch(backendAuthEndpoint, { // Use the corrected endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[spotifyAuthService] Backend token exchange failed: ${response.status} - ${errorText}`);
      return { success: false, error: `Backend exchange failed: ${response.status}` };
    }

    const data = await response.json();
    console.log('[spotifyAuthService] Backend token exchange response:', data);

    // These fields MUST be returned by your backend's chosen endpoint
    const { access_token, refresh_token, expires_in, app_session_token, user_id } = data;

    if (!access_token || !refresh_token || !expires_in || !app_session_token || !user_id) {
        console.error('[spotifyAuthService] Missing required data in backend response.');
        console.error('Received data:', data); // Log the actual response for debugging
        return { success: false, error: 'Missing token data from backend.' };
    }

    // Store Spotify tokens (AuthContext will also store them via setIsLoggedIn, but this ensures immediate persistence)
    const spotifyTokens = {
        access_token,
        refresh_token,
        expires_in,
        token_timestamp: Date.now(),
    };
    await AsyncStorage.setItem('spotifyTokens', JSON.stringify(spotifyTokens));


    return {
      success: true,
      appSessionToken: app_session_token,
      // Optionally return Spotify tokens and user ID here if consumed elsewhere
      // spotifyAccessToken: access_token,
      // userId: user_id,
    };

  } catch (error: any) {
    console.error('[spotifyAuthService] Error during code exchange:', error);
    return { success: false, error: error.message || 'Unknown error during token exchange.' };
  }
};