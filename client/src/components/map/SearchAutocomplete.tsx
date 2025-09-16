import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  X, 
  MapPin, 
  Building2, 
  Users,
  Briefcase,
  Loader2,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import debounce from 'lodash.debounce';

interface SearchResult {
  id: string;
  type: 'territory' | 'place' | 'business' | 'address';
  name: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  metadata?: any;
}

interface SearchAutocompleteProps {
  map: L.Map | null;
  onSelectResult?: (result: SearchResult) => void;
  className?: string;
  placeholder?: string;
}

export function SearchAutocomplete({ 
  map, 
  onSelectResult,
  className,
  placeholder = "Search territories, places, businesses..."
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch territories data
  const { data: territories } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Search function to filter results
  const searchResults = useMemo(() => {
    if (!query || query.length < 2) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search territories
    if (territories?.features) {
      const territoryMatches = territories.features
        .filter((feature: any) => 
          feature.properties?.name?.toLowerCase().includes(lowerQuery) ||
          feature.properties?.groupName?.toLowerCase().includes(lowerQuery) ||
          feature.properties?.languageFamily?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5)
        .map((feature: any) => ({
          id: `territory-${feature.properties.id}`,
          type: 'territory' as const,
          name: feature.properties.name,
          description: `${feature.properties.groupName || 'Aboriginal Territory'} - ${feature.properties.regionType || 'Traditional lands'}`,
          coordinates: feature.geometry?.coordinates?.[0]?.[0] 
            ? { 
                lat: feature.geometry.coordinates[0][0][1], 
                lng: feature.geometry.coordinates[0][0][0] 
              }
            : undefined,
          metadata: feature.properties
        }));
      
      results.push(...territoryMatches);
    }

    // Mock place search (in production, this would call a geocoding API)
    if (lowerQuery.includes('sydney') || lowerQuery.includes('melbourne') || 
        lowerQuery.includes('brisbane') || lowerQuery.includes('perth')) {
      const places = [
        { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
        { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
        { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
        { name: 'Perth', lat: -31.9505, lng: 115.8605 }
      ];
      
      const placeMatches = places
        .filter(place => place.name.toLowerCase().includes(lowerQuery))
        .map(place => ({
          id: `place-${place.name}`,
          type: 'place' as const,
          name: place.name,
          description: 'Major city',
          coordinates: { lat: place.lat, lng: place.lng }
        }));
      
      results.push(...placeMatches);
    }

    // Sort results by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    return results.slice(0, 10); // Limit to 10 results
  }, [query, territories]);

  // Debounced search for external APIs
  const performExternalSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 3) return;
      
      setIsSearching(true);
      
      // Here you would call external geocoding or business search APIs
      // For now, we'll just use a timeout to simulate async search
      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }, 300),
    []
  );

  useEffect(() => {
    performExternalSearch(query);
  }, [query, performExternalSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectResult(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle result selection
  const handleSelectResult = (result: SearchResult) => {
    if (!map || !result.coordinates) return;

    // Pan and zoom to the selected location
    map.setView([result.coordinates.lat, result.coordinates.lng], 
      result.type === 'territory' ? 8 : 12
    );

    // Add a temporary marker
    const L = (window as any).L;
    if (L) {
      const marker = L.marker([result.coordinates.lat, result.coordinates.lng], {
        icon: L.divIcon({
          className: 'search-result-marker',
          html: `<div class="w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>`,
          iconSize: [32, 32]
        })
      }).addTo(map);
      
      // Remove marker after 5 seconds
      setTimeout(() => {
        map.removeLayer(marker);
      }, 5000);
    }

    // Clear search
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);

    // Notify parent component
    onSelectResult?.(result);
  };

  // Get icon for result type
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'territory':
        return <Users className="w-4 h-4" />;
      case 'place':
        return <MapPin className="w-4 h-4" />;
      case 'business':
        return <Briefcase className="w-4 h-4" />;
      case 'address':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

  // Get type badge color
  const getTypeBadgeVariant = (type: SearchResult['type']) => {
    switch (type) {
      case 'territory':
        return 'default';
      case 'place':
        return 'secondary';
      case 'business':
        return 'outline';
      case 'address':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length > 0);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
          data-testid="input-search-autocomplete"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            data-testid="button-clear-search"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        {isSearching && (
          <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search results dropdown */}
      {isOpen && (searchResults.length > 0 || isSearching) && (
        <Card 
          ref={resultsRef}
          className={cn(
            "absolute top-full mt-1 w-full z-[1000] shadow-lg",
            "max-h-[400px] overflow-hidden"
          )}
        >
          <ScrollArea className="h-full max-h-[400px]">
            <div className="p-2">
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectResult(result)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                        selectedIndex === index && "bg-accent text-accent-foreground"
                      )}
                      data-testid={`search-result-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getResultIcon(result.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {result.name}
                            </span>
                            <Badge 
                              variant={getTypeBadgeVariant(result.type) as any}
                              className="text-xs"
                            >
                              {result.type}
                            </Badge>
                          </div>
                          {result.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {result.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : isSearching ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Searching...</p>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No results found for "{query}"</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}