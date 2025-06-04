import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';

interface MiningTenement {
  id: string;
  tenementType: string;
  tenementNumber: string;
  holder: string;
  commodity: string[];
  status: string;
  grantDate?: string;
  expiryDate?: string;
  area: number;
  geometry: any;
  overlapsAboriginalTerritory?: boolean;
  aboriginalTerritories?: string[];
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
      if (!tenement.geometry) return;

      // Color coding based on tenement type and Aboriginal territory overlap
      const getStyle = () => {
        const baseStyle = {
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.3,
        };

        if (tenement.overlapsAboriginalTerritory) {
          return {
            ...baseStyle,
            color: '#dc2626', // Red for overlapping territories
            fillColor: '#fca5a5',
          };
        }

        // Color by tenement type
        switch (tenement.tenementType?.toLowerCase()) {
          case 'mining lease':
            return { ...baseStyle, color: '#ea580c', fillColor: '#fed7aa' };
          case 'exploration licence':
            return { ...baseStyle, color: '#0ea5e9', fillColor: '#bae6fd' };
          case 'prospecting licence':
            return { ...baseStyle, color: '#22c55e', fillColor: '#bbf7d0' };
          default:
            return { ...baseStyle, color: '#6b7280', fillColor: '#e5e7eb' };
        }
      };

      // Create GeoJSON layer for tenement
      const tenementLayer = L.geoJSON(tenement.geometry, {
        style: getStyle(),
        onEachFeature: (feature, layer) => {
          const popupContent = `
            <div class="p-3 min-w-[280px] border-l-4 ${tenement.overlapsAboriginalTerritory ? 'border-red-500' : 'border-orange-500'}">
              <h3 class="font-bold text-lg mb-2 ${tenement.overlapsAboriginalTerritory ? 'text-red-700' : 'text-orange-700'}">
                ${tenement.tenementType} ${tenement.tenementNumber}
              </h3>
              <div class="space-y-2 text-sm">
                <p><strong>Holder:</strong> ${tenement.holder}</p>
                <p><strong>Commodity:</strong> ${tenement.commodity.join(', ')}</p>
                <p><strong>Status:</strong> <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">${tenement.status}</span></p>
                ${tenement.grantDate ? `<p><strong>Grant Date:</strong> ${new Date(tenement.grantDate).toLocaleDateString()}</p>` : ''}
                ${tenement.expiryDate ? `<p><strong>Expiry Date:</strong> ${new Date(tenement.expiryDate).toLocaleDateString()}</p>` : ''}
                <p><strong>Area:</strong> ${tenement.area.toFixed(2)} ha</p>
                ${tenement.overlapsAboriginalTerritory ? `
                  <div class="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <p class="text-red-800 font-medium text-xs">⚠️ Overlaps Aboriginal Territory</p>
                    ${tenement.aboriginalTerritories ? `<p class="text-red-700 text-xs mt-1">${tenement.aboriginalTerritories.join(', ')}</p>` : ''}
                  </div>
                ` : ''}
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