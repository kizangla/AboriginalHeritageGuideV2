import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Building2, Navigation, Search, X } from 'lucide-react';
import L from 'leaflet';
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
      console.log(`Searching for: "${searchQuery}" in ${searchType} mode`);
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
    <Card className="absolute top-20 right-4 z-[1000] w-96 bg-white/95 backdrop-blur-sm shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">Search Aboriginal Australia</h3>
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
          <Button
            onClick={() => setSearchType('places')}
            size="sm"
            variant={searchType === 'places' ? 'default' : 'ghost'}
            className="flex-1 h-8"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Places
          </Button>
          <Button
            onClick={() => setSearchType('businesses')}
            size="sm"
            variant={searchType === 'businesses' ? 'default' : 'ghost'}
            className="flex-1 h-8"
          >
            <Building2 className="w-3 h-3 mr-1" />
            Businesses
          </Button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder={searchType === 'places' ? 'Search places...' : 'Search Indigenous businesses...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            size="sm"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Results */}
        {shouldSearch && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Searching...</p>
              </div>
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

            {/* Business Results */}
            {searchType === 'businesses' && Array.isArray(businessResults) && (
              <>
                {businessResults.map((business: any, index: number) => (
                  <Button
                    key={business.id || business.abn || index}
                    onClick={() => handleBusinessSelect(business)}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left"
                  >
                    <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{business.name || business.entityName}</div>
                      <div className="text-xs text-gray-500">
                        {business.businessType || business.entityType} • {business.address || business.displayAddress}
                      </div>
                      {business.isVerified && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          ✓ Aboriginal Business Verified
                        </div>
                      )}
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
      </CardContent>
    </Card>
  );
}