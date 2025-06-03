import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import type { Territory } from '@shared/schema';

interface SimpleMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
}

export default function SimpleMap({ onMapReady, onTerritorySelect, regionFilter }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const territoryLayerRef = useRef<L.GeoJSON | null>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
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
    console.log('Territories data received:', territoriesGeoJSON?.features?.length || 0);

    // Filter territories based on selected region
    let filteredFeatures = territoriesGeoJSON?.features || [];
    if (regionFilter) {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const featureRegion = feature.properties?.Region || feature.properties?.region;
        return featureRegion === regionFilter;
      });
    }

    console.log(`Displaying ${filteredFeatures.length} territories ${regionFilter ? `for ${regionFilter} region` : 'total'}`);

    // Add filtered territory layer
    if (filteredFeatures.length > 0) {
      const getRegionColor = (region: string) => {
        switch (region) {
          case 'Kimberley': return '#FF6B35'; // Orange for Kimberley
          case 'Southeast': return '#4ECDC4'; // Teal for Southeast
          case 'Riverine': return '#45B7D1'; // Blue for Riverine
          default: return '#e74c3c'; // Default red
        }
      };

      const territoryLayer = L.geoJSON(filteredFeatures as any, {
        style: (feature) => {
          const region = feature?.properties?.Region || feature?.properties?.region;
          return {
            color: getRegionColor(region),
            weight: regionFilter ? 3 : 2,
            opacity: regionFilter ? 1 : 0.8,
            fillOpacity: regionFilter ? 0.8 : 0.6,
          };
        },
        onEachFeature: (feature, layer) => {
          const territory = feature.properties;
          
          // Enhanced popup with new data structure
          layer.bindPopup(`
            <div class="p-3 min-w-[200px]">
              <h3 class="font-bold text-lg text-earth-brown mb-2">${territory.Name || territory.name}</h3>
              <div class="space-y-1 text-sm">
                <p><strong>Region:</strong> ${territory.Region || territory.region || 'Unknown'}</p>
                ${territory.groupName ? `<p><strong>Group:</strong> ${territory.groupName}</p>` : ''}
                ${territory.languageFamily ? `<p><strong>Language Family:</strong> ${territory.languageFamily}</p>` : ''}
                ${territory.regionType ? `<p><strong>Type:</strong> ${territory.regionType}</p>` : ''}
              </div>
            </div>
          `, {
            className: 'custom-popup'
          });
          
          layer.on('click', () => {
            if (onTerritorySelect) {
              onTerritorySelect(territory);
            }
          });

          layer.on('mouseover', () => {
            (layer as any).setStyle({
              fillOpacity: 0.8,
              weight: 3,
            });
          });

          layer.on('mouseout', () => {
            if (territoryLayerRef.current) {
              territoryLayerRef.current.resetStyle(layer as any);
            }
          });
        },
      });

      territoryLayerRef.current = territoryLayer;
      territoryLayer.addTo(mapInstanceRef.current);
      
      console.log(`Added ${filteredFeatures.length} Aboriginal territories`);
    }
  }, [territoriesGeoJSON, isLoading, onTerritorySelect, regionFilter]);

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