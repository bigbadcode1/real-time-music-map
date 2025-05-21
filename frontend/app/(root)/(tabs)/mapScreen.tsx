import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
// import * as geohash from 'ngeohash';
import { requestPermissions } from '../../../src/services/locationService';
import { useRouter } from 'expo-router';
import { Hotspot } from '@/components/Hotspot';
import { HotspotDetail } from '@/components/HotspotDetail';
import { useRealTimeUpdates } from '@/src/hooks/useRealTimeUpdates';
import { useAuth } from '@/src/context/AuthContext';
import { NowPlayingBar } from '@/components/NowPlayingBar';
import { LocationSearchBar } from '@/components/LocationSearchBar';
import { CustomBottomNavigationBar, MapMode } from '@/components/CustomBottomNavigationBar';
import { HotspotData, CurrentLocation, CurrentTrack, LocationDetail, TrackData, AlbumData, ArtistData, GenreData, UserListenerData } from '../../../types/dataTypes'; // Ensure all needed types are here


interface MapContentProps {
  hotspots: HotspotData[];
  onHotspotPress: (hotspot: HotspotData) => void;
  currentSelectedHotspotId: string | null | undefined;
}

// Renders the hotspot markers on the map.
const MapContent: React.FC<MapContentProps> = React.memo(({
  hotspots,
  onHotspotPress,
  currentSelectedHotspotId,
}) => {
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
            songCount={hotspot.songCount}
            dominantGenre={hotspot.dominantGenre}
            coordinate={hotspot.coordinate}
            onPress={() => onHotspotPress(hotspot)}
          />
        </Marker>
      ))}
    </>
  );
}, (prevProps, nextProps) =>
  prevProps.hotspots === nextProps.hotspots &&
  prevProps.currentSelectedHotspotId === nextProps.currentSelectedHotspotId 
);

const MapScreen: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentMapMode, setCurrentMapMode] = useState<MapMode>('discover');
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(null);
  const [mapPaddingBottom, setMapPaddingBottom] = useState(1);

  const mapRef = useRef<MapView | null>(null);
  const expoRouter = useRouter();
  const { isLoggedIn } = useAuth();
  const { currentLocation, currentTrack, nearbyHotspots } = useRealTimeUpdates() as {
    currentLocation: CurrentLocation | null;
    currentTrack: CurrentTrack | null;
    nearbyHotspots: HotspotData[] | null;
  };

  console.log(nearbyHotspots)

  useEffect(() => {
    if (!isLoggedIn) {
      expoRouter.replace('/(onboarding)/welcome');
    }
  }, [isLoggedIn, expoRouter]);

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
    if (nearbyHotspots) {
      setHotspots(nearbyHotspots);
    }
  }, [nearbyHotspots]);

  useEffect(() => {
    setMapPaddingBottom(selectedHotspot ? 300 : 1);
  }, [selectedHotspot]);

  const handleHotspotPress = useCallback((hotspot: HotspotData) => {
    setSelectedHotspot(hotspot);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: hotspot.coordinate.latitude,
        longitude: hotspot.coordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 300);
    }
  }, []);

  const handleCloseHotspotDetail = useCallback(() => {
    setSelectedHotspot(null);
  }, []);

  const toggleMode = useCallback(() => {
    setCurrentMapMode((prevMode) => (prevMode === 'discover' ? 'analyze' : 'discover'));
  }, []);


  if (errorMsg) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

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