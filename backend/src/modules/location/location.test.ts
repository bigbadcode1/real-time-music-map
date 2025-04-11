import { LocationService } from './location.service';
import { Location } from './location.types';

describe('LocationService', () => {
  let locationService: LocationService;

  beforeEach(() => {
    locationService = new LocationService();
  });

  describe('updateUserLocation', () => {
    it('should update user location with valid coordinates', async () => {
      const userId = 'user123';
      const location: Location = {
        latitude: 52.237049,
        longitude: 21.017532,
        timestamp: new Date(),
      };

      const result = await locationService.updateUserLocation(userId, location);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.location).toEqual(location);
    });

    it('should throw error for invalid coordinates', async () => {
      const userId = 'user123';
      const invalidLocation: Location = {
        latitude: 200, // Invalid latitude
        longitude: 21.017532,
        timestamp: new Date(),
      };

      await expect(
        locationService.updateUserLocation(userId, invalidLocation)
      ).rejects.toThrow('Invalid coordinates');
    });
  });

  describe('getNearbyUsers', () => {
    it('should return users within specified radius', async () => {
      const centerLocation: Location = {
        latitude: 52.237049,
        longitude: 21.017532,
        timestamp: new Date(),
      };
      const radiusInMeters = 1000;

      const nearbyUsers = await locationService.getNearbyUsers(centerLocation, radiusInMeters);

      expect(Array.isArray(nearbyUsers)).toBe(true);
      expect(nearbyUsers.length).toBeGreaterThan(0);
      expect(nearbyUsers[0]).toHaveProperty('userId');
      expect(nearbyUsers[0]).toHaveProperty('location');
    });

    it('should return empty array when no users in radius', async () => {
      const remoteLocation: Location = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
      };
      const radiusInMeters = 1000;

      const nearbyUsers = await locationService.getNearbyUsers(remoteLocation, radiusInMeters);

      expect(Array.isArray(nearbyUsers)).toBe(true);
      expect(nearbyUsers.length).toBe(0);
    });
  });
}); 