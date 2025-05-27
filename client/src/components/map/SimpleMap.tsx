import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import type { Territory } from '@shared/schema';

interface SimpleMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
}

export default function SimpleMap({ onMapReady, onTerritorySelect }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const territoryLayerRef = useRef<L.GeoJSON | null>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery({
    queryKey: ['/api/territories'],
  });

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

  // Add Aboriginal territories
  useEffect(() => {
    if (!mapInstanceRef.current || !territoriesGeoJSON || isLoading) return;

    // Remove existing territory layer
    if (territoryLayerRef.current) {
      mapInstanceRef.current.removeLayer(territoryLayerRef.current);
    }

    console.log('Adding Aboriginal territories to map...');

    // Add Australia territory layer
    if (territoriesGeoJSON && territoriesGeoJSON.features) {
      const territoryLayer = L.geoJSON(territoriesGeoJSON, {
        style: (feature) => ({
          color: feature?.properties?.color || '#e74c3c',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.6,
        }),
        onEachFeature: (feature, layer) => {
          const territory = feature.properties;
          layer.on('click', () => {
            if (onTerritorySelect) {
              onTerritorySelect(territory);
            }
          });

          layer.on('mouseover', () => {
            layer.setStyle({
              fillOpacity: 0.8,
              weight: 3,
            });
          });

          layer.on('mouseout', () => {
            if (territoryLayerRef.current) {
              territoryLayerRef.current.resetStyle(layer);
            }
          });
        },
      });

      territoryLayerRef.current = territoryLayer;
      territoryLayer.addTo(mapInstanceRef.current);
      
      console.log(`Added ${territoriesGeoJSON.features.length} Aboriginal territories`);
    }
  }, [territoriesGeoJSON, isLoading, onTerritorySelect]);

  return (
    <div className="relative w-full h-[calc(100vh-80px)]">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
}