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

  // Query mining data for the current map view
  const { data: miningData, isLoading } = useQuery({
    queryKey: ['/api/mining/tenements', showMining, map?.getCenter()?.lat, map?.getCenter()?.lng],
    enabled: showMining && !!map,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!map) return;

    // Remove existing mining layer
    if (miningLayer) {
      map.removeLayer(miningLayer);
      setMiningLayer(null);
    }

    if (!showMining || !miningData?.tenements) return;

    console.log('Adding mining tenements overlay:', miningData.tenements.length);

    // Create new mining layer group
    const newMiningLayer = L.layerGroup();

    miningData.tenements.forEach((tenement: MiningTenement) => {
      if (!tenement.coordinates || tenement.coordinates.length === 0) return;

      // Color coding based on tenement type
      const getStyle = () => {
        const baseStyle = {
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.3,
        };

        // Color by tenement type from authentic WA DMIRS data
        const typeKey = tenement.type?.toLowerCase() || '';
        
        if (typeKey.includes('mining lease')) {
          return { ...baseStyle, color: '#ea580c', fillColor: '#fed7aa' };
        } else if (typeKey.includes('exploration')) {
          return { ...baseStyle, color: '#0ea5e9', fillColor: '#bae6fd' };
        } else if (typeKey.includes('prospecting')) {
          return { ...baseStyle, color: '#22c55e', fillColor: '#bbf7d0' };
        } else if (typeKey.includes('general purpose')) {
          return { ...baseStyle, color: '#8b5cf6', fillColor: '#ddd6fe' };
        } else {
          return { ...baseStyle, color: '#6b7280', fillColor: '#e5e7eb' };
        }
      };

      // Convert coordinates to GeoJSON polygon
      const geoJsonGeometry = {
        type: 'Polygon',
        coordinates: [tenement.coordinates]
      };

      // Create GeoJSON layer for tenement
      const tenementLayer = L.geoJSON(geoJsonGeometry, {
        style: getStyle(),
        onEachFeature: (feature, layer) => {
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

          layer.bindPopup(popupContent, {
            className: 'custom-popup mining-popup',
            maxWidth: 350
          });
        }
      });

      newMiningLayer.addLayer(tenementLayer);
    });

    // Add to map
    newMiningLayer.addTo(map);
    setMiningLayer(newMiningLayer);

    console.log(`Added ${miningData.tenements.length} mining tenements to map`);

  }, [map, showMining, miningData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (miningLayer && map) {
        map.removeLayer(miningLayer);
      }
    };
  }, []);

  return null; // This component renders directly to the map
}