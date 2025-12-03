import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';
import { dataOptimizationService } from '@/lib/data-optimization';
import EnhancedBusinessMarkers from './EnhancedBusinessMarkers';
import EnhancedMiningOverlay from './EnhancedMiningOverlay';
import ExplorationOverlay from './ExplorationOverlay';
import NationalMiningOverlay from './NationalMiningOverlay';
import MapLoadingIndicator from './MapLoadingIndicator';
import { MiningFilterPanel, type MiningFilters } from './MiningFilterPanel';
import { DataFreshnessIndicator } from './DataFreshnessIndicator';
import { SaveShareMapView } from './SaveShareMapView';
import { MapStateManager, type MapState } from '@/lib/map-state-manager';
import { MobileMapControls } from './MobileMapControls';
import { MobileLayerControl } from './MobileLayerControl';
import { SearchAutocomplete } from './SearchAutocomplete';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface SimpleMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
  selectedTerritory?: Territory | null;
  showRATSIBBoundaries?: boolean;
  businessSearchQuery?: string;
  onBusinessSelect?: (business: any) => void;
  showMining?: boolean;
  showExploration?: boolean;
}

export default function SimpleMap({ onMapReady, onTerritorySelect, regionFilter, nativeTitleFilter, selectedTerritory, showRATSIBBoundaries = true, businessSearchQuery, onBusinessSelect, showMining = false, showExploration = false }: SimpleMapProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const territoryLayerRef = useRef<L.GeoJSON | null>(null);
  const overlayLayerRef = useRef<L.GeoJSON | null>(null);
  const nativeTitleLayerRef = useRef<L.GeoJSON | null>(null);
  const ratsibLayerRef = useRef<L.GeoJSON | null>(null);
  const [loadingState, setLoadingState] = useState<{
    isLoading: boolean;
    progress?: number;
    message?: string;
  }>({ isLoading: false });
  const [showMiningFilters, setShowMiningFilters] = useState(false);
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [miningFilters, setMiningFilters] = useState<MiningFilters>({
    tenementTypes: [],
    status: [],
    holders: [],
    mineralTypes: [],
    majorCompaniesOnly: false,
    areaRange: { min: 0, max: 100000 },
    dateRange: { start: '', end: '' },
    search: ''
  });
  
  // Track all layer states for save/share functionality
  const [layers, setLayers] = useState({
    territories: true,
    nativeTitle: false,
    ratsib: showRATSIBBoundaries,
    mining: showMining,
    exploration: showExploration,
    nationalMining: false,
    businesses: false
  });
  
  // Update layers when props change
  useEffect(() => {
    setLayers(prev => ({
      ...prev,
      ratsib: showRATSIBBoundaries,
      mining: showMining,
      exploration: showExploration
    }));
  }, [showRATSIBBoundaries, showMining, showExploration]);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Handler to load a saved map view
  const handleLoadView = (state: MapState) => {
    if (!mapInstanceRef.current) return;

    // Set map center and zoom
    mapInstanceRef.current.setView([state.center.lat, state.center.lng], state.zoom);

    // Update layers
    setLayers(state.layers);

    // Update filters
    if (state.filters.mining) {
      setMiningFilters(state.filters.mining);
    }

    toast({
      title: "View Loaded",
      description: state.name || "Map view has been restored successfully.",
    });
  };

  // Handler for layer toggle from mobile controls
  const handleLayerToggle = (layerId: string, enabled: boolean) => {
    setLayers(prev => ({ ...prev, [layerId]: enabled }));
  };

  // Handler for layer opacity change
  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    // This would need to be implemented with actual layer opacity control
    console.log(`Setting ${layerId} opacity to ${opacity}%`);
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('SimpleMap: Creating map...');
    
    const map = L.map(mapRef.current, {
      zoomControl: false  // Disable default left-side zoom control, using custom controls on right
    }).setView([-25.2744, 133.7751], 5);
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

      // Load RATSIB boundaries from Australian Government data if filter is enabled
      if (showRATSIBBoundaries) {
        await loadRATSIBBoundaries(lat, lng, territoryName);
      }
    } catch (error) {
      console.warn('Failed to load Native Title boundaries:', error);
    }
  };

  const loadRATSIBBoundaries = async (lat: number, lng: number, territoryName: string) => {
    try {
      console.log(`Fetching RATSIB boundaries for ${territoryName} from Australian Government...`);
      
      // Use our backend API to fetch RATSIB boundaries
      const response = await fetch(`/api/territories/${encodeURIComponent(territoryName)}/ratsib?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        console.warn('Failed to fetch RATSIB boundaries:', response.status);
        return;
      }
      
      const data = await response.json();
      if (!data.success || !data.ratsib.boundaries || data.ratsib.boundaries.length === 0) {
        console.log('No RATSIB boundaries found for this region');
        return;
      }

      // Create GeoJSON features from RATSIB boundaries preserving all original properties
      const ratsibFeatures = data.ratsib.boundaries.map((boundary: any) => ({
        type: "Feature",
        properties: boundary.originalProperties || {
          id: boundary.id,
          name: boundary.name,
          org: boundary.organizationName,
          ratsibtype: boundary.corporationType,
          legisauth: boundary.legislativeAuthority,
          ratsiblink: boundary.website,
          status: boundary.status,
          abn: boundary.abn,
          address: boundary.address,
          contact: boundary.contact
        },
        geometry: boundary.geometry || {
          type: "Point",
          coordinates: [lng, lat] // Fallback to territory center if no geometry
        }
      }));

      // Create RATSIB layer with boundary polygons
      const ratsibLayer = L.geoJSON({ type: "FeatureCollection", features: ratsibFeatures } as any, {
        style: (feature) => ({
          color: '#8B5CF6',
          weight: 2,
          opacity: 0.8,
          fillColor: '#8B5CF6',
          fillOpacity: 0.1
        }),
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: '#8B5CF6',
            color: '#7C3AED',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div class="p-3 min-w-[250px] border-l-4 border-purple-500">
              <h3 class="font-bold text-lg mb-2 text-purple-700">${props.name || props.org || 'Aboriginal Corporation'}</h3>
              <div class="space-y-2 text-sm">
                ${props.org ? `<p><strong>Organization:</strong> ${props.org}</p>` : ''}
                ${props.name ? `<p><strong>Name:</strong> ${props.name}</p>` : ''}
                ${props.ratsibtype ? `<p><strong>Type:</strong> <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">${props.ratsibtype}</span></p>` : ''}
                ${props.legisauth ? `<p><strong>Legislative Authority:</strong> <span class="text-xs">${props.legisauth}</span></p>` : ''}
                ${props.ratsiblink ? `<p><strong>Website:</strong> <a href="${props.ratsiblink}" target="_blank" class="text-purple-600 hover:text-purple-800 underline text-xs">${props.ratsiblink}</a></p>` : ''}
                ${props.status ? `<p><strong>Status:</strong> ${props.status}</p>` : ''}
                ${props.abn ? `<p><strong>ABN:</strong> ${props.abn}</p>` : ''}
                ${props.address ? `<p><strong>Address:</strong> ${props.address}</p>` : ''}
              </div>
              <div class="mt-2 text-xs text-gray-500 border-t pt-2">
                Source: Australian Government RATSIB Register
              </div>
            </div>
          `, {
            className: 'custom-popup ratsib-popup'
          });
        }
      }).addTo(mapInstanceRef.current!);

      ratsibLayerRef.current = ratsibLayer;
      console.log(`Added ${data.ratsib.boundaries.length} RATSIB boundaries to map for ${territoryName}`);
    } catch (error) {
      console.warn('Failed to load RATSIB boundaries:', error);
    }
  };

  // Load RATSIB boundaries for current map view with optimization
  const loadRATSIBForMapView = async () => {
    if (!mapInstanceRef.current || !showRATSIBBoundaries) return;

    const center = mapInstanceRef.current.getCenter();
    const bounds = mapInstanceRef.current.getBounds();
    
    try {
      console.log('Loading RATSIB boundaries for map view...');
      
      // Use optimized fetch with caching and deduplication
      const data = await dataOptimizationService.optimizedFetch(
        `/api/territories/map-view/ratsib?lat=${center.lat}&lng=${center.lng}`
      );
      
      // Start prefetching nearby areas for smoother navigation
      dataOptimizationService.prefetchNearbyRATSIB(center.lat, center.lng);
      if (!data.success || !data.ratsib.boundaries || data.ratsib.boundaries.length === 0) {
        console.log('No RATSIB boundaries found for current map view');
        return;
      }

      // Remove existing RATSIB layer
      if (ratsibLayerRef.current) {
        mapInstanceRef.current.removeLayer(ratsibLayerRef.current);
        ratsibLayerRef.current = null;
      }

      // Create GeoJSON features from RATSIB boundaries
      const ratsibFeatures = data.ratsib.boundaries.map((boundary: any) => ({
        type: "Feature",
        properties: {
          id: boundary.id,
          name: boundary.name,
          organizationName: boundary.organizationName,
          corporationType: boundary.corporationType,
          legislativeAuthority: boundary.legislativeAuthority,
          website: boundary.website,
          jurisdiction: boundary.jurisdiction,
          status: boundary.status,
          registrationDate: boundary.registrationDate,
          // Also include original properties for fallback
          ...boundary.originalProperties
        },
        geometry: boundary.geometry || {
          type: "Point",
          coordinates: [center.lng, center.lat]
        }
      }));

      // Create RATSIB layer
      const ratsibLayer = L.geoJSON({ type: "FeatureCollection", features: ratsibFeatures } as any, {
        style: (feature) => ({
          color: '#8B5CF6',
          weight: 2,
          opacity: 0.8,
          fillColor: '#8B5CF6',
          fillOpacity: 0.1
        }),
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: '#8B5CF6',
            color: '#7C3AED',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div class="p-3 min-w-[280px] border-l-4 border-purple-500">
              <h3 class="font-bold text-lg mb-2 text-purple-700">${props.ORG || props.organizationName || 'Aboriginal Organization'}</h3>
              <div class="space-y-2 text-sm">
                ${props.NAME || props.name ? `<p><strong>Territory:</strong> ${props.NAME || props.name}</p>` : ''}
                ${props.RATSIBTYPE || props.corporationType ? `<p><strong>Type:</strong> <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">${props.RATSIBTYPE || props.corporationType}</span></p>` : ''}
                ${props.JURIS || props.jurisdiction ? `<p><strong>Jurisdiction:</strong> <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">${props.JURIS || props.jurisdiction}</span></p>` : ''}
                ${props.LEGISAUTH || props.legislativeAuthority ? `<p><strong>Legislative Authority:</strong> <span class="text-xs text-gray-600">${props.LEGISAUTH || props.legislativeAuthority}</span></p>` : ''}
                ${props.RATSIBLINK || props.website ? `<p><strong>Website:</strong> <a href="${props.RATSIBLINK || props.website}" target="_blank" class="text-purple-600 hover:text-purple-800 underline text-xs break-all">${props.RATSIBLINK || props.website}</a></p>` : ''}
                ${props.COMMENTS || props.status ? `<p><strong>Status:</strong> <span class="text-xs">${props.COMMENTS || props.status}</span></p>` : ''}
                ${props.ID || props.id ? `<p><strong>RATSIB ID:</strong> ${props.ID || props.id}</p>` : ''}
                ${props.DT_EXTRACT || props.registrationDate ? `<p><strong>Last Updated:</strong> <span class="text-xs">${new Date(props.DT_EXTRACT || props.registrationDate).toLocaleDateString()}</span></p>` : ''}
              </div>
              <div class="mt-3 text-xs text-gray-500 border-t pt-2">
                <strong>Source:</strong> Australian Government RATSIB Register<br>
                <span class="text-xs">Registered Aboriginal and Torres Strait Islander Bodies</span>
              </div>
            </div>
          `, {
            className: 'custom-popup ratsib-popup',
            maxWidth: 320
          });
        }
      }).addTo(mapInstanceRef.current);

      ratsibLayerRef.current = ratsibLayer;
      console.log(`Added ${data.ratsib.boundaries.length} RATSIB boundaries to map view`);
    } catch (error) {
      console.warn('Failed to load RATSIB boundaries for map view:', error);
    }
  };

  // Load all RATSIB boundaries across Australia
  const loadAllRATSIBBoundaries = async () => {
    if (!mapInstanceRef.current || !showRATSIBBoundaries) return;

    try {
      console.log('Loading all RATSIB boundaries across Australia...');
      
      // Remove existing RATSIB layer
      if (ratsibLayerRef.current) {
        mapInstanceRef.current.removeLayer(ratsibLayerRef.current);
        ratsibLayerRef.current = null;
      }

      // Fetch all RATSIB boundaries from Australian Government
      const response = await fetch('/api/ratsib/all-boundaries');
      if (!response.ok) {
        console.warn('Failed to fetch all RATSIB boundaries:', response.status);
        return;
      }
      
      const data = await response.json();
      if (!data.success || !data.ratsib.boundaries || data.ratsib.boundaries.length === 0) {
        console.log('No RATSIB boundaries found');
        return;
      }

      // Create GeoJSON features from all RATSIB boundaries
      const ratsibFeatures = data.ratsib.boundaries.map((boundary: any) => ({
        type: "Feature",
        properties: {
          id: boundary.id,
          name: boundary.name,
          organizationName: boundary.organizationName,
          corporationType: boundary.corporationType,
          legislativeAuthority: boundary.legislativeAuthority,
          website: boundary.website,
          jurisdiction: boundary.jurisdiction,
          status: boundary.status,
          registrationDate: boundary.registrationDate,
          // Also include original properties for fallback
          ...boundary.originalProperties
        },
        geometry: boundary.geometry
      }));

      // Create RATSIB layer for all boundaries
      const ratsibLayer = L.geoJSON({ type: "FeatureCollection", features: ratsibFeatures } as any, {
        style: (feature) => ({
          color: '#8B5CF6',
          weight: 2,
          opacity: 0.8,
          fillColor: '#8B5CF6',
          fillOpacity: 0.1
        }),
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: '#8B5CF6',
            color: '#7C3AED',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div class="p-3 min-w-[280px] border-l-4 border-purple-500">
              <h3 class="font-bold text-lg mb-2 text-purple-700">${props.ORG || props.organizationName || 'Aboriginal Organization'}</h3>
              <div class="space-y-2 text-sm">
                ${props.NAME || props.name ? `<p><strong>Territory:</strong> ${props.NAME || props.name}</p>` : ''}
                ${props.RATSIBTYPE || props.corporationType ? `<p><strong>Type:</strong> <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">${props.RATSIBTYPE || props.corporationType}</span></p>` : ''}
                ${props.JURIS || props.jurisdiction ? `<p><strong>Jurisdiction:</strong> <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">${props.JURIS || props.jurisdiction}</span></p>` : ''}
                ${props.LEGISAUTH || props.legislativeAuthority ? `<p><strong>Authority:</strong> <span class="text-xs">${props.LEGISAUTH || props.legislativeAuthority}</span></p>` : ''}
                ${props.RATSIBLINK || props.website ? `<p><strong>Website:</strong> <a href="${props.RATSIBLINK || props.website}" target="_blank" class="text-purple-600 hover:text-purple-800 underline text-xs">${props.RATSIBLINK || props.website}</a></p>` : ''}
              </div>
              <div class="mt-2 text-xs text-gray-500 border-t pt-2">
                Source: Australian Government RATSIB Register
              </div>
            </div>
          `, {
            className: 'custom-popup ratsib-popup',
            maxWidth: 320
          });
        }
      }).addTo(mapInstanceRef.current);

      ratsibLayerRef.current = ratsibLayer;
      console.log(`Added ${data.ratsib.boundaries.length} RATSIB boundaries across Australia`);
    } catch (error) {
      console.warn('Failed to load all RATSIB boundaries:', error);
    }
  };

  // Effect to handle RATSIB boundaries toggle
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!showRATSIBBoundaries && ratsibLayerRef.current) {
      // Remove RATSIB layer when filter is disabled
      mapInstanceRef.current.removeLayer(ratsibLayerRef.current);
      ratsibLayerRef.current = null;
      console.log('RATSIB boundaries hidden');
    } else if (showRATSIBBoundaries && !ratsibLayerRef.current) {
      // Check if we're at the default map view (Australia-wide)
      const center = mapInstanceRef.current.getCenter();
      const zoom = mapInstanceRef.current.getZoom();
      
      // If at default Australia view (zoom <= 6), show all RATSIB boundaries
      if (zoom <= 6) {
        loadAllRATSIBBoundaries();
      } else {
        // Otherwise show regional RATSIB boundaries
        loadRATSIBForMapView();
      }
    }
  }, [showRATSIBBoundaries]);

  return (
    <div className="relative w-full h-[calc(100vh-80px)]">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />
      
      {/* Search Autocomplete */}
      <div className={cn(
        "absolute z-[500]",
        isMobile ? "top-2 left-2 right-2" : "top-4 left-4 w-96"
      )}>
        <SearchAutocomplete
          map={mapInstanceRef.current}
          onSelectResult={(result) => {
            console.log('Selected search result:', result);
            // If it's a territory, trigger the onTerritorySelect callback
            if (result.type === 'territory' && result.metadata) {
              onTerritorySelect?.(result.metadata);
            }
          }}
        />
      </div>
      
      {/* Map Loading Indicator */}
      <MapLoadingIndicator
        isLoading={loadingState.isLoading}
        progress={loadingState.progress}
        message={loadingState.message}
      />
      {/* Enhanced Business Markers */}
      <EnhancedBusinessMarkers
        map={mapInstanceRef.current}
        searchQuery={businessSearchQuery || ''}
        onBusinessSelect={onBusinessSelect}
      />
      {/* Enhanced Mining Overlay with Clustering */}
      <EnhancedMiningOverlay
        map={mapInstanceRef.current}
        showMining={layers.mining}
        selectedTerritory={selectedTerritory}
        filters={miningFilters}
        onLoadingChange={(isLoading, progress) => {
          setLoadingState({
            isLoading,
            progress,
            message: progress !== undefined 
              ? `Loading mining tenements... ${Math.round(progress)}%` 
              : 'Processing mining data...'
          });
        }}
      />
      {/* Exploration Overlay with Authentic WA DMIRS Data */}
      <ExplorationOverlay
        map={mapInstanceRef.current}
        showExploration={layers.exploration}
        selectedTerritory={selectedTerritory}
      />
      {/* National Mining Overlay - All Australian States */}
      <NationalMiningOverlay
        map={mapInstanceRef.current}
        showNationalMining={layers.nationalMining}
      />
      
      {/* Mobile Map Controls */}
      <MobileMapControls
        map={mapInstanceRef.current}
        onToggleLayers={() => setShowLayerControl(true)}
        onToggleFilters={() => setShowMiningFilters(true)}
        hasFilters={layers.mining || layers.exploration}
      />
      
      {/* Layer Control Panel */}
      <MobileLayerControl
        open={showLayerControl}
        onOpenChange={setShowLayerControl}
        layers={layers}
        onLayerToggle={handleLayerToggle}
        onOpacityChange={handleLayerOpacityChange}
      />
      
      
      {/* Mining filter panel */}
      {layers.mining && (
        <MiningFilterPanel
          isOpen={showMiningFilters}
          onFiltersChange={setMiningFilters}
          onClose={() => setShowMiningFilters(false)}
        />
      )}
      
      {/* Data freshness indicator */}
      <DataFreshnessIndicator
        isOpen={true}
        onRefresh={(sourceId) => {
          console.log(`Refreshing data source: ${sourceId}`);
          // This would trigger a refresh of the specific data source
        }}
      />
      
      {/* Save/Share Map View Controls */}
      <SaveShareMapView
        map={mapInstanceRef.current}
        layers={layers}
        filters={{
          region: regionFilter || null,
          nativeTitle: nativeTitleFilter || {},
          mining: miningFilters
        }}
        selectedTerritory={selectedTerritory?.name || null}
        onLoadView={handleLoadView}
      />
    </div>
  );
}