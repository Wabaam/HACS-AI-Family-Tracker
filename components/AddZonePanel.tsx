import React from 'react';
import type L from 'leaflet';
import { PlusCircle, X, Check, MapPin, Trash2, Loader } from 'lucide-react';

interface AddZonePanelProps {
  mode: 'add' | 'edit' | null;
  onStartAddZone: () => void;
  zoneDetails: {
    id?: string;
    location: L.LatLng | null;
    radius: number;
    name: string;
  };
  onUpdateZoneDetails: (details: Partial<{ radius: number; name:string }>) => void;
  onSaveZone: () => void;
  onCancel: () => void;
  onDeleteZone: (zoneId?: string) => void;
  isSavingZone: boolean;
}

const AddZonePanel: React.FC<AddZonePanelProps> = ({
  mode,
  onStartAddZone,
  zoneDetails,
  onUpdateZoneDetails,
  onSaveZone,
  onCancel,
  onDeleteZone,
  isSavingZone,
}) => {
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateZoneDetails({ radius: parseInt(e.target.value, 10) });
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateZoneDetails({ name: e.target.value });
  };

  if (!mode) {
    return (
      <div>
        <button
          onClick={onStartAddZone}
          className="w-full bg-card-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center border border-divider-color"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Add New Zone
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-primary-background-color rounded-lg border border-divider-color">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">{mode === 'add' ? 'Create Zone' : 'Edit Zone'}</h3>
        <button onClick={onCancel} className="text-secondary-text-color hover:text-primary-text-color">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {mode === 'add' && !zoneDetails.location ? (
        <div className="text-center p-4 bg-secondary-background-color rounded-md">
            <MapPin className="mx-auto w-8 h-8 text-light-primary-color mb-2" />
            <p className="text-secondary-text-color">Click on the map to set location.</p>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label htmlFor="zone-name" className="block text-sm font-medium text-secondary-text-color mb-1">Zone Name</label>
            <input
              type="text"
              id="zone-name"
              value={zoneDetails.name}
              onChange={handleNameChange}
              placeholder="e.g., Grandma's House"
              className="w-full bg-secondary-background-color border border-divider-color rounded-md px-3 py-2 text-primary-text-color focus:ring-primary-color focus:border-primary-color"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="zone-radius" className="block text-sm font-medium text-secondary-text-color mb-1">Radius: {zoneDetails.radius}m</label>
            <input
              type="range"
              id="zone-radius"
              min="50"
              max="2000"
              step="10"
              value={zoneDetails.radius}
              onChange={handleRadiusChange}
              className="w-full h-2 bg-divider-color rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={onSaveZone}
              disabled={!zoneDetails.name.trim() || isSavingZone}
              className="flex-grow bg-primary-color text-white font-bold py-2 px-3 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSavingZone ? (
                <Loader className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              {isSavingZone ? 'Saving...' : 'Save'}
            </button>
            {mode === 'edit' && (
              <button
                onClick={() => onDeleteZone(zoneDetails.id)}
                className="flex-shrink-0 bg-error-color text-white p-3 rounded-lg hover:bg-red-700 transition-colors"
                aria-label="Delete Zone"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddZonePanel;