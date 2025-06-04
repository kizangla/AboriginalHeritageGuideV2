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

interface LeafletMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
  selectedTerritory?: Territory | null;
  showRATSIBBoundaries?: boolean;
}

export default function LeafletMap({ 
  onMapReady, 
  onTerritorySelect, 
  regionFilter, 
  nativeTitleFilter, 
  selectedTerritory, 
  showRATSIBBoundaries = true
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const territoryLayerRef = useRef<L.GeoJSON | null>(null);
  const ratsibLayerRef = useRef<L.GeoJSON | null>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('Initializing Leaflet map...');
    
    // Create map with explicit configuration
    const map = L.map(mapRef.current, {
      center: [-25.2744, 133.7751],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      touchZoom: true
    });
    
    mapInstanceRef.current = map;

    // Add tile layer with explicit configuration
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      minZoom: 2,
      tileSize: 256,
      zoomOffset: 0,
      detectRetina: false,
      crossOrigin: false
    });

    tileLayer.addTo(map);

    console.log('Leaflet map initialized with tiles');

    // Force map size calculation
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize(true);
        console.log('Map size invalidated');
      }
    }, 100);

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

  // Add territories layer
  useEffect(() => {
    if (!territoriesGeoJSON || !mapInstanceRef.current) return;

    console.log('Adding territories to Leaflet map:', territoriesGeoJSON.features?.length);
    console.log('Sample territory data:', territoriesGeoJSON.features?.[0]);
    console.log('Territory geometry type:', territoriesGeoJSON.features?.[0]?.geometry?.type);
    console.log('Territory coordinates structure:', territoriesGeoJSON.features?.[0]?.geometry?.coordinates?.[0]?.length);

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

    console.log('Filtered territories count:', filteredFeatures.length);

    // Create GeoJSON layer
    const territoryLayer = L.geoJSON({
      type: 'FeatureCollection',
      features: filteredFeatures
    } as any, {
      style: (feature) => {
        const props = feature?.properties;
        const hasNativeTitle = props?.NTDA === 'Yes';
        
        return {
          color: hasNativeTitle ? '#2E8B57' : '#8B4513',
          weight: 2,
          opacity: 0.8,
          fillColor: hasNativeTitle ? '#2E8B57' : '#8B4513',
          fillOpacity: 0.4
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        // Add popup
        layer.bindPopup(`
          <div style="padding: 12px; min-width: 250px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: #8B4513;">${props.NAME || 'Aboriginal Territory'}</h3>
            <p><strong>State:</strong> ${props.STATE || 'Unknown'}</p>
            ${props.REGION ? `<p><strong>Region:</strong> ${props.REGION}</p>` : ''}
            ${props.NTDA ? `<p><strong>Native Title:</strong> ${props.NTDA}</p>` : ''}
            ${props.GROUP_NAME ? `<p><strong>Language Group:</strong> ${props.GROUP_NAME}</p>` : ''}
            <p style="font-size: 12px; color: #666; margin-top: 8px;">Source: Australian Government Native Title Data</p>
          </div>
        `);

        // Add click handler
        layer.on('click', (e) => {
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
              centerLat: e.latlng.lat,
              centerLng: e.latlng.lng,
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

    // Debug layer creation
    console.log('Created territory layer with features:', territoryLayer.getLayers().length);
    
    // Check if layer has valid geometries
    let layerCount = 0;
    territoryLayer.eachLayer((layer: any) => {
      if (layerCount === 0) {
        console.log('Layer bounds:', layer.getBounds());
      }
      layerCount++;
    });

    // Add to map
    territoryLayer.addTo(mapInstanceRef.current);
    territoryLayerRef.current = territoryLayer;

    // Force map view to Australia bounds
    const australiaBounds = L.latLngBounds(
      L.latLng(-43.64, 113.16), // Southwest
      L.latLng(-10.68, 153.64)  // Northeast
    );
    mapInstanceRef.current.fitBounds(australiaBounds);

    console.log('Territory layer added to Leaflet map');
    console.log('Map bounds set to Australia:', australiaBounds);
    
    // Additional debugging - check map state
    setTimeout(() => {
      if (mapInstanceRef.current) {
        console.log('Map zoom after bounds:', mapInstanceRef.current.getZoom());
        console.log('Map center after bounds:', mapInstanceRef.current.getCenter());
        const container = mapRef.current;
        console.log('Map container size:', {
          width: container ? container.offsetWidth : 'unknown',
          height: container ? container.offsetHeight : 'unknown'
        });
      }
    }, 100);

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
      console.log('Loading RATSIB boundaries for Leaflet...');
      
      const data = await dataOptimizationService.optimizedFetch(
        `/api/territories/map-view/ratsib?lat=${center.lat}&lng=${center.lng}`
      );
      
      if (!data.success || !data.ratsibBoundaries || data.ratsibBoundaries.length === 0) {
        console.log('No RATSIB boundaries found for Leaflet');
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
          weight: 3,
          opacity: 0.9,
          fillColor: '#8B5CF6',
          fillOpacity: 0.15
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
              ${props.RATSIBLINK ? `<p><strong>Website:</strong> <a href="${props.RATSIBLINK}" target="_blank" rel="noopener">${props.RATSIBLINK}</a></p>` : ''}
              <p style="font-size: 12px; color: #666; margin-top: 8px;">Source: Australian Government RATSIB Register</p>
            </div>
          `);
        }
      });

      ratsibLayer.addTo(mapInstanceRef.current);
      ratsibLayerRef.current = ratsibLayer;

      console.log(`Added ${ratsibFeatures.length} RATSIB boundaries to Leaflet map`);

    } catch (error) {
      console.error('Error loading RATSIB boundaries for Leaflet:', error);
    }
  };

  // Handle selected territory highlighting
  useEffect(() => {
    if (!selectedTerritory || !territoryLayerRef.current) return;

    territoryLayerRef.current.eachLayer((layer: any) => {
      const feature = layer.feature;
      if (feature?.properties?.NAME === selectedTerritory.name) {
        layer.setStyle({
          color: '#FF4500',
          weight: 4,
          opacity: 1,
          fillOpacity: 0.7
        });
        
        if (selectedTerritory.centerLat && selectedTerritory.centerLng) {
          mapInstanceRef.current?.setView(
            [selectedTerritory.centerLat, selectedTerritory.centerLng],
            8
          );
        }
      } else {
        // Reset other territories to default style
        const props = feature?.properties;
        const hasNativeTitle = props?.NTDA === 'Yes';
        layer.setStyle({
          color: hasNativeTitle ? '#2E8B57' : '#8B4513',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4
        });
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
    <div className="h-full w-full relative">
      <div 
        ref={mapRef} 
        className="h-full w-full"
        style={{ 
          minHeight: '400px',
          backgroundColor: '#aad3df'
        }} 
      />
    </div>
  );
}