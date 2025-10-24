
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Zone, TripData, ZoneEvent } from './types';
import { getInitialData, getUpdatedUsers, loadConfiguration, saveConfiguration, getEventsForZone } from './services/homeAssistantService';
import MapComponent from './components/MapComponent';
import UserPanel from './components/UserPanel';
import ZonePanel from './components/ZonePanel';
import AddZonePanel from './components/AddZonePanel';
import ZoneList from './components/ZoneList';
import Setup from './components/Setup';
import SettingsPanel from './components/SettingsPanel';
import { generateDrivingSummary as generateSummary, generateIconForZone } from './services/geminiService';
import L from 'leaflet';
import { Settings } from 'lucide-react';


const App: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [trackedEntities, setTrackedEntities] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneEvents, setZoneEvents] = useState<ZoneEvent[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [tripSummary, setTripSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // State for zone editor
  const [zoneEditorMode, setZoneEditorMode] = useState<'add' | 'edit' | null>(null);
  const [isSavingZone, setIsSavingZone] = useState<boolean>(false);
  const [editingZone, setEditingZone] = useState<{
    id?: string;
    location: L.LatLng | null;
    radius: number;
    name: string;
  }>({
    id: undefined,
    location: null,
    radius: 200,
    name: '',
  });

  // Check for configuration on initial load
  useEffect(() => {
    const config = loadConfiguration();
    if (config && config.entityIds.length > 0 && config.apiKey) {
      setTrackedEntities(config.entityIds);
      setIsConfigured(true);
    }
  }, []);

  // Fetch initial data once configuration is set
  useEffect(() => {
    if (isConfigured) {
      const { users: initialUsers, zones: initialZones } = getInitialData(trackedEntities);
      setUsers(initialUsers);
      setZones(initialZones);
      if (initialUsers.length > 0) {
        setSelectedUserId(initialUsers[0].id);
      }
    }
  }, [isConfigured, trackedEntities]);

  // Set up polling for user updates
  useEffect(() => {
    if (!isConfigured) return;

    const interval = setInterval(() => {
      setUsers(currentUsers => getUpdatedUsers(currentUsers, zones));
    }, 2000);
    return () => clearInterval(interval);
  }, [isConfigured, zones]);

  // Fetch zone events when a zone is selected
  useEffect(() => {
    if (selectedZoneId) {
      const events = getEventsForZone(selectedZoneId);
      setZoneEvents(events);
    } else {
      setZoneEvents([]);
    }
  }, [selectedZoneId]);

  const handleConfigurationComplete = (config: { selectedEntityIds: string[], apiKey: string }) => {
    saveConfiguration(config.selectedEntityIds, config.apiKey);
    setTrackedEntities(config.selectedEntityIds);
    setIsConfigured(true);
  };

  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  const selectedZone = useMemo(() => 
    zones.find(z => z.id === selectedZoneId) || null,
    [zones, selectedZoneId]
  );

  const handleUserSelect = useCallback((user: User) => {
    setTripSummary(null);
    setError(null);
    setZoneEditorMode(null);
    setSelectedZoneId(null);
    setSelectedUserId(user.id);
  }, []);
  
  const handleZoneSelect = useCallback((zone: Zone) => {
    setZoneEditorMode(null);
    setSelectedUserId(null);
    setSelectedZoneId(zone.id);
  }, []);
  
  const generateDrivingSummary = async (tripData: TripData) => {
    setIsSummaryLoading(true);
    setTripSummary(null);
    setError(null);
    try {
      const summary = await generateSummary(tripData);
      setTripSummary(summary);
    } catch (err: any) {
      setError(err.message || 'Could not generate driving summary.');
      console.error(err);
    } finally {
      setIsSummaryLoading(false);
    }
  };
  
  const getStatusEmoji = (status: string) => {
    if (status.includes('Home')) return '🏡';
    if (status === 'Driving') return '🚗';
    if (status.includes('School')) return '🎓';
    if (status.includes('Work')) return '💼';
    if (status.includes('Arrived')) return '✅';
    return '📍';
  };

  const handleStartAddZone = useCallback(() => {
    setSelectedUserId(null);
    setSelectedZoneId(null);
    setZoneEditorMode('add');
    setEditingZone({ id: undefined, location: null, radius: 200, name: '' });
  }, []);
  
  const handleMapClickForZone = useCallback((latlng: L.LatLng) => {
    if (zoneEditorMode === 'add') {
      setEditingZone(prev => ({ ...prev, location: latlng }));
    }
  }, [zoneEditorMode]);

  const handleSelectZoneForEdit = useCallback((zone: Zone) => {
    setSelectedUserId(null);
    setSelectedZoneId(null);
    setZoneEditorMode('edit');
    setEditingZone({
      id: zone.id,
      name: zone.name,
      radius: zone.radius,
      location: L.latLng(zone.location.lat, zone.location.lng),
    });
  }, []);

  const handleUpdateEditingZoneDetails = useCallback((details: Partial<{ radius: number; name: string; location: L.LatLng }>) => {
    setEditingZone(prev => ({ ...prev, ...details }));
  }, []);

  const handleCancelZoneEditor = useCallback(() => {
    setZoneEditorMode(null);
    setEditingZone({ id: undefined, location: null, radius: 200, name: '' });
  }, []);

  const handleSaveZone = useCallback(async () => {
    if (!editingZone.location || !editingZone.name.trim()) {
      alert("Please provide a name and set a location for the zone.");
      return;
    }
    
    setIsSavingZone(true);

    try {
      const zoneName = editingZone.name.trim();
      let icon = '📍';

      const originalZone = zoneEditorMode === 'edit' ? zones.find(z => z.id === editingZone.id) : null;
      const hasNameChanged = originalZone ? originalZone.name !== zoneName : false;

      if (zoneEditorMode === 'add' || hasNameChanged) {
        icon = await generateIconForZone(zoneName);
      } else if (originalZone) {
        icon = originalZone.icon;
      }
      
      if (zoneEditorMode === 'edit' && editingZone.id) {
        const updatedZone: Zone = {
          id: editingZone.id,
          name: zoneName,
          icon,
          location: { lat: editingZone.location.lat, lng: editingZone.location.lng },
          radius: editingZone.radius,
        };
        setZones(prevZones => prevZones.map(z => z.id === updatedZone.id ? updatedZone : z));
      } else if (zoneEditorMode === 'add') {
        const newZone: Zone = {
          id: `zone_${Date.now()}`,
          name: zoneName,
          icon,
          location: { lat: editingZone.location.lat, lng: editingZone.location.lng },
          radius: editingZone.radius,
        };
        setZones(prevZones => [...prevZones, newZone]);
      }
      
      handleCancelZoneEditor();
    } catch (err) {
      console.error("Failed to save zone:", err);
      alert("An error occurred while saving the zone. The API key might be invalid.");
    } finally {
      setIsSavingZone(false);
    }
  }, [editingZone, zoneEditorMode, handleCancelZoneEditor, zones]);
  
  const handleDeleteZone = useCallback((zoneId?: string) => {
    if (!zoneId) return;
    if (window.confirm("Are you sure you want to delete this zone?")) {
      setZones(prevZones => prevZones.filter(z => z.id !== zoneId));
      handleCancelZoneEditor();
    }
  }, [handleCancelZoneEditor]);

  if (!isConfigured) {
    return <Setup onComplete={handleConfigurationComplete} />;
  }

  return (
    <div className="flex h-screen font-sans">
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      
      <aside className="w-full md:w-1/4 lg:w-1/5 h-full bg-secondary-background-color p-4 overflow-y-auto flex flex-col space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-2 p-2">Family</h2>
          {users.length > 0 ? (
            <ul>
              {users.map(user => (
                <li key={user.id} 
                    onClick={() => handleUserSelect(user)}
                    className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors duration-200 ${selectedUserId === user.id ? 'selected-item' : 'hoverable-item'}`}>
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-3"/>
                  <div className="flex-grow">
                    <p className="font-semibold">{user.name}</p>
                    <div className={`text-xs mt-1 flex items-center ${selectedUserId === user.id ? 'text-gray-200' : 'text-secondary-text-color'}`}>
                      <span className="mr-2">{getStatusEmoji(user.status)}</span>
                      <span>
                        {user.status === 'Driving' ? `${user.speed} mph` : user.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-secondary-text-color text-center py-4">No family members selected.</p>
          )}
        </div>

        <ZoneList 
          zones={zones}
          selectedZoneId={selectedZoneId}
          onZoneSelect={handleZoneSelect}
        />
        
        <div className="flex-grow"></div>

        <div className="space-y-2">
            <AddZonePanel
                mode={zoneEditorMode}
                onStartAddZone={handleStartAddZone}
                zoneDetails={editingZone}
                onUpdateZoneDetails={handleUpdateEditingZoneDetails}
                onSaveZone={handleSaveZone}
                onCancel={handleCancelZoneEditor}
                onDeleteZone={handleDeleteZone}
                isSavingZone={isSavingZone}
            />
            <button
                onClick={() => setShowSettings(true)}
                className="w-full bg-card-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center border border-divider-color"
                aria-label="Open Settings"
                >
                <Settings className="w-5 h-5 mr-2" />
                Settings
            </button>
        </div>
      </aside>
      
      <main className="flex-grow h-full flex flex-col md:flex-row p-4 gap-4">
          <div className="w-full md:w-2/3 h-1/2 md:h-full ha-card">
          <MapComponent 
            users={users} 
            zones={zones} 
            onUserSelect={handleUserSelect} 
            selectedUser={selectedUser}
            selectedZone={selectedZone}
            zoneEditorMode={zoneEditorMode}
            onMapClickForZone={handleMapClickForZone}
            onSelectZoneForEdit={handleSelectZoneForEdit}
            editingZonePreview={editingZone}
            onEditingZoneLocationChange={(latlng) => handleUpdateEditingZoneDetails({ location: latlng })}
          />
        </div>
        <div className="w-full md:w-1/3 h-1/2 md:h-full">
          {selectedUser && (
            <UserPanel 
              user={selectedUser} 
              onGenerateSummary={generateDrivingSummary}
              tripSummary={tripSummary}
              isSummaryLoading={isSummaryLoading}
              error={error}
            />
          )}
          {selectedZone && (
            <ZonePanel
              zone={selectedZone}
              events={zoneEvents}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
