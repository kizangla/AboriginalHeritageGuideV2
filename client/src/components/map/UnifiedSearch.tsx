import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Navigation, Search } from 'lucide-react';
import type { SearchResult } from '@shared/schema';

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
}

interface BusinessSearchResult {
  businesses: BusinessLocation[];
  totalResults: number;
}

interface UnifiedSearchProps {
  map: L.Map | null;
  onLocationSelect: (lat: number, lng: number) => void;
  onBusinessSelect?: (business: BusinessLocation) => void;
}

type SearchType = 'places' | 'businesses';

export default function UnifiedSearch({ map, onLocationSelect, onBusinessSelect }: UnifiedSearchProps) {
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
        throw new Error('Search failed');
      }
      return response.json() as Promise<SearchResult[]>;
    },
    enabled: shouldSearch && searchType === 'places' && searchQuery.trim().length > 0,
  });

  // Business search query
  const { data: businessResults, isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ['/api/businesses/map', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { businesses: [], totalResults: 0 };
      const response = await fetch(`/api/businesses/map?search=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Business search failed');
      }
      return response.json() as Promise<BusinessSearchResult>;
    },
    enabled: shouldSearch && searchType === 'businesses' && searchQuery.trim().length > 0,
  });

  const isLoading = searchType === 'places' ? isLoadingPlaces : isLoadingBusinesses;
  const hasResults = searchType === 'places' 
    ? placeResults && placeResults.length > 0
    : businessResults && businessResults.totalResults > 0;

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
  };

  const handleBusinessSelect = (business: BusinessLocation) => {
    onLocationSelect(business.lat, business.lng);
    if (onBusinessSelect) {
      onBusinessSelect(business);
    }
    setShouldSearch(false);
    setSearchQuery('');
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onLocationSelect(lat, lng);
        if (map) {
          map.setView([lat, lng], 15);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location.');
      }
    );
  };

  return (
    <div className="absolute top-20 left-4 z-[1000] w-80">
      <div className="bg-white rounded-xl shadow-md">
        {/* Search Bar */}
        <div className="flex gap-1 p-1">
          <Input
            type="text"
            placeholder={searchType === 'places' ? 'Search places...' : 'Search Indigenous businesses...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border-0 focus:ring-0 focus-visible:ring-0 text-sm h-10"
          />
          <Button 
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            size="sm"
            className="h-10 w-10 p-0 bg-transparent hover:bg-gray-100 text-gray-600"
            variant="ghost"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 px-2 pb-2">
          <Button
            onClick={() => setSearchType('places')}
            size="sm"
            variant={searchType === 'places' ? 'default' : 'outline'}
            className="h-8 text-xs"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Places
          </Button>
          <Button
            onClick={() => setSearchType('businesses')}
            size="sm"
            variant={searchType === 'businesses' ? 'default' : 'outline'}
            className="h-8 text-xs"
          >
            <Building2 className="w-3 h-3 mr-1" />
            Businesses
          </Button>
          <Button
            onClick={getCurrentLocation}
            size="sm"
            variant="outline"
            className="h-8 text-xs ml-auto"
            title="Get current location"
          >
            <Navigation className="w-3 h-3" />
          </Button>
        </div>

        {/* Results Count */}
        {hasResults && (
          <div className="px-3 pb-2 text-xs text-gray-500">
            {searchType === 'places' 
              ? `${placeResults?.length} places found`
              : `${businessResults?.totalResults} businesses found`
            }
          </div>
        )}

        {/* Search Results */}
        {hasResults && (
          <div className="border-t border-gray-100">
            <div className="max-h-60 overflow-y-auto">
              {searchType === 'places' && placeResults?.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handlePlaceSelect(result)}
                  className="w-full text-left p-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{result.display_name}</div>
                    </div>
                  </div>
                </button>
              ))}
              
              {searchType === 'businesses' && businessResults?.businesses.map((business, index) => (
                <button
                  key={index}
                  onClick={() => handleBusinessSelect(business)}
                  className="w-full text-left p-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{business.entityName}</div>
                      <div className="text-xs text-gray-500">{business.displayAddress}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}