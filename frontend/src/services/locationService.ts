/*
 * Handles requesting permissions from the user for location access
 * Requires both foreground (when app is open) and background (when app is minimized) permissions
 * Provides a function to get the current location as a one-time request
 * Throws clear error messages if permissions aren't granted
 */

import * as Location from 'expo-location';

export async function requestPermissions() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Foreground location permission not granted');
  }
  
  // (!!!) For our current testing, dont track background location so keep it commented
  // const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  // if (backgroundStatus !== 'granted') {
  //   throw new Error('Background location permission not granted');
  // }
}

// Gets the device's current location (one-time request)
export async function getCurrentLocation() {
  return await Location.getCurrentPositionAsync({});
}