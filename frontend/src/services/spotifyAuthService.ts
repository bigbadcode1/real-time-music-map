import { AuthError } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

// give a 5 minute before actual expiration
export function isTokenExpired(expirationTime: number): boolean {
  return Date.now() + 5 * 60 * 1000 > expirationTime;
}

// function to refresh the access token
export async function refreshAccessToken(): Promise<{success: boolean; tokens?: any; error?: string}> {
  try {
    const storedTokens = await AsyncStorage.getItem('spotifyTokens');
    if (!storedTokens) {
      return { success: false, error: 'No stored tokens found' };
    }
    
    const { refresh_token, expires_at_current } = JSON.parse(storedTokens);
    
    // Check if we actually need to refresh
    if (expires_at_current && !isTokenExpired(expires_at_current)) {
      // Token is still valid, return stored tokens
      return { success: true, tokens: JSON.parse(storedTokens) };
    }
    
    // Token is expired or about to expire, refresh it
    const backendUrl = 'http://localhost:8888/refresh-token';
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
    }
    
    const newTokens = await response.json();
    
    // Calculate expiration time and store it
    const expires_at_new = Date.now() + (newTokens.expires_in * 1000);
    const tokensToStore = {
      ...newTokens,
      expires_at_new
    };
    
    // Store the new tokens
    await AsyncStorage.setItem('spotifyTokens', JSON.stringify(tokensToStore));
    
    return {
      success: true,
      tokens: tokensToStore,
    };
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: error.message || "Unknown error during token refresh",
    };
  }
}

// function only handles the backend communication
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{success: boolean; tokens?: any; error?: string | AuthError | null}> {
  try {
    const backendUrl = 'http://localhost:8888/exchange-token';
    console.log(`Exchanging code at ${backendUrl} with redirect URI: ${redirectUri}`);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri }),
    });

    if(!response.ok) {
      const errorText = await response.text();
      console.error("Backend Error Response: ", errorText);
      throw new Error(`Failed to exchange code: ${response.status} - ${errorText}`);
    }

    const tokens = await response.json();
    console.log("Tokens received from backend:", tokens);

    await AsyncStorage.setItem('spotifyTokens', JSON.stringify(tokens));

    return {
      success: true,
      tokens, // optional, idk whether they are needed
    };
  } catch (error: any) {
    console.error('Token exchange error: ', error);
    return {
      success: false,
      error: error.message || "unknown error during token exchange",
    };
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  try {
    const storedTokens = await AsyncStorage.getItem('spotifyTokens');
    
    if (!storedTokens) {
      console.error('No stored tokens found');
      return null;
    }
    
    const parsedTokens = JSON.parse(storedTokens);
    
    // Check if token is expired or about to expire
    if (parsedTokens.expires_at && isTokenExpired(parsedTokens.expires_at)) {
      // Token needs refreshing
      console.log('Token expired, refreshing...');
      const refreshResult = await refreshAccessToken();
      
      if (!refreshResult.success) {
        console.error('Failed to refresh token:', refreshResult.error);
        return null;
      }
      
      return refreshResult.tokens.access_token;
    }
    
    // Token is still valid
    return parsedTokens.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}