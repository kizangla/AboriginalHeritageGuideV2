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
    if (filters.commodity) {
      console.log('Adding commodity filter:', filters.commodity);
      params.append('commodity', filters.commodity);
    }
    if (filters.yearFrom) {
      console.log('Adding yearFrom filter:', filters.yearFrom);
      params.append('yearFrom', filters.yearFrom.toString());
    }
    if (filters.yearTo) {
      console.log('Adding yearTo filter:', filters.yearTo);
      params.append('yearTo', filters.yearTo.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    console.log('Built query params:', params.toString());
    return params.toString();
  };

  // Query exploration data for map bounds with filtering
  const { data: explorationData, isLoading, refetch } = useQuery({
    queryKey: ['/api/exploration/map-bounds', JSON.stringify(filters)],
    queryFn: () => fetch(`/api/exploration/map-bounds?${buildQueryParams()}`).then(res => res.json()),
    enabled: showExploration && !!map,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data when filters change
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

      // Create polygon for exploration report boundary with enhanced visibility like mining tenements
      const reportPolygon = L.polygon(report.coordinates, {
        fillColor: fillColor,
        fillOpacity: 0.8,
        color: '#000000',
        weight: 4,
        opacity: 1.0,
        interactive: true // Ensure polygon is clickable
      });

      // Add detailed popup with authentic WA DMIRS data matching mining tenement style
      reportPolygon.bindPopup(`
        <div style="min-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
            <h3 style="margin: 0; color: #1e293b; font-size: 16px; font-weight: bold; line-height: 1.3;">
              ${report.project}
            </h3>
            <div style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: 500;">
              WA DMIRS Report #${report.id}
            </div>
          </div>
          
          <div style="display: grid; gap: 8px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #475569; font-weight: 500;">Operator:</span>
              <span style="color: #1e293b; font-weight: 600; text-align: right; max-width: 150px;">${report.operator}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #475569; font-weight: 500;">Target Commodities:</span>
              <span style="color: #1e293b; font-weight: 600; text-align: right; max-width: 150px;">${report.targetCommodity}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #475569; font-weight: 500;">Report Year:</span>
              <span style="color: #1e293b; font-weight: 600;">${report.reportYear}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #475569; font-weight: 500;">Primary Commodity:</span>
              <span style="color: #059669; font-weight: 700;">${primaryCommodity}</span>
            </div>
          </div>
          
          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center;">
            <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;">Authentic Government Data</div>
            <div style="color: #059669; font-size: 12px; font-weight: 600;">WA Department of Mines & Petroleum</div>
          </div>
        </div>
      `, {
        maxWidth: 320,
        closeButton: true
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
    console.log('Applying exploration filters:', newFilters);
    setFilters(newFilters);
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