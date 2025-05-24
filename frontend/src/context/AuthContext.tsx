import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SpotifyTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_timestamp: number;
};

const APP_SESSION_TOKEN_KEY = 'appSessionToken';

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  accessToken: string | null;
  appSessionToken: string | null;
  setIsLoggedIn: (value: boolean, appSessionToken?: string) => void;
  logout: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
  getAppSessionToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedInState] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
  const [appSessionToken, setAppSessionToken] = useState<string | null>(null);

  const spotifyRefreshPromiseRef = useRef<Promise<SpotifyTokens | null> | null>(null);

  // Check if Spotify token is expired (with 5 minute buffer)
  const isSpotifyTokenExpired = (tokens: SpotifyTokens): boolean => {
    const now = Date.now();
    const tokenAge = (now - tokens.token_timestamp) / 1000;
    return tokenAge >= (tokens.expires_in - 300);
      // const testExpiryDuration = 60 * 60 * 1000; // 20 seconds for testing
      // const expiresAt = tokens.token_timestamp + testExpiryDuration; // Calculate expiry based on a short test duration

      // const expired = now >= expiresAt;
      // console.log(`[AuthContext] Token expiry check (TEST MODE): now=${now}, expiresAt=${expiresAt}, expired=${expired}`);
      // return expired;
  };

const refreshSpotifyAccessToken = async (refreshToken: string): Promise<SpotifyTokens | null> => {
  if(spotifyRefreshPromiseRef.current) {
      console.log('[AuthContext] Refresh already in progress, returning existing promise.');
      return spotifyRefreshPromiseRef.current;
  }
  const newRefreshPromise = (async () => {
  try {
    console.log(`[AuthContext] Attempting to refresh token`);
    
    // Make sure we have userId available
    if (!userId) {
      console.error('[AuthContext] Cannot refresh token: userId is null');
      return null;
    }
    
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
      console.error(`[AuthContext] Spotify Token refresh failed: ${response.status} - ${errorText}`);
      
      // Only throw/fail if it's an auth error (401, 403)
      // For other errors (network, 500, etc.), return null and let retry logic handle it
      if (response.status === 401 || response.status === 403) {
        console.log('[AuthContext] Auth error during refresh, refresh token may be invalid. Logging out');
        await logout();
      }
      return null;
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
  } finally {
    spotifyRefreshPromiseRef.current = null;
    }
  })();

  spotifyRefreshPromiseRef.current = newRefreshPromise;
  return newRefreshPromise;
};

  const getUserProfile = async (token: string): Promise<string | null> => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('[AuthContext] Spotify user profile fetch failed due to authentication error. Token might be invalid.');
        }
        throw new Error(`Failed to get user profile from Spotify: ${response.status}`);
      }

      const profile = await response.json();
      return profile.id;
    } catch (error) {
      console.error('[AuthContext] Error getting user profile from Spotify:', error);
      return null;
    }
  };


