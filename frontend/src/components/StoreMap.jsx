import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

const StoreMap = ({ lat, lng }) => {
  if (!lat || !lng) return null;
  return (
    <div className="w-full rounded-xl overflow-hidden border border-surface2" style={{ height: '200px' }}>
      <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} dragging={false}
        zoomControl={false} doubleClickZoom={false} touchZoom={false} attributionControl={false}
        style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={defaultIcon} />
      </MapContainer>
    </div>
  );
};

export default StoreMap;
