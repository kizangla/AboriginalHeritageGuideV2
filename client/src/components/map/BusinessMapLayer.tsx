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

  const { data: businessResults, refetch: searchBusinesses, isLoading } = useQuery({
    queryKey: ['/api/indigenous-businesses/integrated-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return { businesses: [], totalResults: 0 };
      const response = await fetch(`/api/indigenous-businesses/integrated-search?name=${encodeURIComponent(searchTerm)}&includeSupplyNation=true`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: false,
    select: (data) => {
      // Transform integrated business data to BusinessLocation format
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
        supplyNationData: business.supplyNationData // Include Supply Nation contact data
      })) || [];
      return { businesses, totalResults: data.totalResults || 0 };
    }
  });

  const handleSearch = async () => {
    if (!searchTerm.trim() || !map) return;
    
    setIsSearching(true);
    
    // Clear existing business markers
    businessMarkers.forEach(marker => map.removeLayer(marker));
    setBusinessMarkers([]);

    try {
      const result = await searchBusinesses();
      
      if (result.data?.businesses) {
        const newMarkers: L.Marker[] = [];
        
        result.data.businesses.forEach((business: any) => {
          // Skip businesses without valid coordinates
          if (!business.lat || !business.lng || business.lat === 0 || business.lng === 0) {
            console.log(`Skipping business ${business.entityName} - no valid coordinates`);
            return;
          }

          // Determine marker color based on verification status
          const getMarkerColor = () => {
            if (business.supplyNationVerified) return '#2ECC71'; // Green for verified
            if (business.verificationConfidence === 'high') return '#F39C12'; // Orange for high confidence
            if (business.verificationConfidence === 'medium') return '#3498DB'; // Blue for medium confidence
            return '#95A5A6'; // Gray for low confidence
          };

          const getMarkerIcon = () => {
            if (business.supplyNationVerified) return '✓'; // Checkmark for verified
            return '🏢'; // Building for unverified
          };

          // Enhanced marker design with better visibility
          const businessIcon = L.divIcon({
            html: `<div style="
              background: ${getMarkerColor()};
              color: white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              transition: transform 0.2s ease;
            " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${getMarkerIcon()}</div>`,
            className: 'business-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          console.log(`Adding marker for ${business.entityName} at [${business.lat}, ${business.lng}]`);
          
          // Enhanced popup with verification badges
          const getVerificationBadge = () => {
            if (business.supplyNationVerified) {
              return `<div style="background: #2ECC71; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
                ✓ Supply Nation Verified
              </div>`;
            }
            const confidence = business.verificationConfidence || 'low';
            const badgeColor = confidence === 'high' ? '#F39C12' : confidence === 'medium' ? '#3498DB' : '#95A5A6';
            return `<div style="background: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
              ${confidence.toUpperCase()} Confidence Indigenous
            </div>`;
          };

          // Enhanced popup with Supply Nation contact information
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

          const marker = L.marker([business.lat, business.lng], { icon: businessIcon })
            .bindPopup(`
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
    <div className="absolute top-36 left-4 z-[1000] bg-white rounded-xl shadow-md max-w-sm">
      <div className="flex gap-1 p-1">
        <Input
          type="text"
          placeholder="Search Indigenous businesses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 border-0 focus:ring-0 focus-visible:ring-0 text-sm h-10"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !searchTerm.trim()}
          size="sm"
          className="h-10 w-10 p-0 bg-transparent hover:bg-gray-100 text-gray-600"
          variant="ghost"
        >
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {businessResults && businessResults.totalResults > 0 && (
        <div className="px-3 pb-2 text-xs text-gray-500">
          {businessResults.totalResults} businesses found
        </div>
      )}
    </div>
  );
}