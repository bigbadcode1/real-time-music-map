import { Location, UserLocation, NearbyUser } from './location.types';

export class LocationService {
  async updateUserLocation(userId: string, location: Location): Promise<UserLocation> {
    // This will be implemented in the next phase
    throw new Error('Not implemented');
  }

  async getNearbyUsers(centerLocation: Location, radiusInMeters: number): Promise<NearbyUser[]> {
    // This will be implemented in the next phase
    throw new Error('Not implemented');
  }
} 