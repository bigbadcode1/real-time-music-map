/**
 * MapScreen.tsx
 * 
 * This component displays an interactive map centered on the user's current location.
 * It handles:
 * - Requesting location permissions from the user
 * - Retrieving the current device location
 * - Displaying the location on a map with a marker
 * - Converting the location to a geohash for efficient location encoding
 * - Starting a background location tracking service
 * 
 * The component shows appropriate loading states and error messages
 * during the location retrieval process.
 */

import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as geohash from 'ngeohash';
import { requestPermissions, getCurrentLocation, watchLocation } from '../services/locationService';
import { startBackgroundLocationTracking } from '../tasks/backgroundLocationTask';

const MapScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  // Effect hook runs once when component mounts to initialize location services
  useEffect(() => {

    // Self-executing async function to handle location setup
    (async () => {
      try {
        await requestPermissions();
        
        const currentLocation = await getCurrentLocation();
        setLocation(currentLocation);
        
        // Start tracking location in the background
        const subscription = await watchLocation((newLocation) => {
          console.log('📍 Location update:', newLocation);
          setLocation(newLocation);
        });

        setLocationSubscription(subscription);
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'An error occurred');
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };

  }, []);

  if (errorMsg) return <Text>{errorMsg}</Text>;
  
  // Show loading indicator while waiting for location data
  if (!location) return <ActivityIndicator size="large" className="mt-10" />;
  
  // Extract coordinates from location object and generate a geohash from coordinates with precision level 7
  const { latitude, longitude } = location.coords;
  const hash = geohash.encode(latitude, longitude, 7);

  // Render the map centered on user's location
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.01,  
        longitudeDelta: 0.01,
      }}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        title="You"
        description={`Geohash: ${hash}`}
      />
    </MapView>
  );
};

export default MapScreen;