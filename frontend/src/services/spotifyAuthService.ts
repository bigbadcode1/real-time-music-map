import { AuthError } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

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