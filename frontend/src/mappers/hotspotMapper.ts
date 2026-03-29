import { BasicHotspotData, HotspotSize, HotspotActivity } from '../../types/dataTypes';

// Raw shape returned by the backend HotspotDTO
interface HotspotApiResponse {
  geohash: string;
  longitude: number;
  latitude: number;
  userCount: number;
  lastUpdated: string | null;
}

function getSizeFromCount(count: number): HotspotSize {
  if (count <= 2) return 'small';
  if (count <= 5) return 'medium';
  if (count <= 10) return 'large';
  return 'xlarge';
}

function getActivityLevel(count: number, lastUpdated: string | null): HotspotActivity {
  if (!lastUpdated) return 'low';
  const minutesSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60);
  if (minutesSinceUpdate < 5 && count > 5) return 'trending';
  if (minutesSinceUpdate < 15) return 'high';
  if (minutesSinceUpdate < 30) return 'medium';
  return 'low';
}

export function mapHotspotDtoToBasicHotspot(dto: HotspotApiResponse): BasicHotspotData {
  return {
    id: dto.geohash,
    coordinate: {
      latitude: dto.latitude,
      longitude: dto.longitude,
    },
    size: getSizeFromCount(dto.userCount),
    activity: getActivityLevel(dto.userCount, dto.lastUpdated),
    userCount: dto.userCount,
    lastUpdated: dto.lastUpdated ?? '',
    locationName: `Hotspot ${dto.geohash.substring(0, 5)}`,
    geohash: dto.geohash,
  };
}

export function mapHotspotDtoArray(dtos: HotspotApiResponse[]): BasicHotspotData[] {
  return dtos.map(mapHotspotDtoToBasicHotspot);
}
