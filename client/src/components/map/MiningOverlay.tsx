import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';

interface MiningTenement {
  id: string;
  type: string;
  status: string;
  holder: string;
  coordinates: number[][];
}

interface MiningOverlayProps {
  map: L.Map | null;
  showMining: boolean;
  selectedTerritory?: any;
}

export default function MiningOverlay({ map, showMining, selectedTerritory }: MiningOverlayProps) {
  const [miningLayer, setMiningLayer] = useState<L.LayerGroup | null>(null);

  // Query complete mining dataset from database with geographic bounds
  const { data: miningData, isLoading } = useQuery({
    queryKey: ['/api/mining/map-bounds', showMining, map?.getBounds()],
    queryFn: async () => {
      if (!showMining || !map) return null;
      
      const bounds = map.getBounds();
      const params = new URLSearchParams({
        north: bounds.getNorth().toString(),
        south: bounds.getSouth().toString(),
        east: bounds.getEast().toString(),
        west: bounds.getWest().toString(),
        limit: '500' // Limit for map display performance
      });
      
      const response = await fetch(`/api/mining/map-bounds?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch mining data: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: showMining && !!map,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  interface MiningAPIResponse {
    success: boolean;
    tenements: Array<{
      id: string;
      type: string;
      status: string;
      holder: string;
      coordinates: number[][];
      area?: number;
      mineralTypes?: string[];
      grantDate?: string;
      expiryDate?: string;
      state: string;
      majorCompany: boolean;
    }>;
    totalFound: number;
    totalInDatabase: number;
    dataSource: string;
    dataIntegrity: {
      authenticData: boolean;
      governmentSource: string;
      databaseStored: boolean;
      lastUpdated: string;
    };
  }

  useEffect(() => {
    if (!map) return;

    // Remove existing mining layer
    if (miningLayer) {
      map.removeLayer(miningLayer);
      setMiningLayer(null);
    }

    const typedMiningData = miningData as MiningAPIResponse;
    if (!showMining || !typedMiningData?.tenements) return;

    console.log('Adding mining tenements overlay:', typedMiningData.tenements.length);

    // Create new mining layer group
    const newMiningLayer = L.layerGroup();

    typedMiningData.tenements.forEach((tenement, index: number) => {
      console.log(`Processing tenement ${index + 1}:`, tenement.id, tenement.coordinates);
      if (!tenement.coordinates || tenement.coordinates.length === 0) {
        console.log(`Skipping tenement ${tenement.id}: no coordinates`);
        return;
      }

      // Color coding based on tenement type with enhanced visibility
      const getStyle = () => {
        const baseStyle = {
          weight: 4,
          opacity: 1.0,
          fillOpacity: 0.7,
          dashArray: '8, 4' // Dashed border for better visibility
        };

        // Color by tenement type from authentic WA DMIRS data
        const typeKey = tenement.type?.toLowerCase() || '';
        
        if (typeKey.includes('mining lease')) {
          return { ...baseStyle, color: '#dc2626', fillColor: '#fca5a5' }; // Bright red
        } else if (typeKey.includes('exploration')) {
          return { ...baseStyle, color: '#2563eb', fillColor: '#93c5fd' }; // Bright blue
        } else if (typeKey.includes('prospecting')) {
          return { ...baseStyle, color: '#16a34a', fillColor: '#86efac' }; // Bright green
        } else if (typeKey.includes('general purpose')) {
          return { ...baseStyle, color: '#7c3aed', fillColor: '#c4b5fd' }; // Bright purple
        } else {
          return { ...baseStyle, color: '#f59e0b', fillColor: '#fde68a' }; // Bright orange
        }
      };

      // Calculate center point of tenement
      const centerLat = tenement.coordinates.reduce((sum, coord) => sum + coord[1], 0) / tenement.coordinates.length;
      const centerLng = tenement.coordinates.reduce((sum, coord) => sum + coord[0], 0) / tenement.coordinates.length;
      
      // Get style for this tenement type
      const style = getStyle();
      
      // Create a highly visible circle marker instead of tiny polygon
      const tenementLayer = L.circleMarker([centerLat, centerLng], {
        radius: 15, // Large radius for visibility
        fillColor: style.fillColor,
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        fillOpacity: style.fillOpacity,
        dashArray: style.dashArray
      });

      // Add popup to the circle marker
      const popupContent = `
        <div class="p-3 min-w-[280px] border-l-4 border-orange-500">
          <h3 class="font-bold text-lg mb-2 text-orange-700">
            ${tenement.id}
          </h3>
          <div class="space-y-2 text-sm">
            <p><strong>Type:</strong> ${tenement.type}</p>
            <p><strong>Holder:</strong> ${tenement.holder}</p>
            <p><strong>Status:</strong> <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">${tenement.status}</span></p>
          </div>
          <div class="mt-3 text-xs text-gray-500 border-t pt-2">
            <strong>Source:</strong> WA Department of Mines, Industry Regulation and Safety (DMIRS)
          </div>
        </div>
      `;

      tenementLayer.bindPopup(popupContent, {
        className: 'custom-popup mining-popup',
        maxWidth: 350
      });

      newMiningLayer.addLayer(tenementLayer);
      console.log(`Added tenement ${tenement.id} to layer group, total layers: ${newMiningLayer.getLayers().length}`);
    });

    // Add to map
    console.log(`Adding mining layer group with ${newMiningLayer.getLayers().length} layers to map`);
    newMiningLayer.addTo(map);
    setMiningLayer(newMiningLayer);
    
    // Auto-zoom to WA mining region if tenements are added
    if (typedMiningData.tenements.length > 0) {
      // Calculate bounds for all tenements
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      
      typedMiningData.tenements.forEach(tenement => {
        tenement.coordinates.forEach(coord => {
          const [lng, lat] = coord;
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });
      });
      
      // Add padding and fit to bounds
      const bounds = L.latLngBounds(
        [minLat - 1, minLng - 1],
        [maxLat + 1, maxLng + 1]
      );
      
      console.log('Zooming to WA mining tenements region:', bounds);
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    console.log(`Added ${typedMiningData.tenements.length} mining tenements to map`);

  }, [map, showMining, miningData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (miningLayer && map) {
        map.removeLayer(miningLayer);
      }
    };
  }, [miningLayer, map]);

  return null;
}