// FIX: Added imports for React and other libraries to resolve UMD global errors.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Settings, Users, CheckCircle, KeyRound, LogIn, LogOut, History as HistoryIcon, Clock, PlusCircle, X, Check, MapPin, Trash2, Loader, Battery, Wind, BarChart, AlertTriangle, ShieldCheck, Landmark } from 'lucide-react';
import L from 'leaflet';
import { GoogleGenAI } from "@google/genai";

// --- MOCK DATA AND SERVICES ---

const CONFIG_STORAGE_KEY = 'familyMapperConfig_v2';

// MOCK DATABASE of all available entities in a user's Home Assistant
const MOCK_HASS_ENTITIES = [
  { entity_id: 'person.alex', state: 'home', attributes: { friendly_name: 'Alex', latitude: 34.0522, longitude: -118.2437, entity_picture: 'https://i.pravatar.cc/150?u=alex', battery_level: 88, source_type: 'gps' }},
  { entity_id: 'person.ben', state: 'not_home', attributes: { friendly_name: 'Ben', latitude: 34.07, longitude: -118.25, entity_picture: 'https://i.pravatar.cc/150?u=ben', battery_level: 62, source_type: 'gps' }},
  { entity_id: 'person.chloe', state: 'school', attributes: { friendly_name: 'Chloe', latitude: 34.0425, longitude: -118.2639, entity_picture: 'https://i.pravatar.cc/150?u=chloe', battery_level: 95, source_type: 'gps' }},
  { entity_id: 'device_tracker.davids_phone', state: 'not_home', attributes: { friendly_name: "David's Phone", latitude: 34.08, longitude: -118.22, source_type: 'gps', battery_level: 45 }}
];

// Mock Initial Zones
const MOCK_ZONES_INITIAL = [
  { id: 'home', name: 'Home', icon: '🏡', location: { lat: 34.0522, lng: -118.2437 }, radius: 100 },
  { id: 'work', name: 'Work', icon: '💼', location: { lat: 34.0622, lng: -118.2537 }, radius: 150 },
  { id: 'school', name: 'School', icon: '🎓', location: { lat: 34.0422, lng: -118.2637 }, radius: 120 },
];

const MOCK_TRIP_HISTORY = {
  'person.ben': { driverName: 'Ben', date: new Date().toLocaleDateString(), durationMinutes: 22, distanceMiles: 8.4, startLocation: 'Work', endLocation: 'Home', maxSpeed: 68, speedLimit: 55, averageSpeed: 35, hardBrakingEvents: 1, rapidAccelerationEvents: 0 }
};

const now = new Date();
const MOCK_ZONE_EVENTS = [
  { id: 'evt1', userId: 'person.chloe', userName: 'Chloe', userAvatar: 'https://i.pravatar.cc/150?u=chloe', type: 'entry', timestamp: new Date(now.getTime() - 10 * 60 * 1000), zoneId: 'school' },
  { id: 'evt2', userId: 'person.ben', userName: 'Ben', userAvatar: 'https://i.pravatar.cc/150?u=ben', type: 'exit', timestamp: new Date(now.getTime() - 25 * 60 * 1000), zoneId: 'work' },
  { id: 'evt3', userId: 'person.alex', userName: 'Alex', userAvatar: 'https://i.pravatar.cc/150?u=alex', type: 'exit', timestamp: new Date(now.getTime() - 45 * 60 * 1000), zoneId: 'home' },
  { id: 'evt4', userId: 'person.chloe', userName: 'Chloe', userAvatar: 'https://i.pravatar.cc/150?u=chloe', type: 'exit', timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), zoneId: 'home' },
  { id: 'evt5', userId: 'person.ben', userName: 'Ben', userAvatar: 'https://i.pravatar.cc/150?u=ben', type: 'entry', timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), zoneId: 'work' },
  { id: 'evt6', userId: 'person.alex', userName: 'Alex', userAvatar: 'https://i.pravatar.cc/150?u=alex', type: 'entry', timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000), zoneId: 'home' },
];

// --- homeAssistantService ---
const loadConfiguration = () => {
  const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!storedConfig) return null;
  try {
    const config = JSON.parse(storedConfig);
    if (typeof config.apiKey === 'string' && Array.isArray(config.entityIds)) return config;
    return null;
  } catch (e) {
    console.error("Failed to parse configuration from localStorage", e);
    return null;
  }
};

// --- geminiService ---
let aiClient: GoogleGenAI | null = null;
let clientInitializationError: Error | null = null;

