export interface Hotspot {
    id: string;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    listeners: number;
  }