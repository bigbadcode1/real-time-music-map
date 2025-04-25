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
import { Text, ActivityIndicator, View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as geohash from 'ngeohash';
import { requestPermissions, getCurrentLocation, watchLocation } from '../../../src/services/locationService';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../../../src/tasks/backgroundLocationTask';
import FontAwesome from '@expo/vector-icons/build/FontAwesome';
import { router } from 'expo-router';

type MapMode = 'discover' | 'analyze';

const MapScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [mode, setMode] = useState<MapMode>('discover');

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
          // console.log('📍 Location update:', newLocation);
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

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'discover' ? 'analyze' : 'discover'));
    // console.log("Switched mode to:", mode === 'discover' ? 'analyze' : 'discover');
  };

  if (errorMsg) return <Text className="p-5 text-center text-red-500">{errorMsg}</Text>;
  
  if (!location) return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color="#1DB954" />
      <Text className="mt-3 text-gray-600">Finding your location...</Text>
    </View>
  );
  const { latitude, longitude } = location.coords;
  const hash = geohash.encode(latitude, longitude, 7);

  return (
    <View className='flex-1'>
      <MapView
      // className='flex-1' doesn't work lol it must be like dat
        style={{flex: 1}}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,  
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* <Marker
          coordinate={{ latitude, longitude }}
          title="You"
          description={`Geohash: ${hash}`}
        /> */}
      </MapView>

      <View className="absolute top-20 left-12 right-12 flex-row items-center justify-center px-5 py-4 bg-white rounded-full">
    <FontAwesome name="headphones" size={20} color="black" style={{ marginRight: 8 }} />
    <Text className="text-base text-slate-700 font-semibold">Listeners in this area: {"<num>"}</Text>
  </View>

      <View className="absolute bottom-36 left-0 right-0 items-center">
        <View className="flex-row items-center justify-center px-4 py-3 bg-white rounded-full opacity-65 w-1/2 h-12">
          <TextInput
            className="flex-1 text-sm py-1 font-light text-center"
            placeholder="Search location..."
            placeholderTextColor="black"
          />
        </View>
      </View>

      <View style={styles.customNavBar} className="absolute bottom-12 left-12 right-12 h-20 bg-white rounded-full flex-row items-center justify-between px-6 py-2 shadow-xl">
  <TouchableOpacity
    onPress={toggleMode}
    style={[styles.modeButton, mode === 'analyze' ? styles.modeButtonAnalyze : styles.modeButtonDiscover]}
    className="flex-row items-center justify-center py-2 px-4 rounded-full"
  >
    <FontAwesome 
      name={mode === 'discover' ? 'search' : 'map-pin'} 
      size={16} 
      color={mode === 'analyze' ? 'white' : 'black'} 
      style={styles.iconSpacing} 
    />
    <Text style={[styles.modeButtonText, { color: mode === 'analyze' ? 'white' : 'black' }]}>
      {mode === 'discover' ? 'Discover' : 'Analyze'}
    </Text>
  </TouchableOpacity>

  <View style={styles.navButtonsContainer}>
    <TouchableOpacity onPress={() => router.push('/friends')} style={styles.navButton}>
      <FontAwesome name="users" size={24} color="black" />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => router.push('/saved')} style={styles.navButton}>
      <FontAwesome name="bookmark" size={24} color="black" />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => router.push('/profile')} style={styles.navButton}>
      <FontAwesome name="user" size={24} color="black" />
    </TouchableOpacity>
  </View>
  </View>
    </View>
  );
};

const styles = StyleSheet.create({
  customNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  navButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '55%',
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  modeButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    height: 38,
  },
  modeButtonDiscover: {
    backgroundColor: '#f0f0f0',
  },
  modeButtonAnalyze: {
    backgroundColor: '#000000',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconSpacing: {
    marginRight: 8,
  }
});

export default MapScreen;