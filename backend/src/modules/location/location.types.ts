export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface UserLocation {
  userId: string;
  location: Location;
}

export interface NearbyUser extends UserLocation {
  distance: number; // meters
} 