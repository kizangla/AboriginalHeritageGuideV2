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
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([-25.2744, 133.7751], 5);
    mapInstanceRef.current = map;
    onMapReady(map);

    // Use Mapbox for high-quality map tiles
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'your-mapbox-token';
    const tileLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 18,
    });
    
    tileLayer.addTo(map);
    
    // Force a redraw after a short delay
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onMapReady]);

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
    <div 
      ref={mapRef} 
      className="h-[calc(100vh-80px)] bg-blue-50"
      style={{ zIndex: 1 }}
    />
  );
}
