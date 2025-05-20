import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Text, ActivityIndicator, View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as geohash from 'ngeohash';
import { requestPermissions } from '../../../src/services/locationService';
import FontAwesome from '@expo/vector-icons/build/FontAwesome';
import { useRouter } from 'expo-router';
import { Hotspot, HotspotActivity, HotspotSize } from '@/components/Hotspot';
import { HotspotDetail } from '@/components/HotspotDetail';
import { useRealTimeUpdates } from '@/src/hooks/useRealTimeUpdates';
import { useAuth } from '@/src/context/AuthContext';
import { NowPlayingBar } from '@/components/NowPlayingBar';

// --- TYPE DEFINITIONS ---
type MapMode = 'discover' | 'analyze';

interface HotspotData {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  size: HotspotSize;
  activity: HotspotActivity;
  userCount: number;
  songCount: number;
  dominantGenre?: string;
  locationName: string;
  geohash: string;
  topTracks: TrackData[];
  topAlbums: AlbumData[];
  topArtists: ArtistData[];
  topGenres: GenreData[];
  recentListeners: UserListenerData[];
  timestamp: string;
}

interface TrackData {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  listeners: number;
}

interface AlbumData {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  listeners: number;
}

interface ArtistData {
  id: string;
  name: string;
  image: string;
  listeners: number;
}

interface GenreData {
  name: string;
  percentage: number;
}

interface UserListenerData {
  id: string;
  name: string;
  avatar: string;
  currentTrack: {
    title: string;
    artist: string;
    albumArt: string;
    isCurrentlyListening: boolean;
    timestamp: string;
  };
}

interface CurrentLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface CurrentTrack {
  isPlaying: boolean;
  track: {
    name: string;
    artist: string;
    album_name: string;
    image: string;
    duration: number;
    progress: number;
    uri: string;
  } | null;
}

// --- MAPS COMPONENT PROPS & DEFINITION ---
interface MapContentProps {
  hotspots: HotspotData[];
  onHotspotPress: (hotspot: HotspotData) => void;
  selectedHotspotId: string | null;
}

interface LocationDetail {
  name?: string;
  street?: string;
  streetNumber?: string;
  district?: string;
  city?: string;
  subregion?: string;
  region?: string;
}