const getValidAccessToken = async (): Promise<string | null> => {
  try {
    const tokensString = await AsyncStorage.getItem('spotifyTokens');
    if (!tokensString) {
      console.log('[AuthContext] No Spotify tokens found');
      return null;
    }

    let tokens: SpotifyTokens = JSON.parse(tokensString);

    if (isSpotifyTokenExpired(tokens)) {
      console.log('[AuthContext] Spotify Token expired, refreshing...');
      const refreshedTokens = await refreshSpotifyAccessToken(tokens.refresh_token);
      if (!refreshedTokens) {
        console.log('[AuthContext] Failed to refresh Spotify token - but NOT logging out automatically');
        return null;
      }
      tokens = refreshedTokens;
      setSpotifyAccessToken(tokens.access_token);
      console.log('[AuthContext] Successfully refreshed and updated access token');
    } else {
        if (spotifyAccessToken !== tokens.access_token) {
          setSpotifyAccessToken(tokens.access_token);
          console.log('[AuthContext] Spotify token is valid, updating state.');
        }
    }

    return tokens.access_token;
  } catch (error) {
    console.error('[AuthContext] Error getting valid Spotify access token:', error);
    return null;
  }
};

  const getAppSessionToken = async (): Promise<string | null> => {
    if (appSessionToken) {
      return appSessionToken;
    }

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



  // useEffect(() => {
  //   const checkLoginStatus = async () => {
  //     try {
  //       setIsLoading(true);

  //       const spotifyTokensString = await AsyncStorage.getItem('spotifyTokens');
  //       setAppSessionToken(spotifyTokensString);

  //       let currentSpotifyAccessToken: string | null = null;
  //       let currentUserId: string | null = null;

  //       if (spotifyTokensString) {
  //         const spotifyTokens: SpotifyTokens = JSON.parse(spotifyTokensString);
  //         if (spotifyTokens.access_token) {
  //           currentSpotifyAccessToken = await getValidAccessToken();
  //           if (currentSpotifyAccessToken) {
  //             setSpotifyAccessToken(currentSpotifyAccessToken);
  //             currentUserId = await getUserProfile(currentSpotifyAccessToken);
  //             if (currentUserId) {
  //               setUserId(currentUserId);
  //             } else {
  //               console.log('[AuthContext] Failed to get Spotify user profile during status check.');
  //             }
  //           } else {
  //             console.log('[AuthContext] No valid Spotify access token available during status check.');
  //           }
  //         }
  //       }

  //       const storedAppSessionToken = await AsyncStorage.getItem(APP_SESSION_TOKEN_KEY);
  //       if (storedAppSessionToken && currentUserId) {
  //         setAppSessionToken(storedAppSessionToken);
  //         setIsLoggedInState(true);
  //         console.log('[AuthContext] Successfully restored auth state with app session token and user ID.');
  //       } else {
  //         console.log('[AuthContext] No valid app session token or user ID found, logging out.');
  //         await logout();
  //       }
  //     } catch (error) {
  //       console.error('[AuthContext] Error checking login status:', error);
  //       await logout();
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   checkLoginStatus();
  // }, []);

    useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        setIsLoading(true);

        const storedAppSessionToken = await AsyncStorage.getItem('spotifyTokens');
        setAppSessionToken(storedAppSessionToken);

        let currentSpotifyAccessToken: string | null = null;
        let currentUserId: string | null = null;

        const spotifyTokensString = await AsyncStorage.getItem('spotifyTokens');
        if (spotifyTokensString) {
          const spotifyTokens: SpotifyTokens = JSON.parse(spotifyTokensString);
          if (spotifyTokens.access_token) {
            currentSpotifyAccessToken = await getValidAccessToken();
            if (currentSpotifyAccessToken) {
              setSpotifyAccessToken(currentSpotifyAccessToken);
              currentUserId = await getUserProfile(currentSpotifyAccessToken);
              if (currentUserId) {
                setUserId(currentUserId);
              } else {
                console.log('[AuthContext] Failed to get Spotify user profile during status check. Token might be invalid or user profile not found. Logging out.');
                await logout();
                return;
              }
            } else {
              console.log('[AuthContext] No valid Spotify access token available during status check after potential refresh. Logging out.');
              await logout();
              return;
            }
          }
        }

        if (storedAppSessionToken && currentUserId) {
          setIsLoggedInState(true);
          console.log('[AuthContext] Successfully restored auth state with app session token and user ID.');
        } else {
          console.log('[AuthContext] Incomplete authentication state (no app session token or user ID), logging out.');
          await logout();
        }
      } catch (error) {
        console.error('[AuthContext] Error checking login status:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const setIsLoggedIn = async (value: boolean, receivedAppSessionToken?: string) => {
    if (value) {
      try {
        console.log('[AuthContext] Starting login process from setIsLoggedIn...');
        
        const validSpotifyToken = await getValidAccessToken();
        if (!validSpotifyToken) {
          throw new Error('No valid Spotify access token available after login.');
        }
        setSpotifyAccessToken(validSpotifyToken);

        const userProfileId = await getUserProfile(validSpotifyToken);
        if (!userProfileId) {
          throw new Error('Failed to get user profile from Spotify after login.');
        }
        setUserId(userProfileId);

        if (receivedAppSessionToken) {
          await AsyncStorage.setItem(APP_SESSION_TOKEN_KEY, receivedAppSessionToken);
          setAppSessionToken(receivedAppSessionToken);
          console.log('[AuthContext] Stored and set app session token.');
        } else {
          console.warn('[AuthContext] setIsLoggedIn called with true but no appSessionToken provided!');
          throw new Error('App session token missing during login.');
        }
        
        setIsLoggedInState(true);
        console.log('[AuthContext] Setting isLoggedIn to true with user ID:', userProfileId);

      } catch (error) {
        console.error('[AuthContext] Error during login initiated by setIsLoggedIn:', error);
        await logout();
      }
    } else {
      await logout();
    }
  };

const logout = async () => {
  try {
    if (userId) {
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      console.log('[AuthContext] Backend logout request sent.');
    }

    setIsLoggedInState(false);
    setUserId(null);
    setSpotifyAccessToken(null);
    setAppSessionToken(null);
    await AsyncStorage.removeItem('spotifyTokens');
    await AsyncStorage.removeItem(APP_SESSION_TOKEN_KEY);
    spotifyRefreshPromiseRef.current = null;
    console.log('[AuthContext] Logout successful, all tokens cleared.');
  } catch (error) {
    console.error('[AuthContext] Error during logout:', error);
    setIsLoggedInState(false);
    setUserId(null);
    setSpotifyAccessToken(null);
    setAppSessionToken(null);
    await AsyncStorage.removeItem('spotifyTokens');
    await AsyncStorage.removeItem(APP_SESSION_TOKEN_KEY);
    spotifyRefreshPromiseRef.current = null;
  }
};

  const value = {
    isLoggedIn,
    isLoading,
    userId,
    accessToken: spotifyAccessToken,
    appSessionToken,
    setIsLoggedIn,
    logout,
    getValidAccessToken,
    getAppSessionToken, 
  };

  if (isLoading) {
    return null;
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