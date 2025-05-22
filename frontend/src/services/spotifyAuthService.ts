import AsyncStorage from '@react-native-async-storage/async-storage';

interface ExchangeResult {
  success: boolean;
  error?: string;
  appSessionToken?: string;
}

interface RefreshResult {
  success: boolean;
  error?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

export const refreshTokens = async (
  refreshToken: string,
  userId: string
): Promise<RefreshResult> => {
  try {
    console.log('[spotifyAuthService] Refreshing tokens with backend...');
    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        refresh_token: refreshToken,
        user_id: userId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[spotifyAuthService] Token refresh failed: ${response.status} - ${errorText}`);
      return { success: false, error: `Refresh failed: ${response.status}` };
    }

    const data = await response.json();
    console.log('[spotifyAuthService] Token refresh response:', data);

    const spotifyTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_timestamp: Date.now(),
    };
    await AsyncStorage.setItem('spotifyTokens', JSON.stringify(spotifyTokens));

    return { 
      success: true,
      ...data
    };
  } catch (error: any) {
    console.error('[spotifyAuthService] Error refreshing tokens:', error);
    return { success: false, error: error.message || 'Unknown error during token refresh' };
  }
};

export const exchangeCodeForTokens = async (
  code: string,
  redirectUri: string
): Promise<ExchangeResult> => {
  try {
    console.log('[spotifyAuthService] Exchanging code for tokens with backend...');
    const backendAuthEndpoint = `${process.env.EXPO_PUBLIC_BACKEND_URL}/exchange-token`;

    const response = await fetch(backendAuthEndpoint, {
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


    const { access_token, refresh_token, expires_in, app_session_token, user_id } = data;

    if (!access_token || !refresh_token || !expires_in || !app_session_token || !user_id) {
        console.error('[spotifyAuthService] Missing required data in backend response.');
        console.error('Received data:', data);
        return { success: false, error: 'Missing token data from backend.' };
    }

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
    };

  } catch (error: any) {
    console.error('[spotifyAuthService] Error during code exchange:', error);
    return { success: false, error: error.message || 'Unknown error during token exchange.' };
  }
};