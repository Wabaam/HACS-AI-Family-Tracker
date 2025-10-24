
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { User, Zone } from '../types';

// Fix for default marker icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createAvatarIcon = (avatarUrl: string, isSelected: boolean) => {
  const borderStyle = isSelected ? 'border: 3px solid #3b82f6;' : 'border: 2px solid #6b7280;';
  return L.divIcon({
    html: `<img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; ${borderStyle} box-shadow: 0 2px 5px rgba(0,0,0,0.5);" />`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

interface MapEventsProps {
  zoneEditorMode: 'add' | 'edit' | null;
  onMapClickForZone: (latlng: L.LatLng) => void;
}

const MapEvents: React.FC<MapEventsProps> = ({ zoneEditorMode, onMapClickForZone }) => {
  useMapEvents({
    click(e) {
      if (zoneEditorMode === 'add') {
        onMapClickForZone(e.latlng);
      }
    },
  });
  return null;
};

interface MapUpdaterProps {
  selectedUser: User | null;
  selectedZone: Zone | null;
  zoneEditorMode: 'add' | 'edit' | null;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ selectedUser, selectedZone, zoneEditorMode }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedUser) {
      map.flyTo([selectedUser.location.lat, selectedUser.location.lng], map.getZoom(), {
        animate: true,
        duration: 1,
      });
    }
  }, [selectedUser, map]);

  useEffect(() => {
    if (selectedZone) {
      map.flyTo([selectedZone.location.lat, selectedZone.location.lng], 15, { // Zoom in closer for zones
        animate: true,
        duration: 1,
      });
    }
  }, [selectedZone, map]);

  useEffect(() => {
    const mapContainer = map.getContainer() as HTMLElement;
    if (mapContainer) {
      mapContainer.style.cursor = zoneEditorMode === 'add' ? 'crosshair' : '';
    }
  }, [zoneEditorMode, map]);

  return null;
};

interface MapComponentProps {
  users: User[];
  zones: Zone[];
  onUserSelect: (user: User) => void;
  selectedUser: User | null;
  selectedZone: Zone | null;
  zoneEditorMode: 'add' | 'edit' | null;
  onMapClickForZone: (latlng: L.LatLng) => void;
  onSelectZoneForEdit: (zone: Zone) => void;
  editingZonePreview: {
    id?: string;
    location: L.LatLng | null;
    radius: number;
  };
  onEditingZoneLocationChange: (latlng: L.LatLng) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  users, zones, onUserSelect, selectedUser, selectedZone,
  zoneEditorMode, onMapClickForZone, onSelectZoneForEdit, editingZonePreview, onEditingZoneLocationChange 
}) => {
  const mapRef = useRef<L.Map>(null);

  const center: L.LatLngExpression = [34.0522, -118.2437]; // Default center (Los Angeles)

  return (
    <MapContainer center={center} zoom={13} ref={mapRef} className="h-full w-full">
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {zones.map(zone => {
        const isEditing = editingZonePreview.id === zone.id;
        const isSelected = selectedZone?.id === zone.id;
        const color = isEditing ? '#fb923c' : (isSelected ? '#a855f7' : '#3b82f6');
        
        return (
          <Circle
            key={zone.id}
            center={[zone.location.lat, zone.location.lng]}
            radius={zone.radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isSelected || isEditing ? 0.3 : 0.2,
              weight: isSelected || isEditing ? 3 : 2
            }}
            eventHandlers={{
              click: () => onSelectZoneForEdit(zone),
            }}
          >
            <Popup>{zone.icon} {zone.name}</Popup>
          </Circle>
        )
      })}
      {users.map(user => (
        <Marker
          key={user.id}
          position={[user.location.lat, user.location.lng]}
          icon={createAvatarIcon(user.avatar, selectedUser?.id === user.id)}
          eventHandlers={{
            click: () => onUserSelect(user),
          }}
        >
          <Popup>
            <div className="text-center font-bold">{user.name}</div>
            <div>{user.status} {user.speed > 0 ? `(${user.speed} mph)` : ''}</div>
          </Popup>
        </Marker>
      ))}

      {editingZonePreview.location && (
        <>
          <Marker 
            position={editingZonePreview.location}
            draggable={zoneEditorMode === 'edit'}
            eventHandlers={{
              drag: (e) => {
                if (zoneEditorMode === 'edit') {
                  onEditingZoneLocationChange(e.target.getLatLng());
                }
              }
            }}
           />
          <Circle
            center={editingZonePreview.location}
            radius={editingZonePreview.radius}
            pathOptions={{ color: '#fb923c', fillColor: '#fb923c', fillOpacity: 0.4 }}
          />
        </>
      )}

      <MapEvents zoneEditorMode={zoneEditorMode} onMapClickForZone={onMapClickForZone} />
      <MapUpdater selectedUser={selectedUser} selectedZone={selectedZone} zoneEditorMode={zoneEditorMode} />
    </MapContainer>
  );
};

export default MapComponent;
