import { useState, useMemo } from 'react';
import SimpleMap from '@/components/map/SimpleMap';
import TerritoryModal from '@/components/map/TerritoryModal';
import TerritoryFilter from '@/components/TerritoryFilter';
import TerritoryInfoPanel from '@/components/TerritoryInfoPanel';
import UnifiedSearch from '@/components/map/UnifiedSearch';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Territory } from '@shared/schema';

export default function MapPage() {
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const { data: territoriesGeoJSON } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Calculate territory statistics by region
  const territoryStats = useMemo(() => {
    if (!territoriesGeoJSON?.features) {
      return { total: 0, kimberley: 0, southeast: 0, riverine: 0 };
    }

    const stats = {
      total: territoriesGeoJSON.features.length,
      kimberley: 0,
      southeast: 0,
      riverine: 0
    };

    territoriesGeoJSON.features.forEach((feature: any) => {
      const region = feature.properties?.Region || feature.properties?.region;
      if (region === 'Kimberley') stats.kimberley++;
      else if (region === 'Southeast') stats.southeast++;
      else if (region === 'Riverine') stats.riverine++;
    });

    return stats;
  }, [territoriesGeoJSON]);

  const handleTerritorySelect = (territory: Territory) => {
    setSelectedTerritory(territory);
  };

  const handleRegionFilter = (region: string | null) => {
    setSelectedRegion(region);
    // Filter will be applied by the map component
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSearch = (lat: number, lng: number) => {
    if (mapInstance) {
      mapInstance.setView([lat, lng], 15);
    }
  };

  const handleResetView = () => {
    if (mapInstance) {
      mapInstance.setView([-25.2744, 133.7751], 5);
    }
  };

  return (
    <div className="h-screen w-screen bg-white">
      {/* Minimalist Header */}
      <div className="absolute top-0 left-0 right-0 z-[1010] bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            </svg>
            <h1 className="text-lg font-medium text-gray-900">Indigenous Australia</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/business-search">
              <Button variant="outline" size="sm" className="text-sm">
                <Building2 className="w-4 h-4 mr-1" />
                Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Full Screen Map */}
      <main className="h-full pt-16">
        <SimpleMap 
          onMapReady={setMapInstance}
          onTerritorySelect={handleTerritorySelect}
          regionFilter={selectedRegion}
        />
        
        {/* Territory Filter Component */}
        <TerritoryFilter
          onRegionFilter={handleRegionFilter}
          selectedRegion={selectedRegion}
          territoryStats={territoryStats}
        />
        
        <UnifiedSearch 
          map={mapInstance}
          onLocationSelect={handleSearch}
          onBusinessSelect={(business) => {
            console.log('Selected business:', business);
          }}
        />
        
        {/* Minimalist Controls */}
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
          <Button
            onClick={handleResetView}
            size="sm"
            variant="outline"
            className="bg-white shadow-md h-10 w-10 p-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
          </Button>
        </div>
        
        {/* Enhanced Territory Info Panel */}
        {selectedTerritory && (
          <TerritoryInfoPanel
            territory={selectedTerritory}
            onClose={() => setSelectedTerritory(null)}
            onViewDetails={handleShowModal}
          />
        )}

        {showModal && selectedTerritory && (
          <TerritoryModal
            territory={selectedTerritory}
            onClose={handleCloseModal}
          />
        )}
      </main>
    </div>
  );
}
