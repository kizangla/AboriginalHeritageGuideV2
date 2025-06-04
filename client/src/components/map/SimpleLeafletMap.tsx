import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';

// Fix default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface SimpleLeafletMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
  selectedTerritory?: Territory | null;
  showRATSIBBoundaries?: boolean;
}

export default function SimpleLeafletMap({ 
  onMapReady, 
  onTerritorySelect, 
  regionFilter, 
  nativeTitleFilter, 
  selectedTerritory, 
  showRATSIBBoundaries = true
}: SimpleLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [territoryLayer, setTerritoryLayer] = useState<L.GeoJSON | null>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    console.log('Creating simple Leaflet map');
    
    const leafletMap = L.map(mapRef.current, {
      center: [-25.2744, 133.7751],
      zoom: 5,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(leafletMap);

    setMap(leafletMap);
    console.log('Simple Leaflet map created');

    if (onMapReady) {
      onMapReady(leafletMap);
    }

    return () => {
      if (leafletMap) {
        leafletMap.remove();
      }
    };
  }, []);

  // Add territories
  useEffect(() => {
    if (!map || !territoriesGeoJSON || isLoading) return;

    console.log('Adding territories to simple map:', territoriesGeoJSON.features?.length);

    if (territoryLayer) {
      map.removeLayer(territoryLayer);
    }

    let filteredFeatures = territoriesGeoJSON.features || [];

    // Region filtering
    if (regionFilter && regionFilter !== 'all') {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties;
        return props?.region === regionFilter;
      });
    }

    // Native Title filtering
    if (nativeTitleFilter && Object.values(nativeTitleFilter).some(Boolean)) {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties;
        if (!props) return false;

        const hasConnection = props.culturalInfo?.includes('connection to country');
        const hasTraditionalLands = props.historicalContext?.includes('traditional lands');
        const hasLanguages = props.traditionalLanguages?.length > 0;
        const largePopulation = props.estimatedPopulation > 3000;

        if (nativeTitleFilter.exists && !hasConnection) return false;
        if (nativeTitleFilter.doesNotExist && hasConnection) return false;
        if (nativeTitleFilter.entireArea && !largePopulation) return false;
        if (nativeTitleFilter.partialArea && largePopulation) return false;
        if (nativeTitleFilter.determined && !hasTraditionalLands) return false;
        if (nativeTitleFilter.pending && hasTraditionalLands) return false;

        return true;
      });
    }

    console.log('Creating GeoJSON layer with', filteredFeatures.length, 'territories');

    const newTerritoryLayer = L.geoJSON({
      type: 'FeatureCollection',
      features: filteredFeatures
    } as any, {
      style: (feature) => {
        const props = feature?.properties;
        const hasConnection = props?.culturalInfo?.includes('connection to country');
        
        return {
          color: hasConnection ? '#2E8B57' : '#8B4513',
          weight: 2,
          opacity: 0.8,
          fillColor: hasConnection ? '#2E8B57' : '#8B4513',
          fillOpacity: 0.4
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        layer.bindPopup(`
          <div style="padding: 12px; min-width: 250px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: #8B4513;">${props.name || 'Aboriginal Territory'}</h3>
            <p><strong>Group:</strong> ${props.groupName || 'Unknown'}</p>
            <p><strong>Region:</strong> ${props.region || 'Unknown'}</p>
            <p><strong>Language Family:</strong> ${props.languageFamily || 'Unknown'}</p>
            <p><strong>Population:</strong> ${props.estimatedPopulation || 'Unknown'}</p>
            <p style="font-size: 12px; color: #666; margin-top: 8px;">Source: Aboriginal Territory Database</p>
          </div>
        `);

        layer.on('click', (e) => {
          if (onTerritorySelect) {
            const territory: Territory = {
              id: props.id || Date.now(),
              name: props.name || 'Unknown Territory',
              groupName: props.groupName || 'Unknown',
              languageFamily: props.languageFamily || 'Unknown',
              region: props.region || 'Unknown',
              regionType: props.regionType || 'Unknown',
              estimatedPopulation: props.estimatedPopulation || null,
              culturalInfo: props.culturalInfo || null,
              historicalContext: props.historicalContext || null,
              traditionalLanguages: props.traditionalLanguages || [],
              geometry: feature.geometry,
              color: props.color || '#8B4513',
              centerLat: e.latlng.lat,
              centerLng: e.latlng.lng,
              seasonalCalendar: props.seasonalCalendar || null,
              traditionalFoods: props.traditionalFoods || [],
              medicinalPlants: props.medicinalPlants || [],
              culturalProtocols: props.culturalProtocols || null,
              connectionToCountry: props.connectionToCountry || null,
              artStyles: props.artStyles || []
            };
            onTerritorySelect(territory);
          }
        });
      }
    });

    newTerritoryLayer.addTo(map);
    setTerritoryLayer(newTerritoryLayer);

    // Fit to Australia
    const australiaBounds = L.latLngBounds(
      L.latLng(-43.64, 113.16),
      L.latLng(-10.68, 153.64)
    );
    map.fitBounds(australiaBounds);

  }, [map, territoriesGeoJSON, regionFilter, nativeTitleFilter, onTerritorySelect, isLoading]);

  // Handle selected territory
  useEffect(() => {
    if (!selectedTerritory || !territoryLayer) return;

    territoryLayer.eachLayer((layer: any) => {
      const feature = layer.feature;
      const props = feature?.properties;
      
      if (props?.name === selectedTerritory.name) {
        layer.setStyle({
          color: '#FF4500',
          weight: 4,
          opacity: 1,
          fillOpacity: 0.7
        });
        
        if (selectedTerritory.centerLat && selectedTerritory.centerLng) {
          map?.setView([selectedTerritory.centerLat, selectedTerritory.centerLng], 8);
        }
      } else {
        const hasConnection = props?.culturalInfo?.includes('connection to country');
        layer.setStyle({
          color: hasConnection ? '#2E8B57' : '#8B4513',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4
        });
      }
    });
  }, [selectedTerritory, territoryLayer, map]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-50">
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
        className="h-full w-full leaflet-container"
        style={{ 
          minHeight: '400px',
          backgroundColor: '#aad3df'
        }} 
      />
    </div>
  );
}