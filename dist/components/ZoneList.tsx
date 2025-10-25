import React from 'https://esm.sh/react@18.2.0';
import { Zone } from '../types.ts';
import { Landmark } from 'https://esm.sh/lucide-react@0.378.0';

interface ZoneListProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onZoneSelect: (zone: Zone) => void;
}

const ZoneList: React.FC<ZoneListProps> = ({ zones, selectedZoneId, onZoneSelect }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2 p-2">Zones</h2>
      {zones.length > 0 ? (
        <ul>
          {zones.map(zone => (
            <li
              key={zone.id}
              onClick={() => onZoneSelect(zone)}
              className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors duration-200 ${
                selectedZoneId === zone.id ? 'selected-item-secondary' : 'hoverable-item'
              }`}
            >
              <div className="w-10 h-10 flex items-center justify-center mr-3 text-2xl">
                 {zone.icon}
              </div>
              <div className="flex-grow">
                <p className="font-semibold">{zone.name}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-secondary-text-color text-center py-4">No zones created yet.</p>
      )}
    </div>
  );
};

export default ZoneList;
