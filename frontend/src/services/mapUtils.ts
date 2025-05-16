import { Region } from 'react-native-maps';
import { Hotspot } from '@/types/map';

export const calculateZoomLevel = (region: Region): number => {
  const { longitudeDelta } = region;
  return Math.log2(360 / longitudeDelta);
};

export const createNearbyHotspots = (latitude: number, longitude: number): Hotspot[] => {
  return [
    {
      id: 'nearby1',
      coordinate: { 
        latitude: latitude + 0.01, 
        longitude: longitude + 0.001 
      },
      listeners: 3
    },
    {
      id: 'nearby2',
      coordinate: { 
        latitude: latitude - 0.002, 
        longitude: longitude + 0.008 
      },
      listeners: 12
    },
    {
      id: 'nearby3',
      coordinate: { 
        latitude: latitude + 0.003, 
        longitude: longitude - 0.05 
      },
      listeners: 25
    }
  ];
};