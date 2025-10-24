
import { User, Zone, TripData, HassEntity, ZoneEvent } from '../types';
import { resetAiClient } from './geminiService';

const CONFIG_STORAGE_KEY = 'familyMapperConfig_v2';

// MOCK DATABASE of all available entities in a user's Home Assistant
const allHassEntities: HassEntity[] = [
  {
    entity_id: 'person.alex',
    state: 'home',
    attributes: {
      friendly_name: 'Alex',
      latitude: 34.0522,
      longitude: -118.2437,
      entity_picture: 'https://i.pravatar.cc/150?u=alex',
      battery_level: 88,
      source_type: 'gps',
    }
  },
  {
    entity_id: 'person.ben',
    state: 'not_home',
    attributes: {
      friendly_name: 'Ben',
      latitude: 34.07,
      longitude: -118.25,
      entity_picture: 'https://i.pravatar.cc/150?u=ben',
      battery_level: 62,
      source_type: 'gps',
    }
  },
  {
    entity_id: 'person.chloe',
    state: 'school',
    attributes: {
      friendly_name: 'Chloe',
      latitude: 34.0425,
      longitude: -118.2639,
      entity_picture: 'https://i.pravatar.cc/150?u=chloe',
      battery_level: 95,
      source_type: 'gps',
    }
  },
  {
    entity_id: 'device_tracker.davids_phone',
    state: 'not_home',
    attributes: {
      friendly_name: "David's Phone",
      latitude: 34.08,
      longitude: -118.22,
      source_type: 'gps',
      battery_level: 45,
    }
  }
];

// Mock Data
const zones: Zone[] = [
  { id: 'home', name: 'Home', icon: '🏡', location: { lat: 34.0522, lng: -118.2437 }, radius: 100 },
  { id: 'work', name: 'Work', icon: '💼', location: { lat: 34.0622, lng: -118.2537 }, radius: 150 },
  { id: 'school', name: 'School', icon: '🎓', location: { lat: 34.0422, lng: -118.2637 }, radius: 120 },
];

const tripHistory: { [userId: string]: TripData } = {
  'person.ben': {
    driverName: 'Ben',
    date: new Date().toLocaleDateString(),
    durationMinutes: 22,
    distanceMiles: 8.4,
    startLocation: 'Work',
    endLocation: 'Home',
    maxSpeed: 68,
    speedLimit: 55,
    averageSpeed: 35,
    hardBrakingEvents: 1,
    rapidAccelerationEvents: 0,
  },
};

const now = new Date();
const zoneEvents: ZoneEvent[] = [
  { id: 'evt1', userId: 'person.chloe', userName: 'Chloe', userAvatar: 'https://i.pravatar.cc/150?u=chloe', type: 'entry', timestamp: new Date(now.getTime() - 10 * 60 * 1000), zoneId: 'school' },
  { id: 'evt2', userId: 'person.ben', userName: 'Ben', userAvatar: 'https://i.pravatar.cc/150?u=ben', type: 'exit', timestamp: new Date(now.getTime() - 25 * 60 * 1000), zoneId: 'work' },
  { id: 'evt3', userId: 'person.alex', userName: 'Alex', userAvatar: 'https://i.pravatar.cc/150?u=alex', type: 'exit', timestamp: new Date(now.getTime() - 45 * 60 * 1000), zoneId: 'home' },
  { id: 'evt4', userId: 'person.chloe', userName: 'Chloe', userAvatar: 'https://i.pravatar.cc/150?u=chloe', type: 'exit', timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), zoneId: 'home' },
  { id: 'evt5', userId: 'person.ben', userName: 'Ben', userAvatar: 'https://i.pravatar.cc/150?u=ben', type: 'entry', timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), zoneId: 'work' },
  { id: 'evt6', userId: 'person.alex', userName: 'Alex', userAvatar: 'https://i.pravatar.cc/150?u=alex', type: 'entry', timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000), zoneId: 'home' },
];


// --- New Functions for Configuration Flow ---

export const getAvailablePersonEntities = (): HassEntity[] => {
  // In a real app, this would be an API call to Home Assistant
  // to get all entities from the person and device_tracker domains.
  return allHassEntities;
};

