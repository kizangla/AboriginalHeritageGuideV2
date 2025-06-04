import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';
import { dataOptimizationService } from '@/lib/data-optimization';

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  const ratsibLayerRef = useRef<L.GeoJSON | null>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    console.log('Creating Leaflet map with dimensions:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight);
    
    const map = L.map(mapRef.current, {
      center: [-25.2744, 133.7751],
      zoom: 5,
      zoomControl: true,
      attributionControl: true
    });
    
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    console.log('Map initialized successfully');

    if (onMapReady) {
      onMapReady(map);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add territories layer
  useEffect(() => {
    if (!territoriesGeoJSON || !mapInstanceRef.current) return;

    console.log('Adding territories to map:', territoriesGeoJSON.features?.length);

    // Remove existing layer
    if (territoryLayerRef.current) {
      mapInstanceRef.current.removeLayer(territoryLayerRef.current);
    }

    // Filter territories
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

    console.log('Filtered territories:', filteredFeatures.length);

    // Create territory layer
    const territoryLayer = L.geoJSON({
      type: 'FeatureCollection',
      features: filteredFeatures
    } as any, {
      style: (feature) => {
        const props = feature?.properties;
        const hasNativeTitle = props?.NTDA === 'Yes';
        
        return {
          color: hasNativeTitle ? '#2E8B57' : '#8B4513',
          weight: 1,
          opacity: 0.8,
          fillColor: hasNativeTitle ? '#2E8B57' : '#8B4513',
          fillOpacity: 0.4
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        layer.bindPopup(`
          <div style="padding: 12px; min-width: 250px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${props.NAME || 'Aboriginal Territory'}</h3>
            <p><strong>State:</strong> ${props.STATE || 'Unknown'}</p>
            ${props.REGION ? `<p><strong>Region:</strong> ${props.REGION}</p>` : ''}
            ${props.NTDA ? `<p><strong>Native Title:</strong> ${props.NTDA}</p>` : ''}
            ${props.GROUP_NAME ? `<p><strong>Language Group:</strong> ${props.GROUP_NAME}</p>` : ''}
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

    console.log('Territory layer added to map');
  }, [territoriesGeoJSON, regionFilter, nativeTitleFilter, onTerritorySelect]);

  // Handle RATSIB boundaries
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!showRATSIBBoundaries && ratsibLayerRef.current) {
      mapInstanceRef.current.removeLayer(ratsibLayerRef.current);
      ratsibLayerRef.current = null;
      console.log('RATSIB boundaries hidden');
      return;
    }

    if (showRATSIBBoundaries && !ratsibLayerRef.current) {
      loadRATSIBBoundaries();
    }
  }, [showRATSIBBoundaries]);

  const loadRATSIBBoundaries = async () => {
    if (!mapInstanceRef.current) return;

    const center = mapInstanceRef.current.getCenter();
    
    try {
      console.log('Loading RATSIB boundaries...');
      
      const data = await dataOptimizationService.optimizedFetch(
        `/api/territories/map-view/ratsib?lat=${center.lat}&lng=${center.lng}`
      );
      
      if (!data.success || !data.ratsibBoundaries || data.ratsibBoundaries.length === 0) {
        console.log('No RATSIB boundaries found');
        return;
      }

      // Remove existing RATSIB layer
      if (ratsibLayerRef.current) {
        mapInstanceRef.current.removeLayer(ratsibLayerRef.current);
      }

      // Create RATSIB features
      const ratsibFeatures = data.ratsibBoundaries.map((boundary: any) => ({
        type: "Feature",
        properties: boundary.properties,
        geometry: boundary.geometry
      }));

      // Create RATSIB layer
      const ratsibLayer = L.geoJSON({
        type: "FeatureCollection",
        features: ratsibFeatures
      } as any, {
        style: () => ({
          color: '#8B5CF6',
          weight: 2,
          opacity: 0.8,
          fillColor: '#8B5CF6',
          fillOpacity: 0.1
        }),
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          layer.bindPopup(`
            <div style="padding: 12px; min-width: 280px; border-left: 4px solid #8B5CF6;">
              <h3 style="font-weight: bold; color: #7C3AED; margin-bottom: 8px;">${props.ORG || 'RATSIB Organization'}</h3>
              <p><strong>Type:</strong> ${props.RATSIBTYPE || 'Unknown'}</p>
              <p><strong>Region:</strong> ${props.NAME || 'Unknown'}</p>
              <p><strong>Jurisdiction:</strong> ${props.JURIS || 'Unknown'}</p>
              ${props.LEGISAUTH ? `<p><strong>Legislative Authority:</strong> ${props.LEGISAUTH}</p>` : ''}
              ${props.RATSIBLINK ? `<p><strong>Website:</strong> <a href="${props.RATSIBLINK}" target="_blank">${props.RATSIBLINK}</a></p>` : ''}
              <p style="font-size: 12px; color: #666; margin-top: 8px;">Source: Australian Government RATSIB Register</p>
            </div>
          `);
        }
      });

      ratsibLayer.addTo(mapInstanceRef.current);
      ratsibLayerRef.current = ratsibLayer;

      console.log(`Added ${ratsibFeatures.length} RATSIB boundaries`);

    } catch (error) {
      console.error('Error loading RATSIB boundaries:', error);
    }
  };

  // Handle selected territory highlighting
  useEffect(() => {
    if (!selectedTerritory || !territoryLayerRef.current) return;

    territoryLayerRef.current.eachLayer((layer: any) => {
      if (layer.feature?.properties?.NAME === selectedTerritory.name) {
        layer.setStyle({
          color: '#FF4500',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.6
        });
        
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

  return (
    <div 
      ref={mapRef} 
      className="h-full w-full" 
      style={{ 
        minHeight: '500px',
        position: 'relative'
      }} 
    />
  );
}