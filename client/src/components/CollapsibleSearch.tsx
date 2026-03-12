import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Navigation, Search, X } from 'lucide-react';
import L from 'leaflet';
import type { SearchResult } from '@shared/schema';
import { SearchResultsSkeleton } from '@/components/skeletons';

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
}

interface CollapsibleSearchProps {
  map: L.Map | null;
  onLocationSelect: (lat: number, lng: number) => void;
  onBusinessSelect?: (business: BusinessLocation) => void;
  isVisible: boolean;
  onClose: () => void;
}

type SearchType = 'places' | 'businesses';

export default function CollapsibleSearch({
  map,
  onLocationSelect,
  onBusinessSelect,
  isVisible,
  onClose
}: CollapsibleSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('places');
  const [shouldSearch, setShouldSearch] = useState(false);

  // Place search query
  const { data: placeResults, isLoading: isLoadingPlaces } = useQuery({
    queryKey: ['/api/geocode', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      return response.json();
    },
    enabled: shouldSearch && searchType === 'places' && searchQuery.length > 2,
  });

  // Enhanced business search query with Google Maps integration
  const { data: businessResults, isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ['/api/businesses/enhanced-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/businesses/enhanced-search?search=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Enhanced business search failed');
      }
      return response.json();
    },
    enabled: shouldSearch && searchType === 'businesses' && searchQuery.length > 2,
  });

  const isLoading = isLoadingPlaces || isLoadingBusinesses;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShouldSearch(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePlaceSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onLocationSelect(lat, lng);
    setShouldSearch(false);
    setSearchQuery('');
    onClose();
  };

  const handleBusinessSelect = (business: BusinessLocation) => {
    onLocationSelect(business.lat, business.lng);
    if (onBusinessSelect) {
      onBusinessSelect(business);
    }
    setShouldSearch(false);
    setSearchQuery('');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="absolute top-20 right-4 z-panel w-full max-w-sm md:w-96 glass-strong rounded-2xl shadow-premium-xl animate-fade-in-down">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg gradient-text-gold">
            Search Aboriginal Australia
          </h3>
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover-glow hover-scale transition-all rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-2 mb-4 p-1.5 glass-subtle rounded-xl">
          <Button
            onClick={() => setSearchType('places')}
            size="sm"
            variant={searchType === 'places' ? 'default' : 'ghost'}
            className={`flex-1 h-9 rounded-lg transition-all duration-200 ${searchType === 'places'
              ? 'bg-earth-brown text-white shadow-premium'
              : 'hover-glow'
              }`}
          >
            <MapPin className="w-3.5 h-3.5 mr-2" />
            Places
          </Button>
          <Button
            onClick={() => setSearchType('businesses')}
            size="sm"
            variant={searchType === 'businesses' ? 'default' : 'ghost'}
            className={`flex-1 h-9 rounded-lg transition-all duration-200 ${searchType === 'businesses'
              ? 'bg-earth-brown text-white shadow-premium'
              : 'hover-glow'
              }`}
          >
            <Building2 className="w-3.5 h-3.5 mr-2" />
            Businesses
          </Button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 search-bar rounded-full overflow-hidden">
            <Input
              type="text"
              placeholder={searchType === 'places' ? '🔍 Search places...' : '🔍 Search Indigenous businesses...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-6 py-3"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            size="sm"
            className="px-4 py-3 glass-moderate rounded-xl hover-glow hover-scale active-scale transition-all"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Results */}
        {shouldSearch && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading && (
              <SearchResultsSkeleton count={3} />
            )}

            {/* Place Results */}
            {searchType === 'places' && Array.isArray(placeResults) && (
              <>
                {placeResults.map((result: SearchResult, index: number) => (
                  <Button
                    key={index}
                    onClick={() => handlePlaceSelect(result)}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left"
                  >
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{result.display_name}</div>
                      <div className="text-xs text-gray-500">{result.type || result.class}</div>
                    </div>
                  </Button>
                ))}
              </>
            )}

            {/* Enhanced Business Results */}
            {searchType === 'businesses' && businessResults?.businesses && (
              <>
                {businessResults.businesses.map((business: any, index: number) => (
                  <Button
                    key={business.id || business.abn || index}
                    onClick={() => handleBusinessSelect(business)}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left"
                  >
                    <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{business.entityName}</div>
                      <div className="text-xs text-gray-500">
                        {business.entityType} • {business.address?.fullAddress || `${business.address?.suburb || ''} ${business.address?.stateCode || ''} ${business.address?.postcode || ''}`.trim()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {business.businessInfo?.supplyNationVerified && (
                          <div className="text-xs text-green-600 font-medium">
                            ✓ Verified
                          </div>
                        )}
                        {business.coordinates?.source === 'google_maps' && (
                          <div className="text-xs text-blue-600 font-medium">
                            📍 Google Maps
                          </div>
                        )}
                        {business.googleMapsData?.rating && (
                          <div className="text-xs text-yellow-600">
                            ⭐ {business.googleMapsData.rating}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </>
            )}

            {/* No Results */}
            {shouldSearch && !isLoading && (
              <>
                {searchType === 'places' && (!Array.isArray(placeResults) || placeResults.length === 0) && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No places found</p>
                  </div>
                )}
                {searchType === 'businesses' && (!Array.isArray(businessResults) || businessResults.length === 0) && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No Aboriginal businesses found</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}