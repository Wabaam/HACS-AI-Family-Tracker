import React from 'https://esm.sh/react@18.2.0';
import { User, TripData } from '../types.ts';
import { getTripForUser } from '../services/homeAssistantService.ts';
import DrivingSummary from './DrivingSummary.tsx';
import { Smartphone, Battery, Wind, Map, BarChart, AlertTriangle } from 'https://esm.sh/lucide-react@0.378.0';

interface UserPanelProps {
  user: User;
  onGenerateSummary: (tripData: TripData) => void;
  tripSummary: string | null;
  isSummaryLoading: boolean;
  error: string | null;
}

const UserPanel: React.FC<UserPanelProps> = ({ user, onGenerateSummary, tripSummary, isSummaryLoading, error }) => {
  const tripData = getTripForUser(user.id);

  const handleGenerateClick = () => {
    if (tripData) {
      onGenerateSummary(tripData);
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 80) return <Battery className="text-green-500 w-6 h-6 mr-3" />;
    if (level > 30) return <Battery className="text-yellow-500 w-6 h-6 mr-3" />;
    return <Battery className="text-red-500 w-6 h-6 mr-3" />;
  };

  return (
    <div className="ha-card flex flex-col h-full text-primary-text-color">
      <div className="p-4">
        <div className="flex items-center mb-4 pb-4 border-b border-divider-color">
          <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full mr-4"/>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-secondary-text-color">{user.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-secondary-background-color/50 p-3 rounded-lg flex items-center">
            {getBatteryIcon(user.battery)}
            <div>
              <p className="text-sm text-secondary-text-color">Battery</p>
              <p className="font-semibold text-lg">{user.battery}%</p>
            </div>
          </div>
          <div className="bg-secondary-background-color/50 p-3 rounded-lg flex items-center">
            <Wind className="w-6 h-6 mr-3 text-light-primary-color" />
            <div>
              <p className="text-sm text-secondary-text-color">Speed</p>
              <p className="font-semibold text-lg">{user.speed} mph</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {tripData ? (
          <div>
            <h3 className="text-lg font-semibold mb-2">Last Trip</h3>
            <div className="bg-secondary-background-color/50 p-3 rounded-lg mb-4 text-sm space-y-2">
                <p className="flex justify-between items-center"><strong className="text-secondary-text-color">From:</strong> <span>{tripData.startLocation}</span></p>
                <p className="flex justify-between items-center"><strong className="text-secondary-text-color">To:</strong> <span>{tripData.endLocation}</span></p>
                <p className="flex justify-between items-center"><strong className="text-secondary-text-color">Distance:</strong> <span>{tripData.distanceMiles} miles</span></p>
            </div>
            <button
              onClick={handleGenerateClick}
              disabled={isSummaryLoading}
              className="w-full bg-primary-color text-white font-bold py-2 px-4 rounded-lg hover:bg-dark-primary-color disabled:bg-divider-color disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <BarChart className="w-5 h-5 mr-2" />
              {isSummaryLoading ? 'Generating...' : 'Generate AI Driving Summary'}
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg flex items-center">
                <AlertTriangle className="w-5 h-5 mr-3" />
                <span>{error}</span>
              </div>
            )}
            
            <DrivingSummary summary={tripSummary} isLoading={isSummaryLoading} />

          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <p>No trip data available for {user.name}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPanel;
