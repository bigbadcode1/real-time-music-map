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
 * - Displaying music hotspots on the map
 *
 * The component shows appropriate loading states and error messages
 * during the location retrieval process.
 */
import React, { useEffect, useState, useRef } from 'react';
import { Text, ActivityIndicator, View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import MapView, { Marker} from 'react-native-maps';
import * as Location from 'expo-location';
import * as geohash from 'ngeohash';
import { requestPermissions, getCurrentLocation, watchLocation } from '../../../src/services/locationService';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../../../src/tasks/backgroundLocationTask';
import FontAwesome from '@expo/vector-icons/build/FontAwesome';
import { router } from 'expo-router';
import { Hotspot, HotspotSize, HotspotActivity } from '@/components/Hotspot';
import { HotspotDetail, TrackData, UserListenerData, AlbumData, ArtistData } from '@/components/HotspotDetail';

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

const MapScreen = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [mode, setMode] = useState<MapMode>('discover');
  const mapRef = useRef<MapView>(null);

  // Hotspot states
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(null);
  const [isHotspotDetailVisible, setIsHotspotDetailVisible] = useState(false);
  const [mapPaddingBottom, setMapPaddingBottom] = useState(0);

  // Mock data for hotspot detail view
  const [hotspotDetail, setHotspotDetail] = useState({
    topTracks: [] as TrackData[],
    topAlbums: [] as AlbumData[],
    topArtists: [] as ArtistData[],
    topGenres: [] as { name: string; percentage: number }[],
    timestamp: new Date().toISOString(),
    recentListeners: [] as UserListenerData[]
  });

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
          setLocation(newLocation);
        });

        setLocationSubscription(subscription);

        // Generate sample hotspots around the current location for testing
        if (currentLocation) {
          generateSampleHotspots(currentLocation);
        }
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

  // When location updates, update the hotspots if we didn't have a location before
  useEffect(() => {
    if (location && hotspots.length === 0) {
      generateSampleHotspots(location);
    }
  }, [location]);

  // Generate sample hotspots for testing
