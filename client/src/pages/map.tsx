import { useMemo, useCallback } from 'react';
import SimpleMap from '@/components/map/SimpleMap';
import TerritoryModal from '@/components/map/TerritoryModal';
import TerritoryInfoPanel from '@/components/TerritoryInfoPanel';
import FloatingMapControls from '@/components/FloatingMapControls';
import CollapsibleSearch from '@/components/CollapsibleSearch';
import { Button } from '@/components/ui/button';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Building2 } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { MapProvider, useMapContext } from '@/contexts/MapContext';
import { ErrorBoundary, MapErrorFallback } from '@/components/ErrorBoundary';
import type { Territory } from '@shared/schema';
import type { NativeTitleStatusFilter } from '@/components/NativeTitleFilter';

function MapContent() {
  const {
    selectedTerritory,
    setSelectedTerritory,
    selectedRegion,
    setSelectedRegion,
    nativeTitleFilters,
    setNativeTitleFilters,
    layers,
    toggleLayer,
    showSearch,
    setShowSearch,
    businessSearchQuery,
    setBusinessSearchQuery,
    mapInstance,
    setMapInstance,
    showModal,
    setShowModal,
  } = useMapContext();

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

  const handleTerritorySelect = useCallback((territory: Territory) => {
    setSelectedTerritory(territory);
  }, [setSelectedTerritory]);

  const handleRegionFilter = useCallback((region: string | null) => {
    setSelectedRegion(region);
  }, [setSelectedRegion]);

  const handleNativeTitleFilter = useCallback((filters: NativeTitleStatusFilter) => {
    setNativeTitleFilters(filters);
  }, [setNativeTitleFilters]);

  const handleShowModal = useCallback(() => {
    setShowModal(true);
  }, [setShowModal]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, [setShowModal]);

  const handleSearch = useCallback((lat: number, lng: number) => {
    if (mapInstance && lat && lng && !isNaN(lat) && !isNaN(lng)) {
      mapInstance.setView([lat, lng], 15);
    }
  }, [mapInstance]);

  const handleResetView = useCallback(() => {
    if (mapInstance) {
      mapInstance.setView([-25.2744, 133.7751], 5);
    }
  }, [mapInstance]);

  const handleBusinessSelectFromMap = useCallback((business: any) => {
    if (mapInstance && business.coordinates) {
      mapInstance.setView([business.coordinates.lat, business.coordinates.lng], 15);
    }
  }, [mapInstance]);

  const handleBusinessSelectFromSearch = useCallback((business: any) => {
    setBusinessSearchQuery(business.entityName || business.name || '');
    if (mapInstance && business.lat && business.lng) {
      mapInstance.setView([business.lat, business.lng], 15);
    }
  }, [mapInstance, setBusinessSearchQuery]);

  const handleToggleSearch = useCallback(() => {
    setShowSearch(!showSearch);
  }, [showSearch, setShowSearch]);

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
  }, [setShowSearch]);

  const handleCloseTerritory = useCallback(() => {
    setSelectedTerritory(null);
  }, [setSelectedTerritory]);

  const handleToggleRATSIB = useCallback((show: boolean) => {
    if (show !== layers.ratsib) toggleLayer('ratsib');
  }, [layers.ratsib, toggleLayer]);

  const handleToggleMining = useCallback((show: boolean) => {
    if (show !== layers.mining) toggleLayer('mining');
  }, [layers.mining, toggleLayer]);

  const handleToggleExploration = useCallback((show: boolean) => {
    if (show !== layers.exploration) toggleLayer('exploration');
  }, [layers.exploration, toggleLayer]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-earth-beige to-white">
      {/* Modern Header with Glass Effect - Mobile Responsive */}
      <div className="absolute top-0 left-0 right-0 z-header glass-effect animate-fade-in-up">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4 bg-primary font-semibold text-primary-foreground">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="relative group flex-shrink-0">
              <div className="absolute inset-0 bg-earth-orange rounded-full blur-xl opacity-30 group-hover:opacity-50 smooth-transition"></div>
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-earth-orange relative z-10 animate-pulse-slow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-earth-brown to-earth-orange bg-clip-text text-transparent truncate">
                Indigenous Australia
              </h1>
              <p className="text-xs sm:text-sm text-primary-foreground/70 hidden sm:block">Interactive Territory & Culture Map</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <DarkModeToggle />
            <Link href="/business-search">
              <Button variant="outline" size="icon" className="hover-lift bg-white/50 border-earth-brown/20 hover:bg-earth-beige hover:border-earth-brown/40 md:size-auto md:px-4" data-testid="link-business-directory">
                <Building2 className="w-4 h-4 md:mr-2" />
                <span className="sr-only md:not-sr-only md:inline">Business Directory</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* Full Screen Map with Modern Overlay */}
      <main className="h-full pt-12 sm:pt-16 relative">
        <SimpleMap
          onMapReady={setMapInstance}
          onTerritorySelect={handleTerritorySelect}
          regionFilter={selectedRegion}
          nativeTitleFilter={nativeTitleFilters}
          selectedTerritory={selectedTerritory}
          showRATSIBBoundaries={layers.ratsib}
          businessSearchQuery={businessSearchQuery}
          onBusinessSelect={handleBusinessSelectFromMap}
          showMining={layers.mining}
          showExploration={layers.exploration}
        />

        {/* Floating Map Controls */}
        <FloatingMapControls
          onRegionFilter={handleRegionFilter}
          selectedRegion={selectedRegion}
          territoryStats={territoryStats}
          onResetView={handleResetView}
          onToggleSearch={handleToggleSearch}
          showSearch={showSearch}
          onNativeTitleFilter={handleNativeTitleFilter}
          nativeTitleFilters={nativeTitleFilters}
          onToggleRATSIB={handleToggleRATSIB}
          showRATSIBBoundaries={layers.ratsib}
          onToggleMining={handleToggleMining}
          showMining={layers.mining}
          onToggleExploration={handleToggleExploration}
          showExploration={layers.exploration}
        />

        {/* Collapsible Search Panel */}
        <CollapsibleSearch
          map={mapInstance}
          onLocationSelect={handleSearch}
          onBusinessSelect={handleBusinessSelectFromSearch}
          isVisible={showSearch}
          onClose={handleCloseSearch}
        />

        {/* Enhanced Territory Info Panel */}
        {selectedTerritory && (
          <TerritoryInfoPanel
            territory={selectedTerritory}
            onClose={handleCloseTerritory}
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

export default function MapPage() {
  return (
    <MapProvider>
      <ErrorBoundary fallback={<MapErrorFallback />}>
        <MapContent />
      </ErrorBoundary>
    </MapProvider>
  );
}
