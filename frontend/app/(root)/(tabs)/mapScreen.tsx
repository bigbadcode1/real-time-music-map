import React, { useEffect, useState, useRef } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { requestPermissions, getCurrentLocation, watchLocation } from '@/src/services/locationService';
import CustomHotspotMarker from '@/components/CustomHotspotMarker';
import MapControls from '@/components/MapControls';
import UserLocationMarker from '@/components/UserLocationMarker';
import { dummyHotspots } from '@/constants/hotspots';
import { calculateZoomLevel, createNearbyHotspots } from '@/src/services/mapUtils';
import { Hotspot } from '@/types/map';

const MapScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [visibleHotspots, setVisibleHotspots] = useState<Hotspot[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(15);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await requestPermissions();
        const currentLocation = await getCurrentLocation();
        setLocation(currentLocation);
        
        if (currentLocation) {
          const nearbyHotspots = createNearbyHotspots(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude
          );
          setVisibleHotspots([...nearbyHotspots, ...dummyHotspots]);
        } else {
          setVisibleHotspots(dummyHotspots);
        }
        
        const subscription = await watchLocation((newLocation) => {
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

  const handleRegionChange = (region: Region) => {
    const newZoomLevel = calculateZoomLevel(region);
    setZoomLevel(newZoomLevel);
  };

  const handleMoveToLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  const showAllMarkers = () => {
    if (mapRef.current && location) {
      const points = [
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        ...visibleHotspots.map(h => h.coordinate)
      ];
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    }
  };

  if (errorMsg) return <Text>{errorMsg}</Text>;
  if (!location) return <ActivityIndicator size="large" style={{ marginTop: 10 }} />;

  return (
    <>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onRegionChangeComplete={handleRegionChange}
      >
        <UserLocationMarker 
          latitude={location.coords.latitude} 
          longitude={location.coords.longitude} 
        />
        {visibleHotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            coordinate={hotspot.coordinate}
            title={`${hotspot.listeners} listeners`}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <CustomHotspotMarker hotspot={hotspot} zoomLevel={zoomLevel} />
          </Marker>
        ))}
      </MapView>
      <MapControls 
        onCenterMap={handleMoveToLocation}
        onShowAllMarkers={showAllMarkers}
      />
    </>
  );
};

export default MapScreen;