function getAiClient(): GoogleGenAI {
  if (clientInitializationError) throw clientInitializationError;
  if (aiClient) return aiClient;

  const config = loadConfiguration();
  const API_KEY = config?.apiKey;
  if (!API_KEY) {
    clientInitializationError = new Error("Gemini API Key not found in configuration.");
    throw clientInitializationError;
  }
  try {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
    return aiClient;
  } catch (error) {
    clientInitializationError = new Error("Failed to initialize Gemini client. The API key might be invalid.");
    throw clientInitializationError;
  }
}

function resetAiClient() {
  aiClient = null;
  clientInitializationError = null;
}

async function generateDrivingSummary(tripData: any) {
  const prompt = `You are a helpful assistant that analyzes driving data and creates friendly, easy-to-read summaries for a family safety app. Based on the following trip data, generate a concise summary of about 3-4 sentences. The summary should be positive and encouraging. If there are risky behaviors like speeding, mention them gently as a friendly reminder. Start with a general overview of the trip (e.g., "Ben had a good drive from Work to Home today."). Mention the duration and distance. Highlight the maximum speed, comparing it to the speed limit. Note any other events like hard braking. Conclude with a safety-oriented sentence (e.g., "Overall, a safe trip!"). Do not use markdown formatting. The output should be a single paragraph of plain text.
    Trip Data:
    - Driver: ${tripData.driverName}, Date: ${tripData.date}, Duration: ${tripData.durationMinutes} minutes, Distance: ${tripData.distanceMiles} miles, Start Location: ${tripData.startLocation}, End Location: ${tripData.endLocation}, Max Speed: ${tripData.maxSpeed} mph (in a ${tripData.speedLimit} mph zone), Average Speed: ${tripData.averageSpeed} mph, Hard Braking Events: ${tripData.hardBrakingEvents}, Rapid Acceleration Events: ${tripData.rapidAccelerationEvents}
    Generate the summary now.`;
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Error generating driving summary:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate summary: ${error.message}`);
    }
    throw new Error("Failed to generate summary. Check API key and network.");
  }
}

async function generateIconForZone(zoneName: any) {
  const prompt = `You are an expert emoji selector. Based on the provided place name, return a single, relevant emoji that best represents it. Return ONLY the emoji character itself, with no additional text, explanation, or formatting. For a business name, choose an emoji that represents the business type (e.g., "Starbucks" -> ☕). Place Name: "${zoneName}" Emoji:`;
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    const emoji = response.text.trim();
    return (emoji && emoji.length <= 4) ? emoji : '📍';
  } catch (error) {
    console.error("Error generating zone icon:", error);
    return '📍';
  }
}

// --- homeAssistantService (continued) ---
const getAvailablePersonEntities = () => MOCK_HASS_ENTITIES;
const saveConfiguration = (config: any) => localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
const updateApiKey = (apiKey: any) => {
  const config = loadConfiguration();
  if (config) {
    saveConfiguration({ ...config, apiKey });
    resetAiClient();
  }
};
const calculateDistance = (loc1: any, loc2: any) => {
  const R = 6371e3;
  const φ1 = loc1.lat * Math.PI / 180, φ2 = loc2.lat * Math.PI / 180, Δφ = (loc2.lat - loc1.lat) * Math.PI / 180, Δλ = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
const getInitialData = (trackedEntityIds: any) => {
  const zones = MOCK_ZONES_INITIAL;
  const transformHassEntityToUser = (entity: any) => {
    const isInZone = zones.find(zone => calculateDistance({ lat: entity.attributes.latitude, lng: entity.attributes.longitude }, zone.location) <= zone.radius);
    let status = isInZone ? isInZone.name : 'Away';
    if (entity.entity_id === 'person.ben' && !isInZone) status = 'Driving';
    return { id: entity.entity_id, name: entity.attributes.friendly_name || entity.entity_id, avatar: entity.attributes.entity_picture || 'https://i.pravatar.cc/150?u=unknown', location: { lat: entity.attributes.latitude || 0, lng: entity.attributes.longitude || 0 }, speed: status === 'Driving' ? 45 : 0, status, battery: entity.attributes.battery_level || 100 };
  };
  const trackedEntities = MOCK_HASS_ENTITIES.filter(e => trackedEntityIds.includes(e.entity_id));
  return { users: trackedEntities.map(transformHassEntityToUser), zones };
};
const getUpdatedUsers = (currentUsers: any, currentZones: any) => currentUsers.map((user: any) => {
  const newBattery = Math.max(0, user.battery - (Math.random() < 0.1 ? 1 : 0));
  if (user.id === 'person.ben' && user.status === 'Driving') {
    const newLocation = { lat: user.location.lat - 0.0005, lng: user.location.lng + 0.0005 };
    const zoneEntered = currentZones.find((zone: any) => calculateDistance(newLocation, zone.location) <= zone.radius);
    if (zoneEntered) return { ...user, location: newLocation, speed: 0, status: `Arrived at ${zoneEntered.name}`, battery: newBattery };
    return { ...user, location: newLocation, speed: Math.max(25, Math.floor(40 + (Math.random() * 15 - 7.5))), status: 'Driving', battery: newBattery };
  }
  return { ...user, speed: user.status === 'Driving' ? user.speed : 0, battery: newBattery };
});
const getTripForUser = (userId: any) => MOCK_TRIP_HISTORY[userId as keyof typeof MOCK_TRIP_HISTORY] || null;
const getEventsForZone = (zoneId: any) => MOCK_ZONE_EVENTS.filter(event => event.zoneId === zoneId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

// --- COMPONENTS ---

const DrivingSummary = ({ summary, isLoading }: any) => {
  if (isLoading) return <div className="mt-4 p-4 bg-secondary-background-color/50 rounded-lg text-center"><Loader className="w-6 h-6 text-light-primary-color animate-spin mx-auto mb-2" /><p className="text-secondary-text-color">AI is analyzing the trip data...</p></div>;
  if (!summary) return null;
  return <div className="mt-4 p-4 bg-secondary-background-color/50 rounded-lg"><h4 className="text-md font-semibold mb-2 flex items-center text-light-primary-color"><ShieldCheck className="w-5 h-5 mr-2" />AI Driving Summary</h4><p className="text-secondary-text-color leading-relaxed text-sm">{summary}</p></div>;
};

const UserPanel = ({ user, onGenerateSummary, tripSummary, isSummaryLoading, error }: any) => {
  const tripData = getTripForUser(user.id);
  const handleGenerateClick = () => tripData && onGenerateSummary(tripData);
  const getBatteryIcon = (level: any) => {
    if (level > 80) return <Battery className="text-green-500 w-6 h-6 mr-3" />;
    if (level > 30) return <Battery className="text-yellow-500 w-6 h-6 mr-3" />;
    return <Battery className="text-red-500 w-6 h-6 mr-3" />;
  };
  return (
    <div className="ha-card flex flex-col h-full text-primary-text-color">
      <div className="p-4"><div className="flex items-center mb-4 pb-4 border-b border-divider-color"><img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full mr-4"/><div><h2 className="text-2xl font-bold">{user.name}</h2><p className="text-secondary-text-color">{user.status}</p></div></div><div className="grid grid-cols-2 gap-4 mb-4"><div className="bg-secondary-background-color/50 p-3 rounded-lg flex items-center">{getBatteryIcon(user.battery)}<div><p className="text-sm text-secondary-text-color">Battery</p><p className="font-semibold text-lg">{user.battery}%</p></div></div><div className="bg-secondary-background-color/50 p-3 rounded-lg flex items-center"><Wind className="w-6 h-6 mr-3 text-light-primary-color" /><div><p className="text-sm text-secondary-text-color">Speed</p><p className="font-semibold text-lg">{user.speed} mph</p></div></div></div></div>
      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {tripData ? (<div><h3 className="text-lg font-semibold mb-2">Last Trip</h3><div className="bg-secondary-background-color/50 p-3 rounded-lg mb-4 text-sm space-y-2"><p className="flex justify-between items-center"><strong className="text-secondary-text-color">From:</strong> <span>{tripData.startLocation}</span></p><p className="flex justify-between items-center"><strong className="text-secondary-text-color">To:</strong> <span>{tripData.endLocation}</span></p><p className="flex justify-between items-center"><strong className="text-secondary-text-color">Distance:</strong> <span>{tripData.distanceMiles} miles</span></p></div><button onClick={handleGenerateClick} disabled={isSummaryLoading} className="w-full bg-primary-color text-white font-bold py-2 px-4 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center"><BarChart className="w-5 h-5 mr-2" />{isSummaryLoading ? 'Generating...' : 'Generate AI Driving Summary'}</button>{error && <div className="mt-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg flex items-center"><AlertTriangle className="w-5 h-5 mr-3" /><span>{error}</span></div>}<DrivingSummary summary={tripSummary} isLoading={isSummaryLoading} /></div>) : (<div className="text-center text-gray-500 mt-10"><p>No trip data available for {user.name}.</p></div>)}
      </div>
    </div>
  );
};

const ZonePanel = ({ zone, events }: any) => {
  // FIX: Used .getTime() for explicit date subtraction to fix arithmetic operation error.
  const formatTimeAgo = (date: Date) => { const s = Math.floor((new Date().getTime() - date.getTime()) / 1000); let i = s / 31536000; if (i > 1) return Math.floor(i) + " years ago"; i = s / 2592000; if (i > 1) return Math.floor(i) + " months ago"; i = s / 86400; if (i > 1) return Math.floor(i) + " days ago"; i = s / 3600; if (i > 1) return Math.floor(i) + " hours ago"; i = s / 60; if (i > 1) return Math.floor(i) + " minutes ago"; return Math.floor(s) + " seconds ago"; };
  const formatDuration = (ms: any) => { if (ms < 0) return '0m'; const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); let r = ''; if (d > 0) r += `${d}d `; if (h > 0) r += `${h}h `; if (m >= 0) r += `${m % 60}m`; return r.trim() || '0m'; };
  const findDurationForExit = (exitEvent: any, allZoneEvents: any) => { if (exitEvent.type !== 'exit') return null; const entry = allZoneEvents.find((e: any) => e.userId === exitEvent.userId && e.type === 'entry' && e.timestamp < exitEvent.timestamp); if (!entry) return null; return formatDuration(exitEvent.timestamp.getTime() - entry.timestamp.getTime()); };
  return (
    <div className="ha-card flex flex-col h-full text-primary-text-color">
      <div className="p-4 border-b border-divider-color"><div className="flex items-center"><span className="text-4xl mr-4">{zone.icon}</span><div><h2 className="text-2xl font-bold">{zone.name}</h2><p className="text-secondary-text-color">Event Log</p></div></div></div>
      <div className="flex-grow overflow-y-auto px-4 py-2">
        {events.length > 0 ? (<ul>{events.map((event: any) => { const duration = findDurationForExit(event, events); return (<li key={event.id} className="flex items-center py-3 border-b border-divider-color/50 last:border-b-0"><img src={event.userAvatar} alt={event.userName} className="w-10 h-10 rounded-full mr-3"/><div className="flex-grow"><p className="font-semibold">{event.userName}<span className="font-normal text-secondary-text-color">{event.type === 'entry' ? ' arrived' : ' departed'}</span></p><div className="flex items-center text-xs text-secondary-text-color mt-1"><span>{formatTimeAgo(event.timestamp)}</span>{duration && (<><span className="mx-1.5">&middot;</span><Clock className="w-3 h-3 mr-1 flex-shrink-0" /><span>{duration} at location</span></>)}</div></div>{event.type === 'entry' ? <LogIn className="w-5 h-5 text-green-500" /> : <LogOut className="w-5 h-5 text-red-500" />}</li>) })}</ul>) : (<div className="text-center text-gray-500 mt-10 p-4"><HistoryIcon className="w-12 h-12 mx-auto text-gray-600 mb-2" /><p>No recent events for {zone.name}.</p></div>)}
      </div>
    </div>
  );
};

const ZoneList = ({ zones, selectedZoneId, onZoneSelect }: any) => (
  <div><h2 className="text-xl font-bold mb-2 p-2">Zones</h2>{zones.length > 0 ? (<ul>{zones.map((zone: any) => (<li key={zone.id} onClick={() => onZoneSelect(zone)} className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors duration-200 ${selectedZoneId === zone.id ? 'selected-item-secondary' : 'hoverable-item'}`}><div className="w-10 h-10 flex items-center justify-center mr-3 text-2xl">{zone.icon}</div><div className="flex-grow"><p className="font-semibold">{zone.name}</p></div></li>))}</ul>) : (<p className="text-sm text-secondary-text-color text-center py-4">No zones created yet.</p>)}</div>
);

