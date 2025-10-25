import React, { useState, useEffect } from 'react';
import { X, KeyRound, CheckCircle } from 'lucide-react';
import { loadConfiguration } from '../services/homeAssistantService';

interface SettingsPanelProps {
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

// FIX: Re-instated API key logic.
const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  
  useEffect(() => {
    const config = loadConfiguration();
    if (config?.apiKey) {
      setApiKey(config.apiKey);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    } else {
      alert("API Key cannot be empty.");
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        onClick={onClose}
    >
      <div 
        className="ha-card w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
      >
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-secondary-text-color hover:text-primary-text-color"
            aria-label="Close settings"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-primary-text-color mb-4">Settings</h2>

        <div className="mb-4">
          <label htmlFor="api-key-modal" className="block text-sm font-medium text-primary-text-color mb-2">
            Gemini API Key
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text-color" />
            <input
              type="password"
              id="api-key-modal"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google AI Studio API Key"
              className="w-full bg-secondary-background-color border border-divider-color rounded-md pl-10 pr-3 py-2 text-primary-text-color focus:ring-primary-color focus:border-primary-color"
            />
          </div>
          <p className="text-xs text-secondary-text-color mt-2">
            Your key is stored securely in your browser's local storage.
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="bg-secondary-background-color text-primary-text-color font-medium py-2 px-4 rounded-lg hover:bg-gray-600 border border-divider-color transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-primary-color text-white font-bold py-2 px-4 rounded-lg hover:bg-dark-primary-color transition-colors flex items-center"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
