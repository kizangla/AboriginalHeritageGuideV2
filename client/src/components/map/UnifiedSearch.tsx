import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, 
  Building2, 
  Navigation, 
  Search, 
  Map, 
  Mountain, 
  FileText,
  X,
  Users,
  ChevronDown
} from 'lucide-react';
import L from 'leaflet';
import type { SearchResult } from '@shared/schema';
import { cn } from '@/lib/utils';

interface BusinessLocation {
  abn: string;
  entityName: string;
  entityType: string;
  status: string;
  lat: number;
  lng: number;
  displayAddress: string;
  address: {
    stateCode: string;
    postcode: string;
    fullAddress: string;
  };
  supplyNationVerified?: boolean;
  verificationConfidence?: string;
  supplyNationData?: any;
}

interface TerritorySearchResult {
  id: number;
  name: string;
  groupName: string;
  region: string;
  regionType: string;
  centerLat: number;
  centerLng: number;
  languageFamily: string;
}

interface MinedexSite {
  id: string;
  siteTitle: string;
  shortName: string;
  siteType: string;
  siteCommodities: string;
  siteStage: string;
  targetCommodity: string;
  commodityCategory: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  webLink?: string;
}

interface WamexReport {
  project: string;
  operator: string;
  targetCommodity: string;
  reportYear: number;
  reportType: string;
  latitude?: number;
  longitude?: number;
  abstractUrl?: string;
}

interface UnifiedSearchProps {
  map: L.Map | null;
  onLocationSelect: (lat: number, lng: number) => void;
  onBusinessSelect?: (business: BusinessLocation) => void;
  onTerritorySelect?: (territory: TerritorySearchResult) => void;
}

type SearchCategory = 'all' | 'territories' | 'places' | 'businesses' | 'mining' | 'exploration';

const categoryConfig: Record<SearchCategory, { label: string; icon: any; color: string }> = {
  all: { label: 'All', icon: Search, color: 'bg-gray-100 text-gray-700' },
  territories: { label: 'Territories', icon: Map, color: 'bg-orange-100 text-orange-700' },
  places: { label: 'Places', icon: MapPin, color: 'bg-blue-100 text-blue-700' },
  businesses: { label: 'Businesses', icon: Building2, color: 'bg-green-100 text-green-700' },
  mining: { label: 'Mining Sites', icon: Mountain, color: 'bg-purple-100 text-purple-700' },
  exploration: { label: 'Reports', icon: FileText, color: 'bg-indigo-100 text-indigo-700' }
};