const AddZonePanel = ({ mode, onStartAddZone, zoneDetails, onUpdateZoneDetails, onSaveZone, onCancel, onDeleteZone, isSavingZone }: any) => {
  if (!mode) return <div><button onClick={onStartAddZone} className="w-full bg-card-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center border border-divider-color"><PlusCircle className="w-5 h-5 mr-2" />Add New Zone</button></div>;
  return (
    <div className="p-3 bg-primary-background-color rounded-lg border border-divider-color">
      <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold">{mode === 'add' ? 'Create Zone' : 'Edit Zone'}</h3><button onClick={onCancel} className="text-secondary-text-color hover:text-primary-text-color"><X className="w-5 h-5" /></button></div>
      {mode === 'add' && !zoneDetails.location ? (<div className="text-center p-4 bg-secondary-background-color rounded-md"><MapPin className="mx-auto w-8 h-8 text-light-primary-color mb-2" /><p className="text-secondary-text-color">Click on the map to set location.</p></div>) : (<div><div className="mb-4"><label htmlFor="zone-name" className="block text-sm font-medium text-secondary-text-color mb-1">Zone Name</label><input type="text" id="zone-name" value={zoneDetails.name} onChange={(e) => onUpdateZoneDetails({ name: e.target.value })} placeholder="e.g., Grandma's House" className="w-full bg-secondary-background-color border border-divider-color rounded-md px-3 py-2 text-primary-text-color focus:ring-primary-color focus:border-primary-color"/></div><div className="mb-4"><label htmlFor="zone-radius" className="block text-sm font-medium text-secondary-text-color mb-1">Radius: {zoneDetails.radius}m</label><input type="range" id="zone-radius" min="50" max="2000" step="10" value={zoneDetails.radius} onChange={(e) => onUpdateZoneDetails({ radius: parseInt(e.target.value, 10) })} className="w-full h-2 bg-divider-color rounded-lg appearance-none cursor-pointer"/></div><div className="flex items-center gap-2 mt-4"><button onClick={onSaveZone} disabled={!zoneDetails.name.trim() || isSavingZone} className="flex-grow bg-primary-color text-white font-bold py-2 px-3 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center">{isSavingZone ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}{isSavingZone ? 'Saving...' : 'Save'}</button>{mode === 'edit' && (<button onClick={() => onDeleteZone(zoneDetails.id)} className="flex-shrink-0 bg-error-color text-white p-3 rounded-lg hover:bg-red-700 transition-colors" aria-label="Delete Zone"><Trash2 className="w-5 h-5" /></button>)}</div></div>)}
    </div>
  );
};

