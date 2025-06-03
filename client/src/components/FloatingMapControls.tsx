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
}

export default function FloatingMapControls({
  onRegionFilter,
  selectedRegion,
  territoryStats,
  onResetView,
  onToggleSearch,
  showSearch,
  onNativeTitleFilter,
  nativeTitleFilters
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
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] flex items-center gap-2">
      {/* Floating Control Bar */}
      <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2">
        
        {/* Reset View */}
        <Button
          onClick={onResetView}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
          title="Reset map view"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Search Toggle */}
        <Button
          onClick={onToggleSearch}
          size="sm"
          variant={showSearch ? "default" : "ghost"}
          className="h-8 px-3 rounded-full"
          title="Toggle search"
        >
          <Search className="w-4 h-4 mr-1" />
          Search
        </Button>

        {/* Region Filter */}
        <div className="relative">
          <Button
            size="sm"
            variant={selectedRegion ? "default" : "ghost"}
            className="h-8 px-3 rounded-full"
            title="Filter by region"
            onClick={() => {
              console.log('Region filter button clicked, current state:', showRegionFilter);
              setShowRegionFilter(!showRegionFilter);
            }}
          >
            <Filter className="w-4 h-4 mr-1" />
            {selectedRegion || 'Regions'}
            {selectedRegion && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {territoryStats[selectedRegion.toLowerCase()] || 0}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          
          {showRegionFilter && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-96 max-w-[90vw] p-4 bg-white shadow-xl border rounded-lg z-[1002]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Aboriginal Regions</h4>
                  <Badge variant="outline" className="text-xs">
                    {territoryStats.total} total
                  </Badge>
                </div>

                {/* Show All Territories - Always Visible */}
                <Button
                  onClick={() => {
                    onRegionFilter(null);
                    setShowRegionFilter(false);
                  }}
                  size="sm"
                  variant={!selectedRegion ? "default" : "outline"}
                  className="w-full h-8 text-xs"
                >
                  <Layers className="w-3 h-3 mr-1" />
                  Show All Territories
                  {!selectedRegion && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {territoryStats.total}
                    </Badge>
                  )}
                </Button>

                {/* Quick Region Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {quickRegions.map((region) => (
                    <Button
                      key={region.key}
                      onClick={() => {
                        onRegionFilter(region.key);
                        setShowRegionFilter(false);
                      }}
                      size="sm"
                      variant={selectedRegion === region.key ? "default" : "outline"}
                      className="h-9 text-xs justify-between w-full px-3"
                    >
                      <span className="text-left">{region.name}</span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-1.5 ml-2"
                        style={{ backgroundColor: `${region.color}20`, color: region.color }}
                      >
                        {region.count}
                      </Badge>
                    </Button>
                  ))}
                </div>

                {/* More Regions Link */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    {quickRegions.reduce((sum, r) => sum + r.count, 0)} of {territoryStats.total} territories shown
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Native Title Filter */}
        <div className="relative">
          <Button
            size="sm"
            variant={Object.values(nativeTitleFilters).some(Boolean) ? "default" : "ghost"}
            className="h-8 px-3 rounded-full"
            title="Filter by Native Title status"
            onClick={() => setShowNativeTitleFilter(!showNativeTitleFilter)}
          >
            <Scale className="w-4 h-4 mr-1" />
            Native Title
            {Object.values(nativeTitleFilters).some(Boolean) && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {Object.values(nativeTitleFilters).filter(Boolean).length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          
          {showNativeTitleFilter && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-96 max-w-[90vw] bg-white shadow-xl border rounded-lg z-[1002]">
              <NativeTitleFilter
                onFilterChange={onNativeTitleFilter}
                activeFilters={nativeTitleFilters}
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Territory Count */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Building2 className="w-4 h-4" />
          <span className="font-medium">{territoryStats.total}</span>
          <span className="text-xs">territories</span>
        </div>
      </div>
    </div>
  );
}