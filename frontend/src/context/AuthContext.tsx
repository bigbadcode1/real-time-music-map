import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SpotifyTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_timestamp: number; // When the token was obtained
};

// Define a key for storing the app session token
const APP_SESSION_TOKEN_KEY = 'appSessionToken';

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  accessToken: string | null; // Spotify access token
  appSessionToken: string | null; // Our custom application session token
  setIsLoggedIn: (value: boolean, appSessionToken?: string) => void; // Updated to accept appSessionToken
  logout: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>; // For Spotify token
  getAppSessionToken: () => Promise<string | null>; // New method for our token
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedInState] = useState(false); // Renamed to avoid clash
  const [userId, setUserId] = useState<string | null>(null);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null); // Renamed for clarity
  const [appSessionToken, setAppSessionToken] = useState<string | null>(null); // New state for app token

  // Check if Spotify token is expired (with 5 minute buffer)
  const isSpotifyTokenExpired = (tokens: SpotifyTokens): boolean => {
    const now = Date.now();
    const tokenAge = (now - tokens.token_timestamp) / 1000; // Convert to seconds
    return tokenAge >= (tokens.expires_in - 300); // 5 minute buffer
  };

  // Refresh Spotify access token using refresh token
  const refreshSpotifyAccessToken = async (refreshToken: string): Promise<SpotifyTokens | null> => {
    try {
      console.log('[AuthContext] Refreshing Spotify access token...');
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Spotify Token refresh failed: ${response.status}`);
      }

      const newTokens = await response.json();
      const tokensWithTimestamp = {
        ...newTokens,
        token_timestamp: Date.now(),
      };

      // Store new Spotify tokens
      await AsyncStorage.setItem('spotifyTokens', JSON.stringify(tokensWithTimestamp));
      console.log('[AuthContext] Spotify Token refreshed successfully');
      
      return tokensWithTimestamp;
    } catch (error) {
      console.error('[AuthContext] Error refreshing Spotify token:', error);
      return null;
    }
  };

  // Get user profile information from Spotify
  const getUserProfile = async (token: string): Promise<string | null> => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user profile from Spotify: ${response.status}`);
      }

      const profile = await response.json();
      return profile.id;
    } catch (error) {
      console.error('[AuthContext] Error getting user profile from Spotify:', error);
      return null;
    }
  };

  // Get a valid Spotify access token, refreshing if necessary
  const getValidAccessToken = async (): Promise<string | null> => {
    try {
      const tokensString = await AsyncStorage.getItem('spotifyTokens');
      if (!tokensString) {
        console.log('[AuthContext] No Spotify tokens found');
        return null;
      }

      let tokens: SpotifyTokens = JSON.parse(tokensString);

      // Check if token needs refresh
      if (isSpotifyTokenExpired(tokens)) {
        console.log('[AuthContext] Spotify Token expired, refreshing...');
        const refreshedTokens = await refreshSpotifyAccessToken(tokens.refresh_token);
        if (!refreshedTokens) {
          console.log('[AuthContext] Failed to refresh Spotify token, logging out');
          await logout(); // Ensure full logout if Spotify refresh fails
          return null;
        }
        tokens = refreshedTokens;
        setSpotifyAccessToken(tokens.access_token);
      }

      return tokens.access_token;
    } catch (error) {
      console.error('[AuthContext] Error getting valid Spotify access token:', error);
      return null;
    }
  };

  // New function to get the application session token
  const getAppSessionToken = async (): Promise<string | null> => {
    if (appSessionToken) {
      return appSessionToken;
    }
    // Attempt to load from AsyncStorage if not in state (e.g., app restart)
    try {
      const storedToken = await AsyncStorage.getItem(APP_SESSION_TOKEN_KEY);
      if (storedToken) {
        setAppSessionToken(storedToken);
        return storedToken;
      }
    } catch (error) {
      console.error('[AuthContext] Error retrieving app session token from storage:', error);
    }
    return null;
  };


  // Check for existing tokens on mount
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        setIsLoading(true); // Ensure loading state is true at start

        // Try to load Spotify tokens
        const spotifyTokensString = await AsyncStorage.getItem('spotifyTokens');
        let currentSpotifyAccessToken: string | null = null;
        let currentUserId: string | null = null;

        if (spotifyTokensString) {
          const spotifyTokens: SpotifyTokens = JSON.parse(spotifyTokensString);
          if (spotifyTokens.access_token) {
            currentSpotifyAccessToken = await getValidAccessToken(); // This will refresh if needed
            if (currentSpotifyAccessToken) {
              setSpotifyAccessToken(currentSpotifyAccessToken);
              currentUserId = await getUserProfile(currentSpotifyAccessToken);
              if (currentUserId) {
                setUserId(currentUserId);
              } else {
                console.log('[AuthContext] Failed to get Spotify user profile during status check.');
              }
            } else {
              console.log('[AuthContext] No valid Spotify access token available during status check.');
            }
          }
        }

        // Try to load application session token
        const storedAppSessionToken = await AsyncStorage.getItem(APP_SESSION_TOKEN_KEY);
        if (storedAppSessionToken && currentUserId) { // Only consider logged in if we have both app token AND userId
          setAppSessionToken(storedAppSessionToken);
          setIsLoggedInState(true);
          console.log('[AuthContext] Successfully restored auth state with app session token and user ID.');
        } else {
          console.log('[AuthContext] No valid app session token or user ID found, logging out.');
          await logout(); // Ensure a clean state if partial data
        }
      } catch (error) {
        console.error('[AuthContext] Error checking login status:', error);
        await logout(); // Clear any corrupted state
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []); // Empty dependency array ensures this runs once on mount


  // Update login state and fetch user info when tokens are stored
  // This is called by useSpotifyAuth upon successful login
  const setIsLoggedIn = async (value: boolean, receivedAppSessionToken?: string) => {
    if (value) {
      // When logging in, get the fresh tokens and user info
      try {
        console.log('[AuthContext] Starting login process from setIsLoggedIn...');
        
        // Ensure Spotify token is valid
        const validSpotifyToken = await getValidAccessToken();
        if (!validSpotifyToken) {
          throw new Error('No valid Spotify access token available after login.');
        }
        setSpotifyAccessToken(validSpotifyToken);

        // Fetch user ID
        const userProfileId = await getUserProfile(validSpotifyToken);
        if (!userProfileId) {
          throw new Error('Failed to get user profile from Spotify after login.');
        }
        setUserId(userProfileId);

        // Store the application session token if provided
        if (receivedAppSessionToken) {
          await AsyncStorage.setItem(APP_SESSION_TOKEN_KEY, receivedAppSessionToken);
          setAppSessionToken(receivedAppSessionToken);
          console.log('[AuthContext] Stored and set app session token.');
        } else {
          console.warn('[AuthContext] setIsLoggedIn called with true but no appSessionToken provided!');
          // You might want to throw an error or handle this case more strictly
          throw new Error('App session token missing during login.');
        }
        
        // IMPORTANT: Set isLoggedIn to true LAST to avoid race conditions
        setIsLoggedInState(true);
        console.log('[AuthContext] Setting isLoggedIn to true with user ID:', userProfileId);

      } catch (error) {
        console.error('[AuthContext] Error during login initiated by setIsLoggedIn:', error);
        await logout(); // Ensure full logout on any login error
      }
    } else {
      setIsLoggedInState(false);
    }
  };

  const logout = async () => {
    try {
      // IMPORTANT: Set isLoggedIn to false FIRST to stop real-time updates immediately
      setIsLoggedInState(false);
      setUserId(null);
      setSpotifyAccessToken(null);
      setAppSessionToken(null);
      await AsyncStorage.removeItem('spotifyTokens');
      await AsyncStorage.removeItem(APP_SESSION_TOKEN_KEY); // Clear app session token
      console.log('[AuthContext] Logout successful, all tokens cleared.');
    } catch (error) {
      console.log('[AuthContext] Error during logout:', error);
    }
  };

  const value = {
    isLoggedIn,
    isLoading,
    userId,
    accessToken: spotifyAccessToken, // Provide Spotify access token
    appSessionToken, // Provide our custom app session token
    setIsLoggedIn,
    logout,
    getValidAccessToken, // For Spotify token
    getAppSessionToken, // For our custom token
  };

  if (isLoading) {
    return null; // Or a global loading spinner if desired
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}