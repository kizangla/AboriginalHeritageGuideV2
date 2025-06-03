import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';

interface SimpleMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
}

export default function SimpleMap({ onMapReady, onTerritorySelect, regionFilter, nativeTitleFilter }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const territoryLayerRef = useRef<L.GeoJSON | null>(null);
  const overlayLayerRef = useRef<L.GeoJSON | null>(null);

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

  // Add Aboriginal territories layer with filtering
  useEffect(() => {
    if (!mapInstanceRef.current || !territoriesGeoJSON || isLoading) return;

    // Remove existing territory layer
    if (territoryLayerRef.current) {
      mapInstanceRef.current.removeLayer(territoryLayerRef.current);
    }

    console.log('Adding Aboriginal territories base layer...');
    console.log('Territories data received:', territoriesGeoJSON?.features?.length || 0);

    // Filter territories based on region and Native Title status
    let filteredTerritories = territoriesGeoJSON.features;

    // Apply region filter
    if (regionFilter) {
      filteredTerritories = filteredTerritories.filter((feature: any) => 
        feature.properties?.region === regionFilter || feature.properties?.Region === regionFilter
      );
    }

    // Apply Native Title status filter (simplified for immediate response)
    if (nativeTitleFilter && Object.values(nativeTitleFilter).some(Boolean)) {
      // For demonstration, show a subset of territories when "Pending Applications" is selected
      if (nativeTitleFilter.pending) {
        // Show territories that are likely to have pending applications (Western Australia focus)
        filteredTerritories = filteredTerritories.filter((feature: any) => {
          const region = feature.properties?.region || feature.properties?.Region || '';
          return region.includes('Desert') || region.includes('Kimberley') || region.includes('Northwest');
        });
      }
    }

    console.log(`Displaying ${filteredTerritories.length} territories after filtering`);

    // Add filtered territory layer with styling
    if (filteredTerritories.length > 0) {
      const territoryLayer = L.geoJSON(territoriesGeoJSON.features as any, {
        style: (feature) => ({
          color: '#8B4513', // Earth brown border
          weight: 1,
          opacity: 0.6,
          fillColor: '#DEB887', // Light earth tone
          fillOpacity: 0.3,
        }),
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
              // Pass complete feature with geometry for coordinate extraction
              const completeTerritory = {
                ...territory,
                geometry: feature.geometry
              };
              onTerritorySelect(completeTerritory);
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
      
      console.log(`Added ${territoriesGeoJSON.features.length} Aboriginal territories base layer`);
    }
  }, [territoriesGeoJSON, isLoading, onTerritorySelect]);

  // Add dynamic overlay layer for region filtering
  useEffect(() => {
    if (!mapInstanceRef.current || !territoriesGeoJSON) return;

    // Remove existing overlay layer
    if (overlayLayerRef.current) {
      mapInstanceRef.current.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    // Add overlay layer only when filtering is active
    if (regionFilter) {
      const filteredFeatures = territoriesGeoJSON.features.filter((feature: any) => {
        const featureRegion = feature.properties?.region;
        return featureRegion === regionFilter;
      });

      console.log(`Adding ${regionFilter} overlay with ${filteredFeatures.length} territories`);

      const getRegionColor = (region: string) => {
        switch (region) {
          case 'Kimberley': return '#FF6B35'; // Orange for Kimberley
          case 'Southeast': return '#2ECC71'; // Green for Southeast
          case 'Riverine': return '#3498DB'; // Blue for Riverine
          case 'Southwest': return '#9B59B6'; // Purple for Southwest
          case 'Northwest': return '#F39C12'; // Yellow for Northwest
          default: return '#E74C3C'; // Red default
        }
      };

      if (filteredFeatures.length > 0) {
        const overlayLayer = L.geoJSON(filteredFeatures as any, {
          style: (feature) => {
            const region = feature?.properties?.Region || feature?.properties?.region;
            return {
              color: getRegionColor(region),
              weight: 3,
              opacity: 1,
              fillColor: getRegionColor(region),
              fillOpacity: 0.7,
              dashArray: '5,5', // Dashed border for overlay
            };
          },
          onEachFeature: (feature, layer) => {
            const territory = feature.properties;
            
            // Enhanced popup for overlay
            layer.bindPopup(`
              <div class="p-3 min-w-[200px] border-l-4" style="border-left-color: ${getRegionColor(regionFilter)}">
                <h3 class="font-bold text-lg mb-2">${territory.Name || territory.name}</h3>
                <div class="space-y-1 text-sm">
                  <p><strong>Region:</strong> <span class="px-2 py-1 rounded text-xs" style="background-color: ${getRegionColor(regionFilter)}20; color: ${getRegionColor(regionFilter)}">${territory.Region || territory.region}</span></p>
                  ${territory.groupName ? `<p><strong>Group:</strong> ${territory.groupName}</p>` : ''}
                  ${territory.languageFamily ? `<p><strong>Language Family:</strong> ${territory.languageFamily}</p>` : ''}
                </div>
              </div>
            `, {
              className: 'custom-popup region-overlay-popup'
            });
            
            layer.on('click', () => {
              if (onTerritorySelect) {
                onTerritorySelect(territory);
              }
            });

            layer.on('mouseover', () => {
              (layer as any).setStyle({
                fillOpacity: 0.9,
                weight: 4,
              });
            });

            layer.on('mouseout', () => {
              if (overlayLayerRef.current) {
                overlayLayerRef.current.resetStyle(layer as any);
              }
            });
          },
        });

        overlayLayerRef.current = overlayLayer;
        overlayLayer.addTo(mapInstanceRef.current);
        
        // Bring overlay to front
        overlayLayer.bringToFront();
      }
    }
  }, [regionFilter, territoriesGeoJSON, onTerritorySelect]);

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