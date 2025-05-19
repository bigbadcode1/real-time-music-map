
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import { getValidAccessToken } from '@/src/services/spotifyAuthService';

// Singleton instance
let instance: {
  currentLocation: LocationUpdate | null;
  currentTrack: SpotifyTrack | null;
  updateInterval: number | null;
  isUpdating: boolean;
  lastTrackUpdate: number;
} | null = null;

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

export function useRealTimeUpdates() {
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const { isLoggedIn } = useAuth();

  // Initialize singleton instance
  useEffect(() => {
    if (!instance) {
      instance = {
        currentLocation: null,
        currentTrack: null,
        updateInterval: null,
        isUpdating: false,
        lastTrackUpdate: 0
      };
    }
  }, []);

  // Function to get current location
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

  // Function to get current Spotify track
  const getCurrentTrack = async () => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        console.log('No valid access token available');
        return null;
      }

      const response = await fetch('https://backendtesting-five.vercel.app/currentTrack', {
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

  // Function to send updates to backend
  const sendUpdateToBackend = async (location: LocationUpdate, track: SpotifyTrack | null) => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        console.log('No valid access token available');
        return;
      }

      await fetch('https://backendtesting-five.vercel.app/update-user-location', {
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

  // Function to perform a single update
  const performUpdate = useCallback(async () => {
    if (!instance || instance.isUpdating || !isLoggedIn) return;
    
    try {
      instance.isUpdating = true;
      
      // Get current location
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        instance.currentLocation = location;
      }

      // Get current track with debounce
      const now = Date.now();
      if (now - instance.lastTrackUpdate > 5000) { // Only update track every 5 seconds
        const track = await getCurrentTrack();
        if (track) {
          setCurrentTrack(track);
          instance.currentTrack = track;
          instance.lastTrackUpdate = now;
        }
      }

      // Send update to backend if we have location
      if (location) {
        await sendUpdateToBackend(location, instance.currentTrack);
      }
    } catch (error) {
      console.error('Error in update cycle:', error);
    } finally {
      if (instance) {
        instance.isUpdating = false;
      }
    }
  }, [isLoggedIn]);

  // Start updates when component mounts and user is logged in
  useEffect(() => {
    if (isLoggedIn && instance) {
      // Clear any existing interval
      if (instance.updateInterval) {
        clearInterval(instance.updateInterval);
      }

      // Perform initial update
      performUpdate();

      // Set up interval for updates
      instance.updateInterval = setInterval(performUpdate, 30000);
    }

    return () => {
      if (instance?.updateInterval) {
        clearInterval(instance.updateInterval);
        instance.updateInterval = null;
      }
    };
  }, [isLoggedIn, performUpdate]);

  return {
    currentLocation,
    currentTrack,
    startUpdates: performUpdate,
    stopUpdates: () => {
      if (instance?.updateInterval) {
        clearInterval(instance.updateInterval);
        instance.updateInterval = null;
      }
    }
  };
}