import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Text, ActivityIndicator, View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import MapView, { Marker} from 'react-native-maps';
import * as Location from 'expo-location';
import * as geohash from 'ngeohash';
import { requestPermissions } from '../../../src/services/locationService';
// import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../../../src/tasks/backgroundLocationTask';
import FontAwesome from '@expo/vector-icons/build/FontAwesome';
import { router, useRouter } from 'expo-router';
import { Hotspot, HotspotSize, HotspotActivity } from '@/components/Hotspot';
import { HotspotDetail, TrackData, UserListenerData, AlbumData, ArtistData } from '@/components/HotspotDetail';
import { useRealTimeUpdates } from '@/src/hooks/useRealTimeUpdates';
import { useAuth } from '@/src/context/AuthContext';
import { NowPlayingBar } from '@/components/NowPlayingBar';

type MapMode = 'discover' | 'analyze';

// Hotspot type definition
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
}

const MapContent = React.memo(({ 
  hotspots, 
  onHotspotPress,
  selectedHotspotId
}: { 
  hotspots: HotspotData[], 
  onHotspotPress: (hotspot: HotspotData) => void,
  selectedHotspotId: string | null,
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
  // Custom comparison function to prevent unnecessary re-renders
  return prevProps.selectedHotspotId === nextProps.selectedHotspotId && 
         prevProps.hotspots === nextProps.hotspots;
});

const MapScreen = () => {
console.log('mapscreen rerender');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>('discover');
  const mapRef = useRef<MapView>(null);
  const { currentLocation, currentTrack } = useRealTimeUpdates();
  const { isLoggedIn } = useAuth();
  const expoRouter = useRouter();

  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [isHotspotDetailVisible, setIsHotspotDetailVisible] = useState(false);
  const [mapPaddingBottom, setMapPaddingBottom] = useState(0);
  const [initialHotspotsGenerated, setInitialHotspotsGenerated] = useState(false);

  const hotspotDetailRef = useRef({
    topTracks: [] as TrackData[],
    topAlbums: [] as AlbumData[],
    topArtists: [] as ArtistData[],
    topGenres: [] as { name: string; percentage: number }[],
    timestamp: new Date().toISOString(),
    recentListeners: [] as UserListenerData[]
  });

  const selectedHotspotRef = useRef<HotspotData | null>(null);

  const toggleMode = useCallback(() => {
    setMode((prevMode) => (prevMode === 'discover' ? 'analyze' : 'discover'));
  }, []);

  useEffect(() => {
      if (!isLoggedIn) {
          expoRouter.replace('/(onboarding)/welcome');
      }
  }, [isLoggedIn, expoRouter]);


  const generateSampleHotspots = useCallback(async (userLocation: Location.LocationObject) => {
    const { latitude, longitude } = userLocation.coords;
    const sampleHotspots: HotspotData[] = [];

    // Parameters for generating hotspots
    const numberOfHotspots = 5;
    const radiusKm = 1; // 1km radius

    // Conversion factors
    const oneDegLatKm = 111.32; // km per degree of latitude
    const oneDegLonKm = 111.32 * Math.cos(latitude * (Math.PI / 180)); // km per degree of longitude

    // Activity levels and sizes
    // const activityLevels: HotspotActivity[] = ['low', 'medium', 'high', 'trending']; // Not directly used for assignment, but good for reference
    // const sizes: HotspotSize[] = ['small', 'medium', 'large', 'xlarge']; // Not directly used for assignment

    // Removed nested generateHotspots async function, directly use the loop
    for (let i = 0; i < numberOfHotspots; i++) {
      // Random angle and distance
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radiusKm;

      // Calculate offset
      const lat_offset = (distance / oneDegLatKm) * Math.sin(angle);
      const lon_offset = (distance / oneDegLonKm) * Math.cos(angle);

      // Calculate new coordinates
      const newLat = latitude + lat_offset;
      const newLon = longitude + lon_offset;

      // Random user count between 3 and 50
      const userCount = Math.floor(Math.random() * 48) + 3;

      // Size and activity based on user count
      let size: HotspotSize;
      let activity: HotspotActivity;

      if (userCount < 10) {
        size = 'small';
        activity = 'low';
      } else if (userCount < 20) {
        size = 'medium';
        activity = 'medium';
      } else if (userCount < 35) {
        size = 'large';
        activity = 'high';
      } else {
        size = 'xlarge';
        activity = 'trending';
      }

      // Get real place name from reverse geocoding
      let placeName = "";
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: newLat,
          longitude: newLon
        });
        
        if (reverseGeocode && reverseGeocode.length > 0) {
          const location = reverseGeocode[0];
          
          if (location.name && location.name.length > 3 && !location.name.match(/^\d+$/)) {
            placeName = location.name;
          } else if (location.street && location.streetNumber) {
            placeName = `${location.street} ${location.streetNumber}`;
          } else if (location.street) {
            placeName = location.street;
          } else if (location.district) {
            placeName = location.district;
          } else if (location.subregion && location.city) {
            placeName = `${location.subregion}, ${location.city}`;
          } else if (location.city && location.district) {
            placeName = `${location.district}, ${location.city}`;
          } else if (location.city) {
            const cityAreas = ['University Area', 'Old Town', 'City Center', 'Main Square', 'Central', 'Market District'];
            placeName = `${cityAreas[Math.floor(Math.random() * cityAreas.length)]} ${location.city}`;
          } else if (location.region) {
            const areaTypes = ['District', 'Area', 'Center', 'Square', 'Campus'];
            placeName = `${location.region} ${areaTypes[Math.floor(Math.random() * areaTypes.length)]}`;
          } else {
            const locationTypes = [
              'University Campus', 'Public Library', 'Regional Park', 'Cultural Center', 
              'Central Square', 'Market Hall', 'Shopping Center', 'Concert Hall',
              'Memorial Park', 'Business District', 'Local Café', 'Conference Center',
              'Museum Complex', 'Sports Arena', 'Technology Hub', 'Art Gallery'
            ];
            placeName = locationTypes[Math.floor(Math.random() * locationTypes.length)];
          }
          
          if (placeName.length > 50) {
            const commaIndex = placeName.indexOf(',');
            if (commaIndex > 0 && commaIndex < 20) {
              placeName = placeName.substring(0, commaIndex);
            } else {
              placeName = placeName.substring(0, 22).trim();
              const lastSpaceIndex = placeName.lastIndexOf(' ');
              if (lastSpaceIndex > 15) {
                placeName = placeName.substring(0, lastSpaceIndex);
              }
              placeName += '...';
            }
          }
        } else {
          const locationTypes = [
            'University Campus', 'Public Library', 'Regional Park', 'Cultural Center', 
            'Central Square', 'Market Hall', 'Shopping Center', 'Concert Hall',
            'Memorial Park', 'Business District', 'Arts District', 'Conference Center',
            'Museum Complex', 'Sports Arena', 'Technology Hub', 'Art Gallery'
          ];
          placeName = locationTypes[Math.floor(Math.random() * locationTypes.length)];
        }
      } catch (error) {
        console.log('Error with reverse geocoding:', error);
        const locationTypes = [
          'University Campus', 'Public Library', 'Regional Park', 'Cultural Center', 
          'Central Square', 'Market Hall', 'Shopping Center', 'Concert Hall',
          'Memorial Park', 'Business District', 'Arts District', 'Conference Center',
          'Museum Complex', 'Sports Arena', 'Technology Hub', 'Art Gallery'
        ];
        placeName = locationTypes[Math.floor(Math.random() * locationTypes.length)];
      }

      const hotspotGeohash = geohash.encode(newLat, newLon, 7);

      sampleHotspots.push({
        id: `hotspot-${i}`,
        coordinate: {
          latitude: newLat,
          longitude: newLon,
        },
        size,
        activity,
        userCount,
        songCount: Math.floor(userCount * 1.5),
        dominantGenre: ['Pop', 'Rock', 'Hip-hop', 'Electronic', 'Classical'][Math.floor(Math.random() * 5)],
        locationName: placeName,
        geohash: hotspotGeohash
      });
    }
    
    setHotspots(sampleHotspots);
    setInitialHotspotsGenerated(true); // Mark that initial hotspots are generated
  }, []);


  useEffect(() => {
    (async () => {
      try {
        await requestPermissions();
        console.log('Permissions granted');
        
        if (currentLocation?.latitude && currentLocation?.longitude && !initialHotspotsGenerated) {
          console.log('Initial location available, generating hotspots:', currentLocation);
          const locationObject: Location.LocationObject = {
            coords: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: currentLocation.timestamp
          };
          // No need to await generateSampleHotspots if it sets state internally
          generateSampleHotspots(locationObject); 
        } else if (initialHotspotsGenerated) {
          console.log('Initial hotspots already generated.');
        } else {
          console.log('No valid location available yet for initial hotspot generation or already generated.');
        }
      } catch (error) {
        console.error('Error in initial setup useEffect:', error);
        setErrorMsg(error instanceof Error ? error.message : 'An error occurred during setup');
      }
    })();

  }, [currentLocation, initialHotspotsGenerated]);


  const generateMockDetailData = (hotspot: HotspotData) => {
    // ... (rest of your generateMockDetailData function remains unchanged)
    const mockTracks: TrackData[] = [
      {
        id: '1',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '2',
        title: 'As It Was',
        artist: 'Harry Styles',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '3',
        title: 'Stay',
        artist: 'The Kid LAROI, Justin Bieber',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273be08a5e4ae5b80d527f1bfd0',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '4',
        title: 'Dance The Night',
        artist: 'Dua Lipa',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273e652a9f8916c3699a38620de',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '5',
        title: 'Flowers',
        artist: 'Miley Cyrus',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273f429549123dbe8552764ba1d',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
    ];
    mockTracks.sort((a, b) => b.listeners - a.listeners);
    const mockAlbums: AlbumData[] = [
      {
        id: '1',
        name: 'After Hours',
        artist: 'The Weeknd',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '2',
        name: 'Harry\'s House',
        artist: 'Harry Styles',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '3',
        name: 'F*CK LOVE',
        artist: 'The Kid LAROI',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273be08a5e4ae5b80d527f1bfd0',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '4',
        name: 'Barbie: The Album',
        artist: 'Various Artists',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273e652a9f8916c3699a38620de',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '5',
        name: 'Endless Summer Vacation',
        artist: 'Miley Cyrus',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273f429549123dbe8552764ba1d',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
    ];
    mockAlbums.sort((a, b) => b.listeners - a.listeners);
    const mockArtists: ArtistData[] = [
      {
        id: '1',
        name: 'The Weeknd',
        image: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '2',
        name: 'Harry Styles',
        image: 'https://i.scdn.co/image/ab6761610000e5eb9894f9b5e33241e1229daf75',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '3',
        name: 'Dua Lipa',
        image: 'https://i.scdn.co/image/ab6761610000e5eb34c0f0abf644502fc8656023',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '4',
        name: 'Taylor Swift',
        image: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
      {
        id: '5',
        name: 'Miley Cyrus',
        image: 'https://i.scdn.co/image/ab6761610000e5eb4b698b28477aafd912b1d6c4',
        listeners: Math.floor(Math.random() * hotspot.userCount) + 1
      },
    ];
    mockArtists.sort((a, b) => b.listeners - a.listeners);
    const genres = ['Pop', 'Rock', 'Hip-hop', 'Electronic', 'Classical', 'Jazz', 'R&B'];
    const mockGenres: { name: string; percentage: number }[] = [];
    let remainingPercentage = 100;
    const numberOfGenresToShow = 5;
    for (let i = 0; i < numberOfGenresToShow; i++) {
      const isLast = i === numberOfGenresToShow - 1;
      const percentage = isLast ? remainingPercentage : Math.max(5, Math.floor(Math.random() * (remainingPercentage / (numberOfGenresToShow - i))));
      const finalPercentage = Math.min(percentage, remainingPercentage);
      mockGenres.push({
        name: genres[i < genres.length ? i : Math.floor(Math.random() * genres.length)],
        percentage: finalPercentage
      });
      remainingPercentage -= finalPercentage;
    }
    if (remainingPercentage > 0 && mockGenres.length > 0) {
      mockGenres[0].percentage += remainingPercentage;
    }
    mockGenres.sort((a, b) => b.percentage - a.percentage);
    const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Logan', 'Mia', 'Jacob', 'Isabella', 'Mason', 'Charlotte', 'Lucas', 'Amelia'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin'];
    const albumArtSamples = [
      'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
      'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14',
      // ... more samples
    ];
    const songSamples = [
      { title: 'Blinding Lights', artist: 'The Weeknd' },
      { title: 'As It Was', artist: 'Harry Styles' },
      // ... more samples
    ];
    const avatarSamples = [
      'https://i.pravatar.cc/150?img=1',
      'https://i.pravatar.cc/150?img=2',
      // ... more samples
    ];
    const numUsers = Math.min(25, hotspot.userCount);
    const mockRecentListeners = Array.from({ length: numUsers }, (_, i) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const song = songSamples[Math.floor(Math.random() * songSamples.length)];
      const isCurrentlyListening = Math.random() > 0.3;
      const now = new Date();
      const minutesAgo = Math.floor(Math.random() * 180);
      const timestamp = new Date(now.getTime() - minutesAgo * 60000).toISOString();
      return {
        id: `user-${i}`,
        name: `${firstName} ${lastName}`,
        avatar: avatarSamples[Math.floor(Math.random() * avatarSamples.length)],
        currentTrack: {
          title: song.title,
          artist: song.artist,
          albumArt: albumArtSamples[Math.floor(Math.random() * albumArtSamples.length)],
          isCurrentlyListening,
          timestamp
        }
      };
    });
    mockRecentListeners.sort((a, b) => {
      if (a.currentTrack.isCurrentlyListening && !b.currentTrack.isCurrentlyListening) return -1;
      if (!a.currentTrack.isCurrentlyListening && b.currentTrack.isCurrentlyListening) return 1;
      return new Date(b.currentTrack.timestamp).getTime() - new Date(a.currentTrack.timestamp).getTime();
    });
    return {
      topTracks: mockTracks,
      topAlbums: mockAlbums,
      topArtists: mockArtists,
      topGenres: mockGenres,
      timestamp: new Date().toISOString(),
      recentListeners: mockRecentListeners
    };
  };


const handleHotspotPress = useCallback((hotspot: HotspotData) => {
    console.log('Hotspot pressed:', hotspot.id);
    selectedHotspotRef.current = hotspot;
    setSelectedHotspotId(hotspot.id);
    hotspotDetailRef.current = generateMockDetailData(hotspot);
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
  // const hash = geohash.encode(latitude, longitude, 7);


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
        // Use onRegionChangeComplete instead of controlled region for better performance
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
      <NowPlayingBar currentTrack={currentTrack}/>

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
          topTracks={hotspotDetailRef.current.topTracks}
          topAlbums={hotspotDetailRef.current.topAlbums}
          topArtists={hotspotDetailRef.current.topArtists}
          topGenres={hotspotDetailRef.current.topGenres}
          timestamp={hotspotDetailRef.current.timestamp}
          onClose={handleCloseHotspotDetail}
          recentListeners={hotspotDetailRef.current.recentListeners}
        />
      )}
    </View>
  );
};

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

export default React.memo(MapScreen, (prevProps, nextProps) => {
  console.log('MapScreen memo comparison');
  return true;
});