const MapComponent = ({ users, zones, onUserSelect, selectedUser, selectedZone, zoneEditorMode, onMapClickForZone, onSelectZoneForEdit, editingZonePreview, onEditingZoneLocationChange }: any) => {
  // FIX: Cast prototype to 'any' to delete private property _getIconUrl and fix type error.
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });
  const createAvatarIcon = (avatarUrl: any, isSelected: any) => L.divIcon({ html: `<img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; ${isSelected ? 'border: 3px solid #3b82f6;' : 'border: 2px solid #6b7280;'} box-shadow: 0 2px 5px rgba(0,0,0,0.5);" />`, className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
  const MapEventsHandler = () => { useMapEvents({ click(e) { if (zoneEditorMode === 'add') onMapClickForZone(e.latlng); } }); return null; };
  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => { if (selectedUser) map.flyTo([selectedUser.location.lat, selectedUser.location.lng], map.getZoom(), { animate: true, duration: 1 }); }, [selectedUser]);
    useEffect(() => { if (selectedZone) map.flyTo([selectedZone.location.lat, selectedZone.location.lng], 15, { animate: true, duration: 1 }); }, [selectedZone]);
    useEffect(() => { const container = map.getContainer(); if(container) container.style.cursor = zoneEditorMode === 'add' ? 'crosshair' : ''; }, [zoneEditorMode]);
    return null;
  };
  return (
    <MapContainer center={[34.0522, -118.2437]} zoom={13} className="h-full w-full">
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' />
      {zones.map((zone: any) => { const isEditing = editingZonePreview.id === zone.id, isSelected = selectedZone?.id === zone.id, color = isEditing ? '#fb923c' : (isSelected ? '#a855f7' : '#3b82f6'); return <Circle key={zone.id} center={[zone.location.lat, zone.location.lng]} radius={zone.radius} pathOptions={{ color, fillColor: color, fillOpacity: isSelected || isEditing ? 0.3 : 0.2, weight: isSelected || isEditing ? 3 : 2 }} eventHandlers={{ click: () => onSelectZoneForEdit(zone) }}><Popup>{zone.icon} {zone.name}</Popup></Circle> })}
      {users.map((user: any) => <Marker key={user.id} position={[user.location.lat, user.location.lng]} icon={createAvatarIcon(user.avatar, selectedUser?.id === user.id)} eventHandlers={{ click: () => onUserSelect(user) }}><Popup><div className="text-center font-bold">{user.name}</div><div>{user.status} {user.speed > 0 ? `(${user.speed} mph)` : ''}</div></Popup></Marker>)}
      {editingZonePreview.location && <><Marker position={editingZonePreview.location} draggable={zoneEditorMode === 'edit'} eventHandlers={{ drag: (e) => zoneEditorMode === 'edit' && onEditingZoneLocationChange(e.target.getLatLng()) }} /><Circle center={editingZonePreview.location} radius={editingZonePreview.radius} pathOptions={{ color: '#fb923c', fillColor: '#fb923c', fillOpacity: 0.4 }} /></>}
      <MapEventsHandler /><MapUpdater />
    </MapContainer>
  );
};

