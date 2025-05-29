import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';

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

interface BusinessMapLayerProps {
  map: L.Map | null;
  onBusinessSelect?: (business: BusinessLocation) => void;
}

export default function BusinessMapLayer({ map, onBusinessSelect }: BusinessMapLayerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [businessMarkers, setBusinessMarkers] = useState<L.Marker[]>([]);

  const { data: businessResults, refetch: searchBusinesses } = useQuery({
    queryKey: ['/api/businesses/map', searchTerm],
    enabled: false,
    select: (data) => data as { businesses: BusinessLocation[]; totalResults: number }
  });

  const handleSearch = async () => {
    if (!searchTerm.trim() || !map) return;
    
    setIsSearching(true);
    
    // Clear existing business markers
    businessMarkers.forEach(marker => map.removeLayer(marker));
    setBusinessMarkers([]);

    try {
      await searchBusinesses();
      
      if (businessResults?.businesses) {
        const newMarkers: L.Marker[] = [];
        
        businessResults.businesses.forEach((business) => {
          // Create custom business marker icon
          const businessIcon = L.divIcon({
            html: `<div style="
              background: #ff6b35;
              color: white;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              font-size: 12px;
            ">🏢</div>`,
            className: 'business-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker([business.lat, business.lng], { icon: businessIcon })
            .bindPopup(`
              <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #333;">
                  ${business.entityName}
                </h3>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                  <strong>ABN:</strong> ${business.abn}
                </p>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                  <strong>Type:</strong> ${business.entityType}
                </p>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                  <strong>Status:</strong> ${business.status}
                </p>
                <p style="margin: 0; font-size: 12px; color: #666;">
                  <strong>Address:</strong> ${business.displayAddress}
                </p>
              </div>
            `)
            .addTo(map);

          marker.on('click', () => {
            if (onBusinessSelect) {
              onBusinessSelect(business);
            }
          });

          newMarkers.push(marker);
        });

        setBusinessMarkers(newMarkers);
        
        // Fit map to show all businesses if there are results
        if (newMarkers.length > 0) {
          const group = new L.FeatureGroup(newMarkers);
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }
    } catch (error) {
      console.error('Error searching businesses:', error);
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
    <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-sm">Indigenous Business Search</h3>
      </div>
      
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search Indigenous businesses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !searchTerm.trim()}
          size="sm"
        >
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {businessResults && (
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>
              Found {businessResults.totalResults} businesses from Australian Business Register
            </span>
          </div>
        </div>
      )}
    </div>
  );
}