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
  Navigation,
  Mountain,
  FileText,
  Map
} from 'lucide-react';
import { cn } from '@/lib/utils';
import debounce from 'lodash.debounce';

interface SearchResult {
  id: string;
  type: 'territory' | 'place' | 'business' | 'address' | 'mining' | 'exploration';
  name: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  metadata?: any;
  webLink?: string;
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

  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  
  // Fetch territories data
  const { data: territories } = useQuery<any>({
    queryKey: ['/api/territories'],
  });

  // Search function to filter local territory results
  const localResults = useMemo(() => {
    if (!query || query.length < 2) return [];

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search territories from locally loaded data
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

    return results;
  }, [query, territories]);

  // Combine local and API results
  const searchResults = useMemo(() => {
    const allResults = [...localResults, ...apiResults];
    
    // Sort results by relevance (exact matches first)
    const lowerQuery = query.toLowerCase();
    allResults.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    return allResults.slice(0, 15);
  }, [localResults, apiResults, query]);

  // Debounced search for external APIs (MINEDEX, WAMEX, geocoding)
  const performExternalSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setApiResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      const results: SearchResult[] = [];
      
      // Helper function to safely fetch and parse JSON
      const safeFetch = async (url: string): Promise<any> => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          return await response.json();
        } catch (error) {
          console.warn(`Search fetch failed for ${url}:`, error);
          return null;
        }
      };
      
      try {
        // Fetch from multiple APIs in parallel with individual error handling
        const [minedexData, wamexData, geocodeData] = await Promise.all([
          safeFetch(`/api/minedex/search?q=${encodeURIComponent(searchQuery)}`),
          safeFetch(`/api/wamex/search?q=${encodeURIComponent(searchQuery)}`),
          safeFetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`)
        ]);
        
        // Helper to validate coordinates with proper finite checks
        const validateCoords = (lat: any, lng: any): { lat: number; lng: number } | undefined => {
          const parsedLat = Number(lat);
          const parsedLng = Number(lng);
          if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && 
              parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
            return { lat: parsedLat, lng: parsedLng };
          }
          return undefined;
        };
        
        // Process MINEDEX results (mining sites)
        if (minedexData?.sites && Array.isArray(minedexData.sites)) {
          const miningResults = minedexData.sites
            .filter((site: any) => site?.siteTitle || site?.shortName)
            .slice(0, 5)
            .map((site: any) => ({
              id: site.id || `mining-${site.siteCode || Math.random()}`,
              type: 'mining' as const,
              name: site.siteTitle || site.shortName || 'Unknown Site',
              description: `${site.siteType || 'Mining Site'} - ${site.siteCommodities || 'Unknown'} (${site.siteStage || 'Unknown stage'})`,
              coordinates: validateCoords(site.coordinates?.lat, site.coordinates?.lng),
              webLink: site.webLink,
              metadata: site
            }));
          results.push(...miningResults);
        }
        
        // Process WAMEX results (exploration reports)
        if (wamexData?.reports && Array.isArray(wamexData.reports)) {
          const explorationResults = wamexData.reports
            .filter((report: any) => report?.project || report?.title)
            .slice(0, 5)
            .map((report: any) => {
              const coords = Array.isArray(report.coordinates) && report.coordinates[0]?.length >= 2
                ? validateCoords(report.coordinates[0][1], report.coordinates[0][0])
                : undefined;
              return {
                id: report.id || `exploration-${report.aNumber || Math.random()}`,
                type: 'exploration' as const,
                name: report.project || report.title || 'Unknown Report',
                description: `${report.reportType || 'Report'} - ${report.targetCommodity || 'Various'} (${report.operator || 'Unknown operator'})`,
                coordinates: coords,
                webLink: report.abstractUrl,
                metadata: report
              };
            });
          results.push(...explorationResults);
        }
        
        // Process geocode results (places)
        if (Array.isArray(geocodeData)) {
          const placeResults = geocodeData
            .filter((place: any) => place?.display_name || place?.name)
            .slice(0, 3)
            .map((place: any) => {
              const coords = validateCoords(place.lat, place.lon);
              return {
                id: `place-${place.place_id || place.display_name || Math.random()}`,
                type: 'place' as const,
                name: place.display_name?.split(',')[0] || place.name || 'Unknown Place',
                description: place.display_name || 'Location',
                coordinates: coords,
                metadata: place
              };
            });
          results.push(...placeResults);
        }
        
        setApiResults(results);
      } catch (error) {
        console.error('Search API error:', error);
        setApiResults([]);
      } finally {
        setIsSearching(false);
      }
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
        return <Map className="w-4 h-4 text-orange-600" />;
      case 'place':
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'business':
        return <Briefcase className="w-4 h-4 text-green-600" />;
      case 'address':
        return <Building2 className="w-4 h-4 text-gray-600" />;
      case 'mining':
        return <Mountain className="w-4 h-4 text-purple-600" />;
      case 'exploration':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

  // Get type badge styling
  const getTypeBadgeClass = (type: SearchResult['type']) => {
    switch (type) {
      case 'territory':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'place':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'business':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'address':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'mining':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'exploration':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get human-readable type label
  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'territory': return 'Territory';
      case 'place': return 'Place';
      case 'business': return 'Business';
      case 'address': return 'Address';
      case 'mining': return 'Mining Site';
      case 'exploration': return 'Report';
      default: return type;
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
                              variant="outline"
                              className={cn("text-xs", getTypeBadgeClass(result.type))}
                            >
                              {getTypeLabel(result.type)}
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