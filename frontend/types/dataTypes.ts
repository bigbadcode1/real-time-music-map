// types/dataTypes.ts

// --- Core Data Structures ---
export type Coordinate = {
  latitude: number;
  longitude: number;
};

// --- Spotify Related Data ---
export type TrackData = {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  listeners: number; // ADDED: This was missing or inconsistent
};

export type AlbumData = {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  listeners: number; // ADDED: This was missing or inconsistent
};

export type ArtistData = {
  id: string;
  name: string;
  image: string;
  listeners: number; // ADDED: This was missing or inconsistent
};

export type GenreData = {
  name: string;
  percentage: number;
};

export type UserListenerData = {
  id: string;
  name: string;
  avatar: string;
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    isCurrentlyListening: boolean;
    timestamp: string;
  };
};

// --- Hotspot Specific Data ---
export type HotspotSize = 'small' | 'medium' | 'large' | 'xlarge';
export type HotspotActivity = 'low' | 'medium' | 'high' | 'trending';

// Basic Hotspot Data for map display (lightweight)
export interface BasicHotspotData {
  id: string; // geohash
  coordinate: Coordinate;
  size: HotspotSize;
  activity: HotspotActivity;
  userCount: number; // 'count' from DB
  lastUpdated: string; // 'last_updated' from DB (ISO date string)
  locationName: string; // Derived on frontend
  geohash: string; // Raw geohash from DB
}

// Detailed Hotspot Data (for the detail panel, extends BasicHotspotData)
export interface DetailedHotspotData extends BasicHotspotData {
  songCount: number; // This needs to be fetched or derived
  dominantGenre?: string; // This needs to be fetched or derived
  topTracks: TrackData[]; // Uses the centralized TrackData
  topAlbums: AlbumData[]; // Uses the centralized AlbumData
  topArtists: ArtistData[]; // Uses the centralized ArtistData
  topGenres: GenreData[]; // Uses the centralized GenreData
  recentListeners: UserListenerData[]; // Uses the centralized UserListenerData
  timestamp: string; // This will be the same as lastUpdated for consistency with your current type
}

// --- Other App Specific Types ---
export interface CurrentLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface CurrentTrack {
  isPlaying: boolean;
  track: {
    name: string;
    artist: string;
    album_name: string;
    image: string;
    duration: number;
    progress: number;
    uri: string;
    id: string;
  } | null;
}

export interface LocationDetail {
  name: string;
  address: string;
}