export default function UnifiedSearch({ map, onLocationSelect, onBusinessSelect, onTerritorySelect }: UnifiedSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [shouldSearch, setShouldSearch] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Territory search
  const { data: territoryResults, isLoading: isLoadingTerritories } = useQuery({
    queryKey: ['/api/territories/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { territories: [], totalResults: 0 };
      const response = await fetch(`/api/territories/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Territory search failed');
      return response.json();
    },
    enabled: shouldSearch && (category === 'all' || category === 'territories') && searchQuery.trim().length >= 2
  });

  // Place search
  const { data: placeResults, isLoading: isLoadingPlaces } = useQuery({
    queryKey: ['/api/geocode', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json() as Promise<SearchResult[]>;
    },
    enabled: shouldSearch && (category === 'all' || category === 'places') && searchQuery.trim().length >= 2
  });

  // Business search
  const { data: businessResults, isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ['/api/indigenous-businesses/integrated-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { businesses: [], totalResults: 0 };
      const response = await fetch(`/api/indigenous-businesses/integrated-search?name=${encodeURIComponent(searchQuery)}&includeSupplyNation=true`);
      if (!response.ok) throw new Error('Business search failed');
      const data = await response.json();
      const businesses = data.businesses?.map((business: any) => ({
        abn: business.abn,
        entityName: business.entityName,
        entityType: business.entityType,
        status: business.status,
        lat: business.lat || 0,
        lng: business.lng || 0,
        displayAddress: business.address?.fullAddress || `${business.address?.postcode}, ${business.address?.stateCode}`,
        address: {
          stateCode: business.address?.stateCode || '',
          postcode: business.address?.postcode || '',
          fullAddress: business.address?.fullAddress || ''
        },
        supplyNationVerified: business.supplyNationVerified,
        verificationConfidence: business.verificationConfidence,
        supplyNationData: business.supplyNationData
      })) || [];
      return { businesses, totalResults: data.totalResults || 0 };
    },
    enabled: shouldSearch && (category === 'all' || category === 'businesses') && searchQuery.trim().length >= 2
  });

  // MINEDEX search (mining sites)
  const { data: minedexResults, isLoading: isLoadingMinedex } = useQuery({
    queryKey: ['/api/minedex/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { sites: [], totalResults: 0 };
      const response = await fetch(`/api/minedex/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('MINEDEX search failed');
      return response.json();
    },
    enabled: shouldSearch && (category === 'all' || category === 'mining') && searchQuery.trim().length >= 2
  });

  // WAMEX search (exploration reports)
  const { data: wamexResults, isLoading: isLoadingWamex } = useQuery({
    queryKey: ['/api/wamex/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { reports: [], totalResults: 0 };
      const response = await fetch(`/api/wamex/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('WAMEX search failed');
      return response.json();
    },
    enabled: shouldSearch && (category === 'all' || category === 'exploration') && searchQuery.trim().length >= 2
  });

  const isLoading = isLoadingTerritories || isLoadingPlaces || isLoadingBusinesses || isLoadingMinedex || isLoadingWamex;

  const totalResults = 
    (territoryResults?.totalResults || 0) +
    (placeResults?.length || 0) +
    (businessResults?.totalResults || 0) +
    (minedexResults?.totalResults || 0) +
    (wamexResults?.totalResults || 0);

  const hasResults = totalResults > 0;

  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) {
      setShouldSearch(true);
      setIsExpanded(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setShouldSearch(false);
    setIsExpanded(false);
  };

  const handleTerritorySelect = (territory: TerritorySearchResult) => {
    if (territory.centerLat && territory.centerLng) {
      onLocationSelect(territory.centerLat, territory.centerLng);
      if (onTerritorySelect) {
        onTerritorySelect(territory);
      }
    }
    handleClear();
  };

  const handlePlaceSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onLocationSelect(lat, lng);
    handleClear();
  };

  const handleBusinessSelect = (business: BusinessLocation) => {
    if (business.lat && business.lng) {
      onLocationSelect(business.lat, business.lng);
    }
    if (onBusinessSelect) {
      onBusinessSelect(business);
    }
    handleClear();
  };

  const handleMinedexSelect = (site: MinedexSite) => {
    if (site.coordinates?.lat && site.coordinates?.lng) {
      onLocationSelect(site.coordinates.lat, site.coordinates.lng);
      
      if (map) {
        const marker = L.marker([site.coordinates.lat, site.coordinates.lng], {
          icon: L.divIcon({
            className: 'minedex-marker',
            html: `<div class="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/></svg>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          })
        }).addTo(map);
        
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">${site.siteTitle}</h3>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Type:</strong> ${site.siteType}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Commodities:</strong> ${site.siteCommodities}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Stage:</strong> ${site.siteStage}</p>
            ${site.webLink ? `<a href="${site.webLink}" target="_blank" style="color: #7c3aed; font-size: 12px;">View on MINEDEX</a>` : ''}
          </div>
        `).openPopup();

        setTimeout(() => map.removeLayer(marker), 30000);
      }
    }
    handleClear();
  };

  const handleWamexSelect = (report: WamexReport) => {
    if (report.abstractUrl) {
      window.open(report.abstractUrl, '_blank');
    }
    handleClear();
  };

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationSelect(position.coords.latitude, position.coords.longitude);
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  };

  // Close expanded view when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.unified-search-container')) {
        setShowCategories(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="unified-search-container absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Main Search Bar */}
        <div className="flex items-center gap-2 p-3">
          {/* Category Selector */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCategories(!showCategories)}
              className={cn(
                "h-10 px-3 rounded-xl flex items-center gap-2",
                categoryConfig[category].color
              )}
              data-testid="search-category-button"
            >
              {(() => {
                const Icon = categoryConfig[category].icon;
                return <Icon className="w-4 h-4" />;
              })()}
              <span className="hidden sm:inline text-sm font-medium">{categoryConfig[category].label}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>

            {/* Category Dropdown */}
            {showCategories && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border p-2 min-w-[180px] z-50">
                {(Object.keys(categoryConfig) as SearchCategory[]).map((cat) => {
                  const config = categoryConfig[cat];
                  const Icon = config.icon;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat);
                        setShowCategories(false);
                        if (searchQuery.trim()) handleSearch();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        category === cat ? config.color : "hover:bg-gray-50"
                      )}
                      data-testid={`search-category-${cat}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder={category === 'all' 
                ? 'Search territories, places, businesses, mining...' 
                : `Search ${categoryConfig[category].label.toLowerCase()}...`
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length >= 2) {
                  setShouldSearch(true);
                }
              }}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsExpanded(true)}
              className="w-full border-0 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl h-10 pr-8"
              data-testid="search-input"
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                data-testid="search-clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={isLoading || searchQuery.trim().length < 2}
            size="sm"
            className="h-10 w-10 p-0 bg-orange-500 hover:bg-orange-600 rounded-xl"
            data-testid="search-button"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Search className="h-4 w-4 text-white" />
            )}
          </Button>

          {/* Location Button */}
          <Button
            onClick={getCurrentLocation}
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0 rounded-xl"
            title="Use my location"
            data-testid="search-location"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        {/* Results Section */}
        {isExpanded && shouldSearch && searchQuery.trim().length >= 2 && (
          <div className="border-t">
            {/* Results Count */}
            {hasResults && (
              <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {totalResults} results found
                </span>
                <div className="flex gap-1">
                  {territoryResults?.totalResults > 0 && (
                    <Badge variant="outline" className="text-xs bg-orange-50">
                      <Map className="w-3 h-3 mr-1" />
                      {territoryResults.totalResults}
                    </Badge>
                  )}
                  {(placeResults?.length || 0) > 0 && (
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      <MapPin className="w-3 h-3 mr-1" />
                      {placeResults?.length}
                    </Badge>
                  )}
                  {(businessResults?.totalResults ?? 0) > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50">
                      <Building2 className="w-3 h-3 mr-1" />
                      {businessResults?.totalResults}
                    </Badge>
                  )}
                  {minedexResults?.totalResults > 0 && (
                    <Badge variant="outline" className="text-xs bg-purple-50">
                      <Mountain className="w-3 h-3 mr-1" />
                      {minedexResults.totalResults}
                    </Badge>
                  )}
                  {wamexResults?.totalResults > 0 && (
                    <Badge variant="outline" className="text-xs bg-indigo-50">
                      <FileText className="w-3 h-3 mr-1" />
                      {wamexResults.totalResults}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <ScrollArea className="max-h-80">
              {/* Territory Results */}
              {(category === 'all' || category === 'territories') && territoryResults?.territories?.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 py-2 bg-orange-50 text-xs font-medium text-orange-700 flex items-center gap-2">
                      <Map className="w-3 h-3" />
                      Aboriginal Territories
                    </div>
                  )}
                  {territoryResults.territories.map((territory: TerritorySearchResult, index: number) => (
                    <button
                      key={territory.id}
                      onClick={() => handleTerritorySelect(territory)}
                      className="w-full text-left p-3 text-sm hover:bg-orange-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      data-testid={`territory-result-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Map className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{territory.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {territory.groupName} • {territory.region}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Place Results */}
              {(category === 'all' || category === 'places') && placeResults && placeResults.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 py-2 bg-blue-50 text-xs font-medium text-blue-700 flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      Places
                    </div>
                  )}
                  {placeResults.slice(0, 5).map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handlePlaceSelect(result)}
                      className="w-full text-left p-3 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      data-testid={`place-result-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{result.display_name}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Business Results */}
              {(category === 'all' || category === 'businesses') && (businessResults?.businesses?.length ?? 0) > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 py-2 bg-green-50 text-xs font-medium text-green-700 flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      Indigenous Businesses
                    </div>
                  )}
                  {businessResults?.businesses?.slice(0, 5).map((business: BusinessLocation, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleBusinessSelect(business)}
                      className="w-full text-left p-3 text-sm hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      data-testid={`business-result-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 relative">
                          <Building2 className="w-4 h-4 text-green-600" />
                          {business.supplyNationVerified && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{business.entityName}</span>
                            {business.supplyNationVerified && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Verified</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {business.displayAddress}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* MINEDEX Results */}
              {(category === 'all' || category === 'mining') && minedexResults?.sites?.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 py-2 bg-purple-50 text-xs font-medium text-purple-700 flex items-center gap-2">
                      <Mountain className="w-3 h-3" />
                      Mining Sites (WA MINEDEX)
                    </div>
                  )}
                  {minedexResults.sites.slice(0, 5).map((site: MinedexSite, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleMinedexSelect(site)}
                      className="w-full text-left p-3 text-sm hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      data-testid={`minedex-result-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Mountain className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{site.siteTitle}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {site.siteType} • {site.siteStage}
                          </div>
                          <div className="text-xs text-purple-600 mt-0.5 truncate">
                            {site.siteCommodities}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* WAMEX Results */}
              {(category === 'all' || category === 'exploration') && wamexResults?.reports?.length > 0 && (
                <div>
                  {category === 'all' && (
                    <div className="px-4 py-2 bg-indigo-50 text-xs font-medium text-indigo-700 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Exploration Reports (WA WAMEX)
                    </div>
                  )}
                  {wamexResults.reports.slice(0, 5).map((report: WamexReport, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleWamexSelect(report)}
                      className="w-full text-left p-3 text-sm hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      data-testid={`wamex-result-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{report.project}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {report.operator} • {report.reportYear}
                          </div>
                          <div className="text-xs text-indigo-600 mt-0.5 truncate">
                            {report.targetCommodity}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!isLoading && shouldSearch && !hasResults && (
                <div className="p-8 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                  <p className="text-xs mt-1">Try different keywords or search category</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
