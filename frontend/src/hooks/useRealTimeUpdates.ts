import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import * as geohash from 'ngeohash';
import * as Crypto from 'expo-crypto';

import {
  BasicHotspotData,
  UserListenerData,
  HotspotSize,
  HotspotActivity,
  CurrentLocation,
  CurrentTrack,
} from '../../types/dataTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getSizeFromCount(count: number): HotspotSize {
  if (count <= 2) return 'small';
  if (count <= 5) return 'medium';
  if (count <= 10) return 'large';
  return 'xlarge';
}

function getActivityLevel(count: number, lastUpdated: string): HotspotActivity {
  const minutesSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60);

  if (minutesSinceUpdate < 5 && count > 5) return 'trending';
  if (minutesSinceUpdate < 15) return 'high';
  if (minutesSinceUpdate < 30) return 'medium';
  return 'low';
}

function calculateTimeAgo(timestamp: string): string {
  const now = new Date();
  const updatedTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - updatedTime.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

export function useRealTimeUpdates() {
  const { userId, isLoggedIn, getValidAccessToken, appSessionToken } = useAuth();

  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [nearbyHotspots, setNearbyHotspots] = useState<BasicHotspotData[] | null>(null);

  // Refs for stable access to current state values within useCallback (unchanged)
  const currentTrackRef = useRef(currentTrack);
  const nearbyHotspotsRef = useRef(nearbyHotspots);

  // Keep refs updated with latest state values (unchanged)
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    nearbyHotspotsRef.current = nearbyHotspots;
  }, [nearbyHotspots]);

  // Use refs to track last update times and update state (unchanged)
  const updateStateRef = useRef({
    isUpdating: false,
    lastTrackUpdate: 0,
    lastHotspotUpdate: 0,
    updateInterval: null as number | null,
  });

function hashToken(token: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    token,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}
  
  const getCurrentLocation = async (): Promise<CurrentLocation | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('[useRealTimeUpdates] Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('[useRealTimeUpdates] Error getting location:', error);
      return null;
    }
  };

  // Helper to create authenticated headers
  const getAuthHeaders = useCallback(async () => {
    const token = appSessionToken; // Use the app session token
    const id = userId;
    
    if (!token || !id) {
      console.warn('[useRealTimeUpdates] Authentication headers missing (token or userId)');
      return null;
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // Use app session token here
      'X-User-Id': id, // Add X-User-Id header
    };
  }, [appSessionToken, userId]);


  const getCurrentTrack = async (): Promise<CurrentTrack | null> => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        console.log('[useRealTimeUpdates] Skipping current track fetch due to missing auth headers.');
        return null;
      }

      console.log('[useRealTimeUpdates] Fetching current track from backend...');
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/currentTrack`, {
        headers: headers, // Use the new authenticated headers
      });

      console.log(`[useRealTimeUpdates] Current track response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 204) {
          console.log('[useRealTimeUpdates] No current track playing (204)');
          return { isPlaying: false, track: null };
        }
        const errorText = await response.text();
        console.error(`[useRealTimeUpdates] Failed to fetch current track: ${response.status} - ${errorText}`);
        // Handle specific error codes if needed (e.g., 401 for re-login)
        return null;
      }

      const data = await response.json();
      console.log('[useRealTimeUpdates] Current track data:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('[useRealTimeUpdates] Error getting current track:', error);
      return { isPlaying: false, track: null };
    }
  };

  const getNearbyHotspotsData = async (location: CurrentLocation): Promise<BasicHotspotData[] | null> => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        console.log('[useRealTimeUpdates] Skipping nearby hotspots fetch due to missing auth headers.');
        return null;
      }

      const radius = 5000;
      const latDegreesPerKm = 1 / 111.32;
      const longDegreesPerKm = 1 / (111.32 * Math.cos(location.latitude * (Math.PI / 180)));

      const latDelta = (radius / 1000) * latDegreesPerKm;
      const longDelta = (radius / 1000) * longDegreesPerKm;

      const ne_lat = location.latitude + latDelta;
      const ne_long = location.longitude + longDelta;
      const sw_lat = location.latitude - latDelta;
      const sw_long = location.longitude - longDelta;

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/get_hotspots`, {
        method: 'POST',
        headers: headers, // Use the new authenticated headers
        body: JSON.stringify({ ne_lat, ne_long, sw_lat, sw_long })
      });

      if (!response.ok) {
        console.error(`[useRealTimeUpdates] Failed to fetch nearby hotspots data: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.hotspots.map((h: any) => ({
        id: h.geohash,
        coordinate: { latitude: h.latitude, longitude: h.longitude },
        size: getSizeFromCount(h.count),
        activity: getActivityLevel(h.count, h.last_updated),
        userCount: h.count,
        lastUpdated: h.last_updated,
        locationName: `Hotspot ${h.geohash.substring(0, 5)}`,
        geohash: h.geohash,
      }));
    } catch (error) {
      console.error('[useRealTimeUpdates] Error getting nearby hotspots data:', error);
      return null;
    }
  };

  const getHotspotDetails = async (geohash: string): Promise<UserListenerData[] | null> => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        console.log('[useRealTimeUpdates] Skipping hotspot details fetch due to missing auth headers.');
        return null;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/get_users_from_hotspots`, {
        method: 'POST',
        headers: headers, // Use the new authenticated headers
        body: JSON.stringify({ hotspots: [geohash] })
      });

      if (!response.ok) {
        console.error(`[useRealTimeUpdates] Failed to fetch hotspot details: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.users.map((user: any) => ({
        id: user.id,
        name: user.name,
        avatar: user.image_url,
        currentTrack: {
          title: user.song_title,
          artist: user.song_artist,
          albumArt: user.song_image,
          isCurrentlyListening: (new Date(user.last_updated) > new Date(Date.now() - 5 * 60 * 1000)),
          timestamp: calculateTimeAgo(user.last_updated),
        },
      }));
    } catch (error) {
      console.error(`[useRealTimeUpdates] Error getting details for hotspot ${geohash}:`, error);
      return null;
    }
  };