const SettingsPanel = ({ onClose, onSave }: any) => {
  const [apiKey, setApiKey] = useState('');
  useEffect(() => { const config = loadConfiguration(); if (config?.apiKey) setApiKey(config.apiKey); }, []);
  const handleSave = () => apiKey.trim() ? onSave(apiKey.trim()) : alert("API Key cannot be empty.");
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="ha-card w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary-text-color hover:text-primary-text-color" aria-label="Close settings"><X className="w-6 h-6" /></button>
        <h2 className="text-2xl font-bold text-primary-text-color mb-4">Settings</h2>
        <div className="mb-4"><label htmlFor="api-key-modal" className="block text-sm font-medium text-primary-text-color mb-2">Gemini API Key</label><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text-color" /><input type="password" id="api-key-modal" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Google AI Studio API Key" className="w-full bg-secondary-background-color border border-divider-color rounded-md pl-10 pr-3 py-2 text-primary-text-color focus:ring-primary-color focus:border-primary-color"/></div><p className="text-xs text-secondary-text-color mt-2">Your key is stored securely in your browser's local storage.</p></div>
        <div className="flex justify-end gap-3 mt-6"><button onClick={onClose} className="bg-secondary-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 border border-divider-color transition-colors">Cancel</button><button onClick={handleSave} className="bg-primary-color text-white font-bold py-2 px-4 rounded-lg hover:bg-dark-primary-color transition-colors flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Save</button></div>
      </div>
    </div>
  );
};