// Generate sample hotspots for testing
const generateSampleHotspots = (userLocation: Location.LocationObject) => {
  const { latitude, longitude } = userLocation.coords;
  const sampleHotspots: HotspotData[] = [];

  // Parameters for generating hotspots
  const numberOfHotspots = 5;
  const radiusKm = 1; // 1km radius

  // Conversion factors
  const oneDegLatKm = 111.32; // km per degree of latitude
  const oneDegLonKm = 111.32 * Math.cos(latitude * (Math.PI / 180)); // km per degree of longitude

  // Activity levels and sizes
  const activityLevels: HotspotActivity[] = ['low', 'medium', 'high', 'trending'];
  const sizes: HotspotSize[] = ['small', 'medium', 'large', 'xlarge'];
  const generateHotspots = async () => {
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
          
          // Improved location name generation with valid properties
          if (location.name && location.name.length > 3 && !location.name.match(/^\d+$/)) {
            // Use name if it's not just a number and has meaningful length
            placeName = location.name;
          } else if (location.street && location.streetNumber) {
            // Complete address with street number
            placeName = `${location.street} ${location.streetNumber}`;
          } else if (location.street) {
            // Just the street name
            placeName = location.street;
          } else if (location.district) {
            // District names are recognizable
            placeName = location.district;
          } else if (location.subregion && location.city) {
            // Combination of area and city
            placeName = `${location.subregion}, ${location.city}`;
          } else if (location.city && location.district) {
            // City district
            placeName = `${location.district}, ${location.city}`;
          } else if (location.city) {
            // More specific than just "City Center"
            const cityAreas = ['University Area', 'Old Town', 'City Center', 'Main Square', 'Central', 'Market District'];
            placeName = `${cityAreas[Math.floor(Math.random() * cityAreas.length)]} ${location.city}`;
          } else if (location.region) {
            // Region with an area type
            const areaTypes = ['District', 'Area', 'Center', 'Square', 'Campus'];
            placeName = `${location.region} ${areaTypes[Math.floor(Math.random() * areaTypes.length)]}`;
          } else {
            // Generate a descriptive location based on type of area
            // More specific and local-feeling location types
            const locationTypes = [
              'University Campus', 'Public Library', 'Regional Park', 'Cultural Center', 
              'Central Square', 'Market Hall', 'Shopping Center', 'Concert Hall',
              'Memorial Park', 'Business District', 'Local Café', 'Conference Center',
              'Museum Complex', 'Sports Arena', 'Technology Hub', 'Art Gallery'
            ];
            
            placeName = locationTypes[Math.floor(Math.random() * locationTypes.length)];
          }
          
          // Truncate long names but preserve the full meaning where possible
          if (placeName.length > 50) {
            // Check if there's a comma to split on
            const commaIndex = placeName.indexOf(',');
            if (commaIndex > 0 && commaIndex < 20) {
              // Keep just the first part before the comma
              placeName = placeName.substring(0, commaIndex);
            } else {
              // Truncate but try to preserve complete words
              placeName = placeName.substring(0, 22).trim();
              // Don't cut in the middle of a word if possible
              const lastSpaceIndex = placeName.lastIndexOf(' ');
              if (lastSpaceIndex > 15) {
                placeName = placeName.substring(0, lastSpaceIndex);
              }
              placeName += '...';
            }
          }
        } else {
          // Fallback if reverse geocoding returns no results
          // Use more specific and culturally varied location types
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
        // Fallback with more interesting, specific location types
        const locationTypes = [
          'University Campus', 'Public Library', 'Regional Park', 'Cultural Center', 
          'Central Square', 'Market Hall', 'Shopping Center', 'Concert Hall',
          'Memorial Park', 'Business District', 'Arts District', 'Conference Center',
          'Museum Complex', 'Sports Arena', 'Technology Hub', 'Art Gallery'
        ];
        
        placeName = locationTypes[Math.floor(Math.random() * locationTypes.length)];
      }

      // Generate a geohash for the location
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
        songCount: Math.floor(userCount * 1.5), // Roughly 1.5 songs per user
        dominantGenre: ['Pop', 'Rock', 'Hip-hop', 'Electronic', 'Classical'][Math.floor(Math.random() * 5)],
        locationName: placeName,
        geohash: hotspotGeohash
      });
    }
    
    setHotspots(sampleHotspots);
  };

  generateHotspots();
  setHotspots(sampleHotspots);
};

  // Generate mock data for detailed view
  const generateMockDetailData = (hotspot: HotspotData) => {
    // Mock track data
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

    // Sort tracks by listener count
    mockTracks.sort((a, b) => b.listeners - a.listeners);
    
    // Mock album data
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
    
    // Sort albums by listener count
    mockAlbums.sort((a, b) => b.listeners - a.listeners);
    
    // Mock artist data
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
    
    // Sort artists by listener count
    mockArtists.sort((a, b) => b.listeners - a.listeners);

    // Mock genre data
    const genres = ['Pop', 'Rock', 'Hip-hop', 'Electronic', 'Classical', 'Jazz', 'R&B'];
    const mockGenres: { name: string; percentage: number }[] = [];

    // Randomly assign percentages to genres, ensuring they sum to 100%
    let remainingPercentage = 100;
    const numberOfGenresToShow = 5;
    for (let i = 0; i < numberOfGenresToShow; i++) {
      const isLast = i === numberOfGenresToShow - 1;
      const percentage = isLast ? remainingPercentage : Math.max(5, Math.floor(Math.random() * (remainingPercentage / (numberOfGenresToShow - i)))); // Ensure at least 5% and distribute remaining
      // Prevent negative remainingPercentage if random is too high
      const finalPercentage = Math.min(percentage, remainingPercentage);

      mockGenres.push({
        name: genres[i < genres.length ? i : Math.floor(Math.random() * genres.length)], // Handle case if fewer genres than spots
        percentage: finalPercentage
      });
      remainingPercentage -= finalPercentage;
    }

    // If there's still remaining percentage due to rounding, add it to the largest genre
    if (remainingPercentage > 0 && mockGenres.length > 0) {
      mockGenres[0].percentage += remainingPercentage;
    }

    // Sort genres by percentage
    mockGenres.sort((a, b) => b.percentage - a.percentage);

    // Generate mock recent listeners data
    const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Logan', 'Mia', 'Jacob', 'Isabella', 'Mason', 'Charlotte', 'Lucas', 'Amelia'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin'];
    
    // Album art samples
    const albumArtSamples = [
      'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
      'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14',
      'https://i.scdn.co/image/ab67616d0000b273be08a5e4ae5b80d527f1bfd0',
      'https://i.scdn.co/image/ab67616d0000b273e652a9f8916c3699a38620de',
      'https://i.scdn.co/image/ab67616d0000b273f429549123dbe8552764ba1d',
      'https://i.scdn.co/image/ab67616d0000b2734aee3b4db84b1b9a63ff8a43',
      'https://i.scdn.co/image/ab67616d0000b2735ef878a782c987d38d82b605',
      'https://i.scdn.co/image/ab67616d0000b2736ada0849e7cc56307d0d4b80'
    ];
    
    // Song titles and artists
    const songSamples = [
      { title: 'Blinding Lights', artist: 'The Weeknd' },
      { title: 'As It Was', artist: 'Harry Styles' },
      { title: 'Stay', artist: 'The Kid LAROI, Justin Bieber' },
      { title: 'Dance The Night', artist: 'Dua Lipa' },
      { title: 'Flowers', artist: 'Miley Cyrus' },
      { title: 'Die For You', artist: 'The Weeknd' },
      { title: 'Kill Bill', artist: 'SZA' },
      { title: 'Cruel Summer', artist: 'Taylor Swift' },
      { title: 'Creepin', artist: 'Metro Boomin, The Weeknd' },
      { title: 'Anti-Hero', artist: 'Taylor Swift' },
      { title: 'Calm Down', artist: 'Rema, Selena Gomez' },
      { title: 'Unholy', artist: 'Sam Smith, Kim Petras' }
    ];
    
    // Avatar images
    const avatarSamples = [
      'https://i.pravatar.cc/150?img=1',
      'https://i.pravatar.cc/150?img=2',
      'https://i.pravatar.cc/150?img=3',
      'https://i.pravatar.cc/150?img=4',
      'https://i.pravatar.cc/150?img=5',
      'https://i.pravatar.cc/150?img=6',
      'https://i.pravatar.cc/150?img=7',
      'https://i.pravatar.cc/150?img=8'
    ];
    
    // Generate up to 25 mock users
    const numUsers = Math.min(25, hotspot.userCount);
    const mockRecentListeners = Array.from({ length: numUsers }, (_, i) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const song = songSamples[Math.floor(Math.random() * songSamples.length)];
      const isCurrentlyListening = Math.random() > 0.3; // 70% chance of currently listening
      
      // For timestamp, create a random time in the past few hours
      const now = new Date();
      const minutesAgo = Math.floor(Math.random() * 180); // Up to 3 hours ago
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
    
    // Sort by timestamp (most recent first)
    mockRecentListeners.sort((a, b) => {
      // Currently listening users come first
      if (a.currentTrack.isCurrentlyListening && !b.currentTrack.isCurrentlyListening) return -1;
      if (!a.currentTrack.isCurrentlyListening && b.currentTrack.isCurrentlyListening) return 1;
      
      // Then sort by timestamp for non-currently listening
      return new Date(b.currentTrack.timestamp).getTime() - new Date(a.currentTrack.timestamp).getTime();
    });

    // Return the object matching the hotspotDetail state structure
    return {
      topTracks: mockTracks,
      topAlbums: mockAlbums,
      topArtists: mockArtists,
      topGenres: mockGenres,
      timestamp: new Date().toISOString(),
      recentListeners: mockRecentListeners
    };
  };


  const handleHotspotPress = (hotspot: HotspotData) => {
    setSelectedHotspot(hotspot);
    // Ensure generateMockDetailData is called here and its return matches the state structure
    setHotspotDetail(generateMockDetailData(hotspot));
    setIsHotspotDetailVisible(true);
    setMapPaddingBottom(300); // Add padding to the map to accommodate the detail view
  };

  const handleCloseHotspotDetail = () => {
    setIsHotspotDetailVisible(false);
    setSelectedHotspot(null);
    setMapPaddingBottom(0); // Reset map padding
  };


  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'discover' ? 'analyze' : 'discover'));
  };

  if (errorMsg) return <Text className="p-5 text-center text-red-500">{errorMsg}</Text>;

  if (!location) return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color="#1DB954" />
      <Text className="mt-3 text-gray-600">Finding your location...</Text>
    </View>
  );

  // Destructure latitude and longitude here for use in the component's render
  const { latitude, longitude } = location.coords;
  const hash = geohash.encode(latitude, longitude, 7);


  return (
    <View className='flex-1'>
      <MapView
        ref={mapRef}
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
        onRegionChangeComplete={(region) => {
          // Here you would typically update hotspots based on new region
          // For simplicity in this demo, we'll skip this step
        }}
        paddingAdjustmentBehavior="automatic"
        maxZoomLevel={20}
        minZoomLevel={10}
        moveOnMarkerPress={false}
        liteMode={false}
        showsCompass={true}
        loadingEnabled={true}
        zoomControlEnabled={true}
        mapPadding={{top: 0, right: 0, bottom: mapPaddingBottom, left: 0}}
      >
        {/* Render hotspots */}
        {hotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            coordinate={hotspot.coordinate}
            tracksViewChanges={false} // Add this for performance and stability
            anchor={{ x: 0.5, y: 0.5 }} // Center the marker correctly
            zIndex={10} // Ensure markers stay on top
          >
            <Hotspot
              size={hotspot.size}
              activity={hotspot.activity}
              userCount={hotspot.userCount}
              songCount={hotspot.songCount}
              dominantGenre={hotspot.dominantGenre}
              coordinate={hotspot.coordinate}
              onPress={() => handleHotspotPress(hotspot)}
            />
          </Marker>
        ))}
      </MapView>

      <View className="absolute top-20 left-12 right-12 flex-row items-center justify-center px-5 py-4 bg-white rounded-full">
        <FontAwesome name="headphones" size={20} color="black" style={{ marginRight: 8 }} />
        <Text className="text-base text-slate-700 font-semibold">
          Listeners in this area: {hotspots.reduce((sum, h) => sum + h.userCount, 0)}
        </Text>
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

      {/* Render hotspot detail when a hotspot is selected */}
      {isHotspotDetailVisible && selectedHotspot && (
        <HotspotDetail
          locationName={selectedHotspot.locationName}
          userCount={selectedHotspot.userCount}
          topTracks={hotspotDetail.topTracks}
          topAlbums={hotspotDetail.topAlbums}
          topArtists={hotspotDetail.topArtists}
          topGenres={hotspotDetail.topGenres}
          timestamp={hotspotDetail.timestamp}
          onClose={handleCloseHotspotDetail}
          recentListeners={hotspotDetail.recentListeners}
        />
      )}
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
    width: '55%', // Adjust as needed
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15, // Adjust spacing between buttons
  },
  modeButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120, // Ensure minimum width for the button
    height: 38,
  },
  modeButtonDiscover: {
    backgroundColor: '#000000', // Example color for Discover mode
  },
  modeButtonAnalyze: {
    backgroundColor: '#f0f0f0', // Example color for Analyze mode
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconSpacing: {
    marginRight: 8, // Spacing between icon and text
  }
});

export default MapScreen;