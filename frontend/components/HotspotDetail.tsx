import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  FlatList
} from 'react-native';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/build/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

export type TrackData = {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  listeners: number;
};

export type AlbumData = {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  listeners: number;
};

export type ArtistData = {
  id: string;
  name: string;
  image: string;
  listeners: number;
};

type GenreData = {
  name: string;
  percentage: number;
};

export type UserListenerData = {
  id: string;
  name: string;
  avatar: string; // URL to user's avatar image
  currentTrack: {
    title: string;
    artist: string;
    albumArt: string; // URL to track's album art
    isCurrentlyListening: boolean;
    timestamp: string; // ISO date string
  };
};

type HotspotDetailProps = {
  locationName: string;
  userCount: number;
  topTracks: TrackData[];
  topAlbums: AlbumData[];
  topArtists: ArtistData[];
  topGenres: GenreData[];
  recentListeners: UserListenerData[]; // Added this prop for the new mode
  timestamp: string;
  onClose: () => void;
};

type DisplayMode = 'summary' | 'recentUsers';
type SummaryTabType = 'tracks' | 'albums' | 'artists' | 'genres';

const { width, height } = Dimensions.get('window');
const MAX_RECENT_LISTENERS = 25;

export const HotspotDetail: React.FC<HotspotDetailProps> = ({
  locationName,
  userCount,
  topTracks,
  topAlbums,
  topArtists,
  topGenres,
  recentListeners,
  timestamp,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [displayMode, setDisplayMode] = useState<DisplayMode>('summary');
  const [summaryTab, setSummaryTab] = useState<SummaryTabType>('tracks');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  };

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const renderTrackItem = ({ item, index }: { item: TrackData, index: number }) => (
    <View style={styles.trackItem}>
      <Text style={styles.trackRank}>#{index + 1}</Text>
      {item.albumArt ? (
        <Image 
          source={{ uri: item.albumArt }} 
          style={styles.albumArt} 
          defaultSource={require('../assets/images/remove.png')}
        />
      ) : (
        <View style={[styles.albumArt, styles.defaultAlbumArt]}>
          <FontAwesome name="music" size={20} color="#999" />
        </View>
      )}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <View style={styles.listenerCount}>
        <FontAwesome name="headphones" size={12} color="#666" />
        <Text style={styles.listenerText}>{item.listeners}</Text>
      </View>
    </View>
  );

  const renderAlbumItem = ({ item, index }: { item: AlbumData, index: number }) => (
    <View style={styles.trackItem}>
      <Text style={styles.trackRank}>#{index + 1}</Text>
      {item.albumArt ? (
        <Image 
          source={{ uri: item.albumArt }} 
          style={styles.albumArt}
          defaultSource={require('../assets/images/remove.png')}
        />
      ) : (
        <View style={[styles.albumArt, styles.defaultAlbumArt]}>
          <FontAwesome name="music" size={20} color="#999" />
        </View>
      )}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <View style={styles.listenerCount}>
        <FontAwesome name="headphones" size={12} color="#666" />
        <Text style={styles.listenerText}>{item.listeners}</Text>
      </View>
    </View>
  );

  const renderArtistItem = ({ item, index }: { item: ArtistData, index: number }) => (
    <View style={styles.trackItem}>
      <Text style={styles.trackRank}>#{index + 1}</Text>
      {item.image ? (
        <Image 
          source={{ uri: item.image }} 
          style={[styles.albumArt, styles.artistImage]}
          defaultSource={require('../assets/images/remove.png')}
        />
      ) : (
        <View style={[styles.albumArt, styles.defaultAlbumArt]}>
          <FontAwesome name="user" size={20} color="#999" />
        </View>
      )}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={styles.listenerCount}>
        <FontAwesome name="headphones" size={12} color="#666" />
        <Text style={styles.listenerText}>{item.listeners}</Text>
      </View>
    </View>
  );

  const renderUserListenerItem = ({ item }: { item: UserListenerData }) => (
    <View style={styles.userListenerItem}>
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.userAvatar}
        defaultSource={require('../assets/images/remove.png')}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.userTrackContainer}>
          <FontAwesome 
            name={item.currentTrack.isCurrentlyListening ? "play-circle" : "history"} 
            size={14} 
            color={item.currentTrack.isCurrentlyListening ? "#1DB954" : "#777"} 
            style={styles.userTrackIcon}
          />
          <Text style={styles.userTrackText} numberOfLines={1}>
            {item.currentTrack.title} - {item.currentTrack.artist}
          </Text>
        </View>
        <Text style={styles.userTrackTimestamp}>
          {item.currentTrack.isCurrentlyListening 
            ? "Listening now" 
            : `Last listened: ${new Date(item.currentTrack.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </Text>
      </View>
      {/* Album art for the user's track with fallback */}
      {item.currentTrack.albumArt ? (
        <Image 
          source={{ uri: item.currentTrack.albumArt }} 
          style={styles.userTrackAlbumArt}
          defaultSource={require('../assets/images/remove.png')}
        />
      ) : (
        <View style={[styles.userTrackAlbumArt, styles.defaultAlbumArt]}>
          <FontAwesome name="music" size={16} color="#999" />
        </View>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim }
      ]}
    >
      <TouchableOpacity
        style={styles.backgroundDismiss}
        activeOpacity={1}
        onPress={handleClose}
      />

      <Animated.View
        style={[
          styles.detailContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <BlurView intensity={80} tint="light" style={styles.blurContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
              <Text style={styles.locationName} numberOfLines={1} ellipsizeMode="tail">{locationName}</Text>
                <View style={styles.statsRow}>
                  <FontAwesome name="users" size={14} color="#666" style={styles.icon} />
                  <Text style={styles.statValue}>{userCount} listeners</Text>
                  <Text style={styles.timestampText}>as of {formattedTime}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <FontAwesome name="times" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Mode Selector */}
            <View style={styles.modeSelectorContainer}>
              <TouchableOpacity
                style={[styles.modeButton, displayMode === 'summary' && styles.modeButtonActive]}
                onPress={() => setDisplayMode('summary')}
              >
                <FontAwesome name="bar-chart" size={16} color={displayMode === 'summary' ? '#1DB954' : '#555'} style={styles.modeIcon} />
                <Text style={[styles.modeButtonText, displayMode === 'summary' && styles.modeButtonTextActive]}>Summary</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, displayMode === 'recentUsers' && styles.modeButtonActive]}
                onPress={() => setDisplayMode('recentUsers')}
              >
                <FontAwesome name="user-o" size={16} color={displayMode === 'recentUsers' ? '#1DB954' : '#555'} style={styles.modeIcon} />
                <Text style={[styles.modeButtonText, displayMode === 'recentUsers' && styles.modeButtonTextActive]}>Listeners</Text>
              </TouchableOpacity>
            </View>

            {displayMode === 'summary' ? (
              <>
                {/* Summary Tab Selector */}
                <View style={styles.summaryTabContainer}>
                  <TouchableOpacity
                    style={[styles.summaryTab, summaryTab === 'tracks' && styles.summaryTabActive]}
                    onPress={() => setSummaryTab('tracks')}
                  >
                    <Text style={[styles.summaryTabText, summaryTab === 'tracks' && styles.summaryTabTextActive]}>Tracks</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.summaryTab, summaryTab === 'albums' && styles.summaryTabActive]}
                    onPress={() => setSummaryTab('albums')}
                  >
                    <Text style={[styles.summaryTabText, summaryTab === 'albums' && styles.summaryTabTextActive]}>Albums</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.summaryTab, summaryTab === 'artists' && styles.summaryTabActive]}
                    onPress={() => setSummaryTab('artists')}
                  >
                    <Text style={[styles.summaryTabText, summaryTab === 'artists' && styles.summaryTabTextActive]}>Artists</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.summaryTab, summaryTab === 'genres' && styles.summaryTabActive]}
                    onPress={() => setSummaryTab('genres')}
                  >
                    <Text style={[styles.summaryTabText, summaryTab === 'genres' && styles.summaryTabTextActive]}>Genres</Text>
                  </TouchableOpacity>
                </View>
                
                {summaryTab === 'tracks' && (
                  <>
                    <Text style={styles.sectionTitle}>Top Tracks Now</Text>
                    <FlatList
                      data={topTracks}
                      renderItem={renderTrackItem}
                      keyExtractor={(item) => `track-${item.id}`}
                      style={styles.tracksList}
                      scrollEnabled={false} // List scrolls with parent ScrollView
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={<Text style={styles.emptyListText}>No top tracks available.</Text>}
                    />
                  </>
                )}

                {summaryTab === 'albums' && (
                  <>
                    <Text style={styles.sectionTitle}>Top Albums Now</Text>
                    <FlatList
                      data={topAlbums}
                      renderItem={renderAlbumItem}
                      keyExtractor={(item) => `album-${item.id}`}
                      style={styles.tracksList}
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={<Text style={styles.emptyListText}>No top albums available.</Text>}
                    />
                  </>
                )}

                {summaryTab === 'artists' && (
                  <>
                    <Text style={styles.sectionTitle}>Top Artists Now</Text>
                    <FlatList
                      data={topArtists}
                      renderItem={renderArtistItem}
                      keyExtractor={(item) => `artist-${item.id}`}
                      style={styles.tracksList}
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={<Text style={styles.emptyListText}>No top artists available.</Text>}
                    />
                  </>
                )}

                {summaryTab === 'genres' && (
                  <>
                    <Text style={styles.sectionTitle}>Genre Breakdown</Text>
                    {topGenres.length > 0 ? (
                      <View style={styles.genreContainer}>
                      {topGenres.map((genre, index) => (
                          <View key={genre.name} style={styles.genreItem}>
                          <View style={styles.genreLabel}>
                              <Text style={styles.genreName}>{genre.name}</Text>
                              <Text style={styles.genrePercentage}>{genre.percentage}%</Text>
                          </View>
                          <View style={styles.genreBar}>
                              <LinearGradient
                              colors={getGenreColors(index)}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[
                                  styles.genreProgress,
                                  { width: `${genre.percentage}%` }
                              ]}
                              />
                          </View>
                          </View>
                      ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyListText}>No genre data available.</Text>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Recent Listeners ({Math.min(recentListeners.length, MAX_RECENT_LISTENERS)})</Text>
                <FlatList
                  data={recentListeners.slice(0, MAX_RECENT_LISTENERS)}
                  renderItem={renderUserListenerItem}
                  keyExtractor={(item) => `user-${item.id}`}
                  style={styles.recentListenersList}
                  scrollEnabled={false} // List scrolls with parent ScrollView
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={<Text style={styles.emptyListText}>No recent listeners in this hotspot.</Text>}
                />
              </>
            )}

            <View style={styles.footerContainer}>
              <TouchableOpacity style={styles.footerButton}>
                <Text style={styles.footerButtonText}>placeholder1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerButton}>
                <Text style={styles.footerButtonText}>placeholder2</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
};

const getGenreColors = (index: number): [string, string, ...string[]] => {
  const colorSets = [
    ['#1DB954', '#25D366'], // Spotify green
    ['#4169E1', '#00BFFF'], // Blue shades
    ['#FF6347', '#FF8C69'], // Red/orange shades
    ['#9932CC', '#BA55D3'], // Purple shades
    ['#FFD700', '#FFA500'], // Gold/orange
  ];
  return colorSets[index % colorSets.length] as [string, string, ...string[]];
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backgroundDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // Full screen dismiss
    // backgroundColor: 'rgba(0, 0, 0, 0.3)', // Kept for potential re-activation
  },
  detailContainer: {
    height: height * 0.75, // Consider making this maxHeight and height: 'auto' if content varies a lot
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent', // Important for BlurView to look right
  },
  blurContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10, // Reduced padding bottom as ScrollView will have its own
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  locationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    flexShrink: 1,
    maxWidth: '95%',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', // In case it gets too long
  },
  icon: {
    marginRight: 6,
  },
  statValue: {
    fontSize: 14,
    color: '#555', // Darker for better readability
    fontWeight: '500',
    marginRight: 10,
  },
  timestampText: {
    fontSize: 12,
    color: '#777', // Slightly darker
    fontStyle: 'italic',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(220, 220, 220, 0.7)', // Softer background
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Softer divider
    marginVertical: 15,
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    marginHorizontal: 3,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modeIcon: {
    marginRight: 8,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  modeButtonTextActive: {
    color: '#1DB954',
  },
  summaryTabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 3,
  },
  summaryTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 5,
    alignItems: 'center',
    borderRadius: 8,
  },
  summaryTabActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
  },
  summaryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  summaryTabTextActive: {
    color: '#1DB954',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 10, // Adjusted margin
    marginBottom: 15,
  },
  tracksList: {
    // maxHeight not needed if scrollEnabled=false & parent ScrollView handles it
    marginBottom: 10, // Space before next section
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // More subtle background
    borderRadius: 10,
  },
  trackRank: {
    width: 24,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  albumArt: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginHorizontal: 10,
  },
  artistImage: {
    borderRadius: 22, // More rounded for artist images
  },
  defaultAlbumArt: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  trackArtist: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  listenerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listenerText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 5,
    fontWeight: '500',
  },
  genreContainer: {
    marginBottom: 20,
  },
  genreItem: {
    marginBottom: 12,
  },
  genreBar: {
    height: 10, // Slightly thicker bar
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  genreProgress: {
    height: '100%',
    borderRadius: 5,
  },
  genreLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5, // Label above bar
  },
  genreName: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  genrePercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  recentListenersList: {
    // maxHeight not needed if scrollEnabled=false & parent ScrollView handles it
    marginBottom: 15,
  },
  userListenerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  userTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  userTrackIcon: {
    marginRight: 6,
  },
  userTrackText: {
    fontSize: 13,
    color: '#555',
    flexShrink: 1,
  },
  userTrackTimestamp: {
    fontSize: 11,
    color: '#777',
    fontStyle: 'italic',
  },
  userTrackAlbumArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginLeft: 8, // Add some space if shown
  },
  emptyListText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 14,
    marginTop: 20,
    marginBottom: 20,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20, // Ensure space above footer
    paddingBottom: 10, // Ensure footer buttons are not cut off
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  footerButtonText: {
    color: '#1DB954',
    fontWeight: '600', // Bolder text
    marginLeft: 8,
    fontSize: 13,
  },
});