const sendUpdateToBackend = async (location: CurrentLocation, track: CurrentTrack | null) => {
  try {
    const spotifyAccessToken = await getValidAccessToken(); 
    const appSession = appSessionToken;
    const id = userId;

    if (!spotifyAccessToken) {
      console.log('[useRealTimeUpdates] No valid Spotify access token available to send update');
      return;
    }
    if (!appSession || !id) {
      console.log('[useRealTimeUpdates] No app session token or user ID available to send update');
      return;
    }

    const geohashValue = geohash.encode(location.latitude, location.longitude, 7);

    // Get the refresh token from storage
    const tokensString = await AsyncStorage.getItem('spotifyTokens');
    if (!tokensString) {
      console.log('[useRealTimeUpdates] No Spotify tokens found in storage');
      return;
    }
    const tokens = JSON.parse(tokensString);
    const refreshToken = tokens.refresh_token;

    // Hash the refresh token instead of the access token
    const tokenHash = await hashToken(refreshToken);

    const requestBody = {
      access_token: spotifyAccessToken, // Still send the access token for Spotify API calls
      token_hash: tokenHash, // Send the refresh token hash for authentication
      user_id: id,
      geohash: geohashValue
    };

    console.log(`[useRealTimeUpdates] Sending update for user ${id}`);
    console.log(`[useRealTimeUpdates] Request body:`, JSON.stringify(requestBody, null, 2));
    console.log(`[useRealTimeUpdates] Geohash: ${geohashValue}`);
    console.log(`[useRealTimeUpdates] Location: lat=${location.latitude}, lng=${location.longitude}`);
    
    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/update-user-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appSession}`,
        'X-User-Id': id,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[useRealTimeUpdates] Failed to send update to backend: ${response.status}`);
      console.error(`[useRealTimeUpdates] Error response:`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error(`[useRealTimeUpdates] Error details:`, errorJson);
      } catch (e) {}
    } else {
      const responseData = await response.json();
      console.log('[useRealTimeUpdates] Successfully sent update to backend');
      console.log('[useRealTimeUpdates] Backend response:', responseData);
      
      if (responseData.track) {
        const backendTrack: CurrentTrack = {
          isPlaying: true,
          track: responseData.track
        };
        setCurrentTrack(backendTrack);
      }
    }
  } catch (error) {
    console.error('[useRealTimeUpdates] Error sending update to backend:', error);
  }
};
  const performUpdate = useCallback(async () => {
    const updateState = updateStateRef.current;

    // CRITICAL: Check all authentication conditions before proceeding
    // Now also check for appSessionToken presence
    if (!isLoggedIn || !userId || !appSessionToken || updateState.isUpdating) { // ADD appSessionToken check
      console.log(`[useRealTimeUpdates] Skipping update: isLoggedIn=${isLoggedIn}, userId=${userId}, appSessionToken=${!!appSessionToken}, isUpdating=${updateState.isUpdating}`);
      return;
    }

    try {
      updateState.isUpdating = true;
      console.log('[useRealTimeUpdates] Starting update cycle...');

      const location = await getCurrentLocation();
      if (!location) {
        console.log('[useRealTimeUpdates] Failed to get location, skipping update');
        return;
      }

      setCurrentLocation(location);
      const now = Date.now();

      await sendUpdateToBackend(location, currentTrackRef.current);

      if (!updateState.lastHotspotUpdate || now - updateState.lastHotspotUpdate > 20000) {
        console.log('[useRealTimeUpdates] Fetching nearby hotspots...');
        const hotspots = await getNearbyHotspotsData(location);
        if (hotspots) {
          setNearbyHotspots(hotspots);
          updateState.lastHotspotUpdate = now;
        }
      }

      console.log('[useRealTimeUpdates] Update cycle completed successfully');
    } catch (error) {
      console.error('[useRealTimeUpdates] Error in update cycle:', error);
    } finally {
      updateState.isUpdating = false;
    }
  }, [isLoggedIn, userId, appSessionToken, getValidAccessToken]); // ADD appSessionToken to dependencies


  useEffect(() => {
    const updateState = updateStateRef.current;

    // CRITICAL: Only start updates when ALL isLoggedIn, userId AND appSessionToken are available
    if (isLoggedIn && userId && appSessionToken) { // ADD appSessionToken check
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        console.log('[useRealTimeUpdates] Cleared previous update interval.');
      }

      console.log('[useRealTimeUpdates] User is logged in with userId and app session token. Performing immediate update.');
      performUpdate();

      updateState.updateInterval = setInterval(() => {
        if (isLoggedIn && userId && appSessionToken) { // ADD appSessionToken check
          console.log('[useRealTimeUpdates] Interval triggered. Performing update.');
          performUpdate();
        } else {
          console.log('[useRealTimeUpdates] Interval triggered but user is no longer authenticated. Clearing interval.');
          if (updateState.updateInterval) {
            clearInterval(updateState.updateInterval);
            updateState.updateInterval = null;
          }
        }
      }, 30000); // 30 seconds

      console.log('[useRealTimeUpdates] Update interval set for every 30 seconds');
    } else {
      // If not logged in or no userId/appSessionToken, ensure the interval is cleared and states are reset
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        updateState.updateInterval = null;
        console.log('[useRealTimeUpdates] Not fully authenticated. Cleared update interval.');
      }
      setCurrentLocation(null);
      setCurrentTrack(null);
      setNearbyHotspots(null);
      console.log('[useRealTimeUpdates] Cleared all local states due to incomplete authentication.');
    }

    return () => {
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        updateState.updateInterval = null;
        console.log('[useRealTimeUpdates] Cleanup: Interval cleared on unmount/dependency change.');
      }
    };
  }, [isLoggedIn, userId, appSessionToken, performUpdate]); // ADD appSessionToken to dependencies


  return {
    currentLocation,
    currentTrack,
    nearbyHotspots,
    getHotspotDetails,
    startUpdates: performUpdate,
    stopUpdates: () => {
      const updateState = updateStateRef.current;
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        updateState.updateInterval = null;
        console.log('[useRealTimeUpdates] Manual stop: Interval cleared.');
      }
    },
  };
}