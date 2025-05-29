import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Text, ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { requestPermissions } from '../../../src/services/locationService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Hotspot } from '@/components/Hotspot';
import { HotspotDetail } from '@/components/HotspotDetail';
import { useRealTimeUpdates } from '@/src/hooks/useRealTimeUpdates';
import { useAuth } from '@/src/context/AuthContext';
import { NowPlayingBar } from '@/components/NowPlayingBar';
import { TutorialModal } from '@/components/TutorialModal';
// import { LocationSearchBar } from '@/components/LocationSearchBar';
import { CustomBottomNavigationBar, MapMode } from '@/components/CustomBottomNavigationBar';
import { TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { HotspotSearchButton } from '@/components/HotspotSearchButton'
import Feather from '@expo/vector-icons/Feather';

import {
  BasicHotspotData,
  DetailedHotspotData,
  CurrentLocation,
  CurrentTrack,
  UserListenerData
} from '../../../types/dataTypes';

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapContentProps {
  hotspots: BasicHotspotData[];
  onHotspotPress: (hotspot: BasicHotspotData) => void;
  currentSelectedHotspotId: string | null | undefined;
  isMapReady: boolean;
}

// Renders the hotspot markers on the map.
const MapContent: React.FC<MapContentProps> = React.memo(
  ({ hotspots, onHotspotPress, currentSelectedHotspotId, isMapReady }) => {
    if (!isMapReady) {
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

    if (Platform.OS === 'android') {
      return (
        <>
          {validHotspots.map((hotspot) => (
            <Marker
              key={hotspot.id}
              coordinate={hotspot.coordinate}
              // tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={currentSelectedHotspotId === hotspot.id ? 100 : 10}
              // flat={true}
              onPress={() => onHotspotPress(hotspot)}
            >
              <Hotspot
                size={hotspot.size}
                activity={hotspot.activity}
                userCount={hotspot.userCount}
                coordinate={hotspot.coordinate}
                onPress={() => (1)}
              />
            </Marker>
          ))}
        </>
      )
    }
    return (
      <>
        {validHotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            coordinate={hotspot.coordinate}
            // tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={currentSelectedHotspotId === hotspot.id ? 100 : 10}
          // flat={true}
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
  // const [mapPaddingBottom, setMapPaddingBottom] = useState(1);
  const [isMapReady, setIsMapReady] = useState(false);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [isSearchingHotspots, setIsSearchingHotspots] = useState(false);
  const [lastHotspotUpdateTime, setLastHotspotUpdateTime] = useState(0);
  const [showTutorialState, setShowTutorialState] = useState(false);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  
  const mapRef = useRef<MapView | null>(null);
  const expoRouter = useRouter();

  const { isLoggedIn, userId } = useAuth();

  const { showTutorial } = useLocalSearchParams();

  const { currentLocation, currentTrack, nearbyHotspots, getNearbyHotspotsData, getHotspotDetails, nextUpdateCountdown, setMapRegionForUpdates } = useRealTimeUpdates();

  useEffect(() => {
    if (showTutorial === "true") {
      setShowTutorialState(true);
    }
  }, [showTutorial]);

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

  // Handle map region changes
  const handleRegionChange = useCallback((region: MapRegion) => {
    setMapRegion(region);
    setMapRegionForUpdates(region); // Add this line
  }, [setMapRegionForUpdates]);


  // Handle when user stops moving the map
  const handleRegionChangeComplete = useCallback((region: MapRegion) => {
    setMapRegion(region);
    setMapRegionForUpdates(region);
    // Uncomment if we want auto-search when user stops moving the map
    // hell nah dont uncomment its lagging like crazy
    // handleSearchHotspots();
  }, []);

  const handleSearchHotspots = useCallback(async () => {
    let searchRegion: MapRegion;
    
    if (mapRegion) {
      searchRegion = mapRegion;
    } else if (currentLocation) {
      searchRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    } else {
      console.log('[MapScreen] Cannot search hotspots: no map region or current location');
      return;
    }

    if (isSearchingHotspots) {
      console.log('[MapScreen] Already searching for hotspots');
      return;
    }

    const COOLDOWN_MS = 3000; // 3 seconds
    const timeSinceLastUpdate = Date.now() - lastHotspotUpdateTime;
    
    if (timeSinceLastUpdate < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastUpdate) / 1000);
      console.log(`[MapScreen] Cooldown active, ${remainingSeconds}s remaining`);
      return;
    }

    try {
      setIsSearchingHotspots(true);
      setLastHotspotUpdateTime(Date.now());
      console.log('[MapScreen] Manually searching for hotspots in current map view...');
      console.log('[MapScreen] Search region:', searchRegion);
      
      const hotspots = await getNearbyHotspotsData(searchRegion);
      if (hotspots) {
        console.log(`[MapScreen] Found ${hotspots.length} hotspots in search area`);
        
        const validatedHotspots = hotspots.map(hotspot => {
          if (!hotspot.coordinate ||
            typeof hotspot.coordinate.latitude !== 'number' ||
            typeof hotspot.coordinate.longitude !== 'number' ||
            isNaN(hotspot.coordinate.latitude) ||
            isNaN(hotspot.coordinate.longitude)) {
            console.warn(`[MapScreen] Invalid coordinate for hotspot ${hotspot.id}:`, hotspot.coordinate);
            return {
              ...hotspot,
              coordinate: searchRegion ? {
                latitude: searchRegion.latitude + (Math.random() - 0.5) * 0.005,
                longitude: searchRegion.longitude + (Math.random() - 0.5) * 0.005,
              } : { latitude: 0, longitude: 0 }
            };
          }
          return hotspot;
        }).filter(hotspot =>
          hotspot.coordinate.latitude !== 0 || hotspot.coordinate.longitude !== 0
        );

        setHotspots(validatedHotspots);
      } else {
        console.log('[MapScreen] No hotspots found in search area');
      }
    } catch (error) {
      console.error('[MapScreen] Error searching for hotspots:', error);
    } finally {
      setIsSearchingHotspots(false);
    }
  }, [mapRegion, currentLocation, getNearbyHotspotsData, isSearchingHotspots, lastHotspotUpdateTime]);

  useEffect(() => {
    if (currentLocation && !initialRegion) {
      const region: Region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setInitialRegion(region);
      setMapRegion(region);
      console.log(`[MapScreen] Set initial region:`, region);
    }
  }, [currentLocation, initialRegion]);

  // Update hotspots when nearby data changes
  useEffect(() => {
    if (nearbyHotspots && isMapReady) {
      console.log(`[MapScreen] Received ${nearbyHotspots.length} nearby hotspots`);
      setLastHotspotUpdateTime(Date.now());

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

      setHotspots((prevHotspots) => {
      const existingById = new Map(prevHotspots.map(h => [h.id, h]));
      validatedHotspots.forEach(h => existingById.set(h.id, h));
      return Array.from(existingById.values());
    });
    }
  }, [nearbyHotspots, currentLocation, isMapReady]);

  // Adjust map padding when a hotspot is selected
  // useEffect(() => {
  //   setMapPaddingBottom(selectedHotspot ? 300 : 1);
  // }, [selectedHotspot]);

  const handleMapReady = useCallback(() => {
    console.log("[MapScreen] Map is ready");
    setIsMapReady(true);
  }, []);

  const getInfo = () => {
    setShowTutorialState(true);
  };

  const centerMapOnUser = () => {
    if (mapRef.current && currentLocation) {
      const newRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 300);
      setMapRegion(newRegion); // Update mapRegion when centering on user
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
        showsMyLocationButton={false} // android no location button
        showsCompass={false}
        loadingEnabled={true}
        moveOnMarkerPress={false}
        onMapReady={handleMapReady}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
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
      
      <HotspotSearchButton
        isLoadingHotspots={isSearchingHotspots}
        lastUpdateTime={lastHotspotUpdateTime}
        onPress={handleSearchHotspots}
        cooldownMs={3000}
      />

      <View style={styles.updateTimerContainer}>
        <Text style={styles.updateTimerText}>
          {nextUpdateCountdown > 0
            ? `Next update in: ${nextUpdateCountdown}s`
            : `Updating...`}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.getInfo}
        onPress={getInfo}
      >
        <Feather name="help-circle" size={20} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.centerLocationButton}
        onPress={centerMapOnUser}
      >
        <MaterialIcons name="my-location" size={20} color="#333" />
        {/* <FontAwesome5 name="location-arrow" size={20} color="#333" /> */}
      </TouchableOpacity>

      {/* <LocationSearchBar /> */}
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
      <TutorialModal visible={showTutorialState} onClose={() => setShowTutorialState(false)} />
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
    width: 48,
    height: 48,
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

  getInfo: {
    position: 'absolute',
    top: 180,
    right: 20,
    width: 48,
    height: 48,
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

  updateTimerContainer: {
    position: 'absolute',
    top: 135,
    right: 20,
    minWidth: 140,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    opacity: 0.8
  },

  updateTimerText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default React.memo(MapScreen);