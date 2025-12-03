/**
 * National Mining Overlay - Displays mining data from all Australian states
 * Uses marker clustering and stacked cards for clean visualization
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useQuery } from '@tanstack/react-query';
import StackedReportCards from './StackedReportCards';

interface NationalMiningOverlayProps {
  map: L.Map | null;
  showNationalMining: boolean;
}

interface MiningDeposit {
  id: string;
  name: string;
  state: string;
  commodities: string;
  primaryCommodity: string;
  status: string;
  owner?: string;
  operator?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  dataSource: string;
}

interface NationalMiningData {
  success: boolean;
  deposits: MiningDeposit[];
  totalCount: number;
  source: string;
}

// State colors for visual distinction
const getStateColor = (state: string): string => {
  const upperState = state?.toUpperCase() || '';
  if (upperState.includes('WESTERN') || upperState === 'WA') return '#FF6B35';
  if (upperState.includes('SOUTH') || upperState === 'SA') return '#2EC4B6';
  if (upperState.includes('QUEENSLAND') || upperState === 'QLD') return '#9B5DE5';
  if (upperState.includes('NEW SOUTH') || upperState === 'NSW') return '#00BBF9';
  if (upperState.includes('VICTORIA') || upperState === 'VIC') return '#00F5D4';
  if (upperState.includes('NORTHERN') || upperState === 'NT') return '#FEE440';
  if (upperState.includes('TASMANIA') || upperState === 'TAS') return '#F15BB5';
  return '#6366F1';
};

// Commodity colors
const getCommodityColor = (commodity: string): string => {
  const lower = (commodity || '').toLowerCase();
  if (lower.includes('gold')) return '#FFD700';
  if (lower.includes('iron')) return '#B22222';
  if (lower.includes('lithium')) return '#9370DB';
  if (lower.includes('copper')) return '#B87333';
  if (lower.includes('nickel')) return '#71797E';
  if (lower.includes('rare earth')) return '#FF69B4';
  if (lower.includes('cobalt')) return '#0047AB';
  if (lower.includes('uranium')) return '#32CD32';
  if (lower.includes('zinc')) return '#708090';
  return '#6366F1';
};

const getStateAbbr = (state: string): string => {
  const upperState = state?.toUpperCase() || '';
  if (upperState.includes('WESTERN') || upperState === 'WA') return 'WA';
  if (upperState.includes('SOUTH') && !upperState.includes('NEW')) return 'SA';
  if (upperState.includes('QUEENSLAND') || upperState === 'QLD') return 'QLD';
  if (upperState.includes('NEW SOUTH') || upperState === 'NSW') return 'NSW';
  if (upperState.includes('VICTORIA') || upperState === 'VIC') return 'VIC';
  if (upperState.includes('NORTHERN') || upperState === 'NT') return 'NT';
  if (upperState.includes('TASMANIA') || upperState === 'TAS') return 'TAS';
  return state?.slice(0, 3) || '???';
};

export default function NationalMiningOverlay({ map, showNationalMining }: NationalMiningOverlayProps) {
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [selectedDeposits, setSelectedDeposits] = useState<any[]>([]);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const allDepositsRef = useRef<MiningDeposit[]>([]);

  // Fetch national critical minerals data
  const { data: miningData, isLoading } = useQuery({
    queryKey: ['/api/national/critical-minerals'],
    queryFn: () => fetch('/api/national/critical-minerals?limit=1000').then(res => res.json()),
    enabled: showNationalMining && !!map,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Main render effect
  useEffect(() => {
    if (!map) return;

    // Cleanup existing layer
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    if (!showNationalMining || isLoading || !miningData) {
      allDepositsRef.current = [];
      return;
    }

    const typedData = miningData as NationalMiningData;
    const deposits = typedData.deposits || [];
    allDepositsRef.current = deposits;

    if (deposits.length === 0) {
      console.log('No national mining deposits available');
      return;
    }

    console.log(`Rendering ${deposits.length} national mining deposits with clustering...`);

    // Create cluster group
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 10,
      iconCreateFunction: (cluster) => {
        const childCount = cluster.getChildCount();
        const markers = cluster.getAllChildMarkers();
        
        // Get state distribution in cluster
        const stateCounts: Record<string, number> = {};
        markers.forEach((marker: any) => {
          const state = marker.options.state || 'Unknown';
          stateCounts[state] = (stateCounts[state] || 0) + 1;
        });
        
        const dominantState = Object.entries(stateCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        
        const color = getStateColor(dominantState);
        
        let size = 40;
        if (childCount > 100) size = 55;
        else if (childCount > 50) size = 50;
        else if (childCount > 20) size = 45;

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
          className: 'national-mining-cluster-icon',
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2)
        });
      }
    });

    // Add markers for each deposit
    deposits.forEach((deposit) => {
      if (!deposit.coordinates?.lat || !deposit.coordinates?.lng) return;
      if (!Number.isFinite(deposit.coordinates.lat) || !Number.isFinite(deposit.coordinates.lng)) return;

      const commodityColor = getCommodityColor(deposit.primaryCommodity);
      const stateColor = getStateColor(deposit.state);

      // Create diamond-shaped marker for deposits
      const marker = L.circleMarker([deposit.coordinates.lat, deposit.coordinates.lng], {
        radius: 10,
        fillColor: commodityColor,
        color: stateColor,
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85,
        state: deposit.state,
        commodity: deposit.primaryCommodity
      } as any);

      // Handle click to show details
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        
        const containerPoint = map.latLngToContainerPoint(e.latlng);
        setCardPosition({ 
          x: containerPoint.x + 20, 
          y: containerPoint.y - 50 
        });
        
        // Convert deposit to card format
        const cardData = {
          id: deposit.id,
          project: deposit.name,
          operator: deposit.owner || deposit.operator || 'Unknown',
          targetCommodity: deposit.commodities || deposit.primaryCommodity,
          reportYear: null,
          aNumber: `${getStateAbbr(deposit.state)}-${deposit.id}`,
          status: deposit.status
        };
        
        setSelectedDeposits([cardData]);
      });

      clusterGroup.addLayer(marker);
    });

    // Add to map
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    console.log(`Added ${deposits.length} national mining deposits with clustering`);

  }, [map, showNationalMining, miningData, isLoading]);

  // Close cards when clicking elsewhere on map
  useEffect(() => {
    if (!map) return;

    const handleMapClick = () => {
      setSelectedDeposits([]);
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
    };
  }, [map]);

  if (!showNationalMining) return null;

  return (
    <>
      {selectedDeposits.length > 0 && (
        <StackedReportCards
          reports={selectedDeposits}
          onClose={() => setSelectedDeposits([])}
          position={cardPosition}
        />
      )}
    </>
  );
}
