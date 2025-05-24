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
import { TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

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
  isMapReady: boolean;
}

// Renders the hotspot markers on the map.
const MapContent: React.FC<MapContentProps> = React.memo(
  ({ hotspots, onHotspotPress, currentSelectedHotspotId, isMapReady }) => {
    if(!isMapReady) {
      return null;
    }

    const validHotspots = hotspots.filter(hotspot => 
      hotspot.coordinate &&
      typeof hotspot.coordinate.latitude === 'number' &&
      typeof hotspot.coordinate.longitude === 'number' &&
      hotspot.coordinate.latitude >= -90 && 
      hotspot.coordinate.latitude <= 90 &&
      hotspot.coordinate.longitude >= -180 && 
      hotspot.coordinate.longitude <= 180 &&
      !isNaN(hotspot.coordinate.latitude) &&
      !isNaN(hotspot.coordinate.longitude)
    );


    return (
      <>
        {validHotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            coordinate={hotspot.coordinate}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={currentSelectedHotspotId === hotspot.id ? 100 : 10}
            flat={true}
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
    prevProps.currentSelectedHotspotId === nextProps.currentSelectedHotspotId && prevProps.isMapReady === nextProps.isMapReady
);

const MapScreen: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentMapMode, setCurrentMapMode] = useState<MapMode>('discover');
  const [hotspots, setHotspots] = useState<BasicHotspotData[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<DetailedHotspotData | null>(null);
  const [mapPaddingBottom, setMapPaddingBottom] = useState(1);
  const [isMapReady, setIsMapReady] = useState(false);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);

  const mapRef = useRef<MapView | null>(null);
  const expoRouter = useRouter();
  
  const { isLoggedIn, userId } = useAuth();

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


  useEffect(() => {
    if (currentLocation && !initialRegion) {
      const region: Region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setInitialRegion(region);
      console.log(`[MapScreen] Set initial region:`, region);
    }
  }, [currentLocation, initialRegion]);

  // Update hotspots when nearby data changes
  useEffect(() => {
    if (nearbyHotspots && isMapReady) {
      console.log(`[MapScreen] Received ${nearbyHotspots.length} nearby hotspots`);
      
      // Validate hotspot coordinates before setting
      const validatedHotspots = nearbyHotspots.map(hotspot => {
        if (!hotspot.coordinate || 
            typeof hotspot.coordinate.latitude !== 'number' || 
            typeof hotspot.coordinate.longitude !== 'number' ||
            isNaN(hotspot.coordinate.latitude) ||
            isNaN(hotspot.coordinate.longitude)) {
          console.warn(`[MapScreen] Invalid coordinate for hotspot ${hotspot.id}:`, hotspot.coordinate);
          // Return hotspot with default coordinate if current location is available
          return {
            ...hotspot,
            coordinate: currentLocation ? {
              latitude: currentLocation.latitude + (Math.random() - 0.5) * 0.005,
              longitude: currentLocation.longitude + (Math.random() - 0.5) * 0.005,
            } : { latitude: 0, longitude: 0 }
          };
        }
        return hotspot;
      }).filter(hotspot => 
        hotspot.coordinate.latitude !== 0 || hotspot.coordinate.longitude !== 0
      );

      setHotspots(validatedHotspots);
    }
  }, [nearbyHotspots, currentLocation, isMapReady]);

  // Adjust map padding when a hotspot is selected
  useEffect(() => {
    setMapPaddingBottom(selectedHotspot ? 300 : 1);
  }, [selectedHotspot]);


  const handleMapReady = useCallback(() => {
    console.log("[MapScreen] Map is ready");
    setIsMapReady(true);
  }, []);


  const centerMapOnUser = () => {
      if (mapRef.current && currentLocation) {
        mapRef.current.animateToRegion(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300
        );
      }
  };

  const handleHotspotPress = useCallback(async (hotspot: BasicHotspotData) => {
    console.log(`[MapScreen] Hotspot selected: ${hotspot.id}`);
    
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

    // hmmmmmmmmm
    // if (mapRef.current) {
    //   mapRef.current.animateToRegion(
    //     {
    //       latitude: hotspot.coordinate.latitude,
    //       longitude: hotspot.coordinate.longitude,
    //       latitudeDelta: 0.01,
    //       longitudeDelta: 0.01,
    //     },
    //     300
    //   );
    // };

    const listeners = await getHotspotDetails(hotspot.geohash);
    console.log(`[MapScreen] Received ${listeners?.length || 0} listeners for hotspot ${hotspot.id}`);

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
  if (!currentLocation && !initialRegion) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Finding your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion as Region}
        showsUserLocation={true}
        showsCompass={true}
        loadingEnabled={true}
        moveOnMarkerPress={false}
        onMapReady={handleMapReady}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <MapContent
          hotspots={hotspots}
          onHotspotPress={handleHotspotPress}
          currentSelectedHotspotId={selectedHotspot?.id}
          isMapReady={isMapReady}
        />
      </MapView>

      <NowPlayingBar currentTrack={currentTrack} />

      <TouchableOpacity
        style={styles.centerLocationButton}
        onPress={centerMapOnUser}
      >
        <MaterialIcons name="my-location" size={24} color="#333" />
        {/* <FontAwesome5 name="location-arrow" size={20} color="#333" /> */}
        
      </TouchableOpacity>

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
  centerLocationButton: {
    position: 'absolute',
    bottom: 225,
    right: 20,
    width: 52,
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 1.00)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default React.memo(MapScreen);
