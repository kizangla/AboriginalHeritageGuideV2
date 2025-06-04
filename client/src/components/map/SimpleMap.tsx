import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';
import { dataOptimizationService } from '@/lib/data-optimization';

interface SimpleMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
  selectedTerritory?: Territory | null;
  showRATSIBBoundaries?: boolean;
}

export default function SimpleMap({ 
  onMapReady, 
  onTerritorySelect, 
  regionFilter, 
  nativeTitleFilter, 
  selectedTerritory, 
  showRATSIBBoundaries = true
}: SimpleMapProps) {
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
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    console.log('SimpleMap: Map created successfully');
    
    if (onMapReady) {
      onMapReady(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [onMapReady]);

  useEffect(() => {
    if (!territoriesGeoJSON || !mapInstanceRef.current) return;

    console.log('Adding Aboriginal territories base layer...');
    console.log('Territories data received:', territoriesGeoJSON.features?.length);

    // Remove existing territory layer
    if (territoryLayerRef.current) {
      mapInstanceRef.current.removeLayer(territoryLayerRef.current);
    }

    // Filter territories based on region and native title filters
    let filteredFeatures = territoriesGeoJSON.features || [];

    if (regionFilter && regionFilter !== 'all') {
      filteredFeatures = filteredFeatures.filter((feature: any) => 
        feature.properties?.STATE === regionFilter
      );
    }

    if (nativeTitleFilter) {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties;
        if (!props) return true;

        if (nativeTitleFilter.exists && props.NTDA !== 'Yes') return false;
        if (nativeTitleFilter.doesNotExist && props.NTDA === 'Yes') return false;
        if (nativeTitleFilter.entireArea && props.OVERLAP !== 'Entire Area') return false;
        if (nativeTitleFilter.partialArea && props.OVERLAP === 'Entire Area') return false;
        if (nativeTitleFilter.discontinued && props.STATUS !== 'Discontinued') return false;
        if (nativeTitleFilter.dismissed && props.STATUS !== 'Dismissed') return false;

        return true;
      });
    }

    console.log(`Displaying ${filteredFeatures.length} territories after filtering`);

    const filteredGeoJSON = {
      type: 'FeatureCollection',
      features: filteredFeatures
    };

    const territoryLayer = L.geoJSON(filteredGeoJSON as any, {
      style: (feature) => {
        const props = feature?.properties;
        let color = '#8B4513';
        let fillOpacity = 0.3;

        if (props?.NTDA === 'Yes') {
          color = '#2E8B57';
          fillOpacity = 0.4;
        }

        return {
          color: color,
          weight: 1,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: fillOpacity
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        layer.bindPopup(`
          <div class="p-3 min-w-[280px]">
            <h3 class="font-bold text-lg mb-2">${props.NAME || 'Aboriginal Territory'}</h3>
            <div class="space-y-2 text-sm">
              <p><strong>State:</strong> <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">${props.STATE || 'Unknown'}</span></p>
              ${props.REGION ? `<p><strong>Region:</strong> ${props.REGION}</p>` : ''}
              ${props.NTDA ? `<p><strong>Native Title:</strong> <span class="px-2 py-1 ${props.NTDA === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} rounded text-xs">${props.NTDA}</span></p>` : ''}
              ${props.OVERLAP ? `<p><strong>Overlap Type:</strong> ${props.OVERLAP}</p>` : ''}
              ${props.STATUS ? `<p><strong>Status:</strong> <span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">${props.STATUS}</span></p>` : ''}
              ${props.GROUP_NAME ? `<p><strong>Language Group:</strong> ${props.GROUP_NAME}</p>` : ''}
            </div>
            <div class="mt-3 text-xs text-gray-500">
              <p>Click to view detailed information</p>
            </div>
          </div>
        `);

        layer.on('click', () => {
          if (onTerritorySelect) {
            const territory: Territory = {
              id: props.FID || Date.now(),
              name: props.NAME || 'Unknown Territory',
              groupName: props.GROUP_NAME || 'Unknown',
              languageFamily: 'Unknown',
              region: props.REGION || 'Unknown',
              regionType: 'Unknown',
              estimatedPopulation: null,
              culturalInfo: null,
              historicalContext: null,
              traditionalLanguages: [],
              geometry: feature.geometry,
              color: '#8B4513',
              centerLat: feature.geometry?.type === 'Point' ? feature.geometry.coordinates[1] : 0,
              centerLng: feature.geometry?.type === 'Point' ? feature.geometry.coordinates[0] : 0,
              seasonalCalendar: null,
              traditionalFoods: [],
              medicinalPlants: [],
              culturalProtocols: null,
              connectionToCountry: null,
              artStyles: []
            };
            onTerritorySelect(territory);
          }
        });
      }
    });

    territoryLayer.addTo(mapInstanceRef.current);
    territoryLayerRef.current = territoryLayer;

    console.log(`Added ${filteredFeatures.length} Aboriginal territories base layer`);

  }, [territoriesGeoJSON, regionFilter, nativeTitleFilter, onTerritorySelect]);

  // Load RATSIB boundaries for current map view
  const loadRATSIBForMapView = async () => {
    if (!mapInstanceRef.current) return;

    const center = mapInstanceRef.current.getCenter();
    
    try {
      console.log('Loading RATSIB boundaries for map view...');
      
      const data = await dataOptimizationService.optimizedFetch(
        `/api/territories/map-view/ratsib?lat=${center.lat}&lng=${center.lng}`
      );
      
      if (!data.success || !data.ratsibBoundaries || data.ratsibBoundaries.length === 0) {
        console.log('No RATSIB boundaries found for current map view');
        return;
      }

      // Remove existing RATSIB layer
      if (nativeTitleLayerRef.current) {
        mapInstanceRef.current.removeLayer(nativeTitleLayerRef.current);
        nativeTitleLayerRef.current = null;
      }

      // Create GeoJSON features from RATSIB boundaries
      const ratsibFeatures = data.ratsibBoundaries.map((boundary: any) => ({
        type: "Feature",
        properties: {
          id: boundary.properties?.ID,
          org: boundary.properties?.ORG,
          name: boundary.properties?.NAME,
          ratsibType: boundary.properties?.RATSIBTYPE,
          legisAuth: boundary.properties?.LEGISAUTH,
          ratsibLink: boundary.properties?.RATSIBLINK,
          juris: boundary.properties?.JURIS,
          comments: boundary.properties?.COMMENTS,
          dtExtract: boundary.properties?.DT_EXTRACT
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
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div class="p-3 min-w-[280px] border-l-4 border-purple-500">
              <h3 class="font-bold text-lg mb-2 text-purple-700">${props.org || 'RATSIB Organization'}</h3>
              <div class="space-y-2 text-sm">
                <p><strong>Type:</strong> <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">${props.ratsibType || 'Unknown'}</span></p>
                <p><strong>Region:</strong> ${props.name || 'Unknown'}</p>
                <p><strong>Jurisdiction:</strong> <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">${props.juris || 'Unknown'}</span></p>
                ${props.legisAuth ? `<p><strong>Legislative Authority:</strong> ${props.legisAuth}</p>` : ''}
                ${props.ratsibLink ? `<p><strong>Website:</strong> <a href="${props.ratsibLink}" target="_blank" class="text-blue-600 hover:underline">${props.ratsibLink}</a></p>` : ''}
                ${props.comments ? `<p><strong>Comments:</strong> ${props.comments}</p>` : ''}
              </div>
              <div class="mt-3 text-xs text-gray-500">
                <p>Source: Australian Government RATSIB Register</p>
                ${props.dtExtract ? `<p>Last Updated: ${new Date(props.dtExtract).toLocaleDateString()}</p>` : ''}
              </div>
            </div>
          `);
        }
      });

      ratsibLayer.addTo(mapInstanceRef.current);
      nativeTitleLayerRef.current = ratsibLayer;

      console.log(`Added ${ratsibFeatures.length} RATSIB boundaries to map view`);

      // Prefetch nearby areas for smoother navigation
      const bounds = mapInstanceRef.current.getBounds();
      const latOffset = 0.5;
      const lngOffset = 0.5;
      const nearbyAreas = [
        { lat: center.lat + latOffset, lng: center.lng },
        { lat: center.lat - latOffset, lng: center.lng },
        { lat: center.lat, lng: center.lng + lngOffset },
        { lat: center.lat, lng: center.lng - lngOffset }
      ];

      nearbyAreas.forEach(async (area) => {
        try {
          await dataOptimizationService.optimizedFetch(
            `/api/territories/map-view/ratsib?lat=${area.lat}&lng=${area.lng}`
          );
        } catch (error) {
          // Silent prefetch failure
        }
      });

      console.log(`Prefetched RATSIB data for ${nearbyAreas.length} nearby areas around ${center.lat},${center.lng}`);

    } catch (error) {
      console.error('Error loading RATSIB boundaries:', error);
    }
  };

  // Handle RATSIB boundaries toggle
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!showRATSIBBoundaries && nativeTitleLayerRef.current) {
      // Remove RATSIB layer when filter is disabled
      mapInstanceRef.current.removeLayer(nativeTitleLayerRef.current);
      nativeTitleLayerRef.current = null;
      console.log('RATSIB boundaries hidden');
    } else if (showRATSIBBoundaries && !nativeTitleLayerRef.current) {
      // Load RATSIB boundaries when filter is enabled
      loadRATSIBForMapView();
    }
  }, [showRATSIBBoundaries]);

  // Handle selected territory highlighting
  useEffect(() => {
    if (!selectedTerritory || !mapInstanceRef.current || !territoryLayerRef.current) return;

    // Reset all layers to default style
    territoryLayerRef.current.eachLayer((layer: any) => {
      if (layer.feature) {
        const props = layer.feature.properties;
        let color = '#8B4513';
        if (props?.NTDA === 'Yes') {
          color = '#2E8B57';
        }
        layer.setStyle({
          color: color,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.3
        });
      }
    });

    // Highlight selected territory
    territoryLayerRef.current.eachLayer((layer: any) => {
      if (layer.feature?.properties?.NAME === selectedTerritory.name) {
        layer.setStyle({
          color: '#FF4500',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.6
        });
        
        // Center map on selected territory if coordinates are available
        if (selectedTerritory.centerLat && selectedTerritory.centerLng) {
          mapInstanceRef.current?.setView(
            [selectedTerritory.centerLat, selectedTerritory.centerLng],
            8
          );
        }
      }
    });
  }, [selectedTerritory]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Aboriginal territories...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full" />;
}