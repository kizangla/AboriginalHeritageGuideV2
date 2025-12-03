/**
 * Exploration Overlay - Displays WA DMIRS exploration report data with clustering
 * Uses marker clustering for better performance and cleaner visualization
 */

import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
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
  aNumber?: string;
  abstractUrl?: string;
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

// Commodity color mapping
const getCommodityColor = (commodity: string): string => {
  const lowerCommodity = commodity.toLowerCase();
  
  if (lowerCommodity.includes('gold')) return '#FFD700';
  if (lowerCommodity.includes('iron')) return '#B22222';
  if (lowerCommodity.includes('lithium')) return '#9370DB';
  if (lowerCommodity.includes('copper')) return '#B87333';
  if (lowerCommodity.includes('nickel')) return '#71797E';
  if (lowerCommodity.includes('zinc')) return '#708090';
  if (lowerCommodity.includes('uranium')) return '#32CD32';
  if (lowerCommodity.includes('diamond')) return '#B9F2FF';
  if (lowerCommodity.includes('coal')) return '#36454F';
  if (lowerCommodity.includes('rare earth')) return '#FF69B4';
  if (lowerCommodity.includes('tantalum')) return '#4B0082';
  if (lowerCommodity.includes('tin')) return '#D2691E';
  
  return '#6366F1'; // Default indigo
};

// Get commodity icon/emoji for cluster display
const getCommodityIcon = (commodity: string): string => {
  const lowerCommodity = commodity.toLowerCase();
  
  if (lowerCommodity.includes('gold')) return '🥇';
  if (lowerCommodity.includes('iron')) return '⚙️';
  if (lowerCommodity.includes('lithium')) return '🔋';
  if (lowerCommodity.includes('copper')) return '🔶';
  if (lowerCommodity.includes('nickel')) return '⚪';
  if (lowerCommodity.includes('diamond')) return '💎';
  if (lowerCommodity.includes('uranium')) return '☢️';
  if (lowerCommodity.includes('coal')) return '⬛';
  
  return '📋';
};

export default function ExplorationOverlay({ map, showExploration, selectedTerritory }: ExplorationOverlayProps) {
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(5);

  // Query exploration data
  const { data: explorationData, isLoading } = useQuery({
    queryKey: ['/api/exploration/map-bounds'],
    queryFn: () => fetch('/api/exploration/map-bounds?limit=2000').then(res => res.json()),
    enabled: showExploration && !!map,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Track zoom level for progressive detail
  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoom);
    setCurrentZoom(map.getZoom());

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  // Main effect to render exploration data
  useEffect(() => {
    if (!map) return;

    // Clean up existing layers
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    if (!showExploration || isLoading || !explorationData) {
      return;
    }

    const typedData = explorationData as ExplorationData;
    const reports = typedData.reports || [];

    if (reports.length === 0) {
      console.log('No exploration reports available');
      return;
    }

    console.log(`Rendering ${reports.length} exploration reports with clustering...`);

    // Create marker cluster group with custom styling
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 12,
      iconCreateFunction: (cluster) => {
        const childCount = cluster.getChildCount();
        
        // Get dominant commodity in cluster
        const markers = cluster.getAllChildMarkers();
        const commodityCounts: Record<string, number> = {};
        
        markers.forEach((marker: any) => {
          const commodity = marker.options.commodity || 'other';
          commodityCounts[commodity] = (commodityCounts[commodity] || 0) + 1;
        });
        
        const dominantCommodity = Object.entries(commodityCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
        
        const color = getCommodityColor(dominantCommodity);
        
        // Size based on count
        let size = 40;
        let fontSize = 12;
        if (childCount > 100) {
          size = 55;
          fontSize = 14;
        } else if (childCount > 50) {
          size = 50;
          fontSize = 13;
        } else if (childCount > 10) {
          size = 45;
          fontSize = 12;
        }

        return L.divIcon({
          html: `
            <div style="
              background: ${color};
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: ${fontSize}px;
              border: 3px solid white;
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            ">
              ${childCount}
            </div>
          `,
          className: 'exploration-cluster-icon',
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2)
        });
      }
    });

    // Create polygon layer for detailed view
    const polygonLayer = L.layerGroup();

    // Add markers for each report
    reports.forEach((report) => {
      if (!report.coordinates || report.coordinates.length === 0) return;

      // Calculate center of polygon
      const centerLat = report.coordinates.reduce((sum, coord) => sum + coord[0], 0) / report.coordinates.length;
      const centerLng = report.coordinates.reduce((sum, coord) => sum + coord[1], 0) / report.coordinates.length;

      if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return;

      const primaryCommodity = report.targetCommodity?.split(';')[0]?.trim() || 'Unknown';
      const color = getCommodityColor(primaryCommodity);

      // Create circle marker for clustering
      const marker = L.circleMarker([centerLat, centerLng], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
        commodity: primaryCommodity // Store for cluster icon
      } as any);

      // Create popup content
      const popupContent = `
        <div style="min-width: 260px; font-family: system-ui, -apple-system, sans-serif;">
          <div style="background: linear-gradient(135deg, ${color}22, ${color}44); padding: 12px; margin: -14px -14px 12px -14px; border-radius: 4px 4px 0 0;">
            <h3 style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">
              ${report.project || 'Exploration Report'}
            </h3>
            <div style="color: #64748b; font-size: 11px; margin-top: 4px;">
              Report ${report.aNumber || report.id} • ${report.reportYear || 'Unknown year'}
            </div>
          </div>
          
          <div style="display: grid; gap: 8px; font-size: 13px;">
            <div style="display: flex; gap: 8px; align-items: flex-start;">
              <span style="color: #64748b; min-width: 80px;">Operator:</span>
              <span style="color: #1e293b; font-weight: 500;">${report.operator || 'Unknown'}</span>
            </div>
            
            <div style="display: flex; gap: 8px; align-items: flex-start;">
              <span style="color: #64748b; min-width: 80px;">Commodity:</span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; display: inline-block;"></span>
                <span style="color: #1e293b; font-weight: 500;">${report.targetCommodity || 'Unknown'}</span>
              </span>
            </div>
            
            ${report.abstractUrl ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <a href="${report.abstractUrl}" target="_blank" rel="noopener noreferrer" 
                 style="color: #6366F1; text-decoration: none; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                View Full Report →
              </a>
            </div>
            ` : ''}
          </div>
          
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center;">
            <span style="color: #64748b; font-size: 10px;">Source: WA Dept of Mines (DMIRS)</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
      clusterGroup.addLayer(marker);

      // Add polygon for detailed view at high zoom
      if (currentZoom >= 11 && report.coordinates.length > 2) {
        const polygon = L.polygon(report.coordinates, {
          fillColor: color,
          fillOpacity: 0.25,
          color: color,
          weight: 2,
          opacity: 0.8,
          dashArray: '5, 5'
        });
        polygon.bindPopup(popupContent, { maxWidth: 300 });
        polygonLayer.addLayer(polygon);
      }
    });

    // Add layers to map
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    if (currentZoom >= 11) {
      polygonLayer.addTo(map);
      polygonLayerRef.current = polygonLayer;
    }

    console.log(`Added ${reports.length} exploration reports with clustering`);

  }, [map, showExploration, explorationData, isLoading, currentZoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clusterGroupRef.current && map) {
        map.removeLayer(clusterGroupRef.current);
      }
      if (polygonLayerRef.current && map) {
        map.removeLayer(polygonLayerRef.current);
      }
    };
  }, [map]);

  // Don't render any UI - stats are shown in the layer control
  if (!showExploration) return null;

  return null;
}
