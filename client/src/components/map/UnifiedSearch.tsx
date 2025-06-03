import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Navigation, Search } from 'lucide-react';
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
  supplyNationData?: {
    companyName: string;
    categories: string[];
    description?: string;
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

  // Business search query using integrated ABR + Supply Nation system
  const { data: businessResults, isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ['/api/indigenous-businesses/integrated-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { businesses: [], totalResults: 0 };
      const response = await fetch(`/api/indigenous-businesses/integrated-search?name=${encodeURIComponent(searchQuery)}&includeSupplyNation=true`);
      if (!response.ok) {
        throw new Error('Business search failed');
      }
      const data = await response.json();
      
      // Transform integrated business data to match expected format
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
        verificationSource: business.verificationSource,
        supplyNationData: business.supplyNationData
      })) || [];
      
      return { businesses, totalResults: data.totalResults || 0 };
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
    
    // Add business marker to map
    if (map) {
      const marker = L.marker([business.lat, business.lng], {
        icon: L.divIcon({
          className: 'business-marker',
          html: `
            <div class="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9l-5.91 0.74L12 22l-4.09-6.26L2 15l5.91-0.74L12 2z"/>
              </svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(map);
      
      // Enhanced popup with Supply Nation contact information
      const getVerificationBadge = () => {
        if (business.supplyNationVerified) {
          return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
            <div style="background: #2ECC71; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block;">
              ✓ Supply Nation Verified
            </div>
            <img src="https://ibd.supplynation.org.au/public/resource/1651046831000/sna/certifiled_new.png" 
                 alt="Supply Nation Certified" 
                 style="height: 24px; width: auto; border-radius: 4px;" />
          </div>`;
        }
        const confidence = (business as any).verificationConfidence || 'low';
        const badgeColor = confidence === 'high' ? '#F39C12' : confidence === 'medium' ? '#3498DB' : '#95A5A6';
        return `<div style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
          ${confidence.toUpperCase()} Confidence Indigenous
        </div>`;
      };

      const getContactInfo = () => {
        if (!business.supplyNationData) return '';
        
        let contactHtml = '';
        const contactInfo = business.supplyNationData.contactInfo || {};
        const detailedAddress = business.supplyNationData.detailedAddress;
        
        // Trading name
        if (business.supplyNationData.tradingName) {
          contactHtml += `
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">
              <strong>Trading as:</strong> ${business.supplyNationData.tradingName}
            </p>`;
        }
        
        // Contact person
        if (contactInfo.contactPerson) {
          contactHtml += `
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">
              <strong>Contact:</strong> ${contactInfo.contactPerson}
            </p>`;
        }
        
        // Phone
        if (contactInfo.phone) {
          contactHtml += `
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">
              <strong>Phone:</strong> <a href="tel:${contactInfo.phone}" style="color: #3498db; text-decoration: none;">${contactInfo.phone}</a>
            </p>`;
        }
        
        // Email
        if (contactInfo.email) {
          contactHtml += `
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">
              <strong>Email:</strong> <a href="mailto:${contactInfo.email}" style="color: #3498db; text-decoration: none;">${contactInfo.email}</a>
            </p>`;
        }
        
        // Website
        if (contactInfo.website) {
          contactHtml += `
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">
              <strong>Website:</strong> <a href="${contactInfo.website}" target="_blank" style="color: #3498db; text-decoration: none;">Visit Website</a>
            </p>`;
        }
        
        // Detailed address
        if (detailedAddress && detailedAddress.streetAddress) {
          contactHtml += `
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">
              <strong>Address:</strong> ${detailedAddress.streetAddress}, ${detailedAddress.suburb} ${detailedAddress.state} ${detailedAddress.postcode}
            </p>`;
        }
        
        // Services
        if (business.supplyNationData.categories && business.supplyNationData.categories.length > 0) {
          contactHtml += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #666;">SERVICES:</p>
              <p style="margin: 0; font-size: 11px; color: #666; line-height: 1.4;">
                ${business.supplyNationData.categories.slice(0, 3).join(' • ')}
              </p>
            </div>`;
        }
        
        return contactHtml;
      };
      
      marker.bindPopup(`
        <div style="min-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
          ${getVerificationBadge()}
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #2c3e50; line-height: 1.3;">
            ${business.entityName}
          </h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
            <strong>ABN:</strong> ${business.abn}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
            <strong>Status:</strong> ${business.status}
          </p>
          ${getContactInfo()}
        </div>
      `, {
        offset: [120, -10], // Move popup to the right to avoid search component overlap
        maxWidth: 300,
        className: 'business-popup'
      }).openPopup();
      
      // Store marker for cleanup
      (marker as any).businessABN = business.abn;
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
    <div className="absolute top-20 left-16 z-[1000] w-80">
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
              
              {searchType === 'businesses' && businessResults?.businesses.map((business: any, index: number) => (
                <button
                  key={index}
                  onClick={() => handleBusinessSelect(business)}
                  className="w-full text-left p-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors hover:bg-orange-50"
                >
                  <div className="flex items-start gap-3">
                    {/* Business Icon with Verification Indicator */}
                    <div className="relative flex-shrink-0">
                      <Building2 className="w-5 h-5 text-orange-600 mt-0.5" />
                      {business.supplyNationVerified && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Business Name and Verification */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-gray-900 truncate text-sm">{business.entityName}</div>
                        {business.supplyNationVerified && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs font-medium">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Supply Nation
                          </div>
                        )}
                      </div>
                      
                      {/* Business Status and Confidence */}
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                          business.status === 'Active' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {business.status}
                        </span>
                        {business.verificationConfidence && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                            business.verificationConfidence === 'high' 
                              ? 'bg-orange-100 text-orange-700'
                              : business.verificationConfidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {business.verificationConfidence} confidence
                          </span>
                        )}
                      </div>
                      
                      {/* Location - Prioritize Supply Nation address */}
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>
                          {business.supplyNationData?.location ? 
                           business.supplyNationData.location.trim().replace(/\s+/g, ' ') : 
                           business.displayAddress}
                        </span>
                        {business.supplyNationData?.location && (
                          <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded text-[10px] font-medium">
                            SN
                          </span>
                        )}
                      </div>
                      
                      {/* Owner/Founder Information */}
                      {business.supplyNationData?.companyName && 
                       business.supplyNationData.companyName.includes(',') && 
                       !business.supplyNationData.companyName.includes('PTY') && 
                       !business.supplyNationData.companyName.includes('LTD') && (
                        <div className="text-xs text-orange-700 mt-1 flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium">Owner:</span> {business.supplyNationData.companyName}
                        </div>
                      )}
                      
                      {/* Supply Nation Categories */}
                      {business.supplyNationData?.categories && business.supplyNationData.categories.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          <span className="font-medium">Services:</span> {business.supplyNationData.categories.slice(0, 2).join(', ')}
                          {business.supplyNationData.categories.length > 2 && ' +more'}
                        </div>
                      )}
                      
                      {/* Supply Nation Description (truncated) */}
                      {business.supplyNationData?.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {business.supplyNationData.description.substring(0, 80)}
                          {business.supplyNationData.description.length > 80 && '...'}
                        </div>
                      )}
                      
                      {/* Certifications */}
                      {business.supplyNationData?.certifications && business.supplyNationData.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {business.supplyNationData.certifications.slice(0, 2).map((cert: string, certIndex: number) => (
                            <span key={certIndex} className="inline-block bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
                              {cert}
                            </span>
                          ))}
                          {business.supplyNationData.certifications.length > 2 && (
                            <span className="inline-block bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                              +{business.supplyNationData.certifications.length - 2}
                            </span>
                          )}
                        </div>
                      )}
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