const Setup = ({ onComplete }: any) => {
  const [apiKey, setApiKey] = useState('');
  const [availableEntities, setAvailableEntities] = useState<any[]>([]);
  const [selectedEntities, setSelectedEntities] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { setAvailableEntities(getAvailablePersonEntities()); setIsLoading(false); }, []);
  const handleToggleEntity = (entityId: any) => setSelectedEntities(prev => { const newSet = new Set(prev); if (newSet.has(entityId)) newSet.delete(entityId); else newSet.add(entityId); return newSet; });
  const handleSave = () => { if (selectedEntities.size === 0) return alert("Please select at least one person or device."); if (!apiKey.trim()) return alert("Please enter your Gemini API Key."); onComplete({ apiKey: apiKey.trim(), selectedEntityIds: Array.from(selectedEntities) }); };
  const getAvatar = (entity: any) => entity.attributes.entity_picture || `https://i.pravatar.cc/150?u=${entity.entity_id}`;
  return (
    <div className="bg-primary-background-color min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg"><div className="ha-card p-6"><div className="text-center mb-6"><Users className="mx-auto h-12 w-12 text-primary-color mb-3" /><h1 className="text-2xl font-bold text-primary-text-color">Welcome to Family Mapper AI</h1><p className="text-secondary-text-color mt-2">To get started, please select the people and devices you'd like to see on the map.</p></div>
        {isLoading ? <p className="text-center text-secondary-text-color">Loading entities...</p> : <div className="max-h-60 overflow-y-auto pr-2 mb-6">{availableEntities.map(entity => (<div key={entity.entity_id} onClick={() => handleToggleEntity(entity.entity_id)} className={`entity-list-item ${selectedEntities.has(entity.entity_id) ? 'selected' : ''}`}><input type="checkbox" className="ha-checkbox" checked={selectedEntities.has(entity.entity_id)} readOnly /><img src={getAvatar(entity)} alt="" className="w-10 h-10 rounded-full mr-4"/><div><p className="font-semibold text-primary-text-color">{entity.attributes.friendly_name || entity.entity_id}</p><p className="text-xs text-secondary-text-color">{entity.entity_id}</p></div></div>))}</div>}
        <div className="mt-4"><label htmlFor="api-key" className="block text-sm font-medium text-primary-text-color mb-2">Gemini API Key</label><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text-color" /><input type="password" id="api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter your Google AI Studio API Key" className="w-full bg-secondary-background-color border border-divider-color rounded-md pl-10 pr-3 py-2 text-primary-text-color focus:ring-primary-color focus:border-primary-color"/></div><p className="text-xs text-secondary-text-color mt-2">Your key is stored securely in your browser's local storage.</p></div>
        <button onClick={handleSave} disabled={isLoading || selectedEntities.size === 0} className="w-full mt-6 bg-primary-color text-white font-bold py-3 px-4 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center"><CheckCircle className="w-5 h-5 mr-2" />Save and Start ({selectedEntities.size} selected)</button>
      </div></div>
    </div>
  );
};

