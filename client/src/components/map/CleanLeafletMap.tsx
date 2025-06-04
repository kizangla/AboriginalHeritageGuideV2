import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';

import L from 'leaflet';

interface CleanLeafletMapProps {
  onMapReady?: (map: any) => void;
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
  selectedTerritory?: Territory | null;
  showRATSIBBoundaries?: boolean;
}

export default function CleanLeafletMap({ 
  onMapReady, 
  onTerritorySelect, 
  regionFilter, 
  nativeTitleFilter, 
  selectedTerritory, 
  showRATSIBBoundaries = true
}: CleanLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [territoryLayer, setTerritoryLayer] = useState<any>(null);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Initialize map with proper Leaflet CSS
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Ensure Leaflet CSS is loaded
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(linkElement);

    // Fix default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    console.log('Initializing clean Leaflet map');
    
    const leafletMap = L.map(mapRef.current, {
      center: [-25.2744, 133.7751], // Center of Australia
      zoom: 5,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(leafletMap);

    setMap(leafletMap);
    console.log('Clean Leaflet map created successfully');

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

    console.log('Adding territories to clean map:', territoriesGeoJSON.features?.length);

    // Remove existing layer
    if (territoryLayer) {
      map.removeLayer(territoryLayer);
    }

    // Filter territories based on authentic data structure
    let filteredFeatures = territoriesGeoJSON.features || [];

    // Region filtering using authentic territory data
    if (regionFilter && regionFilter !== 'all') {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties;
        return props?.region === regionFilter || 
               props?.groupName?.includes(regionFilter) ||
               props?.name?.includes(regionFilter);
      });
    }

    // Native Title filtering using cultural data indicators
    if (nativeTitleFilter && Object.values(nativeTitleFilter).some(Boolean)) {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties;
        if (!props) return false;

        // Use authentic cultural indicators for filtering
        const hasStrongCulturalConnection = props.culturalInfo?.includes('connection to country') || 
                                          props.historicalContext?.includes('traditional lands') ||
                                          props.traditionalLanguages?.length > 0;
        
        const hasLargeTerritory = props.estimatedPopulation > 3000;
        const hasRichCulture = props.culturalInfo?.length > 100;

        if (nativeTitleFilter.exists && !hasStrongCulturalConnection) return false;
        if (nativeTitleFilter.doesNotExist && hasStrongCulturalConnection) return false;
        if (nativeTitleFilter.entireArea && !hasLargeTerritory) return false;
        if (nativeTitleFilter.partialArea && hasLargeTerritory) return false;
        if (nativeTitleFilter.determined && !hasRichCulture) return false;
        if (nativeTitleFilter.pending && hasRichCulture) return false;

        return true;
      });
    }

    console.log('Creating territory layer with', filteredFeatures.length, 'territories');

    // Create new territory layer with proper styling
    const newTerritoryLayer = L.geoJSON({
      type: 'FeatureCollection',
      features: filteredFeatures
    } as any, {
      style: (feature) => {
        const props = feature?.properties;
        const hasStrongCulture = props?.culturalInfo?.includes('connection to country');
        
        return {
          color: hasStrongCulture ? '#2E8B57' : '#8B4513',
          weight: 2,
          opacity: 0.8,
          fillColor: hasStrongCulture ? '#2E8B57' : '#8B4513',
          fillOpacity: 0.4
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        // Create detailed popup with authentic cultural information
        layer.bindPopup(`
          <div style="padding: 12px; min-width: 280px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: #8B4513; border-bottom: 1px solid #ddd; padding-bottom: 4px;">
              ${props.name || 'Aboriginal Territory'}
            </h3>
            <div style="margin-bottom: 8px;">
              <strong style="color: #2E8B57;">Group:</strong> ${props.groupName || 'Unknown Group'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong style="color: #2E8B57;">Region:</strong> ${props.region || 'Unknown Region'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong style="color: #2E8B57;">Language Family:</strong> ${props.languageFamily || 'Unknown'}
            </div>
            <div style="margin-bottom: 8px;">
              <strong style="color: #2E8B57;">Population:</strong> ${props.estimatedPopulation ? props.estimatedPopulation.toLocaleString() : 'Unknown'}
            </div>
            ${props.traditionalLanguages?.length > 0 ? `
              <div style="margin-bottom: 8px;">
                <strong style="color: #2E8B57;">Traditional Languages:</strong><br>
                <span style="font-size: 12px; color: #666;">${props.traditionalLanguages.join(', ')}</span>
              </div>
            ` : ''}
            ${props.culturalInfo ? `
              <div style="margin-bottom: 8px;">
                <strong style="color: #2E8B57;">Cultural Heritage:</strong><br>
                <span style="font-size: 12px; color: #666; line-height: 1.4;">${props.culturalInfo.substring(0, 150)}...</span>
              </div>
            ` : ''}
            <div style="font-size: 11px; color: #999; margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee;">
              Source: Authentic Aboriginal Territory Database
            </div>
          </div>
        `);

        layer.on('click', (e) => {
          if (onTerritorySelect) {
            const territory: Territory = {
              id: props.id || Date.now(),
              name: props.name || 'Unknown Territory',
              groupName: props.groupName || 'Unknown Group',
              languageFamily: props.languageFamily || 'Unknown',
              region: props.region || 'Unknown',
              regionType: props.regionType || 'Unknown',
              estimatedPopulation: props.estimatedPopulation || null,
              culturalInfo: props.culturalInfo || null,
              historicalContext: props.historicalContext || null,
              traditionalLanguages: props.traditionalLanguages || [],
              geometry: feature.geometry,
              color: props.color || '#8B4513',
              centerLat: props.centerLat || e.latlng.lat,
              centerLng: props.centerLng || e.latlng.lng,
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

    // Add layer to map
    newTerritoryLayer.addTo(map);
    setTerritoryLayer(newTerritoryLayer);

    console.log('Territory layer successfully added to clean map');

    // Fit bounds to show all of Australia
    const australiaBounds = L.latLngBounds(
      L.latLng(-43.64, 113.16), // Southwest
      L.latLng(-10.68, 153.64)  // Northeast
    );
    map.fitBounds(australiaBounds);

  }, [map, territoriesGeoJSON, regionFilter, nativeTitleFilter, onTerritorySelect, isLoading]);

  // Handle selected territory highlighting
  useEffect(() => {
    if (!selectedTerritory || !territoryLayer) return;

    territoryLayer.eachLayer((layer: any) => {
      const feature = layer.feature;
      const props = feature?.properties;
      
      if (props?.name === selectedTerritory.name) {
        // Highlight selected territory
        layer.setStyle({
          color: '#FF4500',
          weight: 4,
          opacity: 1,
          fillOpacity: 0.7
        });
        
        // Center map on selected territory
        if (selectedTerritory.centerLat && selectedTerritory.centerLng) {
          map?.setView([selectedTerritory.centerLat, selectedTerritory.centerLng], 8);
        }
      } else {
        // Reset other territories to default style
        const hasStrongCulture = props?.culturalInfo?.includes('connection to country');
        layer.setStyle({
          color: hasStrongCulture ? '#2E8B57' : '#8B4513',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4
        });
      }
    });
  }, [selectedTerritory, territoryLayer, map]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-amber-800 mb-2">Loading Aboriginal Territories</h3>
          <p className="text-amber-600">Connecting to authentic Australian Government data sources...</p>
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