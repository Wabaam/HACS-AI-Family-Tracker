
import React from 'react';
import { Zone, ZoneEvent } from '../types';
import { LogIn, LogOut, History, Clock } from 'lucide-react';

interface ZonePanelProps {
  zone: Zone;
  events: ZoneEvent[];
}

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

const formatDuration = (milliseconds: number): string => {
    if (milliseconds < 0) return '0m';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    let result = '';
    if (days > 0) {
        result += `${days}d `;
    }
    if (hours > 0) {
        result += `${hours}h `;
    }
    if (minutes >= 0) {
        result += `${minutes % 60}m`;
    }

    return result.trim() || '0m';
};


const ZonePanel: React.FC<ZonePanelProps> = ({ zone, events }) => {
  const findDurationForExit = (exitEvent: ZoneEvent, allZoneEvents: ZoneEvent[]): string | null => {
    if (exitEvent.type !== 'exit') {
        return null;
    }

    const correspondingEntry = allZoneEvents.find(
        e =>
        e.userId === exitEvent.userId &&
        e.type === 'entry' &&
        e.timestamp < exitEvent.timestamp
    );

    if (!correspondingEntry) {
        return null;
    }

    const durationMs = exitEvent.timestamp.getTime() - correspondingEntry.timestamp.getTime();
    return formatDuration(durationMs);
  };


  return (
    <div className="ha-card flex flex-col h-full text-primary-text-color">
      <div className="p-4 border-b border-divider-color">
        <div className="flex items-center">
          <span className="text-4xl mr-4">{zone.icon}</span>
          <div>
            <h2 className="text-2xl font-bold">{zone.name}</h2>
            <p className="text-secondary-text-color">Event Log</p>
          </div>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto px-4 py-2">
        {events.length > 0 ? (
          <ul>
            {events.map(event => {
              const duration = findDurationForExit(event, events);
              return (
                <li key={event.id} className="flex items-center py-3 border-b border-divider-color/50 last:border-b-0">
                  <img src={event.userAvatar} alt={event.userName} className="w-10 h-10 rounded-full mr-3"/>
                  <div className="flex-grow">
                    <p className="font-semibold">
                      {event.userName}
                      <span className="font-normal text-secondary-text-color">
                        {event.type === 'entry' ? ' arrived' : ' departed'}
                      </span>
                    </p>
                    <div className="flex items-center text-xs text-secondary-text-color mt-1">
                      <span>{formatTimeAgo(event.timestamp)}</span>
                      {duration && (
                          <>
                              <span className="mx-1.5" aria-hidden="true">&middot;</span>
                              <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span>{duration} at location</span>
                          </>
                      )}
                    </div>
                  </div>
                  {event.type === 'entry' ? (
                    <LogIn className="w-5 h-5 text-green-500" />
                  ) : (
                    <LogOut className="w-5 h-5 text-red-500" />
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-center text-gray-500 mt-10 p-4">
            <History className="w-12 h-12 mx-auto text-gray-600 mb-2" />
            <p>No recent events for {zone.name}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZonePanel;
