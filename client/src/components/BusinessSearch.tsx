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
                <Card key={business.abn} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{business.entityName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{business.entityType}</Badge>
                          <Badge variant={business.status === 'Active' ? 'default' : 'secondary'}>
                            {business.status}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>ABN: {business.abn}</div>
                        {business.gst && (
                          <Badge variant="secondary" className="mt-1">
                            GST Registered
                          </Badge>
                        )}
                        {business.dgr && (
                          <Badge variant="secondary" className="mt-1 ml-1">
                            DGR Status
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
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