import { useState, useMemo } from 'react';
import SimpleMap from '@/components/map/SimpleMap';
import TerritoryModal from '@/components/map/TerritoryModal';
import TerritoryInfoPanel from '@/components/TerritoryInfoPanel';
import FloatingMapControls from '@/components/FloatingMapControls';
import CollapsibleSearch from '@/components/CollapsibleSearch';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';

export default function MapPage() {
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [nativeTitleFilters, setNativeTitleFilters] = useState<NativeTitleStatusFilter>({
    determined: false,
    pending: false,
    exists: false,
    doesNotExist: false,
    partialArea: false,
    entireArea: false,
    discontinued: false,
    dismissed: false
  });
  const [showRATSIBBoundaries, setShowRATSIBBoundaries] = useState(true);
  const [businessSearchQuery, setBusinessSearchQuery] = useState<string>('');
  const [showMining, setShowMining] = useState<boolean>(false);
  const [showExploration, setShowExploration] = useState<boolean>(false);

  const { data: territoriesGeoJSON } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Calculate territory statistics by region
  const territoryStats = useMemo(() => {
    if (!territoriesGeoJSON?.features) {
      return { 
        total: 0, kimberley: 0, southeast: 0, riverine: 0, southwest: 0, northwest: 0,
        tasmania: 0, gulf: 0, desert: 0, northeast: 0, eyre: 0, fitzmaurice: 0, 
        arnhem: 0, westCape: 0, north: 0, eastCape: 0, spencer: 0, rainforest: 0, torresStrait: 0
      };
    }

    const stats: any = {
      total: territoriesGeoJSON.features.length,
      kimberley: 0, southeast: 0, riverine: 0, southwest: 0, northwest: 0,
      tasmania: 0, gulf: 0, desert: 0, northeast: 0, eyre: 0, fitzmaurice: 0,
      arnhem: 0, westCape: 0, north: 0, eastCape: 0, spencer: 0, rainforest: 0, torresStrait: 0
    };

    territoriesGeoJSON.features.forEach((feature: any) => {
      const region = feature.properties?.region;
      
      switch (region) {
        case 'Kimberley': stats.kimberley++; break;
        case 'Southeast': stats.southeast++; break;
        case 'Riverine': stats.riverine++; break;
        case 'Southwest': stats.southwest++; break;
        case 'Northwest': stats.northwest++; break;
        case 'Tasmania': stats.tasmania++; break;
        case 'Gulf': stats.gulf++; break;
        case 'Desert': stats.desert++; break;
        case 'Northeast': stats.northeast++; break;
        case 'Eyre': stats.eyre++; break;
        case 'Fitzmaurice': stats.fitzmaurice++; break;
        case 'Arnhem': stats.arnhem++; break;
        case 'West Cape': stats.westCape++; break;
        case 'North': stats.north++; break;
        case 'East Cape': stats.eastCape++; break;
        case 'Spencer': stats.spencer++; break;
        case 'Rainforest': stats.rainforest++; break;
        case 'Torres Strait': stats.torresStrait++; break;
      }
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

  const handleNativeTitleFilter = (filters: NativeTitleStatusFilter) => {
    setNativeTitleFilters(filters);
    // Filter will be applied by the map component
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSearch = (lat: number, lng: number) => {
    if (mapInstance && lat && lng && !isNaN(lat) && !isNaN(lng)) {
      mapInstance.setView([lat, lng], 15);
    }
  };

  const handleResetView = () => {
    if (mapInstance) {
      mapInstance.setView([-25.2744, 133.7751], 5);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-earth-beige to-white">
      {/* Modern Header with Glass Effect */}
      <div className="absolute top-0 left-0 right-0 z-[1010] glass-effect animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 bg-[#d8aa84] font-semibold text-[23px] text-[#050505]">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-earth-orange rounded-full blur-xl opacity-30 group-hover:opacity-50 smooth-transition"></div>
              <svg className="w-8 h-8 text-earth-orange relative z-10 animate-pulse-slow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-earth-brown to-earth-orange bg-clip-text text-transparent">
                Indigenous Australia
              </h1>
              <p className="text-sm text-gray-600">Interactive Territory & Culture Map</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/business-search">
              <Button variant="outline" size="default" className="hover-lift bg-white/50 border-earth-brown/20 hover:bg-earth-beige hover:border-earth-brown/40">
                <Building2 className="w-4 h-4 mr-2" />
                Business Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* Full Screen Map with Modern Overlay */}
      <main className="h-full pt-20 relative">
        <SimpleMap 
          onMapReady={setMapInstance}
          onTerritorySelect={handleTerritorySelect}
          regionFilter={selectedRegion}
          nativeTitleFilter={nativeTitleFilters}
          selectedTerritory={selectedTerritory}
          showRATSIBBoundaries={showRATSIBBoundaries}
          businessSearchQuery={businessSearchQuery}
          onBusinessSelect={(business) => {
            console.log('Selected enhanced business:', business);
            if (mapInstance && business.coordinates) {
              mapInstance.setView([business.coordinates.lat, business.coordinates.lng], 15);
            }
          }}
          showMining={showMining}
          showExploration={showExploration}
        />
        
        {/* Floating Map Controls */}
        <FloatingMapControls
          onRegionFilter={handleRegionFilter}
          selectedRegion={selectedRegion}
          territoryStats={territoryStats}
          onResetView={handleResetView}
          onToggleSearch={() => setShowSearch(!showSearch)}
          showSearch={showSearch}
          onNativeTitleFilter={handleNativeTitleFilter}
          nativeTitleFilters={nativeTitleFilters}
          onToggleRATSIB={setShowRATSIBBoundaries}
          showRATSIBBoundaries={showRATSIBBoundaries}
          onToggleMining={setShowMining}
          showMining={showMining}
          onToggleExploration={setShowExploration}
          showExploration={showExploration}
        />
        
        {/* Collapsible Search Panel */}
        <CollapsibleSearch
          map={mapInstance}
          onLocationSelect={handleSearch}
          onBusinessSelect={(business: any) => {
            console.log('Selected business from search:', business);
            setBusinessSearchQuery(business.entityName || business.name || '');
            if (mapInstance && business.lat && business.lng) {
              mapInstance.setView([business.lat, business.lng], 15);
            }
          }}
          isVisible={showSearch}
          onClose={() => setShowSearch(false)}
        />
        
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
