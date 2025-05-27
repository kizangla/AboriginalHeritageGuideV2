import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface SimpleMapProps {
  onMapReady?: (map: L.Map) => void;
}

export default function SimpleMap({ onMapReady }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('SimpleMap: Creating map...');
    
    const map = L.map(mapRef.current).setView([-25.2744, 133.7751], 5);
    mapInstanceRef.current = map;

    // Add basic tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Add test marker
    L.marker([-25.2744, 133.7751])
      .addTo(map)
      .bindPopup('🎯 SIMPLE MAP WORKING!')
      .openPopup();

    // Add test circle
    L.circle([-25.2744, 133.7751], {
      color: 'blue',
      fillColor: '#30f',
      fillOpacity: 0.3,
      radius: 300000
    }).addTo(map);

    if (onMapReady) {
      onMapReady(map);
    }

    console.log('SimpleMap: Map created successfully');

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onMapReady]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef} 
        className="w-full h-full border-4 border-green-500"
        style={{ minHeight: '400px' }}
      />
      <div className="absolute top-2 left-2 bg-green-200 p-2 rounded text-sm font-bold">
        SIMPLE MAP: {mapInstanceRef.current ? '✅ ACTIVE' : '❌ MISSING'}
      </div>
    </div>
  );
}