// --- COMPONENT DEFINITIONS ---
const MapContent: React.FC<MapContentProps> = React.memo(({ 
  hotspots, 
  onHotspotPress,
  selectedHotspotId
}) => {
  return (
    <>
      {hotspots.map((hotspot) => (
        <Marker
          key={hotspot.id}
          coordinate={hotspot.coordinate}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={10}
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
}, (prevProps, nextProps) => {
  return prevProps.selectedHotspotId === nextProps.selectedHotspotId && 
         prevProps.hotspots === nextProps.hotspots;
});

const MapScreen: React.FC = () => {
  // --- STATE & REFS ---
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>('discover');
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [isHotspotDetailVisible, setIsHotspotDetailVisible] = useState(false);
  const [mapPaddingBottom, setMapPaddingBottom] = useState(0);
  
  // --- REFS ---
  const mapRef = useRef<MapView | null>(null);
  const selectedHotspotRef = useRef<HotspotData | null>(null);
  const hotspotDetailRef = useRef<any>(null);
  
  // --- HOOKS ---
  const { currentLocation, currentTrack, nearbyHotspots } = useRealTimeUpdates() as {
    currentLocation: CurrentLocation | null;
    currentTrack: CurrentTrack | null;
    nearbyHotspots: HotspotData[] | null;
  };
  const { isLoggedIn } = useAuth();
  const expoRouter = useRouter();

  // --- GEOCODING UTILITIES ---
  const getLocationNameFromCoordinates = useCallback(async (latitude: number, longitude: number): Promise<string> => {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (reverseGeocode && reverseGeocode.length > 0) {
        const location = reverseGeocode[0] as unknown as LocationDetail;
        
        // Try to extract a meaningful location name using various available fields
        if (location.name && location.name.length > 3 && !location.name.match(/^\d+$/)) {
          return location.name;
        } else if (location.street && location.streetNumber) {
          return `${location.street} ${location.streetNumber}`;
        } else if (location.street) {
          return location.street;
        } else if (location.district) {
          return location.district;
        } else if (location.subregion && location.city) {
          return `${location.subregion}, ${location.city}`;
        } else if (location.city && location.district) {
          return `${location.district}, ${location.city}`;
        } else if (location.city) {
          return `${location.city}`;
        } else if (location.region) {
          return location.region;
        }
      }
      return "Unknown Location";
    } catch (error) {
      console.log('Error with reverse geocoding:', error);
      return "Unknown Location";
    }
  }, []);

  // --- EVENT HANDLERS ---
  const toggleMode = useCallback(() => {
    setMode((prevMode) => (prevMode === 'discover' ? 'analyze' : 'discover'));
  }, []);

  const handleHotspotPress = useCallback((hotspot: HotspotData) => {
    console.log('Hotspot pressed:', hotspot.id);
    selectedHotspotRef.current = hotspot;
    setSelectedHotspotId(hotspot.id);
    setIsHotspotDetailVisible(true);
    setMapPaddingBottom(300);
  }, []);

  const handleCloseHotspotDetail = useCallback(() => {
    console.log('Closing hotspot detail');
    setIsHotspotDetailVisible(false);
    setSelectedHotspotId(null);
    selectedHotspotRef.current = null;
    setMapPaddingBottom(0);
  }, []);

  // --- EFFECTS ---
  useEffect(() => {
    if (!isLoggedIn) {
      expoRouter.replace('/(onboarding)/welcome');
    }
  }, [isLoggedIn, expoRouter]);

  // Update hotspots when nearbyHotspots changes
  useEffect(() => {
    if (nearbyHotspots) {
      setHotspots(nearbyHotspots);
    }
  }, [nearbyHotspots]);

  useEffect(() => {
    (async () => {
      try {
        await requestPermissions();
        console.log('Permissions granted');
      } catch (error) {
        console.error('Error in initial setup useEffect:', error);
        setErrorMsg(error instanceof Error ? error.message : 'An error occurred during setup');
      }
    })();
  }, []);

  // --- CONDITIONAL RENDERING ---
  if (errorMsg) return <Text className="p-5 text-center text-red-500">{errorMsg}</Text>;

  if (!currentLocation) {
    return (
      <View style={styles.container} className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#1DB954" />
        <Text className="mt-3 text-gray-600">Finding your location...</Text>
      </View>
    );
  }

  const { latitude, longitude } = currentLocation;

  // --- RENDER ---
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        onRegionChangeComplete={() => {/* Logic if needed */}}
        paddingAdjustmentBehavior="automatic"
        maxZoomLevel={20}
        minZoomLevel={10}
        moveOnMarkerPress={false}
        showsCompass={true}
        loadingEnabled={true}
        zoomControlEnabled={true}
        mapPadding={{top: 0, right: 0, bottom: mapPaddingBottom, left: 0}}
      >
        <MapContent 
          hotspots={hotspots} 
          onHotspotPress={handleHotspotPress} 
          selectedHotspotId={selectedHotspotId}
        />
      </MapView>
      
      {currentTrack && <NowPlayingBar currentTrack={currentTrack}/>}

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
          style={[
            styles.modeButton,
            mode === 'discover' ? styles.modeButtonDiscover : styles.modeButtonAnalyze
          ]}
          className="flex-row items-center justify-center py-2 px-4 rounded-full"
        >
          <FontAwesome
            name={mode === 'discover' ? 'map-pin' : 'search'}
            size={16}
            color={mode === 'discover' ? 'white' : 'black'}
            style={styles.iconSpacing}
          />
          <Text style={[styles.modeButtonText, { color: mode === 'discover' ? 'white' : 'black' }]}>
            {mode === 'discover' ? 'Analyze' : 'Discover'} 
          </Text>
        </TouchableOpacity>

        <View style={styles.navButtonsContainer}>
          <TouchableOpacity onPress={() => expoRouter.push('/friends')} style={styles.navButton}>
            <FontAwesome name="users" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => expoRouter.push('/saved')} style={styles.navButton}>
            <FontAwesome name="bookmark" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => expoRouter.push('/profile')} style={styles.navButton}>
            <FontAwesome name="user" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      {isHotspotDetailVisible && selectedHotspotRef.current && (
        <HotspotDetail
          locationName={selectedHotspotRef.current.locationName}
          userCount={selectedHotspotRef.current.userCount}
          topTracks={selectedHotspotRef.current.topTracks || []}
          topAlbums={selectedHotspotRef.current.topAlbums || []}
          topArtists={selectedHotspotRef.current.topArtists || []}
          topGenres={selectedHotspotRef.current.topGenres || []}
          recentListeners={selectedHotspotRef.current.recentListeners || []}
          timestamp={selectedHotspotRef.current.timestamp || new Date().toISOString()}
          onClose={handleCloseHotspotDetail}
        />
      )}
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  customNavBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5, // For Android
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 120, 
    height: 38,
  },
  modeButtonDiscover: {
    backgroundColor: '#000000', 
  },
  modeButtonAnalyze: {
    backgroundColor: '#f0f0f0', 
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconSpacing: {
    marginRight: 8, 
  }
});

export default React.memo(MapScreen);