// --- APP ---
const App = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [trackedEntities, setTrackedEntities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [zoneEvents, setZoneEvents] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [tripSummary, setTripSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [zoneEditorMode, setZoneEditorMode] = useState(null);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [editingZone, setEditingZone] = useState<any>({ id: undefined, location: null, radius: 200, name: '' });

  useEffect(() => { const config = loadConfiguration(); if (config && config.apiKey && config.entityIds.length > 0) { setTrackedEntities(config.entityIds); setIsConfigured(true); }}, []);
  useEffect(() => { if (isConfigured) { const { users: initialUsers, zones: initialZones } = getInitialData(trackedEntities); setUsers(initialUsers); setZones(initialZones); if (initialUsers.length > 0) setSelectedUserId(initialUsers[0].id); }}, [isConfigured, trackedEntities]);
  useEffect(() => { if (!isConfigured) return; const interval = setInterval(() => setUsers(currentUsers => getUpdatedUsers(currentUsers, zones)), 2000); return () => clearInterval(interval); }, [isConfigured, zones]);
  useEffect(() => { if (selectedZoneId) setZoneEvents(getEventsForZone(selectedZoneId)); else setZoneEvents([]); }, [selectedZoneId]);

  const handleConfigurationComplete = (config: any) => { saveConfiguration(config); setTrackedEntities(config.selectedEntityIds); setIsConfigured(true); };
  const handleApiKeyUpdate = (newApiKey: any) => { updateApiKey(newApiKey); setShowSettings(false); alert("API Key updated successfully!"); };

  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId) || null, [zones, selectedZoneId]);

  const handleUserSelect = useCallback((user) => { setTripSummary(null); setError(null); setZoneEditorMode(null); setSelectedZoneId(null); setSelectedUserId(user.id); }, []);
  const handleZoneSelect = useCallback((zone) => { setZoneEditorMode(null); setSelectedUserId(null); setSelectedZoneId(zone.id); }, []);
  
  const generateDrivingSummaryHandler = async (tripData: any) => {
    setIsSummaryLoading(true); setTripSummary(null); setError(null);
    try { const summary = await generateDrivingSummary(tripData); setTripSummary(summary); }
    catch (err: any) { setError(err.message || 'Could not generate summary.'); }
    finally { setIsSummaryLoading(false); }
  };
  
  const getStatusEmoji = (status: any) => { if (status.includes('Home')) return '🏡'; if (status === 'Driving') return '🚗'; if (status.includes('School')) return '🎓'; if (status.includes('Work')) return '💼'; if (status.includes('Arrived')) return '✅'; return '📍'; };

  const handleStartAddZone = useCallback(() => { setSelectedUserId(null); setSelectedZoneId(null); setZoneEditorMode('add'); setEditingZone({ id: undefined, location: null, radius: 200, name: '' }); }, []);
  const handleMapClickForZone = useCallback((latlng) => { if (zoneEditorMode === 'add') setEditingZone(prev => ({ ...prev, location: latlng })); }, [zoneEditorMode]);
  const handleSelectZoneForEdit = useCallback((zone) => { setSelectedUserId(null); setSelectedZoneId(null); setZoneEditorMode('edit'); setEditingZone({ id: zone.id, name: zone.name, radius: zone.radius, location: L.latLng(zone.location.lat, zone.location.lng) }); }, []);
  const handleUpdateEditingZoneDetails = useCallback((details) => setEditingZone(prev => ({ ...prev, ...details })), []);
  const handleCancelZoneEditor = useCallback(() => { setZoneEditorMode(null); setEditingZone({ id: undefined, location: null, radius: 200, name: '' }); }, []);
  const handleSaveZone = useCallback(async () => {
    if (!editingZone.location || !editingZone.name.trim()) return alert("Provide a name and location.");
    setIsSavingZone(true);
    try {
      const zoneName = editingZone.name.trim(); let icon = '📍';
      const originalZone = zoneEditorMode === 'edit' ? zones.find(z => z.id === editingZone.id) : null;
      if (zoneEditorMode === 'add' || (originalZone && originalZone.name !== zoneName)) icon = await generateIconForZone(zoneName); else if (originalZone) icon = originalZone.icon;
      if (zoneEditorMode === 'edit' && editingZone.id) { const updatedZone = { id: editingZone.id, name: zoneName, icon, location: { lat: editingZone.location.lat, lng: editingZone.location.lng }, radius: editingZone.radius }; setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z)); }
      else if (zoneEditorMode === 'add') { const newZone = { id: `zone_${Date.now()}`, name: zoneName, icon, location: { lat: editingZone.location.lat, lng: editingZone.location.lng }, radius: editingZone.radius }; setZones(prev => [...prev, newZone]); }
      handleCancelZoneEditor();
    } catch (err) { console.error("Failed to save zone:", err); alert("Error saving zone. API key might be invalid."); }
    finally { setIsSavingZone(false); }
  }, [editingZone, zoneEditorMode, zones, handleCancelZoneEditor]);
  const handleDeleteZone = useCallback((zoneId) => { if (!zoneId) return; if (window.confirm("Delete this zone?")) { setZones(prev => prev.filter(z => z.id !== zoneId)); handleCancelZoneEditor(); }}, [handleCancelZoneEditor]);

  if (!isConfigured) return <Setup onComplete={handleConfigurationComplete} />;

  return (
    <div className="flex h-screen font-sans">
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onSave={handleApiKeyUpdate} />}
      <aside className="w-full md:w-1/4 lg:w-1/5 h-full bg-secondary-background-color p-4 overflow-y-auto flex flex-col space-y-4">
        <div><h2 className="text-xl font-bold mb-2 p-2">Family</h2>{users.length > 0 ? (<ul>{users.map(user => (<li key={user.id} onClick={() => handleUserSelect(user)} className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors duration-200 ${selectedUserId === user.id ? 'selected-item' : 'hoverable-item'}`}><img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-3"/><div className="flex-grow"><p className="font-semibold">{user.name}</p><div className={`text-xs mt-1 flex items-center ${selectedUserId === user.id ? 'text-gray-200' : 'text-secondary-text-color'}`}><span className="mr-2">{getStatusEmoji(user.status)}</span><span>{user.status === 'Driving' ? `${user.speed} mph` : user.status}</span></div></div></li>))}</ul>) : (<p className="text-sm text-secondary-text-color text-center py-4">No family members selected.</p>)}</div>
        <ZoneList zones={zones} selectedZoneId={selectedZoneId} onZoneSelect={handleZoneSelect} />
        <div className="flex-grow"></div>
        <div className="space-y-2">
            <AddZonePanel mode={zoneEditorMode} onStartAddZone={handleStartAddZone} zoneDetails={editingZone} onUpdateZoneDetails={handleUpdateEditingZoneDetails} onSaveZone={handleSaveZone} onCancel={handleCancelZoneEditor} onDeleteZone={handleDeleteZone} isSavingZone={isSavingZone} />
            <button onClick={() => setShowSettings(true)} className="w-full bg-card-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center border border-divider-color" aria-label="Open settings"><Settings className="w-5 h-5 mr-2" />Settings</button>
        </div>
      </aside>
      <main className="flex-grow h-full flex flex-col md:flex-row p-4 gap-4">
          <div className="w-full md:w-2/3 h-1/2 md:h-full ha-card"><MapComponent users={users} zones={zones} onUserSelect={handleUserSelect} selectedUser={selectedUser} selectedZone={selectedZone} zoneEditorMode={zoneEditorMode} onMapClickForZone={handleMapClickForZone} onSelectZoneForEdit={handleSelectZoneForEdit} editingZonePreview={editingZone} onEditingZoneLocationChange={(latlng) => handleUpdateEditingZoneDetails({ location: latlng })} /></div>
          <div className="w-full md:w-1/3 h-1/2 md:h-full">{selectedUser && <UserPanel user={selectedUser} onGenerateSummary={generateDrivingSummaryHandler} tripSummary={tripSummary} isSummaryLoading={isSummaryLoading} error={error} />}{selectedZone && <ZonePanel zone={selectedZone} events={zoneEvents} />}</div>
      </main>
    </div>
  );
};

// --- RENDER ---
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find the 'root' element to mount the application to.");
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);