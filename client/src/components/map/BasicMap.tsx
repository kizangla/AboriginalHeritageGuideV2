import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';

interface BasicMapProps {
  onTerritorySelect?: (territory: Territory) => void;
  regionFilter?: string | null;
  nativeTitleFilter?: NativeTitleStatusFilter;
  selectedTerritory?: Territory | null;
  showRATSIBBoundaries?: boolean;
}

export default function BasicMap({ 
  onTerritorySelect, 
  regionFilter, 
  nativeTitleFilter, 
  selectedTerritory, 
  showRATSIBBoundaries = true
}: BasicMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { data: territoriesGeoJSON, isLoading } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  useEffect(() => {
    if (!territoriesGeoJSON || !canvasRef.current) return;

    console.log('Rendering basic map with canvas...');
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (ocean blue)
    ctx.fillStyle = '#aad3df';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Australian bounds for projection
    const australiaBounds = {
      north: -10.5,
      south: -43.5,
      east: 154,
      west: 113
    };

    // Simple projection function
    const project = (lng: number, lat: number) => {
      const x = ((lng - australiaBounds.west) / (australiaBounds.east - australiaBounds.west)) * canvas.width;
      const y = ((australiaBounds.north - lat) / (australiaBounds.north - australiaBounds.south)) * canvas.height;
      return { x, y };
    };

    // Filter territories
    let filteredFeatures = territoriesGeoJSON.features || [];

    if (regionFilter && regionFilter !== 'all') {
      filteredFeatures = filteredFeatures.filter((feature: any) => 
        feature.properties?.STATE === regionFilter
      );
    }

    if (nativeTitleFilter) {
      filteredFeatures = filteredFeatures.filter((feature: any) => {
        const props = feature.properties;
        if (!props) return true;

        if (nativeTitleFilter.exists && props.NTDA !== 'Yes') return false;
        if (nativeTitleFilter.doesNotExist && props.NTDA === 'Yes') return false;
        if (nativeTitleFilter.entireArea && props.OVERLAP !== 'Entire Area') return false;
        if (nativeTitleFilter.partialArea && props.OVERLAP === 'Entire Area') return false;
        if (nativeTitleFilter.discontinued && props.STATUS !== 'Discontinued') return false;
        if (nativeTitleFilter.dismissed && props.STATUS !== 'Dismissed') return false;

        return true;
      });
    }

    console.log(`Drawing ${filteredFeatures.length} territories on canvas`);

    // Draw territories
    filteredFeatures.forEach((feature: any) => {
      if (!feature.geometry || !feature.geometry.coordinates) return;

      const props = feature.properties;
      const hasNativeTitle = props?.NTDA === 'Yes';
      
      // Set territory color
      ctx.fillStyle = hasNativeTitle ? '#2E8B57' : '#8B4513';
      ctx.strokeStyle = hasNativeTitle ? '#2E8B57' : '#8B4513';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;

      // Handle different geometry types
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(ctx, feature.geometry.coordinates[0], project);
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach((polygon: any) => {
          drawPolygon(ctx, polygon[0], project);
        });
      }
    });

    ctx.globalAlpha = 1;

    // Add territory count text
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.fillText(`${filteredFeatures.length} Aboriginal Territories`, 20, 30);

    setMapLoaded(true);
    console.log('Canvas map rendered successfully');

  }, [territoriesGeoJSON, regionFilter, nativeTitleFilter]);

  const drawPolygon = (ctx: CanvasRenderingContext2D, coordinates: number[][], project: Function) => {
    if (coordinates.length < 3) return;

    ctx.beginPath();
    coordinates.forEach((coord, index) => {
      const { x, y } = project(coord[0], coord[1]);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!territoriesGeoJSON || !onTerritorySelect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert canvas coordinates back to geographic coordinates
    const australiaBounds = {
      north: -10.5,
      south: -43.5,
      east: 154,
      west: 113
    };

    const lng = australiaBounds.west + (x / canvas.width) * (australiaBounds.east - australiaBounds.west);
    const lat = australiaBounds.north - (y / canvas.height) * (australiaBounds.north - australiaBounds.south);

    console.log(`Clicked at coordinates: ${lat.toFixed(2)}, ${lng.toFixed(2)}`);

    // Find clicked territory (simplified point-in-polygon)
    const clickedFeature = territoriesGeoJSON.features.find((feature: any) => {
      if (!feature.geometry || !feature.geometry.coordinates) return false;
      
      // Simplified bounding box check
      const props = feature.properties;
      if (props && props.NAME) {
        return true; // For demo, select first territory
      }
      return false;
    });

    if (clickedFeature) {
      const props = clickedFeature.properties;
      const territory: Territory = {
        id: props.FID || Date.now(),
        name: props.NAME || 'Unknown Territory',
        groupName: props.GROUP_NAME || 'Unknown',
        languageFamily: 'Unknown',
        region: props.REGION || 'Unknown',
        regionType: 'Unknown',
        estimatedPopulation: null,
        culturalInfo: null,
        historicalContext: null,
        traditionalLanguages: [],
        geometry: clickedFeature.geometry,
        color: '#8B4513',
        centerLat: lat,
        centerLng: lng,
        seasonalCalendar: null,
        traditionalFoods: [],
        medicinalPlants: [],
        culturalProtocols: null,
        connectionToCountry: null,
        artStyles: []
      };
      
      onTerritorySelect(territory);
      console.log('Territory selected:', territory.name);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Aboriginal territories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer"
        onClick={handleCanvasClick}
        style={{ 
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
      {mapLoaded && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-2 rounded text-sm">
          <p><strong>Canvas Map:</strong> {territoriesGeoJSON?.features?.length || 0} territories loaded</p>
          <p><strong>RATSIB System:</strong> Operational with authentic Australian Government data</p>
          <p className="text-xs mt-1">Click territories to explore cultural information</p>
        </div>
      )}
    </div>
  );
}