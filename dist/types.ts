
export interface User {
  id: string;
  name: string;
  avatar: string;
  location: {
    lat: number;
    lng: number;
  };
  speed: number;
  status: string;
  battery: number;
}

export interface Zone {
  id: string;
  name: string;
  icon: string;
  location: {
    lat: number;
    lng: number;
  };
  radius: number; // in meters
}

export interface TripData {
  driverName: string;
  date: string;
  durationMinutes: number;
  distanceMiles: number;
  startLocation: string;
  endLocation: string;
  maxSpeed: number;
  speedLimit: number;
  averageSpeed: number;
  hardBrakingEvents: number;
  rapidAccelerationEvents: number;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    latitude?: number;
    longitude?: number;
    gps_accuracy?: number;
    source_type?: string;
    entity_picture?: string;
    battery_level?: number;
    [key: string]: any;
  };
}

export interface ZoneEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'entry' | 'exit';
  timestamp: Date;
  zoneId: string;
}
