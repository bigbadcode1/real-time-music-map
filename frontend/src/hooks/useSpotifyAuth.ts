import { useState, useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, ResponseType, AuthRequestPromptOptions } from 'expo-auth-session';
// Assume exchangeCodeForTokens is updated to return the app_session_token
import { exchangeCodeForTokens } from '@/src/services/spotifyAuthService'; // This service needs modification too
import { useAuth } from '@/src/context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = [
  'user-read-private', 'user-read-email', 'user-read-currently-playing',
  'user-read-playback-state', 'user-modify-playback-state', 'user-read-recently-played',
  'user-library-read', 'playlist-read-private', 'playlist-read-collaborative'
];

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

interface UseSpotifyAuthReturn {
  signInWithSpotify: () => Promise<void>;
  isAuthRequestReady: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to manage the Spotify authentication flow using Expo's AuthSession.
 *
 * Handles initiating the auth request, processing the response, exchanging the code
 * for tokens via the backend service, and managing loading/error states.
 */
export const useSpotifyAuth = (): UseSpotifyAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Destructure the updated setIsLoggedIn
  const { setIsLoggedIn } = useAuth(); 

  const redirectUri = useMemo(() => process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI || 'exp://192.168.0.101:8081', []);
  useEffect(() => {
    console.log("[useSpotifyAuth] Using redirect URI: ", redirectUri);
  }, [redirectUri]);

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Code,
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || "",
      scopes: SCOPES,
      usePKCE: false, // Spotify's Authorization Code Flow with PKCE is for confidential clients
      redirectUri: redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response) {
      console.log("[useSpotifyAuth] Auth Response: ", response);
      if (response.type === 'error') {
        setError('Authentication error: ' + (response.params?.error_description || 'Unknown error'));
        setIsLoading(false);
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        console.log('[useSpotifyAuth] User cancelled or dismissed login');
        setIsLoading(false);
      } else if (response.type === 'success') {
        const { code } = response.params;

        console.log('[useSpotifyAuth] Authorization code received: ', code);

        // exchangeCodeForTokens should now return both Spotify tokens AND app_session_token
        exchangeCodeForTokens(code, redirectUri).then(async (exchangeResult) => {
          if (exchangeResult.success) {
            console.log("[useSpotifyAuth] Token exchange successful");
            // Pass the appSessionToken to setIsLoggedIn
            await setIsLoggedIn(true, exchangeResult.appSessionToken); 
            setError(null);
            router.replace("/(root)/(tabs)/mapScreen");
          } else {
            console.error("[useSpotifyAuth] Token exchange failed: ", exchangeResult.error);
            setError(`Login failed during token exchange: ${exchangeResult.error}`);
            setIsLoading(false);
          }
        }).catch(err => {
          console.error("[useSpotifyAuth] Error during token exchange promise: ", err);
          setError(`An unexpected error occurred during token exchange: ${err.message}`);
          setIsLoading(false);
        });
      } else {
        console.warn("[useSpotifyAuth] Unexpected auth response type: ", response.type);
        setIsLoading(false);
      }
    }
  }, [response, redirectUri, setIsLoggedIn]);

  const signInWithSpotify = async () => {
    if (!request) {
      const errorMessage = "Authentication request is not ready. Please wait or check configuration.";
      setError(errorMessage);
      console.error("[useSpotifyAuth] Auth Request object is null or undefined.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      console.log("[useSpotifyAuth] Calling promptAsync...");
      await promptAsync();
      // Result is handled by the useEffect[response] hook.
      // isLoading remains true until the useEffect handles the response (success, error, or cancel).
    } catch (err: any) {
      console.error("[useSpotifyAuth] Error calling promptAsync:", err);
      setError(`Failed to start login process: ${err.message}`);
      setIsLoading(false);
    }
  };

  return {
    signInWithSpotify,
    isAuthRequestReady: !!request, // Boolean indicating if request is ready
    isLoading,
    error,
  };
};