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

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export function useRealTimeUpdates() {
  const { userId, isLoggedIn, getValidAccessToken, appSessionToken } = useAuth();

  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [nearbyHotspots, setNearbyHotspots] = useState<BasicHotspotData[] | null>(null);
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number>(0); 

  const currentTrackRef = useRef(currentTrack);
  const nearbyHotspotsRef = useRef(nearbyHotspots);
  // Add ref to track the current map region
  const currentMapRegionRef = useRef<MapRegion | null>(null);

  const UPDATE_INTERVAL_MS = 30000; // 30 seconds

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
    countdownInterval: null as number | null,
  });
  
  // Add method to update the map region reference
  const setMapRegionForUpdates = useCallback((region: MapRegion | null) => {
    currentMapRegionRef.current = region;
  }, []);
  
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


const getNearbyHotspotsData = async (region: MapRegion): Promise<BasicHotspotData[] | null> => {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      console.log('[useRealTimeUpdates] Skipping map region hotspots fetch due to missing auth headers.');
      return null;
    }


    const latPadding = region.latitudeDelta * 0.1;
    const lngPadding = region.longitudeDelta * 0.1;
    
    const ne_lat = region.latitude + (region.latitudeDelta / 2) + latPadding;
    const ne_long = region.longitude + (region.longitudeDelta / 2) + lngPadding;
    const sw_lat = region.latitude - (region.latitudeDelta / 2) - latPadding;
    const sw_long = region.longitude - (region.longitudeDelta / 2) - lngPadding;

    const normalizedNeLong = ne_long > 180 ? ne_long - 360 : ne_long;
    const normalizedSwLong = sw_long < -180 ? sw_long + 360 : sw_long;

    console.log(`[useRealTimeUpdates] Searching hotspots in map region: NE(${ne_lat.toFixed(4)}, ${normalizedNeLong.toFixed(4)}) SW(${sw_lat.toFixed(4)}, ${normalizedSwLong.toFixed(4)})`);

    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/get_hotspots`, {
      method: 'POST',
      headers: headers, 
      body: JSON.stringify({ 
        ne_lat: ne_lat, 
        ne_long: normalizedNeLong, 
        sw_lat: sw_lat, 
        sw_long: normalizedSwLong 
      })
    });

    if (!response.ok) {
      console.error(`[useRealTimeUpdates] Failed to fetch map region hotspots data: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[useRealTimeUpdates] Error response:`, errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data || !Array.isArray(data.hotspots)) {
      console.error('[useRealTimeUpdates] Invalid response structure from hotspots API');
      return null;
    }

    console.log(`[useRealTimeUpdates] Found ${data.hotspots.length} hotspots in region`);

    return data.hotspots.map((h: any) => ({
      id: h.geohash,
      coordinate: { 
        latitude: parseFloat(h.latitude), 
        longitude: parseFloat(h.longitude) 
      },
      size: getSizeFromCount(h.count),
      activity: getActivityLevel(h.count, h.last_updated),
      userCount: h.count,
      lastUpdated: h.last_updated,
      locationName: `Hotspot ${h.geohash.substring(0, 5)}`,
      geohash: h.geohash,
    }));
  } catch (error) {
    console.error('[useRealTimeUpdates] Error getting map region hotspots data:', error);
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
        avatar: user.image,
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
      return;
    }
    const tokens = JSON.parse(tokensString);
    const refreshToken = tokens.refresh_token;

    const requestBody = {
      access_token: spotifyAccessToken,
      refresh_token: refreshToken,
      user_id: id,
      geohash: geohashValue
    };

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
      setCurrentTrack(null);
    } else {
      const responseData = await response.json();
      console.log('[useRealTimeUpdates] Successfully sent update to backend');

      if (responseData.track !== null && responseData.track !== undefined) {
        const backendTrack: CurrentTrack = {
          isPlaying: responseData.isPlaying ?? true,
          track: responseData.track
        };
        setCurrentTrack(backendTrack);
      } else {
        setCurrentTrack(null);
        console.log('[useRealTimeUpdates] Updated currentTrack to NULL (no track playing)');
      }
    }
  } catch (error) {
    console.error('[useRealTimeUpdates] Error sending update to backend:', error);
    setCurrentTrack(null); 
  }
};

  const performUpdate = useCallback(async () => {
    const updateState = updateStateRef.current;

    if (!isLoggedIn || !userId || !appSessionToken || updateState.isUpdating) {
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
        
        // Use current map region if available, otherwise fall back to user location
        let regionToSearch: MapRegion;
        if (currentMapRegionRef.current) {
          regionToSearch = currentMapRegionRef.current;
          console.log('[useRealTimeUpdates] Using current map region for hotspot search');
        } else {
          regionToSearch = {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          console.log('[useRealTimeUpdates] Using user location for hotspot search (no map region set)');
        }
        
        const hotspots = await getNearbyHotspotsData(regionToSearch);
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
      setNextUpdateCountdown(UPDATE_INTERVAL_MS / 1000); 
    }
  }, [isLoggedIn, userId, appSessionToken, getValidAccessToken]);


  useEffect(() => {
    const updateState = updateStateRef.current;

    if (isLoggedIn && userId && appSessionToken) {
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        console.log('[useRealTimeUpdates] Cleared previous update interval.');
      }
      if (updateState.countdownInterval) {
        clearInterval(updateState.countdownInterval);
      }

      console.log('[useRealTimeUpdates] User is logged in with userId and app session token. Performing immediate update.');
      performUpdate();

      setNextUpdateCountdown(UPDATE_INTERVAL_MS / 1000);
      updateState.countdownInterval = setInterval(() => {
        setNextUpdateCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);

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
           if (updateState.countdownInterval) {
            clearInterval(updateState.countdownInterval);
            updateState.countdownInterval = null;
          }
        }
      }, UPDATE_INTERVAL_MS);

      console.log(`[useRealTimeUpdates] Update interval set for every ${UPDATE_INTERVAL_MS / 1000} seconds`);
    } else {
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        updateState.updateInterval = null;
        console.log('[useRealTimeUpdates] Not fully authenticated. Cleared update interval.');
      }
      if (updateState.countdownInterval) {
        clearInterval(updateState.countdownInterval);
        updateState.countdownInterval = null;
      }
      setCurrentLocation(null);
      setCurrentTrack(null);
      setNearbyHotspots(null);
      setNextUpdateCountdown(0);
      console.log('[useRealTimeUpdates] Cleared all local states due to incomplete authentication.');
    }

    return () => {
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        updateState.updateInterval = null;
        console.log('[useRealTimeUpdates] Cleanup: Interval cleared on unmount/dependency change.');
      }
      if (updateState.countdownInterval) {
        clearInterval(updateState.countdownInterval);
        updateState.countdownInterval = null;
      }
    };
  }, [isLoggedIn, userId, appSessionToken, performUpdate]);


  return {
    currentLocation,
    currentTrack,
    nearbyHotspots,
    getHotspotDetails,
    getNearbyHotspotsData,
    setMapRegionForUpdates,
    startUpdates: performUpdate,
    stopUpdates: () => {
      const updateState = updateStateRef.current;
      if (updateState.updateInterval) {
        clearInterval(updateState.updateInterval);
        updateState.updateInterval = null;
        console.log('[useRealTimeUpdates] Manual stop: Interval cleared.');
      }
      if (updateState.countdownInterval) {
        clearInterval(updateState.countdownInterval);
        updateState.countdownInterval = null;
      }
      setNextUpdateCountdown(0);
    },
    nextUpdateCountdown,
  };
}