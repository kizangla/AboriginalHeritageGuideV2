import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Territory } from '@shared/schema';

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface InteractiveMapProps {
  onTerritorySelect: (territory: Territory) => void;
  onMapReady: (map: L.Map) => void;
}

export default function InteractiveMap({ onTerritorySelect, onMapReady }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const territoryLayerRef = useRef<L.GeoJSON | null>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery({
    queryKey: ['/api/territories'],
  });

  useEffect(() => {
    if (!mapRef.current) return;
    
    // Clear any existing map first
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      console.log('Creating map instance...');
      
      // Force container to be ready
      const container = mapRef.current;
      container.innerHTML = ''; // Clear any existing content
      
      // Initialize map with explicit options
      const map = L.map(container, {
        center: [-25.2744, 133.7751],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: false
      });
      
      // Store reference immediately
      mapInstanceRef.current = map;
      onMapReady(map);

      // Add very simple tile layer first
      console.log('Adding basic tiles...');
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      });
      
      tileLayer.addTo(map);
      
      // Add visible test elements
      console.log('Adding test marker...');
      const marker = L.marker([-25.2744, 133.7751])
        .addTo(map)
        .bindPopup('🗺️ MAP IS WORKING! Your Aboriginal territories will appear here.')
        .openPopup();
        
      // Add test circle to show map is interactive
      const circle = L.circle([-25.2744, 133.7751], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 500000
      }).addTo(map);

      // Force map to render properly
      setTimeout(() => {
        map.invalidateSize();
        console.log('Map size invalidated and forced refresh');
      }, 100);

      console.log('Map initialization complete');

    } catch (error) {
      console.error('Map initialization failed:', error);
    }

    // Don't cleanup on every render - only on unmount
  }, []); // Empty dependency array

  useEffect(() => {
    if (!mapInstanceRef.current || !territoriesGeoJSON || isLoading) return;

    // Remove existing territory layer
    if (territoryLayerRef.current) {
      mapInstanceRef.current.removeLayer(territoryLayerRef.current);
    }

    // Add territory layer
    territoryLayerRef.current = L.geoJSON(territoriesGeoJSON, {
      style: (feature) => ({
        fillColor: feature?.properties.color || '#E74C3C',
        weight: 2,
        opacity: 1,
        color: '#8B4513',
        dashArray: '3',
        fillOpacity: 0.7,
      }),
      onEachFeature: (feature, layer) => {
        // Add click event handler
        layer.on('click', async () => {
          try {
            const response = await fetch(`/api/territories/${feature.properties.id}`);
            if (response.ok) {
              const territory = await response.json();
              onTerritorySelect(territory);
            }
          } catch (error) {
            console.error('Failed to fetch territory details:', error);
          }
        });

        // Add hover effects
        layer.on('mouseover', () => {
          layer.setStyle({
            weight: 3,
            color: '#DAA520',
            dashArray: '',
            fillOpacity: 0.8,
          });
        });

        layer.on('mouseout', () => {
          if (territoryLayerRef.current) {
            territoryLayerRef.current.resetStyle(layer as L.Path);
          }
        });

        // Bind popup
        layer.bindPopup(`
          <div class="p-4 min-w-[200px]">
            <h3 class="font-serif font-bold text-earth-brown mb-2">${feature.properties.name}</h3>
            <div class="space-y-1 text-sm">
              <p><strong>Group:</strong> ${feature.properties.groupName}</p>
              <p><strong>Language:</strong> ${feature.properties.languageFamily}</p>
              <p><strong>Region:</strong> ${feature.properties.region}</p>
            </div>
          </div>
        `, {
          className: 'custom-popup'
        });
      },
    }).addTo(mapInstanceRef.current);

  }, [territoriesGeoJSON, isLoading, onTerritorySelect]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-80px)] bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-earth-brown mx-auto mb-4"></div>
          <p className="text-earth-dark">Loading territories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-80px)]">
      <div 
        ref={mapRef} 
        className="w-full h-full border-4 border-blue-600"
        style={{ 
          zIndex: 1,
          backgroundColor: '#e8f4f8',
          minHeight: '500px',
          position: 'relative'
        }}
        id="map-container"
      />
      <div className="absolute top-4 left-4 bg-yellow-300 p-3 rounded shadow z-50 text-sm font-bold border-2 border-black">
        DEBUG: {mapInstanceRef.current ? '✅ MAP ACTIVE' : '❌ NO MAP'} | Data: {territoriesGeoJSON ? '✅ LOADED' : '❌ MISSING'}
      </div>
      {!mapInstanceRef.current && (
        <div className="absolute inset-0 bg-red-100 border-4 border-red-500 flex items-center justify-center z-40">
          <div className="text-center p-4 bg-red-200 rounded">
            <h2 className="text-xl font-bold text-red-800">MAP NOT LOADING</h2>
            <p className="text-red-700">Container visible but map instance missing</p>
          </div>
        </div>
      )}
    </div>
  );
}
