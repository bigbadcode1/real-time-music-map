import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { requestPermissions } from '../../../src/services/locationService';
import { useRouter } from 'expo-router';
import { Hotspot } from '@/components/Hotspot';
import { HotspotDetail } from '@/components/HotspotDetail';
import { useRealTimeUpdates } from '@/src/hooks/useRealTimeUpdates';
import { useAuth } from '@/src/context/AuthContext';
import { NowPlayingBar } from '@/components/NowPlayingBar';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { CustomBottomNavigationBar, MapMode } from '@/components/CustomBottomNavigationBar';
import {
  BasicHotspotData,
  DetailedHotspotData,
  CurrentLocation,
  CurrentTrack,
  UserListenerData
} from '../../../types/dataTypes';

interface MapContentProps {
  hotspots: BasicHotspotData[];
  onHotspotPress: (hotspot: BasicHotspotData) => void;
  currentSelectedHotspotId: string | null | undefined;
}

// Renders the hotspot markers on the map.
const MapContent: React.FC<MapContentProps> = React.memo(
  ({ hotspots, onHotspotPress, currentSelectedHotspotId }) => {
    return (
      <>
        {hotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            coordinate={hotspot.coordinate}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={currentSelectedHotspotId === hotspot.id ? 100 : 10}
          >
            <Hotspot
              size={hotspot.size}
              activity={hotspot.activity}
              userCount={hotspot.userCount}
              coordinate={hotspot.coordinate}
              onPress={() => onHotspotPress(hotspot)}
            />
          </Marker>
        ))}
      </>
    );
  },
  (prevProps, nextProps) =>
    prevProps.hotspots === nextProps.hotspots &&
    prevProps.currentSelectedHotspotId === nextProps.currentSelectedHotspotId
);

const MapScreen: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentMapMode, setCurrentMapMode] = useState<MapMode>('discover');
  const [hotspots, setHotspots] = useState<BasicHotspotData[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<DetailedHotspotData | null>(null);
  const [mapPaddingBottom, setMapPaddingBottom] = useState(1);

  const mapRef = useRef<MapView | null>(null);
  const expoRouter = useRouter();
  
  // Get auth context values - we no longer need a separate userId state
  const { isLoggedIn, userId } = useAuth();

  // No longer need to pass userId to useRealTimeUpdates
  const { currentLocation, currentTrack, nearbyHotspots, getHotspotDetails } = useRealTimeUpdates();

  // Redirect to onboarding if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      console.log("[MapScreen] Not logged in, redirecting to welcome");
      expoRouter.replace('/(onboarding)/welcome');
    } else {
      console.log(`[MapScreen] User is logged in with ID: ${userId || 'unknown'}`);
    }
  }, [isLoggedIn, expoRouter, userId]);

  // Request location permissions on mount
  useEffect(() => {
    const requestLocationAccess = async () => {
      try {
        await requestPermissions();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to request location permissions.');
      }
    };
    requestLocationAccess();
  }, []);

  // Update hotspots when nearby data changes
  useEffect(() => {
    if (nearbyHotspots) {
      console.log(`[MapScreen] Received ${nearbyHotspots.length} nearby hotspots`);
      setHotspots(nearbyHotspots);
    }
  }, [nearbyHotspots]);

  // Adjust map padding when a hotspot is selected
  useEffect(() => {
    setMapPaddingBottom(selectedHotspot ? 300 : 1);
  }, [selectedHotspot]);

  const handleHotspotPress = useCallback(async (hotspot: BasicHotspotData) => {
    console.log(`[MapScreen] Hotspot selected: ${hotspot.id}`);
    
    // 1. Set basic info immediately to show loading state
    setSelectedHotspot({
      ...hotspot,
      songCount: 0,
      dominantGenre: undefined,
      topTracks: [],
      topAlbums: [],
      topArtists: [],
      topGenres: [],
      recentListeners: [],
      timestamp: hotspot.lastUpdated,
    });

    // 2. Center map on selected hotspot
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: hotspot.coordinate.latitude,
          longitude: hotspot.coordinate.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300
      );
    }

    // 3. Fetch detailed listener information
    const listeners = await getHotspotDetails(hotspot.geohash);
    console.log(`[MapScreen] Received ${listeners?.length || 0} listeners for hotspot ${hotspot.id}`);

    // 4. Update selected hotspot with fetched details
    setSelectedHotspot((prevSelectedHotspot) => {
      if (prevSelectedHotspot?.id === hotspot.id && listeners) {
        return {
          ...prevSelectedHotspot,
          recentListeners: listeners,
        };
      }
      return prevSelectedHotspot;
    });
  }, [getHotspotDetails]);

  const handleCloseHotspotDetail = useCallback(() => {
    setSelectedHotspot(null);
  }, []);

  const toggleMode = useCallback(() => {
    setCurrentMapMode((prevMode) => (prevMode === 'discover' ? 'analyze' : 'discover'));
  }, []);

  // Show error message if location permissions were denied
  if (errorMsg) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  // Show loading indicator while waiting for location
  if (!currentLocation) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </View>
    );
  }

  const initialRegion: Region = {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsCompass={true}
        loadingEnabled={true}
        maxZoomLevel={20}
        minZoomLevel={10}
        moveOnMarkerPress={false}
        paddingAdjustmentBehavior="automatic"
        mapPadding={{ top: 0, right: 0, bottom: mapPaddingBottom, left: 0 }}
      >
        <MapContent
          hotspots={hotspots}
          onHotspotPress={handleHotspotPress}
          currentSelectedHotspotId={selectedHotspot?.id}
        />
      </MapView>

      <NowPlayingBar currentTrack={currentTrack} />

      <LocationSearchBar />
      <CustomBottomNavigationBar
        currentMode={currentMapMode}
        onToggleMode={toggleMode}
      />

      {selectedHotspot && (
        <HotspotDetail
          locationName={selectedHotspot.locationName}
          userCount={selectedHotspot.userCount}
          topTracks={selectedHotspot.topTracks || []}
          topAlbums={selectedHotspot.topAlbums || []}
          topArtists={selectedHotspot.topArtists || []}
          topGenres={selectedHotspot.topGenres || []}
          recentListeners={selectedHotspot.recentListeners || []}
          timestamp={selectedHotspot.timestamp || new Date().toISOString()}
          onClose={handleCloseHotspotDetail}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

export default React.memo(MapScreen);