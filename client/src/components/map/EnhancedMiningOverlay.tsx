import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface MiningTenement {
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
}

import type { MiningFilters } from './MiningFilterPanel';

interface EnhancedMiningOverlayProps {
  map: L.Map | null;
  showMining: boolean;
  selectedTerritory?: any;
  onLoadingChange?: (isLoading: boolean, progress?: number) => void;
  filters?: MiningFilters;
}

// Get style for tenement based on type
function getTenementStyle(tenement: MiningTenement) {
  const baseStyle = {
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.5,
  };

  const typeKey = tenement.type?.toLowerCase() || '';
  
  if (typeKey.includes('mining lease')) {
    return { ...baseStyle, color: '#dc2626', fillColor: '#fca5a5' };
  } else if (typeKey.includes('exploration')) {
    return { ...baseStyle, color: '#2563eb', fillColor: '#93c5fd' };
  } else if (typeKey.includes('prospecting')) {
    return { ...baseStyle, color: '#16a34a', fillColor: '#86efac' };
  } else if (typeKey.includes('general purpose')) {
    return { ...baseStyle, color: '#7c3aed', fillColor: '#c4b5fd' };
  } else {
    return { ...baseStyle, color: '#f59e0b', fillColor: '#fde68a' };
  }
}

export default function EnhancedMiningOverlay({ 
  map, 
  showMining, 
  selectedTerritory,
  onLoadingChange,
  filters 
}: EnhancedMiningOverlayProps) {
  const [miningLayers, setMiningLayers] = useState<{
    polygons: L.LayerGroup | null;
    clusters: L.MarkerClusterGroup | null;
  }>({ polygons: null, clusters: null });
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const loadedTenementsRef = useRef<Set<string>>(new Set());

  // Get appropriate detail level based on zoom
  const getDetailLevel = (zoom: number) => {
    if (zoom >= 12) return 'full'; // Show all details
    if (zoom >= 10) return 'medium'; // Show medium details
    if (zoom >= 8) return 'simplified'; // Show simplified polygons
    return 'clustered'; // Show only clusters
  };

  // Query mining data with progressive loading
  // Extract bounds to stable values
  const [boundsKey, setBoundsKey] = useState<string>('');
  
  useEffect(() => {
    if (!map) return;
    
    const updateBounds = () => {
      const bounds = map.getBounds();
      const key = `${bounds.getNorth()}_${bounds.getSouth()}_${bounds.getEast()}_${bounds.getWest()}`;
      setBoundsKey(key);
    };
    
    map.on('moveend', updateBounds);
    updateBounds(); // Initial bounds
    
    return () => {
      map.off('moveend', updateBounds);
    };
  }, [map]);

  const { data: miningData, isLoading, isFetching } = useQuery({
    queryKey: ['/api/mining/map-bounds', showMining, boundsKey, currentZoom, filters],
    queryFn: async () => {
      if (!showMining || !map) return null;
      
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const detailLevel = getDetailLevel(zoom);
      
      // Adjust limit based on zoom level
      const limit = zoom >= 10 ? 1000 : zoom >= 8 ? 500 : 200;
      
      const params = new URLSearchParams({
        north: bounds.getNorth().toString(),
        south: bounds.getSouth().toString(),
        east: bounds.getEast().toString(),
        west: bounds.getWest().toString(),
        limit: limit.toString(),
        detailLevel,
        zoom: zoom.toString()
      });
      
      // Add filters to the query
      if (filters) {
        if (filters.tenementTypes.length > 0) {
          params.append('types', filters.tenementTypes.join(','));
        }
        if (filters.status.length > 0) {
          params.append('status', filters.status.join(','));
        }
        if (filters.holders.length > 0) {
          params.append('holders', filters.holders.join(','));
        }
        if (filters.mineralTypes.length > 0) {
          params.append('minerals', filters.mineralTypes.join(','));
        }
        if (filters.majorCompaniesOnly) {
          params.append('majorCompaniesOnly', 'true');
        }
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.areaRange.min > 0 || filters.areaRange.max < 100000) {
          params.append('areaMin', filters.areaRange.min.toString());
          params.append('areaMax', filters.areaRange.max.toString());
        }
        if (filters.dateRange.start) {
          params.append('grantDateFrom', filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          params.append('grantDateTo', filters.dateRange.end);
        }
      }
      
      onLoadingChange?.(true, 0);
      
      const response = await fetch(`/api/mining/map-bounds?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch mining data: ${response.status}`);
      }
      
      const data = await response.json();
      onLoadingChange?.(false, 100);
      
      return data;
    },
    enabled: showMining && !!map,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes for zoom-based cache
  });

  // Monitor zoom changes
  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      const newZoom = map.getZoom();
      if (Math.abs(newZoom - currentZoom) >= 1) {
        setCurrentZoom(newZoom);
      }
    };

    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, currentZoom]);

  // Update loading state
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading || isFetching);
    }
  }, [isLoading, isFetching]); // Removed onLoadingChange from deps to prevent infinite loop

  // Render mining data with clustering
  useEffect(() => {
    if (!map || !showMining) return;

    // Clean up existing layers
    if (miningLayers.polygons) {
      map.removeLayer(miningLayers.polygons);
    }
    if (miningLayers.clusters) {
      map.removeLayer(miningLayers.clusters);
    }

    if (!miningData?.tenements) return;
    
    // Clear the loaded tenements set when data changes (filters, bounds, zoom)
    // This ensures we don't skip tenements after filter/zoom changes
    loadedTenementsRef.current.clear();

    const zoom = map.getZoom();
    const detailLevel = getDetailLevel(zoom);
    
    console.log(`Loading ${miningData.tenements.length} tenements at zoom ${zoom} (${detailLevel})`);

    // Create layer groups
    const polygonLayer = L.layerGroup();
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 50,
      chunkDelay: 10,
      maxClusterRadius: 60,
      disableClusteringAtZoom: 10,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let className = 'marker-cluster-small';
        
        if (count > 100) {
          size = 'large';
          className = 'marker-cluster-large';
        } else if (count > 50) {
          size = 'medium';
          className = 'marker-cluster-medium';
        }

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster ${className}`,
          iconSize: L.point(40, 40)
        });
      }
    });

    let loadedCount = 0;
    const updateProgress = () => {
      loadedCount++;
      if (loadedCount % 50 === 0) {
        const progress = (loadedCount / miningData.tenements.length) * 100;
        onLoadingChange?.(true, progress);
      }
    };

    // Process tenements based on detail level
    miningData.tenements.forEach((tenement: MiningTenement) => {
      if (!tenement.coordinates || tenement.coordinates.length === 0) return;
      
      // Skip if already loaded (prevents duplicates within same render)
      if (loadedTenementsRef.current.has(tenement.id)) return;
      loadedTenementsRef.current.add(tenement.id);
      
      const style = getTenementStyle(tenement);
      
      if (detailLevel === 'clustered' || detailLevel === 'simplified') {
        // Create marker for clustering
        const centerLat = tenement.coordinates.reduce((sum, coord) => sum + coord[1], 0) / tenement.coordinates.length;
        const centerLng = tenement.coordinates.reduce((sum, coord) => sum + coord[0], 0) / tenement.coordinates.length;
        
        const marker = L.marker([centerLat, centerLng], {
          icon: L.divIcon({
            className: 'mining-marker',
            html: `<div style="background-color: ${style.fillColor}; border: 2px solid ${style.color};" class="w-4 h-4 rounded-full"></div>`,
            iconSize: L.point(16, 16)
          })
        });

        marker.bindPopup(`
          <div class="p-3 min-w-[250px]">
            <h4 class="font-bold text-base mb-2">${tenement.id}</h4>
            <div class="space-y-1 text-sm">
              <p><strong>Type:</strong> ${tenement.type}</p>
              <p><strong>Status:</strong> ${tenement.status}</p>
              <p><strong>Holder:</strong> ${tenement.holder}</p>
              ${tenement.area ? `<p><strong>Area:</strong> ${tenement.area.toFixed(2)} km²</p>` : ''}
            </div>
          </div>
        `);

        clusterGroup.addLayer(marker);
        
      } else {
        // Create full polygon for detailed view
        const polygon = L.polygon(
          tenement.coordinates.map(coord => [coord[1], coord[0]]),
          style
        );

        // Enhanced interactivity
        polygon.on('mouseover', function(e) {
          const layer = e.target;
          layer.setStyle({
            weight: 4,
            opacity: 1,
            fillOpacity: 0.7
          });
          layer.bringToFront();
        });

        polygon.on('mouseout', function(e) {
          const layer = e.target;
          layer.setStyle(style);
        });

        polygon.bindPopup(`
          <div class="p-4 min-w-[300px] max-w-[400px]">
            <h4 class="font-bold text-lg mb-3">${tenement.id}</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p class="text-gray-600">Type</p>
                <p class="font-medium">${tenement.type}</p>
              </div>
              <div>
                <p class="text-gray-600">Status</p>
                <p class="font-medium">${tenement.status}</p>
              </div>
              <div class="col-span-2">
                <p class="text-gray-600">Holder</p>
                <p class="font-medium">${tenement.holder}</p>
              </div>
              ${tenement.area ? `
              <div>
                <p class="text-gray-600">Area</p>
                <p class="font-medium">${tenement.area.toFixed(2)} km²</p>
              </div>
              ` : ''}
              ${tenement.mineralTypes?.length ? `
              <div class="col-span-2">
                <p class="text-gray-600">Minerals</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  ${tenement.mineralTypes.map(m => `<span class="px-2 py-1 bg-gray-100 rounded text-xs">${m}</span>`).join('')}
                </div>
              </div>
              ` : ''}
            </div>
            ${detailLevel === 'full' ? `
            <div class="mt-3 pt-3 border-t text-xs text-gray-500">
              <p>Grant: ${tenement.grantDate || 'N/A'}</p>
              <p>Expiry: ${tenement.expiryDate || 'N/A'}</p>
            </div>
            ` : ''}
          </div>
        `);

        polygonLayer.addLayer(polygon);
      }
      
      loadedTenementsRef.current.add(tenement.id);
      updateProgress();
    });

    // Add layers to map
    if (detailLevel === 'clustered' || detailLevel === 'simplified') {
      clusterGroup.addTo(map);
    } else {
      polygonLayer.addTo(map);
    }

    setMiningLayers({ polygons: polygonLayer, clusters: clusterGroup });
    onLoadingChange?.(false, 100);

    console.log(`Loaded ${loadedCount} mining tenements (${detailLevel} detail)`);

    return () => {
      if (polygonLayer) map.removeLayer(polygonLayer);
      if (clusterGroup) map.removeLayer(clusterGroup);
    };
  }, [map, showMining, miningData]);

  return null;
}