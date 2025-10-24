
import React, { useState, useEffect } from 'react';
import { updateApiKey, loadConfiguration } from '../services/homeAssistantService';
import { X, KeyRound, CheckCircle, Loader } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
      // Pre-fill with existing key for user convenience
      const config = loadConfiguration();
      if (config?.apiKey) {
          setApiKey(config.apiKey);
      }
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API Key cannot be empty.');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      updateApiKey(apiKey.trim());
      // Give a visual confirmation before closing
      setTimeout(() => {
        alert("API Key updated successfully!");
        onClose();
      }, 200);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsSaving(false);
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
          <label htmlFor="api-key" className="block text-sm font-medium text-secondary-text-color mb-2">
            Google Gemini API Key
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-text-color" />
            <input
              type="password"
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your new API key"
              className="w-full bg-secondary-background-color border border-divider-color rounded-md px-3 py-3 pl-10 text-primary-text-color focus:ring-primary-color focus:border-primary-color"
            />
          </div>
          {error && <p className="text-xs text-error-color mt-2">{error}</p>}
           <p className="text-xs text-secondary-text-color mt-2">
                Your key is stored securely in your browser's local storage.
            </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary-color text-white font-bold py-2 px-4 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSaving ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
