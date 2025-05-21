import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import { getValidAccessToken } from '@/src/services/spotifyAuthService';
import * as geohash from 'ngeohash';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface SpotifyTrack {
  isPlaying: boolean;
  track: {
    name: string;
    artist: string;
    album_name: string;
    image: string;
    duration: number;
    progress: number;
    uri: string;
  } | null;
}

export interface Listener {
  id: string;
  name: string;
  avatar: string;
  currentTrack: {
    title: string;
    artist: string;
    albumArt: string;
    isCurrentlyListening: boolean;
    timeAgo: string;
  };
}

export interface HotspotData {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  size: 'small' | 'medium' | 'large' | 'xlarge';
  activity: 'low' | 'medium' | 'high' | 'trending';
  userCount: number;
  lastUpdated: string;
  locationName: string;
  geohash: string;
  listeners: Listener[];
}

let updateManager = {
  currentLocation: null as LocationUpdate | null,
  currentTrack: null as SpotifyTrack | null,
  nearbyHotspots: null as HotspotData[] | null,
  updateInterval: null as number | null,
  isUpdating: false,
  lastTrackUpdate: 0,
  lastHotspotUpdate: 0
};

export function useRealTimeUpdates() {
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [nearbyHotspots, setNearbyHotspots] = useState<HotspotData[] | null>(null);
  const { isLoggedIn } = useAuth();

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const getCurrentTrack = async () => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        console.log('No valid access token available');
        return null;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/currentTrack`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 204) {
          return { isPlaying: false, track: null };
        }
        throw new Error(`Failed to fetch current track: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting current track:', error);
      return { isPlaying: false, track: null };
    }
  };

  const getNearbyHotspotsWithUsers = async (location: LocationUpdate) => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        console.log('No valid access token available');
        return null;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/nearby-hotspots-with-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 5000 // 5km radius
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch nearby hotspots: ${response.status}`);
      }

      const data = await response.json();
      return data.hotspots;
    } catch (error) {
      console.error('Error getting nearby hotspots with users:', error);
      return null;
    }
  };

  const sendUpdateToBackend = async (location: LocationUpdate, track: SpotifyTrack | null) => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        console.log('No valid access token available');
        return;
      }

      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/update-user-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          song: track
        })
      });
    } catch (error) {
      console.error('Error sending update to backend:', error);
    }
  };

  const performUpdate = useCallback(async () => {
    if (updateManager.isUpdating || !isLoggedIn) return;
    
    try {
      updateManager.isUpdating = true;
      

      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        updateManager.currentLocation = location;
      

        const now = Date.now();
        if (!updateManager.lastTrackUpdate || now - updateManager.lastTrackUpdate > 5000) {
          const track = await getCurrentTrack();
          if (track) {
            setCurrentTrack(track);
            updateManager.currentTrack = track;
            updateManager.lastTrackUpdate = now;
          }
        }

        await sendUpdateToBackend(location, updateManager.currentTrack);
        
        if (!updateManager.nearbyHotspots || now - updateManager.lastHotspotUpdate > 20000) {
          const hotspots = await getNearbyHotspotsWithUsers(location);
          console.log(hotspots);
          if (hotspots) {
            setNearbyHotspots(hotspots);
            updateManager.nearbyHotspots = hotspots;
            updateManager.lastHotspotUpdate = now;
          }
        }
      }
    } catch (error) {
      console.error('Error in update cycle:', error);
    } finally {
      updateManager.isUpdating = false;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      if (updateManager.updateInterval) {
        clearInterval(updateManager.updateInterval);
      }

      performUpdate();

      updateManager.updateInterval = setInterval(performUpdate, 30000);
    }

    return () => {
      if (updateManager.updateInterval) {
        clearInterval(updateManager.updateInterval);
        updateManager.updateInterval = null;
      }
    };
  }, [isLoggedIn, performUpdate]);

  return {
    currentLocation,
    currentTrack,
    nearbyHotspots,
    startUpdates: performUpdate,
    stopUpdates: () => {
      if (updateManager.updateInterval) {
        clearInterval(updateManager.updateInterval);
        updateManager.updateInterval = null;
      }
    }
  };
}