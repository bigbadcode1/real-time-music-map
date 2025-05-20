import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import { getValidAccessToken } from '@/src/services/spotifyAuthService';
import * as geohash from 'ngeohash';

// Singleton instance
let instance: {
  currentLocation: LocationUpdate | null;
  currentTrack: SpotifyTrack | null;
  nearbyHotspots: HotspotData[] | null;
  updateInterval: number | null;
  isUpdating: boolean;
  lastTrackUpdate: number;
  lastHotspotUpdate: number;
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

export interface HotspotData {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  size: 'small' | 'medium' | 'large' | 'xlarge';
  activity: 'low' | 'medium' | 'high' | 'trending';
  userCount: number;
  songCount: number;
  dominantGenre?: string;
  locationName: string;
  geohash: string;
  topTracks: TrackData[];
  topAlbums: AlbumData[];
  topArtists: ArtistData[];
  topGenres: GenreData[];
  recentListeners: UserListenerData[];
  timestamp: string;
}

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  listeners: number;
}

export interface AlbumData {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  listeners: number;
}

export interface ArtistData {
  id: string;
  name: string;
  image: string;
  listeners: number;
}

export interface GenreData {
  name: string;
  percentage: number;
}

export interface UserListenerData {
  id: string;
  name: string;
  avatar: string;
  currentTrack: {
    title: string;
    artist: string;
    albumArt: string;
    isCurrentlyListening: boolean;
    timestamp: string;
  };
}

export function useRealTimeUpdates() {
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [nearbyHotspots, setNearbyHotspots] = useState<HotspotData[] | null>(null);
  const { isLoggedIn } = useAuth();

  // Initialize singleton instance
  useEffect(() => {
    if (!instance) {
      instance = {
        currentLocation: null,
        currentTrack: null,
        nearbyHotspots: null,
        updateInterval: null,
        isUpdating: false,
        lastTrackUpdate: 0,
        lastHotspotUpdate: 0
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

  // Function to get nearby hotspots
  const getNearbyHotspots = async (location: LocationUpdate) => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        console.log('No valid access token available');
        return null;
      }

      // Generate geohash for current location
      const locationGeohash = geohash.encode(location.latitude, location.longitude, 7);

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/nearby-hotspots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          geohash: locationGeohash,
          radius: 5000 // 5km radius
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch nearby hotspots: ${response.status}`);
      }

      const data = await response.json();
      return data.hotspots;
    } catch (error) {
      console.error('Error getting nearby hotspots:', error);
      return null;
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
      
        // Send update to backend
        await sendUpdateToBackend(location, instance.currentTrack);
        
        // Get nearby hotspots (every minute)
        const now = Date.now();
        if (!instance.nearbyHotspots || now - instance.lastHotspotUpdate > 20000) {
          const hotspots = await getNearbyHotspots(location);
          if (hotspots) {
            setNearbyHotspots(hotspots);
            console.log("hotspots: ", hotspots)
            instance.nearbyHotspots = hotspots;
            instance.lastHotspotUpdate = now;
          }
        }
      }

      // Get current track with debounce
      if (!instance.lastTrackUpdate || Date.now() - instance.lastTrackUpdate > 5000) {
        const track = await getCurrentTrack();
        if (track) {
          setCurrentTrack(track);
          instance.currentTrack = track;
          instance.lastTrackUpdate = Date.now();
        }
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
    nearbyHotspots,
    startUpdates: performUpdate,
    stopUpdates: () => {
      if (instance?.updateInterval) {
        clearInterval(instance.updateInterval);
        instance.updateInterval = null;
      }
    }
  };
}