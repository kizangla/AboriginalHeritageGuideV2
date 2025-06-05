/**
 * Exploration Overlay - Displays WA DMIRS exploration report boundaries with authentic mineral data
 */

import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';

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
}

export default function ExplorationOverlay({ map, showExploration, selectedTerritory }: ExplorationOverlayProps) {
  const [explorationLayer, setExplorationLayer] = useState<L.LayerGroup | null>(null);

  // Query exploration data for map bounds
  const { data: explorationData, isLoading } = useQuery({
    queryKey: ['/api/exploration/map-bounds'],
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

      // Create polygon for exploration report boundary
      const reportPolygon = L.polygon(report.coordinates, {
        fillColor: fillColor,
        fillOpacity: 0.4,
        color: fillColor,
        weight: 2,
        opacity: 0.8
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

  return null;
}