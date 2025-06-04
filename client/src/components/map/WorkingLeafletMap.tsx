import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';

// Ensure Leaflet CSS is loaded
import 'leaflet/dist/leaflet.css';

// Fix default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface WorkingLeafletMapProps {
  onMapReady?: (map: L.Map) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
  selectedTerritory?: Territory | null;
  showRATSIBBoundaries?: boolean;
}

export default function WorkingLeafletMap({ 
  onMapReady, 
  onTerritorySelect, 
  regionFilter, 
  nativeTitleFilter, 
  selectedTerritory, 
  showRATSIBBoundaries = true
}: WorkingLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [territoryLayer, setTerritoryLayer] = useState<L.GeoJSON | null>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || map) return;

    console.log('Creating new Leaflet map instance');
    
    // Create map
    const leafletMap = L.map(mapRef.current, {
      center: [-25.2744, 133.7751],
      zoom: 5,
      preferCanvas: false,
      renderer: L.svg()
    });

    // Add tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(leafletMap);

    setMap(leafletMap);
    console.log('Leaflet map created and tiles added');

    if (onMapReady) {
      onMapReady(leafletMap);
    }

    return () => {
      if (leafletMap) {
        leafletMap.remove();
      }
    };
  }, []);

  // Add territories when data loads
  useEffect(() => {
    if (!map || !territoriesGeoJSON || isLoading) return;

    console.log('Adding territories to working map:', territoriesGeoJSON.features?.length);

    // Remove existing layer
    if (territoryLayer) {
      map.removeLayer(territoryLayer);
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

    console.log('Creating GeoJSON layer with', filteredFeatures.length, 'territories');

    // Create new territory layer
    const newTerritoryLayer = L.geoJSON({
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
        
        layer.bindPopup(`
          <div style="padding: 12px; min-width: 250px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: #8B4513;">${props.name || props.NAME || 'Aboriginal Territory'}</h3>
            <p><strong>Group:</strong> ${props.groupName || props.GROUP_NAME || 'Unknown'}</p>
            <p><strong>Region:</strong> ${props.region || props.REGION || 'Unknown'}</p>
            ${props.NTDA ? `<p><strong>Native Title:</strong> ${props.NTDA}</p>` : ''}
            <p style="font-size: 12px; color: #666; margin-top: 8px;">Source: Australian Government Native Title Data</p>
          </div>
        `);

        layer.on('click', (e) => {
          if (onTerritorySelect) {
            const territory: Territory = {
              id: props.id || props.FID || Date.now(),
              name: props.name || props.NAME || 'Unknown Territory',
              groupName: props.groupName || props.GROUP_NAME || 'Unknown',
              languageFamily: props.languageFamily || 'Unknown',
              region: props.region || props.REGION || 'Unknown',
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

    // Add to map
    newTerritoryLayer.addTo(map);
    setTerritoryLayer(newTerritoryLayer);

    console.log('Territory layer added to working map');

    // Fit bounds to Australia
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
      const territoryName = props?.name || props?.NAME;
      
      if (territoryName === selectedTerritory.name) {
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
        // Reset style
        const hasNativeTitle = props?.NTDA === 'Yes';
        layer.setStyle({
          color: hasNativeTitle ? '#2E8B57' : '#8B4513',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4
        });
      }
    });
  }, [selectedTerritory, territoryLayer, map]);

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
          backgroundColor: '#aad3df',
          minHeight: '400px'
        }} 
      />
    </div>
  );
}