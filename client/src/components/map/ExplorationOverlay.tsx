/**
 * Exploration Overlay - Displays WA DMIRS exploration report data with clustering
 * Uses marker clustering and stacked cards for overlapping reports
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useQuery } from '@tanstack/react-query';
import StackedReportCards from './StackedReportCards';

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
  
  return '#6366F1';
};

export default function ExplorationOverlay({ map, showExploration, selectedTerritory }: ExplorationOverlayProps) {
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const [selectedReports, setSelectedReports] = useState<ExplorationReport[]>([]);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const allReportsRef = useRef<ExplorationReport[]>([]);

  // Query exploration data
  const { data: explorationData, isLoading } = useQuery({
    queryKey: ['/api/exploration/map-bounds'],
    queryFn: () => fetch('/api/exploration/map-bounds?limit=2000').then(res => res.json()),
    enabled: showExploration && !!map,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Track zoom level
  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      setCurrentZoom(map.getZoom());
      setSelectedReports([]); // Close cards on zoom
    };

    map.on('zoomend', handleZoom);
    setCurrentZoom(map.getZoom());

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  // Find reports near a clicked location
  const findReportsNearLocation = useCallback((lat: number, lng: number, radiusDegrees: number = 0.05): ExplorationReport[] => {
    const reports = allReportsRef.current;
    const nearbyReports: ExplorationReport[] = [];

    reports.forEach(report => {
      if (!report.coordinates || report.coordinates.length === 0) return;

      const centerLat = report.coordinates.reduce((sum, coord) => sum + coord[0], 0) / report.coordinates.length;
      const centerLng = report.coordinates.reduce((sum, coord) => sum + coord[1], 0) / report.coordinates.length;

      const distance = Math.sqrt(Math.pow(centerLat - lat, 2) + Math.pow(centerLng - lng, 2));
      
      if (distance <= radiusDegrees) {
        nearbyReports.push(report);
      }
    });

    return nearbyReports;
  }, []);

  // Main render effect
  useEffect(() => {
    if (!map) return;

    // Cleanup existing layers
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    if (!showExploration || isLoading || !explorationData) {
      allReportsRef.current = [];
      return;
    }

    const typedData = explorationData as ExplorationData;
    const reports = typedData.reports || [];
    allReportsRef.current = reports;

    if (reports.length === 0) {
      console.log('No exploration reports available');
      return;
    }

    console.log(`Rendering ${reports.length} exploration reports with clustering...`);

    // Create cluster group
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 13,
      iconCreateFunction: (cluster) => {
        const childCount = cluster.getChildCount();
        const markers = cluster.getAllChildMarkers();
        const commodityCounts: Record<string, number> = {};
        
        markers.forEach((marker: any) => {
          const commodity = marker.options.commodity || 'other';
          commodityCounts[commodity] = (commodityCounts[commodity] || 0) + 1;
        });
        
        const dominantCommodity = Object.entries(commodityCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
        
        const color = getCommodityColor(dominantCommodity);
        
        let size = 36;
        if (childCount > 100) size = 50;
        else if (childCount > 50) size = 45;
        else if (childCount > 10) size = 40;

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
              font-size: ${size > 45 ? 14 : 12}px;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
              cursor: pointer;
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

    // Group reports by location for stacked display
    const locationGroups = new Map<string, ExplorationReport[]>();
    
    reports.forEach(report => {
      if (!report.coordinates || report.coordinates.length === 0) return;

      const centerLat = report.coordinates.reduce((sum, coord) => sum + coord[0], 0) / report.coordinates.length;
      const centerLng = report.coordinates.reduce((sum, coord) => sum + coord[1], 0) / report.coordinates.length;

      if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return;

      // Group by rounded location (0.02 degree grid ~ 2km)
      const locationKey = `${centerLat.toFixed(2)}_${centerLng.toFixed(2)}`;
      
      if (!locationGroups.has(locationKey)) {
        locationGroups.set(locationKey, []);
      }
      locationGroups.get(locationKey)!.push(report);
    });

    // Create markers for each location group
    locationGroups.forEach((groupReports, locationKey) => {
      const [latStr, lngStr] = locationKey.split('_');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      // Calculate actual center from reports
      let totalLat = 0, totalLng = 0, count = 0;
      groupReports.forEach(report => {
        const cLat = report.coordinates.reduce((sum, coord) => sum + coord[0], 0) / report.coordinates.length;
        const cLng = report.coordinates.reduce((sum, coord) => sum + coord[1], 0) / report.coordinates.length;
        totalLat += cLat;
        totalLng += cLng;
        count++;
      });
      const avgLat = totalLat / count;
      const avgLng = totalLng / count;

      const primaryCommodity = groupReports[0].targetCommodity?.split(';')[0]?.trim() || 'Unknown';
      const color = getCommodityColor(primaryCommodity);

      // Create marker
      const markerSize = groupReports.length > 1 ? 12 : 8;
      const marker = L.circleMarker([avgLat, avgLng], {
        radius: markerSize,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
        commodity: primaryCommodity
      } as any);

      // Handle click to show stacked cards
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        
        const containerPoint = map.latLngToContainerPoint(e.latlng);
        setCardPosition({ 
          x: containerPoint.x + 20, 
          y: containerPoint.y - 50 
        });
        setSelectedReports(groupReports);
      });

      clusterGroup.addLayer(marker);
    });

    // Add polygon layer for high zoom
    const polygonLayer = L.layerGroup();
    
    if (currentZoom >= 12) {
      reports.forEach(report => {
        if (!report.coordinates || report.coordinates.length < 3) return;

        const primaryCommodity = report.targetCommodity?.split(';')[0]?.trim() || 'Unknown';
        const color = getCommodityColor(primaryCommodity);

        const polygon = L.polygon(report.coordinates, {
          fillColor: color,
          fillOpacity: 0.2,
          color: color,
          weight: 2,
          opacity: 0.7,
          dashArray: '4, 4'
        });

        polygon.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          
          const nearbyReports = findReportsNearLocation(e.latlng.lat, e.latlng.lng, 0.03);
          if (nearbyReports.length > 0) {
            const containerPoint = map.latLngToContainerPoint(e.latlng);
            setCardPosition({ 
              x: containerPoint.x + 20, 
              y: containerPoint.y - 50 
            });
            setSelectedReports(nearbyReports);
          }
        });

        polygonLayer.addLayer(polygon);
      });
    }

    // Add to map
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    if (currentZoom >= 12) {
      polygonLayer.addTo(map);
      polygonLayerRef.current = polygonLayer;
    }

    console.log(`Added ${reports.length} exploration reports with stacked card support`);

  }, [map, showExploration, explorationData, isLoading, currentZoom, findReportsNearLocation]);

  // Close cards when clicking elsewhere on map
  useEffect(() => {
    if (!map) return;

    const handleMapClick = () => {
      setSelectedReports([]);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map]);

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

  if (!showExploration) return null;

  return (
    <>
      {selectedReports.length > 0 && (
        <StackedReportCards
          reports={selectedReports}
          onClose={() => setSelectedReports([])}
          position={cardPosition}
        />
      )}
    </>
  );
}
