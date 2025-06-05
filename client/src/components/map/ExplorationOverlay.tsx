/**
 * Exploration Overlay - Displays WA DMIRS exploration report boundaries with authentic mineral data
 */

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { ExplorationFilters, type ExplorationFilters as ExplorationFiltersType } from '../ExplorationFilters';

interface ExplorationOverlayProps {
  map: L.Map | null;
  showExploration: boolean;
  selectedTerritory?: any;
}

interface ExplorationReport {
  id: string;
  targetCommodity: string;
  operator: string;
  project: string;
  reportYear: number;
  keywords: string;
  coordinates: [number, number][];
}

interface ExplorationData {
  success: boolean;
  reports: ExplorationReport[];
  totalInDatabase: number;
  totalDisplayed: number;
  filters: {
    commodity: string;
    yearFrom: string | number;
    yearTo: string | number;
    limit: number;
  };
}

export default function ExplorationOverlay({ map, showExploration, selectedTerritory }: ExplorationOverlayProps) {
  const [explorationLayer, setExplorationLayer] = useState<L.LayerGroup | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExplorationFiltersType>({ limit: 2000 });

  // Build query parameters for filtering
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (filters.commodity) params.append('commodity', filters.commodity);
    if (filters.yearFrom) params.append('yearFrom', filters.yearFrom.toString());
    if (filters.yearTo) params.append('yearTo', filters.yearTo.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    return params.toString();
  };

  // Query exploration data for map bounds with filtering
  const { data: explorationData, isLoading, refetch } = useQuery({
    queryKey: ['/api/exploration/map-bounds', filters],
    queryFn: () => fetch(`/api/exploration/map-bounds?${buildQueryParams()}`).then(res => res.json()),
    enabled: showExploration && !!map,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!map || !showExploration) {
      // Remove exploration layer if hidden
      if (explorationLayer && map) {
        map.removeLayer(explorationLayer);
        setExplorationLayer(null);
      }
      return;
    }

    if (isLoading || !explorationData) {
      return;
    }

    // Remove existing layer
    if (explorationLayer) {
      map.removeLayer(explorationLayer);
    }

    const typedExplorationData = explorationData as ExplorationData;
    console.log('Adding exploration reports overlay with authentic WA DMIRS data...');
    
    // Create new layer group for exploration reports
    const newExplorationLayer = L.layerGroup();

    // Use authentic exploration reports from WA DMIRS data
    const explorationReports = typedExplorationData.reports || [];
    
    if (explorationReports.length === 0) {
      console.log('No exploration reports available for current map bounds');
      // Add empty layer to map and set state
      newExplorationLayer.addTo(map);
      setExplorationLayer(newExplorationLayer);
      return;
    }

    explorationReports.forEach(report => {
      // Parse authentic commodities
      const commodities = report.targetCommodity.split(';').map(c => c.trim());
      
      // Style based on primary commodity
      const primaryCommodity = commodities[0].toLowerCase();
      let fillColor = '#8B4513'; // Default brown for other minerals
      
      if (primaryCommodity.includes('gold')) {
        fillColor = '#FFD700';
      } else if (primaryCommodity.includes('iron')) {
        fillColor = '#B22222';
      } else if (primaryCommodity.includes('lithium')) {
        fillColor = '#9370DB';
      } else if (primaryCommodity.includes('copper')) {
        fillColor = '#B87333';
      } else if (primaryCommodity.includes('nickel')) {
        fillColor = '#C0C0C0';
      }

      // Create polygon for exploration report boundary with enhanced visibility
      const reportPolygon = L.polygon(report.coordinates, {
        fillColor: fillColor,
        fillOpacity: 0.7,
        color: '#ffffff',
        weight: 3,
        opacity: 1.0,
        dashArray: '5, 5'
      });

      // Add popup with authentic WA DMIRS data
      reportPolygon.bindPopup(`
        <div class="exploration-popup">
          <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 14px; font-weight: bold;">
            ${report.project}
          </h3>
          <div style="font-size: 12px; line-height: 1.4;">
            <p style="margin: 4px 0;"><strong>Operator:</strong> ${report.operator}</p>
            <p style="margin: 4px 0;"><strong>Target Commodities:</strong> ${report.targetCommodity}</p>
            <p style="margin: 4px 0;"><strong>Report Year:</strong> ${report.reportYear}</p>
            <p style="margin: 4px 0;"><strong>Report ID:</strong> ${report.id}</p>
            <p style="margin: 8px 0 0 0; font-size: 10px; color: #7f8c8d;">
              Source: WA Department of Mines, Industry Regulation and Safety
            </p>
          </div>
        </div>
      `, {
        maxWidth: 350
      });

      newExplorationLayer.addLayer(reportPolygon);
    });

    console.log(`Added ${explorationReports.length} exploration reports to map with authentic commodity data`);

    // Add to map
    newExplorationLayer.addTo(map);
    setExplorationLayer(newExplorationLayer);

  }, [map, showExploration, explorationData, isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (explorationLayer && map) {
        map.removeLayer(explorationLayer);
      }
    };
  }, []);

  const handleFilterChange = (newFilters: ExplorationFiltersType) => {
    setFilters(newFilters);
    // Force immediate refetch with new filters
    setTimeout(() => refetch(), 100);
  };

  return (
    <>
      {showExploration && (
        <>
          <ExplorationFilters
            onFilterChange={handleFilterChange}
            isVisible={showFilters}
            currentFilters={filters}
          />
          <div className="absolute top-4 left-4 z-[1000]">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/90 backdrop-blur border border-gray-300 rounded px-3 py-2 shadow-lg hover:bg-white/95 transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Filter Exploration Data'}
            </button>
            {explorationData && (
              <div className="mt-2 bg-white/90 backdrop-blur border border-gray-300 rounded px-3 py-2 shadow-lg text-sm">
                <div>Showing: {explorationData.totalDisplayed || 0} reports</div>
                <div>Database: {explorationData.totalInDatabase || 113850} total</div>
                <div className="text-xs text-gray-600 mt-1">
                  Source: WA Department of Mines
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}