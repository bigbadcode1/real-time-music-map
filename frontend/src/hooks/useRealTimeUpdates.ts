import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import * as geohash from 'ngeohash';

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

  const currentTrackRef = useRef(currentTrack);
  const nearbyHotspotsRef = useRef(nearbyHotspots);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    nearbyHotspotsRef.current = nearbyHotspots;
  }, [nearbyHotspots]);

  const updateStateRef = useRef({
    isUpdating: false,
    lastTrackUpdate: 0,
    lastHotspotUpdate: 0,
    updateInterval: null as number | null,
  });
  
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

  const getAuthHeaders = useCallback(async () => {
    const token = appSessionToken;
    const id = userId;
    
    if (!token || !id) {
      console.warn('[useRealTimeUpdates] Authentication headers missing (token or userId)');
      return null;
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-Id': id,
    };
  }, [appSessionToken, userId]);


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
        headers: headers, 
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
        headers: headers,
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

const sendUpdateToBackend = async (location: CurrentLocation, track: CurrentTrack | null, retryCount = 0) => {
  try {
    const spotifyAccessToken = await getValidAccessToken();
    const appSession = appSessionToken;
    const id = userId;

    if (!spotifyAccessToken) {
      console.log('[useRealTimeUpdates] No valid Spotify access token available to send update');
      // If no Spotify token, it's likely no music is playing or can be updated.
      // Consider setting currentTrack to null here as well, or let the backend handle it.
      // For now, we'll rely on the backend response.
      return;
    }
    if (!appSession || !id) {
      console.log('[useRealTimeUpdates] No app session token or user ID available to send update');
      return;
    }

    const geohashValue = geohash.encode(location.latitude, location.longitude, 7);

    const tokensString = await AsyncStorage.getItem('spotifyTokens');
    if (!tokensString) {
      console.log('[useRealTimeUpdates] No Spotify tokens found in storage');
      // If no Spotify tokens, we can't get current playing track.
      // Consider setting currentTrack to null here.
      return;
    }
    const tokens = JSON.parse(tokensString);
    const refreshToken = tokens.refresh_token;

    // console.log('[useRealTimeUpdates] Debug - Refresh Token:', refreshToken);
    // console.log('[useRealTimeUpdates] Debug - User ID:', id);

    const requestBody = {
      access_token: spotifyAccessToken,
      refresh_token: refreshToken,
      user_id: id,
      geohash: geohashValue
    };

    // console.log('[useRealTimeUpdates] Debug - Full Request Body:', JSON.stringify(requestBody, null, 2));

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
      // On error, it's safer to clear the track state if we can't confirm what's playing
      setCurrentTrack(null); // <-- Added this for error cases
    } else {
      const responseData = await response.json();
      console.log('[useRealTimeUpdates] Successfully sent update to backend');
      // console.log('[useRealTimeUpdates] Backend response:', responseData);

      if (responseData.track !== null && responseData.track !== undefined) { // Check for non-null and non-undefined
        const backendTrack: CurrentTrack = {
          isPlaying: responseData.isPlaying ?? true, // Use backend's isPlaying, default to true if not provided
          track: responseData.track
        };
        setCurrentTrack(backendTrack);
        // console.log('[useRealTimeUpdates] Updated currentTrack to playing song:', responseData.track.name);
      } else {
        // If responseData.track is null or undefined, set currentTrack to null
        setCurrentTrack(null);
        console.log('[useRealTimeUpdates] Updated currentTrack to NULL (no track playing)');
      }
    }
  } catch (error) {
    console.error('[useRealTimeUpdates] Error sending update to backend:', error);
    // On any network or parsing error, clear the track state
    setCurrentTrack(null); 
  }
};
  const performUpdate = useCallback(async () => {
    const updateState = updateStateRef.current;

    if (!isLoggedIn || !userId || !appSessionToken || updateState.isUpdating) {
      // console.log(`[useRealTimeUpdates] Skipping update: isLoggedIn=${isLoggedIn}, userId=${userId}, appSessionToken=${!!appSessionToken}, isUpdating=${updateState.isUpdating}`);
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
  }, [isLoggedIn, userId, appSessionToken, getValidAccessToken]);


  useEffect(() => {
    const updateState = updateStateRef.current;


    if (isLoggedIn && userId && appSessionToken) {
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        console.log('[useRealTimeUpdates] Cleared previous update interval.');
      }

      console.log('[useRealTimeUpdates] User is logged in with userId and app session token. Performing immediate update.');
      performUpdate();

      updateState.updateInterval = setInterval(() => {
        if (isLoggedIn && userId && appSessionToken) {
          console.log('[useRealTimeUpdates] Interval triggered. Performing update.');
          performUpdate();
        } else {
          console.log('[useRealTimeUpdates] Interval triggered but user is no longer authenticated. Clearing interval.');
          if (updateState.updateInterval) {
            clearInterval(updateState.updateInterval);
            updateState.updateInterval = null;
          }
        }
      }, 30000);

      console.log('[useRealTimeUpdates] Update interval set for every 30 seconds');
    } else {
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
  }, [isLoggedIn, userId, appSessionToken]);


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