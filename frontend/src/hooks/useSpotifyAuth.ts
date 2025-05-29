import { useState, useEffect, useMemo, useRef} from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, ResponseType, AuthRequestPromptOptions } from 'expo-auth-session';
import { exchangeCodeForTokens } from '@/src/services/spotifyAuthService';
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

export const useSpotifyAuth = (): UseSpotifyAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setIsLoggedIn } = useAuth();
  const isProcessingResponse = useRef<boolean>(false);

  // PROD
  const redirectUri = useMemo(() => {
    const scheme = "myapp"
    return makeRedirectUri({
      scheme: scheme,
    });
  }, []);

  // DEV
  // const redirectUri = useMemo(() => process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI || 'no redirect uri', []);
  // useEffect(() => {
  //   console.log("[useSpotifyAuth] Using redirect URI: ", redirectUri);
  // }, [redirectUri]);

  useEffect(() => {
    console.log("[useSpotifyAuth] Using redirect URI: ", redirectUri);
    console.log("[useSpotifyAuth] Spotify Client ID (first few chars): ", process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID?.substring(0, 5) + '...');
  }, [redirectUri]);

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Code,
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || "",
      scopes: SCOPES,
      usePKCE: false,
      redirectUri: redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response && !isProcessingResponse.current) {
      isProcessingResponse.current = true;
      console.log("[useSpotifyAuth] Auth Response: ", response);
      if (response.type === 'error') {
        setError('Authentication error: ' + (response.params?.error_description || 'Unknown error'));
        setIsLoading(false);
        isProcessingResponse.current = false;
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        console.log('[useSpotifyAuth] User cancelled or dismissed login');
        setIsLoading(false);
        isProcessingResponse.current = false;
      } else if (response.type === 'success') {
        const { code } = response.params;

        console.log('[useSpotifyAuth] Authorization code received: ', code);


        exchangeCodeForTokens(code, redirectUri).then(async (exchangeResult) => {
          if (exchangeResult.success) {
            console.log("[useSpotifyAuth] Token exchange successful");

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
        }).finally(() => {
          setIsLoading(false);
          isProcessingResponse.current = false;
        });
      } else {
        console.warn("[useSpotifyAuth] Unexpected auth response type: ", response.type);
        setIsLoading(false);
        isProcessingResponse.current = false;
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
    isProcessingResponse.current = false;

    try {
      console.log("[useSpotifyAuth] Calling promptAsync...");
      await promptAsync();
    } catch (err: any) {
      console.error("[useSpotifyAuth] Error calling promptAsync:", err);
      setError(`Failed to start login process: ${err.message}`);
      setIsLoading(false);
    }
  };

  return {
    signInWithSpotify,
    isAuthRequestReady: !!request,
    isLoading,
    error,
  };
};