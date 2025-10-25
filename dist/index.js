(() => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Could not find root element to mount app.");
    return;
  }

  // Check for required global libraries
  const requiredLibs = {
    React: window.React,
    ReactDOM: window.ReactDOM,
    ReactLeaflet: window.ReactLeaflet,
    lucide: window.lucide,
    google: window.google?.generativeai?.GoogleGenAI
  };

  const missingLibs = Object.entries(requiredLibs)
    .filter(([_, lib]) => !lib)
    .map(([name, _]) => name);

  if (missingLibs.length > 0) {
    console.error("Required libraries are missing:", missingLibs);
    rootElement.innerHTML = `
      <div style="color: #f87171; background-color: #450a0a; border: 1px solid #991b1b; padding: 20px; margin: 20px; border-radius: 8px; font-family: sans-serif;">
        <h2 style="font-weight: bold; font-size: 1.2em;">Application Failed to Load</h2>
        <p>The following required libraries could not be loaded, which is usually caused by a network issue or a browser extension blocking the CDN:</p>
        <ul style="list-style-type: disc; padding-left: 30px; margin-top: 10px;">
          ${missingLibs.map(lib => `<li>${lib}</li>`).join('')}
        </ul>
        <p style="margin-top: 15px;">Please check your internet connection, disable any ad-blockers for this page, and perform a hard refresh (Ctrl+F5 or Cmd+Shift+R).</p>
      </div>`;
    return;
  }
  
  // --- GLOBALS (now that we know they exist) ---
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo, StrictMode, Fragment } = React;
  const { createRoot } = window.ReactDOM;
  const { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } = window.ReactLeaflet;
  const { Settings, Users, CheckCircle, KeyRound, LogIn, LogOut, History: HistoryIcon, Clock, PlusCircle, X, Check, MapPin, Trash2, Loader, Battery, Wind, BarChart, AlertTriangle, ShieldCheck, Landmark } = window.lucide;
  const { GoogleGenAI } = window.google.generativeai;


  // --- SERVICES ---

  // homeAssistantService
  const CONFIG_STORAGE_KEY = 'familyMapperConfig_v2';
  const MOCK_HASS_ENTITIES = [
    { entity_id: 'person.alex', state: 'home', attributes: { friendly_name: 'Alex', latitude: 34.0522, longitude: -118.2437, entity_picture: 'https://i.pravatar.cc/150?u=alex', battery_level: 88, source_type: 'gps' }},
    { entity_id: 'person.ben', state: 'not_home', attributes: { friendly_name: 'Ben', latitude: 34.07, longitude: -118.25, entity_picture: 'https://i.pravatar.cc/150?u=ben', battery_level: 62, source_type: 'gps' }},
    { entity_id: 'person.chloe', state: 'school', attributes: { friendly_name: 'Chloe', latitude: 34.0425, longitude: -118.2639, entity_picture: 'https://i.pravatar.cc/150?u=chloe', battery_level: 95, source_type: 'gps' }},
    { entity_id: 'device_tracker.davids_phone', state: 'not_home', attributes: { friendly_name: "David's Phone", latitude: 34.08, longitude: -118.22, source_type: 'gps', battery_level: 45 }}
  ];
  const MOCK_ZONES_INITIAL = [
    { id: 'home', name: 'Home', icon: '🏡', location: { lat: 34.0522, lng: -118.2437 }, radius: 100 },
    { id: 'work', name: 'Work', icon: '💼', location: { lat: 34.0622, lng: -118.2537 }, radius: 150 },
    { id: 'school', name: 'School', icon: '🎓', location: { lat: 34.0422, lng: -118.2637 }, radius: 120 },
  ];
  const MOCK_TRIP_HISTORY = { 'person.ben': { driverName: 'Ben', date: new Date().toLocaleDateString(), durationMinutes: 22, distanceMiles: 8.4, startLocation: 'Work', endLocation: 'Home', maxSpeed: 68, speedLimit: 55, averageSpeed: 35, hardBrakingEvents: 1, rapidAccelerationEvents: 0 }};
  const MOCK_ZONE_EVENTS_NOW = new Date();
  const MOCK_ZONE_EVENTS = [
    { id: 'evt1', userId: 'person.chloe', userName: 'Chloe', userAvatar: 'https://i.pravatar.cc/150?u=chloe', type: 'entry', timestamp: new Date(MOCK_ZONE_EVENTS_NOW.getTime() - 10 * 60 * 1000), zoneId: 'school' },
    { id: 'evt2', userId: 'person.ben', userName: 'Ben', userAvatar: 'https://i.pravatar.cc/150?u=ben', type: 'exit', timestamp: new Date(MOCK_ZONE_EVENTS_NOW.getTime() - 25 * 60 * 1000), zoneId: 'work' },
    { id: 'evt3', userId: 'person.alex', userName: 'Alex', userAvatar: 'https://i.pravatar.cc/150?u=alex', type: 'exit', timestamp: new Date(MOCK_ZONE_EVENTS_NOW.getTime() - 45 * 60 * 1000), zoneId: 'home' },
    { id: 'evt4', userId: 'person.chloe', userName: 'Chloe', userAvatar: 'https://i.pravatar.cc/150?u=chloe', type: 'exit', timestamp: new Date(MOCK_ZONE_EVENTS_NOW.getTime() - 4 * 60 * 60 * 1000), zoneId: 'home' },
    { id: 'evt5', userId: 'person.ben', userName: 'Ben', userAvatar: 'https://i.pravatar.cc/150?u=ben', type: 'entry', timestamp: new Date(MOCK_ZONE_EVENTS_NOW.getTime() - 5 * 60 * 60 * 1000), zoneId: 'work' },
    { id: 'evt6', userId: 'person.alex', userName: 'Alex', userAvatar: 'https://i.pravatar.cc/150?u=alex', type: 'entry', timestamp: new Date(MOCK_ZONE_EVENTS_NOW.getTime() - 8 * 60 * 60 * 1000), zoneId: 'home' },
  ];
  const getAvailablePersonEntities = () => MOCK_HASS_ENTITIES;
  const saveConfiguration = (config) => localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  const loadConfiguration = () => { const s = localStorage.getItem(CONFIG_STORAGE_KEY); if (!s) return null; try { const c = JSON.parse(s); if (typeof c.apiKey === 'string' && Array.isArray(c.entityIds)) return c; return null; } catch (e) { console.error("Failed to parse config", e); return null; } };
  
  // geminiService
  let aiClient = null;
  let clientInitializationError = null;
  function getAiClient() {
    if (clientInitializationError) throw clientInitializationError;
    if (aiClient) return aiClient;
    const config = loadConfiguration();
    const API_KEY = config?.apiKey;
    if (!API_KEY) { clientInitializationError = new Error("Gemini API Key not found."); throw clientInitializationError; }
    try { aiClient = new GoogleGenAI({ apiKey: API_KEY }); return aiClient; }
    catch (error) { clientInitializationError = new Error("Failed to initialize Gemini client."); throw clientInitializationError; }
  }
  function resetAiClient() { aiClient = null; clientInitializationError = null; }

  const updateApiKey = (apiKey) => { const config = loadConfiguration(); if (config) { saveConfiguration({ ...config, apiKey }); resetAiClient(); }};
  
  async function generateDrivingSummarySvc(tripData) {
    const prompt = `You are a helpful assistant that analyzes driving data and creates friendly, easy-to-read summaries for a family safety app. Based on the following trip data, generate a concise summary of about 3-4 sentences. The summary should be positive and encouraging. If there are risky behaviors like speeding, mention them gently as a friendly reminder. Start with a general overview of the trip (e.g., "Ben had a good drive from Work to Home today."). Mention the duration and distance. Highlight the maximum speed, comparing it to the speed limit. Note any other events like hard braking. Conclude with a safety-oriented sentence (e.g., "Overall, a safe trip!"). Do not use markdown formatting. The output should be a single paragraph of plain text.
      Trip Data: Driver: ${tripData.driverName}, Date: ${tripData.date}, Duration: ${tripData.durationMinutes} minutes, Distance: ${tripData.distanceMiles} miles, Start: ${tripData.startLocation}, End: ${tripData.endLocation}, Max Speed: ${tripData.maxSpeed} mph (in a ${tripData.speedLimit} mph zone), Avg Speed: ${tripData.averageSpeed} mph, Hard Braking: ${tripData.hardBrakingEvents}, Rapid Accel: ${tripData.rapidAccelerationEvents}. Generate summary.`;
    try { const ai = getAiClient(); const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); return response.text; }
    catch (error) { console.error("Error generating summary:", error); if (error instanceof Error) throw new Error(`Failed to generate summary: ${error.message}`); throw new Error("Failed to generate summary. Check API key/network."); }
  }
  async function generateIconForZoneSvc(zoneName) {
    const prompt = `You are an expert emoji selector. Based on the place name, return a single, relevant emoji. Return ONLY the emoji character, no extra text. For a business name, represent the business type (e.g., "Starbucks" -> ☕). Place Name: "${zoneName}". Emoji:`;
    try { const ai = getAiClient(); const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); const emoji = response.text.trim(); return (emoji && emoji.length <= 4) ? emoji : '📍'; }
    catch (error) { console.error("Error generating icon:", error); return '📍'; }
  }
  
  const calculateDistance = (loc1, loc2) => { const R = 6371e3; const φ1 = loc1.lat * Math.PI / 180, φ2 = loc2.lat * Math.PI / 180, Δφ = (loc2.lat - loc1.lat) * Math.PI / 180, Δλ = (loc2.lng - loc1.lng) * Math.PI / 180; const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2); return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); };
  const getInitialData = (trackedEntityIds) => {
    const zones = MOCK_ZONES_INITIAL;
    const transformHassEntityToUser = (entity) => {
      const isInZone = zones.find(zone => calculateDistance({ lat: entity.attributes.latitude, lng: entity.attributes.longitude }, zone.location) <= zone.radius);
      let status = isInZone ? isInZone.name : 'Away';
      if (entity.entity_id === 'person.ben' && !isInZone) status = 'Driving';
      return { id: entity.entity_id, name: entity.attributes.friendly_name || entity.entity_id, avatar: entity.attributes.entity_picture || 'https://i.pravatar.cc/150?u=unknown', location: { lat: entity.attributes.latitude || 0, lng: entity.attributes.longitude || 0 }, speed: status === 'Driving' ? 45 : 0, status, battery: entity.attributes.battery_level || 100 };
    };
    const trackedEntities = MOCK_HASS_ENTITIES.filter(e => trackedEntityIds.includes(e.entity_id));
    return { users: trackedEntities.map(transformHassEntityToUser), zones };
  };
  const getUpdatedUsers = (currentUsers, currentZones) => currentUsers.map((user) => { const newBattery = Math.max(0, user.battery - (Math.random() < 0.1 ? 1 : 0)); if (user.id === 'person.ben' && user.status === 'Driving') { const newLocation = { lat: user.location.lat - 0.0005, lng: user.location.lng + 0.0005 }; const zoneEntered = currentZones.find((zone) => calculateDistance(newLocation, zone.location) <= zone.radius); if (zoneEntered) return { ...user, location: newLocation, speed: 0, status: `Arrived at ${zoneEntered.name}`, battery: newBattery }; return { ...user, location: newLocation, speed: Math.max(25, Math.floor(40 + (Math.random() * 15 - 7.5))), status: 'Driving', battery: newBattery }; } return { ...user, speed: user.status === 'Driving' ? user.speed : 0, battery: newBattery }; });
  const getTripForUser = (userId) => MOCK_TRIP_HISTORY[userId] || null;
  const getEventsForZone = (zoneId) => MOCK_ZONE_EVENTS.filter(event => event.zoneId === zoneId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // --- COMPONENTS ---
  
  const DrivingSummary = ({ summary, isLoading }) => {
    if (isLoading) return React.createElement('div', { className: "mt-4 p-4 bg-secondary-background-color/50 rounded-lg text-center" }, React.createElement(Loader, { className: "w-6 h-6 text-light-primary-color animate-spin mx-auto mb-2" }), React.createElement('p', { className: "text-secondary-text-color" }, "AI is analyzing the trip data..."));
    if (!summary) return null;
    return React.createElement('div', { className: "mt-4 p-4 bg-secondary-background-color/50 rounded-lg" }, React.createElement('h4', { className: "text-md font-semibold mb-2 flex items-center text-light-primary-color" }, React.createElement(ShieldCheck, { className: "w-5 h-5 mr-2" }), "AI Driving Summary"), React.createElement('p', { className: "text-secondary-text-color leading-relaxed text-sm" }, summary));
  };

  const UserPanel = ({ user, onGenerateSummary, tripSummary, isSummaryLoading, error }) => {
    const tripData = getTripForUser(user.id);
    const getBatteryIcon = (level) => { if (level > 80) return React.createElement(Battery, { className: "text-green-500 w-6 h-6 mr-3" }); if (level > 30) return React.createElement(Battery, { className: "text-yellow-500 w-6 h-6 mr-3" }); return React.createElement(Battery, { className: "text-red-500 w-6 h-6 mr-3" }); };
    return React.createElement('div', { className: "ha-card flex flex-col h-full text-primary-text-color" }, React.createElement('div', { className: "p-4" }, React.createElement('div', { className: "flex items-center mb-4 pb-4 border-b border-divider-color" }, React.createElement('img', { src: user.avatar, alt: user.name, className: "w-16 h-16 rounded-full mr-4" }), React.createElement('div', null, React.createElement('h2', { className: "text-2xl font-bold" }, user.name), React.createElement('p', { className: "text-secondary-text-color" }, user.status))), React.createElement('div', { className: "grid grid-cols-2 gap-4 mb-4" }, React.createElement('div', { className: "bg-secondary-background-color/50 p-3 rounded-lg flex items-center" }, getBatteryIcon(user.battery), React.createElement('div', null, React.createElement('p', { className: "text-sm text-secondary-text-color" }, "Battery"), React.createElement('p', { className: "font-semibold text-lg" }, `${user.battery}%`))), React.createElement('div', { className: "bg-secondary-background-color/50 p-3 rounded-lg flex items-center" }, React.createElement(Wind, { className: "w-6 h-6 mr-3 text-light-primary-color" }), React.createElement('div', null, React.createElement('p', { className: "text-sm text-secondary-text-color" }, "Speed"), React.createElement('p', { className: "font-semibold text-lg" }, `${user.speed} mph`))))), React.createElement('div', { className: "flex-grow overflow-y-auto px-4 pb-4" }, tripData ? React.createElement('div', null, React.createElement('h3', { className: "text-lg font-semibold mb-2" }, "Last Trip"), React.createElement('div', { className: "bg-secondary-background-color/50 p-3 rounded-lg mb-4 text-sm space-y-2" }, React.createElement('p', { className: "flex justify-between items-center" }, React.createElement('strong', { className: "text-secondary-text-color" }, "From:"), React.createElement('span', null, tripData.startLocation)), React.createElement('p', { className: "flex justify-between items-center" }, React.createElement('strong', { className: "text-secondary-text-color" }, "To:"), React.createElement('span', null, tripData.endLocation)), React.createElement('p', { className: "flex justify-between items-center" }, React.createElement('strong', { className: "text-secondary-text-color" }, "Distance:"), React.createElement('span', null, `${tripData.distanceMiles} miles`))), React.createElement('button', { onClick: () => tripData && onGenerateSummary(tripData), disabled: isSummaryLoading, className: "w-full bg-primary-color text-white font-bold py-2 px-4 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center" }, React.createElement(BarChart, { className: "w-5 h-5 mr-2" }), isSummaryLoading ? 'Generating...' : 'Generate AI Driving Summary'), error && React.createElement('div', { className: "mt-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg flex items-center" }, React.createElement(AlertTriangle, { className: "w-5 h-5 mr-3" }), React.createElement('span', null, error)), React.createElement(DrivingSummary, { summary: tripSummary, isLoading: isSummaryLoading })) : React.createElement('div', { className: "text-center text-gray-500 mt-10" }, React.createElement('p', null, `No trip data available for ${user.name}.`))));
  };

  const ZonePanel = ({ zone, events }) => {
    const formatTimeAgo = (d) => { const s = Math.floor((new Date().getTime() - d.getTime()) / 1000); let i = s / 31536000; if (i > 1) return `${Math.floor(i)} years ago`; i = s / 2592000; if (i > 1) return `${Math.floor(i)} months ago`; i = s / 86400; if (i > 1) return `${Math.floor(i)} days ago`; i = s / 3600; if (i > 1) return `${Math.floor(i)} hours ago`; i = s / 60; if (i > 1) return `${Math.floor(i)} minutes ago`; return `${Math.floor(s)} seconds ago`; };
    const formatDuration = (ms) => { if (ms < 0) return '0m'; const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); let r = ''; if (d > 0) r += `${d}d `; if (h > 0) r += `${h}h `; if (m >= 0) r += `${m % 60}m`; return r.trim() || '0m'; };
    const findDurationForExit = (exitEv, allEvs) => { if (exitEv.type !== 'exit') return null; const entry = allEvs.find((e) => e.userId === exitEv.userId && e.type === 'entry' && e.timestamp.getTime() < exitEv.timestamp.getTime()); return entry ? formatDuration(exitEv.timestamp.getTime() - entry.timestamp.getTime()) : null; };
    return React.createElement('div', { className: "ha-card flex flex-col h-full text-primary-text-color" }, React.createElement('div', { className: "p-4 border-b border-divider-color" }, React.createElement('div', { className: "flex items-center" }, React.createElement('span', { className: "text-4xl mr-4" }, zone.icon), React.createElement('div', null, React.createElement('h2', { className: "text-2xl font-bold" }, zone.name), React.createElement('p', { className: "text-secondary-text-color" }, "Event Log")))), React.createElement('div', { className: "flex-grow overflow-y-auto px-4 py-2" }, events.length > 0 ? React.createElement('ul', null, events.map((event) => { const duration = findDurationForExit(event, events); return React.createElement('li', { key: event.id, className: "flex items-center py-3 border-b border-divider-color/50 last:border-b-0" }, React.createElement('img', { src: event.userAvatar, alt: event.userName, className: "w-10 h-10 rounded-full mr-3" }), React.createElement('div', { className: "flex-grow" }, React.createElement('p', { className: "font-semibold" }, event.userName, React.createElement('span', { className: "font-normal text-secondary-text-color" }, event.type === 'entry' ? ' arrived' : ' departed')), React.createElement('div', { className: "flex items-center text-xs text-secondary-text-color mt-1" }, React.createElement('span', null, formatTimeAgo(event.timestamp)), duration && React.createElement(Fragment, null, React.createElement('span', { className: "mx-1.5" }, "·"), React.createElement(Clock, { className: "w-3 h-3 mr-1 flex-shrink-0" }), React.createElement('span', null, `${duration} at location`)))), event.type === 'entry' ? React.createElement(LogIn, { className: "w-5 h-5 text-green-500" }) : React.createElement(LogOut, { className: "w-5 h-5 text-red-500" })); })) : React.createElement('div', { className: "text-center text-gray-500 mt-10 p-4" }, React.createElement(HistoryIcon, { className: "w-12 h-12 mx-auto text-gray-600 mb-2" }), React.createElement('p', null, `No recent events for ${zone.name}.`))));
  };

  const ZoneList = ({ zones, selectedZoneId, onZoneSelect }) => React.createElement('div', null, React.createElement('h2', { className: "text-xl font-bold mb-2 p-2" }, "Zones"), zones.length > 0 ? React.createElement('ul', null, zones.map((zone) => React.createElement('li', { key: zone.id, onClick: () => onZoneSelect(zone), className: `flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors duration-200 ${selectedZoneId === zone.id ? 'selected-item-secondary' : 'hoverable-item'}` }, React.createElement('div', { className: "w-10 h-10 flex items-center justify-center mr-3 text-2xl" }, zone.icon), React.createElement('div', { className: "flex-grow" }, React.createElement('p', { className: "font-semibold" }, zone.name))))) : React.createElement('p', { className: "text-sm text-secondary-text-color text-center py-4" }, "No zones created yet."));

  const AddZonePanel = ({ mode, onStartAddZone, zoneDetails, onUpdateZoneDetails, onSaveZone, onCancel, onDeleteZone, isSavingZone }) => {
    if (!mode) return React.createElement('div', null, React.createElement('button', { onClick: onStartAddZone, className: "w-full bg-card-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center border border-divider-color" }, React.createElement(PlusCircle, { className: "w-5 h-5 mr-2" }), "Add New Zone"));
    return React.createElement('div', { className: "p-3 bg-primary-background-color rounded-lg border border-divider-color" }, React.createElement('div', { className: "flex justify-between items-center mb-3" }, React.createElement('h3', { className: "text-lg font-bold" }, mode === 'add' ? 'Create Zone' : 'Edit Zone'), React.createElement('button', { onClick: onCancel, className: "text-secondary-text-color hover:text-primary-text-color" }, React.createElement(X, { className: "w-5 h-5" }))), !zoneDetails.location && mode === 'add' ? React.createElement('div', { className: "text-center p-4 bg-secondary-background-color rounded-md" }, React.createElement(MapPin, { className: "mx-auto w-8 h-8 text-light-primary-color mb-2" }), React.createElement('p', { className: "text-secondary-text-color" }, "Click on the map to set location.")) : React.createElement('div', null, React.createElement('div', { className: "mb-4" }, React.createElement('label', { htmlFor: "zone-name", className: "block text-sm font-medium text-secondary-text-color mb-1" }, "Zone Name"), React.createElement('input', { type: "text", id: "zone-name", value: zoneDetails.name, onChange: (e) => onUpdateZoneDetails({ name: e.target.value }), placeholder: "e.g., Grandma's House", className: "w-full bg-secondary-background-color border border-divider-color rounded-md px-3 py-2 text-primary-text-color focus:ring-primary-color focus:border-primary-color" })), React.createElement('div', { className: "mb-4" }, React.createElement('label', { htmlFor: "zone-radius", className: "block text-sm font-medium text-secondary-text-color mb-1" }, `Radius: ${zoneDetails.radius}m`), React.createElement('input', { type: "range", id: "zone-radius", min: "50", max: "2000", step: "10", value: zoneDetails.radius, onChange: (e) => onUpdateZoneDetails({ radius: parseInt(e.target.value, 10) }), className: "w-full h-2 bg-divider-color rounded-lg appearance-none cursor-pointer" })), React.createElement('div', { className: "flex items-center gap-2 mt-4" }, React.createElement('button', { onClick: onSaveZone, disabled: !zoneDetails.name.trim() || isSavingZone, className: "flex-grow bg-primary-color text-white font-bold py-2 px-3 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center" }, isSavingZone ? React.createElement(Loader, { className: "w-5 h-5 mr-2 animate-spin" }) : React.createElement(Check, { className: "w-5 h-5 mr-2" }), isSavingZone ? 'Saving...' : 'Save'), mode === 'edit' && React.createElement('button', { onClick: () => onDeleteZone(zoneDetails.id), className: "flex-shrink-0 bg-error-color text-white p-3 rounded-lg hover:bg-red-700 transition-colors", "aria-label": "Delete Zone" }, React.createElement(Trash2, { className: "w-5 h-5" })))));
  };

  const MapComponent = ({ users, zones, onUserSelect, selectedUser, selectedZone, zoneEditorMode, onMapClickForZone, onSelectZoneForEdit, editingZonePreview, onEditingZoneLocationChange }) => {
    delete window.L.Icon.Default.prototype._getIconUrl;
    window.L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });
    const createAvatarIcon = (url, sel) => window.L.divIcon({ html: `<img src="${url}" style="width: 40px; height: 40px; border-radius: 50%; ${sel ? 'border: 3px solid #3b82f6;' : 'border: 2px solid #6b7280;'} box-shadow: 0 2px 5px rgba(0,0,0,0.5);" />`, className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
    const MapEventsHandler = () => { useMapEvents({ click: (e) => { if (zoneEditorMode === 'add') onMapClickForZone(e.latlng); }}); return null; };
    const MapUpdater = () => { const map = useMap(); useEffect(() => { if (selectedUser) map.flyTo([selectedUser.location.lat, selectedUser.location.lng], map.getZoom(), { animate: true, duration: 1 }); }, [selectedUser]); useEffect(() => { if (selectedZone) map.flyTo([selectedZone.location.lat, selectedZone.location.lng], 15, { animate: true, duration: 1 }); }, [selectedZone]); useEffect(() => { const c = map.getContainer(); if (c) c.style.cursor = zoneEditorMode === 'add' ? 'crosshair' : ''; }, [zoneEditorMode]); return null; };
    return React.createElement(MapContainer, { center: [34.0522, -118.2437], zoom: 13, className: "h-full w-full" }, React.createElement(TileLayer, { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: '&copy; OpenStreetMap &copy; CARTO' }), zones.map((zone) => { const isEditing = editingZonePreview.id === zone.id, isSelected = selectedZone?.id === zone.id, color = isEditing ? '#fb923c' : (isSelected ? '#a855f7' : '#3b82f6'); return React.createElement(Circle, { key: zone.id, center: [zone.location.lat, zone.location.lng], radius: zone.radius, pathOptions: { color, fillColor: color, fillOpacity: isSelected || isEditing ? 0.3 : 0.2, weight: isSelected || isEditing ? 3 : 2 }, eventHandlers: { click: () => onSelectZoneForEdit(zone) } }, React.createElement(Popup, null, `${zone.icon} ${zone.name}`)); }), users.map((user) => React.createElement(Marker, { key: user.id, position: [user.location.lat, user.location.lng], icon: createAvatarIcon(user.avatar, selectedUser?.id === user.id), eventHandlers: { click: () => onUserSelect(user) } }, React.createElement(Popup, null, React.createElement('div', { className: "text-center font-bold" }, user.name), React.createElement('div', null, `${user.status} ${user.speed > 0 ? `(${user.speed} mph)` : ''}`)))), editingZonePreview.location && React.createElement(Fragment, null, React.createElement(Marker, { position: editingZonePreview.location, draggable: zoneEditorMode === 'edit', eventHandlers: { drag: (e) => zoneEditorMode === 'edit' && onEditingZoneLocationChange(e.target.getLatLng()) } }), React.createElement(Circle, { center: editingZonePreview.location, radius: editingZonePreview.radius, pathOptions: { color: '#fb923c', fillColor: '#fb923c', fillOpacity: 0.4 } })), React.createElement(MapEventsHandler, null), React.createElement(MapUpdater, null));
  };
  
  const SettingsPanel = ({ onClose, onSave }) => {
    const [apiKey, setApiKey] = useState('');
    useEffect(() => { const config = loadConfiguration(); if (config?.apiKey) setApiKey(config.apiKey); }, []);
    return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50", onClick: onClose }, React.createElement('div', { className: "ha-card w-full max-w-md p-6 relative", onClick: (e) => e.stopPropagation() }, React.createElement('button', { onClick: onClose, className: "absolute top-4 right-4 text-secondary-text-color hover:text-primary-text-color", "aria-label": "Close" }, React.createElement(X, { className: "w-6 h-6" })), React.createElement('h2', { className: "text-2xl font-bold text-primary-text-color mb-4" }, "Settings"), React.createElement('div', { className: "mb-4" }, React.createElement('label', { htmlFor: "api-key-modal", className: "block text-sm font-medium text-primary-text-color mb-2" }, "Gemini API Key"), React.createElement('div', { className: "relative" }, React.createElement(KeyRound, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text-color" }), React.createElement('input', { type: "password", id: "api-key-modal", value: apiKey, onChange: (e) => setApiKey(e.target.value), placeholder: "Enter Google AI Studio API Key", className: "w-full bg-secondary-background-color border border-divider-color rounded-md pl-10 pr-3 py-2 text-primary-text-color focus:ring-primary-color focus:border-primary-color" })), React.createElement('p', { className: "text-xs text-secondary-text-color mt-2" }, "Your key is stored in your browser's local storage.")), React.createElement('div', { className: "flex justify-end gap-3 mt-6" }, React.createElement('button', { onClick: onClose, className: "bg-secondary-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 border border-divider-color" }, "Cancel"), React.createElement('button', { onClick: () => apiKey.trim() ? onSave(apiKey.trim()) : alert("API Key cannot be empty."), className: "bg-primary-color text-white font-bold py-2 px-4 rounded-lg hover:bg-dark-primary-color flex items-center" }, React.createElement(CheckCircle, { className: "w-5 h-5 mr-2" }), "Save"))));
  };

  const Setup = ({ onComplete }) => {
    const [apiKey, setApiKey] = useState('');
    const [availableEntities, setAvailableEntities] = useState([]);
    const [selectedEntities, setSelectedEntities] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { setAvailableEntities(getAvailablePersonEntities()); setIsLoading(false); }, []);
    const handleToggleEntity = (id) => setSelectedEntities(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const handleSave = () => { if (selectedEntities.size === 0) return alert("Please select a person/device."); if (!apiKey.trim()) return alert("Please enter your Gemini API Key."); onComplete({ apiKey: apiKey.trim(), selectedEntityIds: Array.from(selectedEntities) }); };
    const getAvatar = (e) => e.attributes.entity_picture || `https://i.pravatar.cc/150?u=${e.entity_id}`;
    return React.createElement('div', { className: "bg-primary-background-color min-h-screen flex items-center justify-center p-4" }, React.createElement('div', { className: "w-full max-w-lg" }, React.createElement('div', { className: "ha-card p-6" }, React.createElement('div', { className: "text-center mb-6" }, React.createElement(Users, { className: "mx-auto h-12 w-12 text-primary-color mb-3" }), React.createElement('h1', { className: "text-2xl font-bold" }, "Welcome to Family Mapper AI"), React.createElement('p', { className: "text-secondary-text-color mt-2" }, "Select people and devices to see on the map.")), isLoading ? React.createElement('p', { className: "text-center" }, "Loading entities...") : React.createElement('div', { className: "max-h-60 overflow-y-auto pr-2 mb-6" }, availableEntities.map(e => React.createElement('div', { key: e.entity_id, onClick: () => handleToggleEntity(e.entity_id), className: `entity-list-item ${selectedEntities.has(e.entity_id) ? 'selected' : ''}` }, React.createElement('input', { type: "checkbox", className: "ha-checkbox", checked: selectedEntities.has(e.entity_id), readOnly: true }), React.createElement('img', { src: getAvatar(e), alt: "", className: "w-10 h-10 rounded-full mr-4" }), React.createElement('div', null, React.createElement('p', { className: "font-semibold" }, e.attributes.friendly_name || e.entity_id), React.createElement('p', { className: "text-xs text-secondary-text-color" }, e.entity_id))))), React.createElement('div', { className: "mt-4" }, React.createElement('label', { htmlFor: "api-key", className: "block text-sm font-medium mb-2" }, "Gemini API Key"), React.createElement('div', { className: "relative" }, React.createElement(KeyRound, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text-color" }), React.createElement('input', { type: "password", id: "api-key", value: apiKey, onChange: (e) => setApiKey(e.target.value), placeholder: "Enter Google AI Studio API Key", className: "w-full bg-secondary-background-color border border-divider-color rounded-md pl-10 pr-3 py-2 focus:ring-primary-color" })), React.createElement('p', { className: "text-xs text-secondary-text-color mt-2" }, "Your key is stored in your browser's local storage.")), React.createElement('button', { onClick: handleSave, disabled: isLoading || selectedEntities.size === 0, className: "w-full mt-6 bg-primary-color text-white font-bold py-3 px-4 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed flex items-center justify-center" }, React.createElement(CheckCircle, { className: "w-5 h-5 mr-2" }), `Save and Start (${selectedEntities.size} selected)`))));
  };
  
  // --- APP ---
  const App = () => {
    const [isConfigured, setIsConfigured] = useState(false);
    const [trackedEntities, setTrackedEntities] = useState([]);
    const [users, setUsers] = useState([]);
    const [zones, setZones] = useState([]);
    const [zoneEvents, setZoneEvents] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedZoneId, setSelectedZoneId] = useState(null);
    const [tripSummary, setTripSummary] = useState(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [zoneEditorMode, setZoneEditorMode] = useState(null);
    const [isSavingZone, setIsSavingZone] = useState(false);
    const [editingZone, setEditingZone] = useState({ id: undefined, location: null, radius: 200, name: '' });

    useEffect(() => { const config = loadConfiguration(); if (config?.apiKey && config.entityIds.length > 0) { setTrackedEntities(config.entityIds); setIsConfigured(true); }}, []);
    useEffect(() => { if (isConfigured) { const { users: u, zones: z } = getInitialData(trackedEntities); setUsers(u); setZones(z); if (u.length > 0) setSelectedUserId(u[0].id); }}, [isConfigured, trackedEntities]);
    useEffect(() => { if (!isConfigured) return; const i = setInterval(() => setUsers(cu => getUpdatedUsers(cu, zones)), 2000); return () => clearInterval(i); }, [isConfigured, zones]);
    useEffect(() => { if (selectedZoneId) setZoneEvents(getEventsForZone(selectedZoneId)); else setZoneEvents([]); }, [selectedZoneId]);

    const handleConfigComplete = (config) => { saveConfiguration(config); setTrackedEntities(config.selectedEntityIds); setIsConfigured(true); };
    const handleApiKeyUpdate = (key) => { updateApiKey(key); setShowSettings(false); alert("API Key updated!"); };

    const selectedUser = users.find(u => u.id === selectedUserId) || null;
    const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId) || null, [zones, selectedZoneId]);

    const handleUserSelect = useCallback((user) => { setTripSummary(null); setError(null); setZoneEditorMode(null); setSelectedZoneId(null); setSelectedUserId(user.id); }, []);
    const handleZoneSelect = useCallback((zone) => { setZoneEditorMode(null); setSelectedUserId(null); setSelectedZoneId(zone.id); }, []);
    
    const genSummary = async (tripData) => { setIsSummaryLoading(true); setTripSummary(null); setError(null); try { const s = await generateDrivingSummarySvc(tripData); setTripSummary(s); } catch (e) { setError(e.message || 'Could not generate summary.'); } finally { setIsSummaryLoading(false); }};
    const getStatusEmoji = (s) => { if (s.includes('Home')) return '🏡'; if (s === 'Driving') return '🚗'; if (s.includes('School')) return '🎓'; if (s.includes('Work')) return '💼'; if (s.includes('Arrived')) return '✅'; return '📍'; };

    const handleStartAddZone = useCallback(() => { setSelectedUserId(null); setSelectedZoneId(null); setZoneEditorMode('add'); setEditingZone({ id: undefined, location: null, radius: 200, name: '' }); }, []);
    const handleMapClickForZone = useCallback((latlng) => { if (zoneEditorMode === 'add') setEditingZone(p => ({ ...p, location: latlng })); }, [zoneEditorMode]);
    const handleSelectZoneForEdit = useCallback((zone) => { setSelectedUserId(null); setSelectedZoneId(null); setZoneEditorMode('edit'); setEditingZone({ id: zone.id, name: zone.name, radius: zone.radius, location: window.L.latLng(zone.location.lat, zone.location.lng) }); }, []);
    const handleUpdateEditingZoneDetails = useCallback((details) => setEditingZone(p => ({ ...p, ...details })), []);
    const handleCancelZoneEditor = useCallback(() => { setZoneEditorMode(null); setEditingZone({ id: undefined, location: null, radius: 200, name: '' }); }, []);
    
    const handleSaveZone = useCallback(async () => {
        if (!editingZone.location || !editingZone.name.trim()) return alert("Provide a name and location.");
        setIsSavingZone(true);
        try {
            const zoneName = editingZone.name.trim(); let icon = '📍';
            const originalZone = zoneEditorMode === 'edit' ? zones.find(z => z.id === editingZone.id) : null;
            if (zoneEditorMode === 'add' || (originalZone && originalZone.name !== zoneName)) icon = await generateIconForZoneSvc(zoneName); else if (originalZone) icon = originalZone.icon;
            const zoneData = { name: zoneName, icon, location: { lat: editingZone.location.lat, lng: editingZone.location.lng }, radius: editingZone.radius };
            if (zoneEditorMode === 'edit' && editingZone.id) setZones(p => p.map(z => z.id === editingZone.id ? { ...z, ...zoneData } : z));
            else setZones(p => [...p, { id: `zone_${Date.now()}`, ...zoneData }]);
            handleCancelZoneEditor();
        } catch (e) { console.error("Failed to save zone:", e); alert("Error saving zone. API key might be invalid."); } finally { setIsSavingZone(false); }
    }, [editingZone, zoneEditorMode, zones, handleCancelZoneEditor]);
    const handleDeleteZone = useCallback((id) => { if (!id) return; if (window.confirm("Delete this zone?")) { setZones(p => p.filter(z => z.id !== id)); handleCancelZoneEditor(); }}, [handleCancelZoneEditor]);

    if (!isConfigured) return React.createElement(Setup, { onComplete: handleConfigComplete });

    return React.createElement('div', { className: "flex h-screen font-sans" }, showSettings && React.createElement(SettingsPanel, { onClose: () => setShowSettings(false), onSave: handleApiKeyUpdate }), React.createElement('aside', { className: "w-full md:w-1/4 lg:w-1/5 h-full bg-secondary-background-color p-4 overflow-y-auto flex flex-col space-y-4" }, React.createElement('div', null, React.createElement('h2', { className: "text-xl font-bold mb-2 p-2" }, "Family"), users.length > 0 ? React.createElement('ul', null, users.map(user => React.createElement('li', { key: user.id, onClick: () => handleUserSelect(user), className: `flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors duration-200 ${selectedUserId === user.id ? 'selected-item' : 'hoverable-item'}` }, React.createElement('img', { src: user.avatar, alt: user.name, className: "w-10 h-10 rounded-full mr-3" }), React.createElement('div', { className: "flex-grow" }, React.createElement('p', { className: "font-semibold" }, user.name), React.createElement('div', { className: `text-xs mt-1 flex items-center ${selectedUserId === user.id ? 'text-gray-200' : 'text-secondary-text-color'}` }, React.createElement('span', { className: "mr-2" }, getStatusEmoji(user.status)), React.createElement('span', null, user.status === 'Driving' ? `${user.speed} mph` : user.status)))))) : React.createElement('p', { className: "text-sm text-secondary-text-color text-center py-4" }, "No family members selected.")), React.createElement(ZoneList, { zones: zones, selectedZoneId: selectedZoneId, onZoneSelect: handleZoneSelect }), React.createElement('div', { className: "flex-grow" }), React.createElement('div', { className: "space-y-2" }, React.createElement(AddZonePanel, { mode: zoneEditorMode, onStartAddZone: handleStartAddZone, zoneDetails: editingZone, onUpdateZoneDetails: handleUpdateEditingZoneDetails, onSaveZone: handleSaveZone, onCancel: handleCancelZoneEditor, onDeleteZone: handleDeleteZone, isSavingZone: isSavingZone }), React.createElement('button', { onClick: () => setShowSettings(true), className: "w-full bg-card-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center border border-divider-color", "aria-label": "Settings" }, React.createElement(Settings, { className: "w-5 h-5 mr-2" }), "Settings"))), React.createElement('main', { className: "flex-grow h-full flex flex-col md:flex-row p-4 gap-4" }, React.createElement('div', { className: "w-full md:w-2/3 h-1/2 md:h-full ha-card" }, React.createElement(MapComponent, { users: users, zones: zones, onUserSelect: handleUserSelect, selectedUser: selectedUser, selectedZone: selectedZone, zoneEditorMode: zoneEditorMode, onMapClickForZone: handleMapClickForZone, onSelectZoneForEdit: handleSelectZoneForEdit, editingZonePreview: editingZone, onEditingZoneLocationChange: (latlng) => handleUpdateEditingZoneDetails({ location: latlng }) })), React.createElement('div', { className: "w-full md:w-1/3 h-1/2 md:h-full" }, selectedUser && React.createElement(UserPanel, { user: selectedUser, onGenerateSummary: genSummary, tripSummary: tripSummary, isSummaryLoading: isSummaryLoading, error: error }), selectedZone && React.createElement(ZonePanel, { zone: selectedZone, events: zoneEvents }))));
  };

  // --- RENDER ---
  const finalRoot = createRoot(rootElement);
  finalRoot.render(React.createElement(StrictMode, null, React.createElement(App, null)));
})();
