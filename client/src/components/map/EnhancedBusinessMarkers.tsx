import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';

interface EnhancedBusinessLocation {
  id: string;
  abn: string;
  entityName: string;
  entityType: string;
  status: string;
  address: {
    stateCode?: string;
    postcode?: string;
    suburb?: string;
    streetAddress?: string;
    fullAddress?: string;
  };
  coordinates: {
    lat: number;
    lng: number;
    accuracy: 'precise' | 'approximate' | 'postcode';
    source: 'google_maps' | 'postcode_mapping' | 'cached';
  };
  businessInfo: {
    businessType: string;
    supplyNationVerified: boolean;
    verificationSource: string;
    verificationConfidence: 'high' | 'medium' | 'low';
  };
  googleMapsData?: {
    placeId?: string;
    businessStatus?: string;
    openingHours?: string[];
    phoneNumber?: string;
    website?: string;
    rating?: number;
    userRatingsTotal?: number;
  };
}

interface EnhancedBusinessMarkersProps {
  map: L.Map | null;
  searchQuery: string;
  onBusinessSelect?: (business: EnhancedBusinessLocation) => void;
}

export default function EnhancedBusinessMarkers({ 
  map, 
  searchQuery, 
  onBusinessSelect 
}: EnhancedBusinessMarkersProps) {
  const [businessMarkers, setBusinessMarkers] = useState<L.Marker[]>([]);
  const businessLayerRef = useRef<L.LayerGroup | null>(null);

  // Enhanced business search query
  const { data: businessResults, isLoading } = useQuery({
    queryKey: ['/api/businesses/enhanced-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const response = await fetch(`/api/businesses/enhanced-search?search=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Business search failed');
      return response.json();
    },
    enabled: !!searchQuery.trim()
  });

  useEffect(() => {
    if (!map) return;

    // Initialize business layer group
    if (!businessLayerRef.current) {
      businessLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (businessLayerRef.current) {
        map.removeLayer(businessLayerRef.current);
        businessLayerRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!map || !businessLayerRef.current || !businessResults?.businesses) return;

    console.log(`Adding ${businessResults.businesses.length} enhanced business markers to map`);

    // Clear existing markers
    businessLayerRef.current.clearLayers();
    setBusinessMarkers([]);

    const newMarkers: L.Marker[] = [];

    businessResults.businesses.forEach((business: EnhancedBusinessLocation) => {
      // Skip businesses without valid coordinates
      if (!business.coordinates?.lat || !business.coordinates?.lng) {
        console.log(`Skipping business ${business.entityName} - no valid coordinates`);
        return;
      }

      // Create enhanced marker based on data quality and verification
      const marker = createEnhancedBusinessMarker(business);
      
      if (marker) {
        businessLayerRef.current!.addLayer(marker);
        newMarkers.push(marker);
      }
    });

    setBusinessMarkers(newMarkers);

    // Auto-zoom to show all business markers if any exist
    if (newMarkers.length > 0) {
      const group = new L.FeatureGroup(newMarkers);
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }

  }, [map, businessResults, onBusinessSelect]);

  const createEnhancedBusinessMarker = (business: EnhancedBusinessLocation): L.Marker | null => {
    if (!map) return null;

    const { coordinates, businessInfo, googleMapsData } = business;

    // Determine marker appearance based on data quality and verification
    const getMarkerStyle = () => {
      const baseStyle = {
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        color: 'white'
      };

      // Color coding based on verification and data source
      let backgroundColor = '#95A5A6'; // Default gray
      let icon = '🏢'; // Default building icon

      if (businessInfo.supplyNationVerified) {
        backgroundColor = '#27AE60'; // Green for verified
        icon = '✓';
      } else if (googleMapsData?.placeId) {
        backgroundColor = '#3498DB'; // Blue for Google Maps enhanced
        icon = '📍';
      } else if (coordinates.accuracy === 'precise') {
        backgroundColor = '#F39C12'; // Orange for precise location
        icon = '📍';
      } else if (coordinates.accuracy === 'approximate') {
        backgroundColor = '#E67E22'; // Dark orange for approximate
        icon = '🔍';
      }

      return { ...baseStyle, backgroundColor, icon };
    };

    const style = getMarkerStyle();

    // Create custom marker icon
    const businessIcon = L.divIcon({
      html: `
        <div style="
          background: ${style.backgroundColor};
          color: ${style.color};
          border-radius: ${style.borderRadius};
          width: ${style.width}px;
          height: ${style.height}px;
          display: ${style.display};
          align-items: ${style.alignItems};
          justify-content: ${style.justifyContent};
          border: ${style.border};
          box-shadow: ${style.boxShadow};
          font-size: ${style.fontSize};
          font-weight: ${style.fontWeight};
          cursor: ${style.cursor};
          transition: transform 0.2s ease;
        " 
        onmouseover="this.style.transform='scale(1.1)'" 
        onmouseout="this.style.transform='scale(1)'"
        title="${business.entityName}"
        >${style.icon}</div>
      `,
      className: 'enhanced-business-marker',
      iconSize: [style.width, style.height],
      iconAnchor: [style.width / 2, style.height / 2]
    });

    // Create marker
    const marker = L.marker([coordinates.lat, coordinates.lng], { icon: businessIcon });

    // Enhanced popup content with Google Maps data
    const popupContent = createEnhancedPopupContent(business);
    marker.bindPopup(popupContent, {
      maxWidth: 320,
      className: 'enhanced-business-popup'
    });

    // Click handler
    marker.on('click', () => {
      console.log('Enhanced business marker clicked:', business.entityName);
      if (onBusinessSelect) {
        onBusinessSelect(business);
      }
    });

    return marker;
  };

  const createEnhancedPopupContent = (business: EnhancedBusinessLocation): string => {
    const { entityName, abn, status, address, coordinates, businessInfo, googleMapsData } = business;

    // Data source indicator
    const getSourceBadge = () => {
      if (coordinates.source === 'google_maps') {
        return '<span style="background: #4285F4; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">Google Maps</span>';
      }
      return '<span style="background: #95A5A6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">Postcode</span>';
    };

    // Verification badge
    const getVerificationBadge = () => {
      if (businessInfo.supplyNationVerified) {
        return '<span style="background: #27AE60; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">✓ Verified</span>';
      }
      return '';
    };

    // Google Maps additional info
    const getGoogleMapsInfo = () => {
      if (!googleMapsData) return '';
      
      let info = '';
      if (googleMapsData.rating) {
        info += `<div style="margin-top: 8px; font-size: 13px;">
          <strong>Rating:</strong> ⭐ ${googleMapsData.rating}/5 (${googleMapsData.userRatingsTotal || 0} reviews)
        </div>`;
      }
      if (googleMapsData.phoneNumber) {
        info += `<div style="margin-top: 4px; font-size: 13px;">
          <strong>Phone:</strong> ${googleMapsData.phoneNumber}
        </div>`;
      }
      if (googleMapsData.website) {
        info += `<div style="margin-top: 4px; font-size: 13px;">
          <strong>Website:</strong> <a href="${googleMapsData.website}" target="_blank" style="color: #3498DB;">Visit</a>
        </div>`;
      }
      if (googleMapsData.businessStatus) {
        info += `<div style="margin-top: 4px; font-size: 13px;">
          <strong>Status:</strong> ${googleMapsData.businessStatus}
        </div>`;
      }
      return info;
    };

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #2C3E50; line-height: 1.2;">${entityName}</h3>
          <div style="margin-left: 8px;">
            ${getSourceBadge()}
            ${getVerificationBadge()}
          </div>
        </div>
        
        <div style="font-size: 13px; color: #7F8C8D; margin-bottom: 8px;">
          <strong>ABN:</strong> ${abn} | <strong>Status:</strong> ${status}
        </div>
        
        <div style="font-size: 13px; color: #34495E; margin-bottom: 8px;">
          <strong>Address:</strong> ${address.fullAddress || `${address.suburb || ''} ${address.stateCode || ''} ${address.postcode || ''}`.trim()}
        </div>
        
        <div style="font-size: 12px; color: #95A5A6; margin-bottom: 8px;">
          <strong>Location:</strong> ${coordinates.accuracy} (${coordinates.source})
        </div>
        
        ${getGoogleMapsInfo()}
        
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #ECF0F1;">
          <button onclick="window.open('https://abr.business.gov.au/ABN/View?abn=${abn}', '_blank')" 
                  style="background: #3498DB; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 8px;">
            View ABN Details
          </button>
          ${googleMapsData?.placeId ? 
            `<button onclick="window.open('https://www.google.com/maps/place/?q=place_id:${googleMapsData.placeId}', '_blank')" 
                     style="background: #4285F4; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              View on Google Maps
            </button>` : ''
          }
        </div>
      </div>
    `;
  };

  // Show loading indicator
  if (isLoading && searchQuery) {
    console.log(`Loading enhanced business search for: ${searchQuery}`);
  }

  return null; // This component only manages markers, no rendered content
}