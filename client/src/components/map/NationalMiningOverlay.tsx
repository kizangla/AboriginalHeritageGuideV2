/**
 * National Mining Overlay - Displays mining data from all Australian states
 * Uses marker clustering and stacked cards for clean visualization
 * Supports filtering by state, commodity, and status
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useQuery } from '@tanstack/react-query';
import { NationalMiningFilters, type NationalMiningFilters as FilterType } from './NationalMiningFilters';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

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
  depositType: string;
  status: string;
  owner?: string;
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
  if (lower.includes('silicon')) return '#87CEEB';
  if (lower.includes('manganese')) return '#8B4513';
  if (lower.includes('graphite')) return '#2F4F4F';
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

const extractMainCommodity = (commodities: string): string => {
  if (!commodities) return 'Other';
  const lower = commodities.toLowerCase();
  if (lower.includes('gold')) return 'Gold';
  if (lower.includes('iron')) return 'Iron';
  if (lower.includes('lithium')) return 'Lithium';
  if (lower.includes('copper')) return 'Copper';
  if (lower.includes('nickel')) return 'Nickel';
  if (lower.includes('rare earth')) return 'Rare Earth';
  if (lower.includes('cobalt')) return 'Cobalt';
  if (lower.includes('uranium')) return 'Uranium';
  if (lower.includes('zinc')) return 'Zinc';
  if (lower.includes('silicon')) return 'Silicon';
  if (lower.includes('manganese')) return 'Manganese';
  if (lower.includes('graphite')) return 'Graphite';
  if (lower.includes('vanadium')) return 'Vanadium';
  if (lower.includes('tungsten')) return 'Tungsten';
  return 'Other';
};

export default function NationalMiningOverlay({ map, showNationalMining }: NationalMiningOverlayProps) {
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<MiningDeposit | null>(null);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterType>({
    states: [],
    commodities: [],
    status: []
  });

  const { data: miningData, isLoading } = useQuery({
    queryKey: ['/api/national/critical-minerals'],
    queryFn: () => fetch('/api/national/critical-minerals?limit=1000').then(res => res.json()),
    enabled: showNationalMining && !!map,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
  });

  const depositStats = useMemo(() => {
    if (!miningData?.deposits) return null;
    
    const deposits = miningData.deposits as MiningDeposit[];
    const byState: Record<string, number> = {};
    const byCommodity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    deposits.forEach(d => {
      const stateAbbr = getStateAbbr(d.state);
      byState[stateAbbr] = (byState[stateAbbr] || 0) + 1;
      
      const commodity = extractMainCommodity(d.commodities || d.primaryCommodity);
      byCommodity[commodity] = (byCommodity[commodity] || 0) + 1;
      
      const status = d.status || 'Unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return { byState, byCommodity, byStatus, total: deposits.length };
  }, [miningData]);

  const filteredDeposits = useMemo(() => {
    if (!miningData?.deposits) return [];
    
    let deposits = miningData.deposits as MiningDeposit[];

    if (filters.states.length > 0) {
      deposits = deposits.filter(d => {
        const stateAbbr = getStateAbbr(d.state);
        return filters.states.includes(stateAbbr);
      });
    }

    if (filters.commodities.length > 0) {
      deposits = deposits.filter(d => {
        const commodity = extractMainCommodity(d.commodities || d.primaryCommodity);
        return filters.commodities.includes(commodity);
      });
    }

    if (filters.status.length > 0) {
      deposits = deposits.filter(d => filters.status.includes(d.status));
    }

    return deposits;
  }, [miningData, filters]);

  useEffect(() => {
    if (!map) return;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    if (!showNationalMining || isLoading) {
      return;
    }

    const deposits = filteredDeposits;

    if (deposits.length === 0) {
      console.log('No national mining deposits to display (filtered or no data)');
      return;
    }

    console.log(`Rendering ${deposits.length} national mining deposits with clustering...`);

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

    deposits.forEach((deposit) => {
      if (!deposit.coordinates?.lat || !deposit.coordinates?.lng) return;
      if (!Number.isFinite(deposit.coordinates.lat) || !Number.isFinite(deposit.coordinates.lng)) return;

      const commodityColor = getCommodityColor(deposit.primaryCommodity || deposit.commodities);
      const stateColor = getStateColor(deposit.state);

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

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        
        const containerPoint = map.latLngToContainerPoint(e.latlng);
        setCardPosition({ 
          x: Math.min(containerPoint.x + 20, window.innerWidth - 350), 
          y: Math.max(containerPoint.y - 50, 20) 
        });
        
        setSelectedDeposit(deposit);
      });

      clusterGroup.addLayer(marker);
    });

    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    console.log(`Added ${deposits.length} national mining deposits with clustering`);

  }, [map, showNationalMining, filteredDeposits, isLoading]);

  useEffect(() => {
    if (!map) return;

    const handleMapClick = () => {
      setSelectedDeposit(null);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map]);

  useEffect(() => {
    return () => {
      if (clusterGroupRef.current && map) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map]);

  if (!showNationalMining) return null;

  const activeFilterCount = filters.states.length + filters.commodities.length + filters.status.length;

  return (
    <>
      {/* Filter Toggle Button */}
      <div className="absolute left-4 top-20 z-[450]">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="bg-background/95 backdrop-blur-sm shadow-lg"
          data-testid="button-toggle-national-filters"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-indigo-500 text-white rounded-full px-1.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <NationalMiningFilters
        filters={filters}
        onFiltersChange={setFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        depositStats={depositStats || undefined}
      />

      {/* Deposit Detail Card */}
      {selectedDeposit && (
        <div
          className="absolute z-[600] w-80 bg-background/95 backdrop-blur-sm rounded-lg shadow-xl border overflow-hidden"
          style={{ left: cardPosition.x, top: cardPosition.y }}
          data-testid="deposit-detail-card"
        >
          <div 
            className="p-3 text-white"
            style={{ backgroundColor: getCommodityColor(selectedDeposit.primaryCommodity || selectedDeposit.commodities) }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">{selectedDeposit.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: getStateColor(selectedDeposit.state) }}
                  >
                    {getStateAbbr(selectedDeposit.state)}
                  </span>
                  <span className="text-sm opacity-90">{selectedDeposit.status}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setSelectedDeposit(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-3 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Commodities</div>
              <div className="text-sm font-medium">{selectedDeposit.commodities || selectedDeposit.primaryCommodity}</div>
            </div>
            
            {selectedDeposit.depositType && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Deposit Type</div>
                <div className="text-sm">{selectedDeposit.depositType}</div>
              </div>
            )}
            
            {selectedDeposit.owner && selectedDeposit.owner !== 'Not specified' && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Owner/Operator</div>
                <div className="text-sm">{selectedDeposit.owner}</div>
              </div>
            )}
            
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Coordinates</div>
              <div className="text-sm font-mono">
                {selectedDeposit.coordinates.lat.toFixed(4)}, {selectedDeposit.coordinates.lng.toFixed(4)}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                Official Government Data
              </div>
              <div className="text-xs text-muted-foreground">
                Source: {selectedDeposit.dataSource === 'geoscience_australia' ? 'Geoscience Australia' : selectedDeposit.dataSource}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
