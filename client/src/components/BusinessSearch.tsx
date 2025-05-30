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
    fullAddress?: string;
  };
  gst: boolean;
  dgr?: boolean;
  supplyNationVerified?: boolean;
  verificationConfidence?: 'high' | 'medium' | 'low';
  supplyNationData?: {
    companyName: string;
    verified: boolean;
    categories: string[];
    location: string;
    contactInfo: {
      email?: string;
      phone?: string;
      website?: string;
      contactPerson?: string;
    };
    description?: string;
    supplynationId: string;
    capabilities?: string[];
    certifications?: string[];
    tradingName?: string;
    detailedAddress?: {
      streetAddress?: string;
      suburb?: string;
      state?: string;
      postcode?: string;
    };
    abn?: string;
    acn?: string;
    lastUpdated?: string;
  };
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
                    {/* Location Information - Prioritize Supply Nation address */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {business.supplyNationData?.location ? 
                         business.supplyNationData.location.trim().replace(/\s+/g, ' ') : 
                         [business.address.suburb, business.address.stateCode, business.address.postcode]
                           .filter(Boolean)
                           .join(', ')}
                      </span>
                      {business.supplyNationData?.location && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Supply Nation Address
                        </span>
                      )}
                    </div>

                    {/* Owner/Founder Information */}
                    {business.supplyNationData?.companyName && 
                     business.supplyNationData.companyName.includes(',') && 
                     !business.supplyNationData.companyName.includes('PTY') && 
                     !business.supplyNationData.companyName.includes('LTD') && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                        <h4 className="font-medium text-sm text-orange-900 mb-1 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Indigenous Business Owner
                        </h4>
                        <p className="text-sm text-orange-800">
                          {business.supplyNationData.companyName}
                        </p>
                      </div>
                    )}

                    {/* Supply Nation Verification Status */}
                    {business.supplyNationVerified && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-sm text-green-900">Supply Nation Verified Indigenous Business</span>
                        </div>
                        <p className="text-xs text-green-700">
                          This business is certified as an Indigenous-owned enterprise through Supply Nation.
                        </p>
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

                        {/* Enhanced Supply Nation Profile Information */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Supply Nation Certified Profile
                            </h4>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                              Verified Indigenous Business
                            </span>
                          </div>

                          {/* Trading Name */}
                          {business.supplyNationData?.tradingName && (
                            <div>
                              <p className="text-xs text-blue-600 font-medium">Trading as:</p>
                              <p className="text-sm text-blue-900 font-medium">{business.supplyNationData.tradingName}</p>
                            </div>
                          )}

                          {/* Detailed Address */}
                          {business.supplyNationData.detailedAddress && (
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div>
                                {business.supplyNationData.detailedAddress.streetAddress && (
                                  <p className="text-sm font-medium text-blue-900">
                                    {business.supplyNationData.detailedAddress.streetAddress}
                                  </p>
                                )}
                                <p className="text-sm text-blue-700">
                                  {[
                                    business.supplyNationData.detailedAddress.suburb,
                                    business.supplyNationData.detailedAddress.state,
                                    business.supplyNationData.detailedAddress.postcode
                                  ].filter(Boolean).join(' ')}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Contact Person */}
                          {business.supplyNationData.contactInfo?.contactPerson && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <div>
                                <p className="text-xs text-blue-600">Contact Person</p>
                                <p className="text-sm font-medium text-blue-900">
                                  {business.supplyNationData.contactInfo.contactPerson}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Contact Information */}
                          <div className="space-y-2">
                            {business.supplyNationData.contactInfo?.phone && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <a href={`tel:${business.supplyNationData.contactInfo.phone.replace(/\s/g, '')}`}
                                   className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                  {business.supplyNationData.contactInfo.phone}
                                </a>
                              </div>
                            )}

                            {business.supplyNationData.contactInfo?.website && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                                </svg>
                                <a href={business.supplyNationData.contactInfo.website} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                  {business.supplyNationData.contactInfo.website.replace(/^https?:\/\//, '')}
                                </a>
                              </div>
                            )}

                            {business.supplyNationData.contactInfo?.email && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <a href={`mailto:${business.supplyNationData.contactInfo.email}`}
                                   className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                  {business.supplyNationData.contactInfo.email}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* ABN/ACN */}
                          {(business.supplyNationData.abn || business.supplyNationData.acn) && (
                            <div className="flex items-center gap-4 text-xs text-blue-600 pt-2 border-t border-blue-200">
                              {business.supplyNationData.abn && <span>ABN: {business.supplyNationData.abn}</span>}
                              {business.supplyNationData.acn && <span>ACN: {business.supplyNationData.acn}</span>}
                            </div>
                          )}

                          {/* Last Updated */}
                          {business.supplyNationData.lastUpdated && (
                            <div className="text-xs text-blue-500">
                              Last updated: {business.supplyNationData.lastUpdated}
                            </div>
                          )}
                        </div>

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

                        {/* Supply Nation Profile Link */}
                        {business.supplyNationData.supplynationId && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <a
                              href={`https://ibd.supplynation.org.au/public/s/supplierprofile?accid=${business.supplyNationData.supplynationId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Full Supply Nation Profile
                            </a>
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