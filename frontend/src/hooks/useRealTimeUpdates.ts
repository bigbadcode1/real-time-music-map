import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import { getValidAccessToken } from '@/src/services/spotifyAuthService';
import ngeohash from 'ngeohash';

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
    id: string;
  } | null;
}

interface HotspotData {
  geohash: string;
  count: number;
  last_updated: string;
  longitude: number;
  latitude: number;
}

// Singleton instance with proper types
let instance: {
  currentLocation: LocationUpdate | null;
  currentTrack: SpotifyTrack | null;
  updateInterval: ReturnType<typeof setInterval> | null;
  isUpdating: boolean;
  lastTrackUpdate: number;
  lastHotspotUpdate: number;
  lastServerTimestamp: string | null;
} = {
  currentLocation: null,
  currentTrack: null,
  updateInterval: null,
  isUpdating: false,
  lastTrackUpdate: 0,
  lastHotspotUpdate: 0,
  lastServerTimestamp: null
};

// Define the viewport size for hotspot queries
const VIEWPORT_PADDING = 0.02; // ~2km at equator
const API_BASE_URL = 'https://backendtesting-five.vercel.app';

export function useRealTimeUpdates() {
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [isLoadingHotspots, setIsLoadingHotspots] = useState<boolean>(false);
  const { isLoggedIn } = useAuth();

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

      const response = await fetch(`${API_BASE_URL}/currentTrack`, {
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
        return null;
      }

      const geohash = ngeohash.encode(location.latitude, location.longitude, 7);
      
      const response = await fetch(`${API_BASE_URL}/update-user-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          song: track?.track?.id || null,
          geohash: geohash,
          trackDetails: track?.track ? {
            image: track.track.image,
            name: track.track.name,
            artist: track.track.artist
          } : null
        })
      });
      
      if (!response.ok) {
        console.error('Server error:', await response.text());
        return null;
      }
      
      const data = await response.json();
      return data.updatedHotspot;
    } catch (error) {
      console.error('Error sending update to backend:', error);
      return null;
    }
  };

  // Function to fetch hotspots
  const fetchHotspots = useCallback(async (location: LocationUpdate, forceUpdate = false) => {
    if (isLoadingHotspots) return;
    
    try {
      setIsLoadingHotspots(true);
      
      const now = Date.now();
      // Only update hotspots every 2 minutes (120000ms) unless forced
      if (!forceUpdate && now - instance.lastHotspotUpdate < 120000) {
        setIsLoadingHotspots(false);
        return;
      }
      
      // If it's initial load or forced update, get all hotspots
      let endpoint = `${API_BASE_URL}/get_hotspots`;
      let body: any = {
        ne_lat: location.latitude + VIEWPORT_PADDING,
        ne_long: location.longitude + VIEWPORT_PADDING,
        sw_lat: location.latitude - VIEWPORT_PADDING,
        sw_long: location.longitude - VIEWPORT_PADDING
      };
      
      // If we have a timestamp, use the incremental update endpoint
      if (instance.lastServerTimestamp && !forceUpdate) {
        endpoint = `${API_BASE_URL}/get_updated_hotspots`;
        body.lastUpdateTimestamp = instance.lastServerTimestamp;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error('Server error when fetching hotspots:', await response.text());
        setIsLoadingHotspots(false);
        return;
      }
      
      const data = await response.json();
      instance.lastHotspotUpdate = now;
      
      if (data.timestamp) {
        instance.lastServerTimestamp = data.timestamp;
      }
      
      // Handle hotspot data based on endpoint
      if (endpoint === `${API_BASE_URL}/get_hotspots`) {
        // Full hotspot load
        if (data.hotspots && Array.isArray(data.hotspots)) {
          setHotspots(data.hotspots);
        }
      } else {
        // Incremental update
        if (data.hotspots && data.hotspots.length > 0) {
          setHotspots(prevHotspots => {
            const hotspotMap = new Map(prevHotspots.map(h => [h.geohash, h]));
            
            // Update or add new hotspots
            data.hotspots.forEach((hotspot: HotspotData) => {
              hotspotMap.set(hotspot.geohash, hotspot);
            });
            
            return Array.from(hotspotMap.values());
          });
        }
      }
    } catch (error) {
      console.error('Error fetching hotspots:', error);
    } finally {
      setIsLoadingHotspots(false);
    }
  }, [isLoadingHotspots]);

  // Update hotspot counts when own user's hotspot changes
  const updateLocalHotspot = useCallback((updatedHotspot: HotspotData | null) => {
    if (!updatedHotspot) return;
    
    setHotspots(prevHotspots => {
      const newHotspots = [...prevHotspots];
      const existingIndex = newHotspots.findIndex(h => h.geohash === updatedHotspot.geohash);
      
      if (existingIndex >= 0) {
        newHotspots[existingIndex] = updatedHotspot;
      } else {
        newHotspots.push(updatedHotspot);
      }
      
      return newHotspots;
    });
  }, []);

  // Function to perform a single update
  const performUpdate = useCallback(async (forceHotspotUpdate = false) => {
    if (instance.isUpdating || !isLoggedIn) return;
    
    try {
      instance.isUpdating = true;
      
      // Get current location
      const location = await getCurrentLocation();
      if (!location) {
        console.log('No location available');
        instance.isUpdating = false;
        return;
      }
      
      // Fixed locationChanged check with proper type handling
      const locationChanged = !instance.currentLocation || 
                           Math.abs(location.latitude - instance.currentLocation.latitude) > 0.0001 ||
                           Math.abs(location.longitude - instance.currentLocation.longitude) > 0.0001;
      
      setCurrentLocation(location);
      instance.currentLocation = location;
      
      // Get current track with throttling
      const now = Date.now();
      let trackChanged = false;
      if (now - instance.lastTrackUpdate > 5000) { // Only update track every 5 seconds
        const track = await getCurrentTrack();
        if (track) {
          // Fixed trackDifferent check with proper type handling
          const trackDifferent = !instance.currentTrack || 
                             !instance.currentTrack.track || !track.track ||
                             instance.currentTrack.track?.id !== track.track?.id ||
                             instance.currentTrack.isPlaying !== track.isPlaying;
          
          if (trackDifferent) {
            setCurrentTrack(track);
            instance.currentTrack = track;
            trackChanged = true;
          }
          
          instance.lastTrackUpdate = now;
        }
      }
      
      // Only send update if location changed or track changed
      if (locationChanged || trackChanged) {
        const updatedHotspot = await sendUpdateToBackend(location, instance.currentTrack);
        if (updatedHotspot) {
          updateLocalHotspot(updatedHotspot);
        }
      }
      
      // Fetch hotspots when location changes significantly or forced
      if (locationChanged || forceHotspotUpdate) {
        await fetchHotspots(location, forceHotspotUpdate);
      }
    } catch (error) {
      console.error('Error in update cycle:', error);
    } finally {
      instance.isUpdating = false;
    }
  }, [isLoggedIn, fetchHotspots, updateLocalHotspot]);

  // Start updates when component mounts and user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      // Perform initial update with force hotspot update
      performUpdate(true);

      // Set up interval for updates
      const updateInterval = setInterval(() => performUpdate(), 30000);
      instance.updateInterval = updateInterval;

      return () => {
        clearInterval(updateInterval);
        instance.updateInterval = null;
      };
    }
  }, [isLoggedIn, performUpdate]);

  return {
    currentLocation,
    currentTrack,
    hotspots,
    isLoadingHotspots,
    forceUpdate: () => performUpdate(true),
    startUpdates: () => {
      if (instance.updateInterval) {
        clearInterval(instance.updateInterval);
      }
      const interval = setInterval(() => performUpdate(), 30000);
      instance.updateInterval = interval;
      performUpdate(true);
    },
    stopUpdates: () => {
      if (instance.updateInterval) {
        clearInterval(instance.updateInterval);
        instance.updateInterval = null;
      }
    }
  };
}