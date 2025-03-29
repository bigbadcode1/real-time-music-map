/*
 * Sets up a background task for continuous location tracking
 * Defines a named task (background-location-task) that's registered with Expo's TaskManager
 * Implements the task handler that processes location updates when they arrive
 * Provides functions to start and stop the background tracking
 * Configures tracking parameters (Accuracy, intervals of updates, include notifications, location indicator on IOS)
 * 
 * Possible further implementation - Proximity-Based Privacy (assign nearest hotspot / random hotspot in geohash (?))
*/

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

// Define the task name for background location updates
export const LOCATION_TASK_NAME = 'background-location-task';

// Type for the task data
interface LocationTaskData {
  locations: Location.LocationObject[];
}

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: LocationTaskData; error: any }) => {
  if (error) {
    console.error(error);
    return;
  }

  if (data && data.locations) {
    const { locations } = data;
    console.log('📍 Background location update:', locations);
    // Data to handle on backend [todo]
  }

  return Promise.resolve();
});

export async function startBackgroundLocationTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // Update every 10 seconds
      distanceInterval: 50, // Update every 50 meters
      showsBackgroundLocationIndicator: true, // IOS only
      foregroundService: {
        notificationTitle: 'MusicMap is tracking your location',
        notificationBody: 'Sharing your location in the background.',
        notificationColor: '#FF5733',
      },
      pausesUpdatesAutomatically: false,
    });
    console.log('✅ Background location tracking started');
  }
}

// Function to stop background location tracking (not used anywhere right now)
export async function stopBackgroundLocationTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
