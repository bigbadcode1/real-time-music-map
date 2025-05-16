import { Hotspot } from '@/types/map';
  
export const dummyHotspots: Hotspot[] = [
    { id: 'hotspot1', coordinate: { latitude: 52.2297, longitude: 21.0122 }, listeners: 14 },
    { id: 'hotspot3', coordinate: { latitude: 51.1079, longitude: 17.0385 }, listeners: 11 },
    { id: 'hotspot4', coordinate: { latitude: 54.3520, longitude: 18.6466 }, listeners: 17 },
    { id: 'hotspot6', coordinate: { latitude: 53.0138, longitude: 18.5984 }, listeners: 15 },
    { id: 'hotspot8', coordinate: { latitude: 50.0413, longitude: 21.9990 }, listeners: 6 },
    { id: 'hotspot9', coordinate: { latitude: 53.1325, longitude: 23.1688 }, listeners: 12 },
    { id: 'hotspot12', coordinate: { latitude: 51.2465, longitude: 22.5684 }, listeners: 13 },
    { id: 'hotspot13', coordinate: { latitude: 50.2880, longitude: 18.6775 }, listeners: 10 },
    { id: 'hotspot14', coordinate: { latitude: 54.1964, longitude: 16.1722 }, listeners: 7 },
    { id: 'hotspot16', coordinate: { latitude: 52.2298, longitude: 20.9842 }, listeners: 20 },
    { id: 'hotspot19', coordinate: { latitude: 50.8731, longitude: 20.6319 }, listeners: 4 },
];
  
export const getHotspotColor = (listeners: number): string => {
    const saturation = Math.min(100, Math.max(40, 40 + listeners * 3));
    return `hsl(0, ${saturation}%, 50%)`;
};
  
export const getHotspotSize = (listeners: number, baseSize: number, zoomLevel: number): number => {
    const listenerFactor = Math.min(1.5, Math.max(0.7, 0.7 + listeners * 0.04));
    const zoomFactor = Math.min(1.5, Math.max(0.7, zoomLevel / 15));
    return baseSize * listenerFactor * zoomFactor;
};