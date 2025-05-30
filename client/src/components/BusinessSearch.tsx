import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, MapPin, Phone, Mail, Globe } from 'lucide-react';

interface ABRBusiness {
  abn: string;
  entityName: string;
  entityType: string;
  status: string;
  address: {
    stateCode?: string;
    postcode?: string;
    suburb?: string;
  };
  gst: boolean;
  dgr?: boolean;
}

interface ABRSearchResult {
  businesses: ABRBusiness[];
  totalResults: number;
}

export default function BusinessSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { data: searchResults, refetch } = useQuery<ABRSearchResult>({
    queryKey: ['abr-business-search', searchTerm],
    queryFn: async () => {
      const response = await fetch(`/api/abr/businesses/search?name=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Failed to search businesses');
      }
      return response.json();
    },
    enabled: false, // Only run when manually triggered
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      await refetch();
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="Search for Indigenous businesses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !searchTerm.trim()}
          className="px-6"
        >
          <Search className="w-4 h-4 mr-2" />
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {searchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Australian Business Register Results
            </h3>
            <Badge variant="secondary">
              {searchResults.totalResults} businesses found
            </Badge>
          </div>

          {searchResults.businesses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No businesses found for "{searchTerm}"</p>
                  <p className="text-sm mt-2">
                    Try searching with different keywords like "Indigenous", "Aboriginal", or "Cultural"
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {searchResults.businesses.map((business) => (
                <Card key={business.abn} className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-orange-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{business.entityName}</CardTitle>
                          {business.supplyNationVerified && (
                            <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Supply Nation Verified
                            </div>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="outline">{business.entityType}</Badge>
                          <Badge variant={business.status === 'Active' ? 'default' : 'secondary'}>
                            {business.status}
                          </Badge>
                          {business.verificationConfidence && (
                            <Badge variant="secondary" className="text-xs">
                              {business.verificationConfidence.toUpperCase()} Confidence
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="font-mono">ABN: {business.abn}</div>
                        <div className="flex flex-col gap-1 mt-1">
                          {business.gst && (
                            <Badge variant="secondary" className="text-xs">
                              GST Registered
                            </Badge>
                          )}
                          {business.dgr && (
                            <Badge variant="secondary" className="text-xs">
                              DGR Status
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Location Information */}
                    {(business.address.suburb || business.address.stateCode || business.address.postcode) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {[business.address.suburb, business.address.stateCode, business.address.postcode]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Supply Nation Data */}
                    {business.supplyNationData && (
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        {/* Business Description */}
                        {business.supplyNationData.description && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 mb-1">Services & Capabilities</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {business.supplyNationData.description}
                            </p>
                          </div>
                        )}

                        {/* Categories */}
                        {business.supplyNationData.categories && business.supplyNationData.categories.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 mb-2">Business Categories</h4>
                            <div className="flex flex-wrap gap-1">
                              {business.supplyNationData.categories.slice(0, 6).map((category, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                              {business.supplyNationData.categories.length > 6 && (
                                <Badge variant="outline" className="text-xs text-gray-500">
                                  +{business.supplyNationData.categories.length - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Contact Information */}
                        {(business.supplyNationData.contactInfo?.website || 
                          business.supplyNationData.contactInfo?.email || 
                          business.supplyNationData.contactInfo?.phone) && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 mb-2">Contact Information</h4>
                            <div className="space-y-1">
                              {business.supplyNationData.contactInfo.website && (
                                <div className="flex items-center gap-2 text-sm">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                                  </svg>
                                  <a href={business.supplyNationData.contactInfo.website} 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     className="text-blue-600 hover:text-blue-800 text-sm">
                                    {business.supplyNationData.contactInfo.website}
                                  </a>
                                </div>
                              )}
                              {business.supplyNationData.contactInfo.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <a href={`mailto:${business.supplyNationData.contactInfo.email}`}
                                     className="text-blue-600 hover:text-blue-800 text-sm">
                                    {business.supplyNationData.contactInfo.email}
                                  </a>
                                </div>
                              )}
                              {business.supplyNationData.contactInfo.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <a href={`tel:${business.supplyNationData.contactInfo.phone}`}
                                     className="text-blue-600 hover:text-blue-800 text-sm">
                                    {business.supplyNationData.contactInfo.phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Certifications */}
                        {business.supplyNationData.certifications && business.supplyNationData.certifications.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 mb-2">Certifications</h4>
                            <div className="flex flex-wrap gap-1">
                              {business.supplyNationData.certifications.map((cert, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-green-50 text-green-700">
                                  {cert}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>
          Business data sourced from the Australian Business Register (ABR). 
          Results are filtered to show businesses that may be Indigenous-owned or operated.
        </p>
      </div>
    </div>
  );
}