import React, { useState, useEffect } from 'react';
import { HassEntity } from '../types';
import { getAvailablePersonEntities } from '../services/homeAssistantService';
import { Users, CheckCircle } from 'lucide-react';

interface SetupProps {
  onComplete: (selectedEntityIds: string[]) => void;
}

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [availableEntities, setAvailableEntities] = useState<HassEntity[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntities = async () => {
      // In a real app, this would be an async API call
      const entities = getAvailablePersonEntities();
      setAvailableEntities(entities);
      setIsLoading(false);
    };
    fetchEntities();
  }, []);

  const handleToggleEntity = (entityId: string) => {
    setSelectedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    if (selectedEntities.size === 0) {
      alert("Please select at least one person or device to track.");
      return;
    }
    onComplete(Array.from(selectedEntities));
  };
  
  const getAvatar = (entity: HassEntity) => {
    return entity.attributes.entity_picture || `https://i.pravatar.cc/150?u=${entity.entity_id}`;
  };

  return (
    <div className="bg-primary-background-color min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="ha-card p-6">
          <div className="text-center mb-6">
            <Users className="mx-auto h-12 w-12 text-primary-color mb-3" />
            <h1 className="text-2xl font-bold text-primary-text-color">Welcome to Family Mapper AI</h1>
            <p className="text-secondary-text-color mt-2">
              To get started, please select the people and devices you'd like to see on the map.
            </p>
          </div>

          {isLoading ? (
            <p className="text-center text-secondary-text-color">Loading entities from Home Assistant...</p>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-2">
              {availableEntities.map(entity => (
                <div
                  key={entity.entity_id}
                  onClick={() => handleToggleEntity(entity.entity_id)}
                  className={`entity-list-item ${selectedEntities.has(entity.entity_id) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="ha-checkbox"
                    checked={selectedEntities.has(entity.entity_id)}
                    readOnly
                  />
                  <img src={getAvatar(entity)} alt="" className="w-10 h-10 rounded-full mr-4"/>
                  <div>
                    <p className="font-semibold text-primary-text-color">{entity.attributes.friendly_name || entity.entity_id}</p>
                    <p className="text-xs text-secondary-text-color">{entity.entity_id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={handleSave}
            disabled={isLoading || selectedEntities.size === 0}
            className="w-full mt-6 bg-primary-color text-white font-bold py-3 px-4 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Save and Start ({selectedEntities.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup;