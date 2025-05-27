import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loading-spinner';
import type { SearchResult } from '@shared/schema';

interface SearchPanelProps {
  onSearch: (lat: number, lng: number) => void;
}

export default function SearchPanel({ onSearch }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [shouldSearch, setShouldSearch] = useState(false);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['/api/geocode', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json() as Promise<SearchResult[]>;
    },
    enabled: shouldSearch && searchQuery.trim().length > 0,
  });

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

  const handleResultSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onSearch(lat, lng);
    setShouldSearch(false);
    setSearchQuery('');
  };

  return (
    <Card className="search-container absolute top-5 left-5 z-[1000] bg-earth-beige/95 backdrop-blur-sm border-earth-brown/20 shadow-lg">
      <div className="p-5">
        <h3 className="font-serif font-bold text-earth-brown mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          Search Territory
        </h3>
        
        <div className="space-y-3">
          <Input
            type="text"
            placeholder="Enter address or place name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="border-earth-peru/30 focus:ring-earth-gold"
          />
          
          <Button 
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="w-full bg-earth-brown hover:bg-earth-brown/90 text-white"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </Button>

          <div className="text-sm text-earth-dark/70">
            <svg className="w-4 h-4 inline mr-1 text-earth-gold" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z"/>
            </svg>
            Try: "Sydney", "Alice Springs", or "Darwin"
          </div>

          {/* Search Results */}
          {searchResults && searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <h4 className="font-semibold text-earth-brown text-sm">Search Results:</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultSelect(result)}
                    className="w-full text-left p-2 text-sm bg-white hover:bg-earth-gold/20 rounded border border-earth-peru/20 transition-colors"
                  >
                    <div className="font-medium text-earth-brown">{result.display_name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
