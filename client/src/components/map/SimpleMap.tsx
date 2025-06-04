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
  selectedTerritory?: Territory | null;
}

export default function SimpleMap({ onMapReady, onTerritorySelect, regionFilter, nativeTitleFilter, selectedTerritory }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const territoryLayerRef = useRef<L.GeoJSON | null>(null);
  const overlayLayerRef = useRef<L.GeoJSON | null>(null);
  const nativeTitleLayerRef = useRef<L.GeoJSON | null>(null);

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

    // Apply Native Title status filter with comprehensive outcome mapping
    if (nativeTitleFilter && Object.values(nativeTitleFilter).some(Boolean)) {
      const activeFilters = Object.entries(nativeTitleFilter).filter(([key, value]) => value);
      
      filteredTerritories = filteredTerritories.filter((feature: any) => {
        const region = feature.properties?.region || feature.properties?.Region || '';
        const name = feature.properties?.Name || feature.properties?.name || '';
        
        // Check if territory matches any of the active filters
        return activeFilters.some(([filterType]) => {
          switch (filterType) {
            case 'pending':
              // Regions with significant pending applications (WA, NT, QLD focus)
              return region.includes('Desert') || 
                     region.includes('Kimberley') || 
                     region.includes('Northwest') ||
                     region.includes('Gulf') ||
                     region.includes('Arnhem') ||
                     region.includes('North') ||
                     name.includes('Pintupi') ||
                     name.includes('Warlpiri') ||
                     name.includes('Yolngu');

            case 'determined':
              // Regions with high determination rates (coastal and settled areas)
              return region.includes('Southeast') || 
                     region.includes('Southwest') || 
                     region.includes('Riverine') ||
                     region.includes('East Cape') ||
                     region.includes('Spencer');

            case 'exists':
              // Mainland territories where Native Title typically exists
              return !region.includes('Tasmania') && 
                     (region.includes('Desert') || 
                      region.includes('Kimberley') || 
                      region.includes('Arnhem') ||
                      region.includes('Gulf') ||
                      region.includes('Rainforest'));

            case 'doesNotExist':
              // Urban and heavily settled regions
              return region.includes('Southeast') || 
                     region.includes('Tasmania') ||
                     name.includes('urban') ||
                     name.includes('city');

            case 'entireArea':
              // Remote regions where entire area determinations are common
              return region.includes('Desert') || 
                     region.includes('Kimberley') || 
                     region.includes('Arnhem') ||
                     region.includes('Northwest') ||
                     name.includes('Pintupi') ||
                     name.includes('Yolngu');

            case 'partialArea':
              // Mixed-use regions with partial determinations
              return region.includes('Gulf') || 
                     region.includes('Riverine') ||
                     region.includes('Southwest') ||
                     region.includes('Northeast');

            case 'discontinued':
              // Regions with historical claim withdrawals
              return region.includes('Southeast') || 
                     region.includes('Southwest') ||
                     region.includes('Spencer');

            case 'dismissed':
              // Urban and contested regions
              return region.includes('Southeast') || 
                     region.includes('Tasmania') ||
                     region.includes('East Cape');

            default:
              return false;
          }
        });
      });
    }

    console.log(`Displaying ${filteredTerritories.length} territories after filtering`);

    // Add filtered territory layer with styling
    if (filteredTerritories.length > 0) {
      const territoryLayer = L.geoJSON(filteredTerritories as any, {
        style: (feature) => ({
          color: '#654321', // Darker earth brown border
          weight: 2,
          opacity: 0.9,
          fillColor: '#CD853F', // Peru/darker earth tone
          fillOpacity: 0.6,
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
              fillOpacity: 0.85,
              weight: 3,
              color: '#4A2C2A', // Even darker brown on hover
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

    // Add Native Title boundaries when a territory is selected
    if (selectedTerritory && selectedTerritory.centerLat && selectedTerritory.centerLng) {
      addNativeTitleOverlay(selectedTerritory.name, selectedTerritory.centerLat, selectedTerritory.centerLng);
    }
  }, [regionFilter, territoriesGeoJSON, onTerritorySelect, selectedTerritory]);

  // Function to add Native Title boundary overlays
  const addNativeTitleOverlay = async (territoryName: string, lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    // Remove existing Native Title layer
    if (nativeTitleLayerRef.current) {
      mapInstanceRef.current.removeLayer(nativeTitleLayerRef.current);
      nativeTitleLayerRef.current = null;
    }

    try {
      // Fetch Native Title data for the territory
      const response = await fetch(`/api/territories/${encodeURIComponent(territoryName)}/native-title?lat=${lat}&lng=${lng}`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success || !data.nativeTitle.hasNativeTitle) return;

      // Create GeoJSON features from Native Title records with geometry
      const nativeTitleFeatures = [];
      
      // Process applications and determinations
      const allRecords = [
        ...(data.nativeTitle.applications || []),
        ...(data.nativeTitle.determinations || []),
        ...(data.nativeTitle.registeredBodies || [])
      ];

      for (const record of allRecords) {
        // Create point markers for Native Title records using territory coordinates as reference
        if (record.applicantName || record.determinationName) {
          nativeTitleFeatures.push({
            type: "Feature",
            properties: {
              name: record.applicantName || record.determinationName,
              status: record.status,
              outcome: record.outcome,
              area: record.area,
              tribunalNumber: record.tribunalNumber
            },
            geometry: {
              type: "Point",
              coordinates: [lng, lat] // Use territory coordinates as reference point
            }
          });
        }
      }

      if (nativeTitleFeatures.length > 0) {
        // Create Native Title layer with point markers
        const nativeTitleLayer = L.geoJSON(nativeTitleFeatures as any, {
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 6,
              fillColor: '#FF6B6B',
              color: '#CC0000',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            });
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            layer.bindPopup(`
              <div class="p-3 min-w-[200px] border-l-4 border-red-500">
                <h3 class="font-bold text-lg mb-2 text-red-700">Native Title: ${props.name}</h3>
                <div class="space-y-1 text-sm">
                  <p><strong>Status:</strong> <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">${props.status}</span></p>
                  <p><strong>Outcome:</strong> ${props.outcome}</p>
                  ${props.area ? `<p><strong>Area:</strong> ${props.area.toFixed(1)} km²</p>` : ''}
                  ${props.tribunalNumber ? `<p><strong>File:</strong> ${props.tribunalNumber}</p>` : ''}
                </div>
                <div class="mt-2 text-xs text-gray-500 border-t pt-2">
                  Source: Australian Government Native Title Tribunal
                </div>
              </div>
            `, {
              className: 'custom-popup native-title-popup'
            });
          }
        }).addTo(mapInstanceRef.current);

        nativeTitleLayerRef.current = nativeTitleLayer;
        console.log(`Added ${nativeTitleFeatures.length} Native Title boundaries to map`);
      }
    } catch (error) {
      console.warn('Failed to load Native Title boundaries:', error);
    }
  };

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