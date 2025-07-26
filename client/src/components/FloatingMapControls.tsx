import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import NativeTitleFilter, { type NativeTitleStatusFilter } from '@/components/NativeTitleFilter';
import { 
  Filter, 
  Search, 
  MapPin, 
  RotateCcw, 
  ChevronDown,
  Layers,
  Building2,
  Scale
} from 'lucide-react';

interface FloatingMapControlsProps {
  onRegionFilter: (region: string | null) => void;
  selectedRegion: string | null;
  territoryStats: any;
  onResetView: () => void;
  onToggleSearch: () => void;
  showSearch: boolean;
  onNativeTitleFilter: (filters: NativeTitleStatusFilter) => void;
  nativeTitleFilters: NativeTitleStatusFilter;
  onToggleRATSIB?: (show: boolean) => void;
  showRATSIBBoundaries?: boolean;
  onToggleMining?: (show: boolean) => void;
  showMining?: boolean;
  onToggleExploration?: (show: boolean) => void;
  showExploration?: boolean;
}

function FloatingMapControls({
  onRegionFilter,
  selectedRegion,
  territoryStats,
  onResetView,
  onToggleSearch,
  showSearch,
  onNativeTitleFilter,
  nativeTitleFilters,
  onToggleRATSIB,
  showRATSIBBoundaries = true,
  onToggleMining,
  showMining = false,
  onToggleExploration,
  showExploration = false
}: FloatingMapControlsProps) {
  const [showRegionFilter, setShowRegionFilter] = useState(false);
  const [showNativeTitleFilter, setShowNativeTitleFilter] = useState(false);

  const quickRegions = [
    { name: 'Tasmania', key: 'Tasmania', count: territoryStats.tasmania || 0, color: '#10B981' },
    { name: 'Northwest', key: 'Northwest', count: territoryStats.northwest || 0, color: '#F59E0B' },
    { name: 'Gulf', key: 'Gulf', count: territoryStats.gulf || 0, color: '#3B82F6' },
    { name: 'Riverine', key: 'Riverine', count: territoryStats.riverine || 0, color: '#06B6D4' },
    { name: 'Desert', key: 'Desert', count: territoryStats.desert || 0, color: '#F59E0B' },
    { name: 'Kimberley', key: 'Kimberley', count: territoryStats.kimberley || 0, color: '#EF4444' },
    { name: 'Southeast', key: 'Southeast', count: territoryStats.southeast || 0, color: '#8B5CF6' },
    { name: 'Northeast', key: 'Northeast', count: territoryStats.northeast || 0, color: '#EC4899' },
    { name: 'Fitzmaurice', key: 'Fitzmaurice', count: territoryStats.fitzmaurice || 0, color: '#14B8A6' },
    { name: 'Eyre', key: 'Eyre', count: territoryStats.eyre || 0, color: '#F97316' },
    { name: 'Arnhem', key: 'Arnhem', count: territoryStats.arnhem || 0, color: '#84CC16' },
    { name: 'West Cape', key: 'West Cape', count: territoryStats.westCape || 0, color: '#06B6D4' },
    { name: 'Southwest', key: 'Southwest', count: territoryStats.southwest || 0, color: '#8B5CF6' },
    { name: 'North', key: 'North', count: territoryStats.north || 0, color: '#EF4444' },
    { name: 'East Cape', key: 'East Cape', count: territoryStats.eastCape || 0, color: '#10B981' },
    { name: 'Spencer', key: 'Spencer', count: territoryStats.spencer || 0, color: '#F59E0B' },
    { name: 'Rainforest', key: 'Rainforest', count: territoryStats.rainforest || 0, color: '#22C55E' },
    { name: 'Torres Strait', key: 'Torres Strait', count: territoryStats.torresStrait || 0, color: '#3B82F6' }
  ];

  return (
    <>
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] flex items-center gap-2 animate-fade-in-up">
        {/* Modern Floating Control Bar with Glass Effect */}
        <div className="glass-effect rounded-2xl modern-shadow-lg px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 max-w-[95vw] overflow-x-auto smooth-transition">
        
        {/* Reset View */}
        <Button
          onClick={onResetView}
          size="sm"
          variant="ghost"
          className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-xl hover:bg-earth-beige/50 hover:scale-110 smooth-transition group"
          title="Reset map view"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-earth-brown group-hover:rotate-180 smooth-transition duration-500" />
        </Button>

        {/* Elegant Divider */}
        <div className="h-6 sm:h-8 w-px bg-gradient-to-b from-transparent via-earth-brown/20 to-transparent" />

        {/* Search Toggle */}
        <Button
          onClick={onToggleSearch}
          size="sm"
          variant={showSearch ? "default" : "ghost"}
          className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm smooth-transition ${
            showSearch ? 'bg-earth-brown hover:bg-earth-brown/90 text-white' : 'hover:bg-earth-beige/50'
          }`}
          title="Toggle search"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
          <span className="hidden sm:inline font-medium">Search</span>
          <span className="sm:hidden font-medium">Find</span>
        </Button>

        {/* Region Filter */}
        <div className="relative">
          <Button
            size="sm"
            variant={selectedRegion ? "default" : "ghost"}
            className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm smooth-transition ${
              selectedRegion ? 'bg-earth-orange hover:bg-earth-orange/90 text-white' : 'hover:bg-earth-beige/50'
            }`}
            title="Filter by region"
            onClick={() => {
              console.log('Region filter button clicked, current state:', showRegionFilter);
              setShowRegionFilter(!showRegionFilter);
            }}
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
            <span className="hidden sm:inline font-medium">{selectedRegion || 'Regions'}</span>
            <span className="sm:hidden font-medium">{selectedRegion || 'Area'}</span>
            {selectedRegion && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 bg-white/20 border-0">
                {territoryStats[selectedRegion.toLowerCase()] || 0}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Native Title Filter */}
        <div className="relative">
          <Button
            size="sm"
            variant={Object.values(nativeTitleFilters).some(Boolean) ? "default" : "ghost"}
            className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm smooth-transition ${
              Object.values(nativeTitleFilters).some(Boolean) ? 'bg-earth-sage hover:bg-earth-sage/90 text-white' : 'hover:bg-earth-beige/50'
            }`}
            title="Filter by Native Title status"
            onClick={() => {
              console.log('Native Title filter button clicked, current state:', showNativeTitleFilter);
              setShowNativeTitleFilter(!showNativeTitleFilter);
            }}
          >
            <Scale className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
            <span className="hidden sm:inline font-medium">Native Title</span>
            <span className="sm:hidden font-medium">Title</span>
            {Object.values(nativeTitleFilters).some(Boolean) && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 bg-white/20 border-0">
                {Object.values(nativeTitleFilters).filter(Boolean).length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {/* Elegant Divider */}
        <div className="h-6 sm:h-8 w-px bg-gradient-to-b from-transparent via-earth-brown/20 to-transparent" />

        {/* Layer Controls Group */}
        <div className="flex items-center gap-1">
          {/* RATSIB Boundaries Toggle */}
          {onToggleRATSIB && (
            <Button
              onClick={() => onToggleRATSIB(!showRATSIBBoundaries)}
              size="sm"
              variant={showRATSIBBoundaries ? "default" : "ghost"}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm smooth-transition ${
                showRATSIBBoundaries ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-earth-beige/50'
              }`}
              title="Toggle RATSIB boundaries"
            >
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
              <span className="hidden sm:inline font-medium">RATSIB</span>
              <span className="sm:hidden font-medium">Corp</span>
            </Button>
          )}

          {/* Mining Overlay Toggle */}
          {onToggleMining && (
            <Button
              onClick={() => onToggleMining(!showMining)}
              size="sm"
              variant={showMining ? "default" : "ghost"}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm smooth-transition ${
                showMining ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-earth-beige/50'
              }`}
              title="Toggle mining tenements overlay"
            >
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
              <span className="hidden sm:inline font-medium">Mining</span>
              <span className="sm:hidden font-medium">Mine</span>
            </Button>
          )}

          {/* Exploration Overlay Toggle */}
          {onToggleExploration && (
            <Button
              onClick={() => onToggleExploration(!showExploration)}
              size="sm"
              variant={showExploration ? "default" : "ghost"}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm smooth-transition ${
                showExploration ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'hover:bg-earth-beige/50'
              }`}
              title="Toggle WA DMIRS exploration reports overlay"
            >
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
              <span className="hidden sm:inline font-medium">Exploration</span>
              <span className="sm:hidden font-medium">Explore</span>
            </Button>
          )}
        </div>

        {/* Elegant Divider */}
        <div className="h-6 sm:h-8 w-px bg-gradient-to-b from-transparent via-earth-brown/20 to-transparent" />

        {/* Territory Count Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-earth-beige/50 rounded-xl">
          <Layers className="w-4 h-4 text-earth-brown" />
          <span className="font-bold text-earth-brown">{territoryStats.total}</span>
          <span className="text-xs text-earth-dark/70">territories</span>
        </div>
        </div>
      </div>

      {/* Modern Region Filter Popup */}
      {showRegionFilter && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up">
          <div className="glass-effect rounded-2xl modern-shadow-lg w-[450px] max-w-[95vw] max-h-[80vh] overflow-hidden m-4 animate-slide-in-left">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg text-earth-brown">Aboriginal Regions</h4>
                  <p className="text-sm text-gray-600 mt-1">Select a region to filter territories</p>
                </div>
                <button 
                  onClick={() => setShowRegionFilter(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 smooth-transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <Button
                onClick={() => {
                  onRegionFilter(null);
                  setShowRegionFilter(false);
                }}
                size="default"
                variant={!selectedRegion ? "default" : "outline"}
                className={`w-full h-10 ${!selectedRegion ? 'bg-earth-brown hover:bg-earth-brown/90' : 'hover:bg-earth-beige'} smooth-transition`}
              >
                <Layers className="w-4 h-4 mr-2" />
                Show All Territories ({territoryStats.total})
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {quickRegions.map((region) => (
                  <Button
                    key={region.key}
                    onClick={() => {
                      onRegionFilter(region.key);
                      setShowRegionFilter(false);
                    }}
                    size="default"
                    variant={selectedRegion === region.key ? "default" : "outline"}
                    className={`h-11 text-sm flex items-center justify-between hover-lift ${
                      selectedRegion === region.key ? 'bg-earth-orange hover:bg-earth-orange/90' : 'hover:bg-earth-beige'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: region.color }}
                      />
                      <span className="font-medium">{region.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-earth-brown/10 border-0">
                      {region.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Native Title Filter Popup */}
      {showNativeTitleFilter && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up">
          <div className="glass-effect rounded-2xl modern-shadow-lg w-[400px] max-w-[95vw] max-h-[80vh] overflow-y-auto m-4 animate-slide-in-left">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg text-earth-brown">Native Title Status</h4>
                  <p className="text-sm text-gray-600 mt-1">Filter territories by legal status</p>
                </div>
                <button 
                  onClick={() => setShowNativeTitleFilter(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 smooth-transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-2">Status</h5>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={nativeTitleFilters.determined}
                      onChange={() => onNativeTitleFilter({...nativeTitleFilters, determined: !nativeTitleFilters.determined})}
                      className="rounded"
                    />
                    <span>Determined (648)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={nativeTitleFilters.pending}
                      onChange={() => onNativeTitleFilter({...nativeTitleFilters, pending: !nativeTitleFilters.pending})}
                      className="rounded"
                    />
                    <span>Pending Applications (102)</span>
                  </label>
                </div>
                
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-2">Outcomes</h5>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={nativeTitleFilters.exists}
                      onChange={() => onNativeTitleFilter({...nativeTitleFilters, exists: !nativeTitleFilters.exists})}
                      className="rounded"
                    />
                    <span>Native Title Exists (425)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={nativeTitleFilters.entireArea}
                      onChange={() => onNativeTitleFilter({...nativeTitleFilters, entireArea: !nativeTitleFilters.entireArea})}
                      className="rounded"
                    />
                    <span>Exists in Entire Area (291)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={nativeTitleFilters.partialArea}
                      onChange={() => onNativeTitleFilter({...nativeTitleFilters, partialArea: !nativeTitleFilters.partialArea})}
                      className="rounded"
                    />
                    <span>Exists in Part (134)</span>
                  </label>
                </div>
              </div>
              
              <div className="pt-2 border-t text-xs text-gray-500">
                Data from National Native Title Tribunal
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingMapControls;