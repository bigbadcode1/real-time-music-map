
// Represents a musical track.
export type TrackData = {
  id: string;
  title: string;
  artist: string;
  albumArt: string; // URL to track's album art
  listeners: number;
};

// Represents a musical album.
export type AlbumData = {
  id: string;
  name: string;
  artist: string;
  albumArt: string; // URL to album's album art
  listeners: number;
};

// Represents a musical artist.
export type ArtistData = {
  id: string;
  name: string;
  image: string; // URL to artist's image
  listeners: number;
};

// Represents a musical genre with its percentage in a context.
export type GenreData = {
  name: string;
  percentage: number;
};

// Represents a user who is listening or has recently listened to music.
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

// Defines the possible sizes for a hotspot.
export type HotspotSize = 'small' | 'medium' | 'large' | 'xlarge';

// Defines the activity levels for a hotspot.
export type HotspotActivity = 'low' | 'medium' | 'high' | 'trending';

// Represents all data associated with a hotspot.
export interface HotspotData {
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
  timestamp: string; // ISO date string of when the hotspot data was generated
}

// Represents the current geographic location of the user.
export interface CurrentLocation {
  latitude: number;
  longitude: number;
  timestamp: number; // Timestamp of the location fix
}

// Represents the currently playing track information.
export interface CurrentTrack {
  isPlaying: boolean;
  track: {
    name: string;
    artist: string;
    album_name: string;
    image: string; // URL to track's image
    duration: number; // Duration in ms
    progress: number; // Progress in ms
    uri: string; // Spotify track URI
  } | null;
}

// Details of a location obtained from reverse geocoding.
export interface LocationDetail {
  name?: string;
  street?: string;
  streetNumber?: string;
  district?: string;
  city?: string;
  subregion?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}