export const saveConfiguration = (entityIds: string[], apiKey: string) => {
  const config = { entityIds, apiKey };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
};

export const loadConfiguration = (): { entityIds: string[], apiKey: string } | null => {
  const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!storedConfig) return null;
  try {
    const config = JSON.parse(storedConfig);
    // Basic validation
    if (Array.isArray(config.entityIds) && typeof config.apiKey === 'string') {
      return config;
    }
    return null;
  } catch (e) {
    console.error("Failed to parse configuration from localStorage", e);
    return null;
  }
};

export const updateApiKey = (apiKey: string) => {
  const currentConfig = loadConfiguration();
  if (currentConfig) {
    saveConfiguration(currentConfig.entityIds, apiKey);
    resetAiClient(); // Reset the client to force re-initialization with the new key
  } else {
    // This case should ideally not happen if the app is configured, but handle it just in case.
    console.error("Cannot update API key: no existing configuration found.");
    alert("Error: Could not find existing configuration to update.");
  }
};


// --- Updated Data Functions ---

const transformHassEntityToUser = (entity: HassEntity): User => {
  // This function converts the raw Home Assistant entity state
  // into the User object our application uses.
  const isInZone = zones.find(zone => calculateDistance(
    { lat: entity.attributes.latitude!, lng: entity.attributes.longitude! },
    zone.location
  ) <= zone.radius);

  let status = 'Away';
  if (isInZone) {
    status = isInZone.name;
  }
  
  // A simple mock logic for driving status
  if (entity.entity_id === 'person.ben' && !isInZone) {
    status = 'Driving';
  }
  
  return {
    id: entity.entity_id,
    name: entity.attributes.friendly_name || entity.entity_id,
    avatar: entity.attributes.entity_picture || 'https://i.pravatar.cc/150?u=unknown',
    location: {
      lat: entity.attributes.latitude || 0,
      lng: entity.attributes.longitude || 0,
    },
    speed: status === 'Driving' ? 45 : 0,
    status,
    battery: entity.attributes.battery_level || 100,
  };
};

export const getInitialData = (trackedEntityIds: string[]) => {
  const trackedEntities = allHassEntities.filter(e => trackedEntityIds.includes(e.entity_id));
  const users = trackedEntities.map(transformHassEntityToUser);
  return { users, zones };
};

const calculateDistance = (loc1: {lat: number, lng: number}, loc2: {lat: number, lng: number}) => {
  const R = 6371e3; // metres
  const φ1 = loc1.lat * Math.PI/180;
  const φ2 = loc2.lat * Math.PI/180;
  const Δφ = (loc2.lat-loc1.lat) * Math.PI/180;
  const Δλ = (loc2.lng-loc1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export const getUpdatedUsers = (currentUsers: User[], currentZones: Zone[]): User[] => {
  return currentUsers.map(user => {
    const newBattery = Math.max(0, user.battery - (Math.random() < 0.1 ? 1 : 0));

    // Only move Ben for the demo, and only if he is driving.
    if (user.id === 'person.ben' && user.status === 'Driving') {
      const newLat = user.location.lat - 0.0005;
      const newLng = user.location.lng + 0.0005;
      const newLocation = { lat: newLat, lng: newLng };

      const zoneEntered = currentZones.find(
        zone => calculateDistance(newLocation, zone.location) <= zone.radius
      );

      if (zoneEntered) {
        return {
          ...user,
          location: newLocation,
          speed: 0,
          status: `Arrived at ${zoneEntered.name}`,
          battery: newBattery,
        };
      } else {
        return {
          ...user,
          location: newLocation,
          speed: Math.max(25, Math.floor(40 + (Math.random() * 15 - 7.5))),
          status: 'Driving',
          battery: newBattery,
        };
      }
    }
    
    return {
      ...user,
      speed: user.status === 'Driving' ? user.speed : 0,
      battery: newBattery,
    };
  });
};

export const getTripForUser = (userId: string): TripData | null => {
  return tripHistory[userId] || null;
};

export const getEventsForZone = (zoneId: string): ZoneEvent[] => {
  return zoneEvents
    .filter(event => event.zoneId === zoneId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};
