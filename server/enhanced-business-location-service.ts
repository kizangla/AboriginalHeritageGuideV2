/**
 * Enhanced Business Location Service
 * Combines ABR data with Google Maps AI for accurate business locations
 */

import fetch from 'node-fetch';
import { searchBusinessesByName } from './abr-service';
import type { ABRBusinessDetails } from './abr-service';

export interface EnhancedBusinessLocation {
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

interface GoogleMapsGeocodingResult {
  results: Array<{
    place_id: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type: string;
    };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  status: string;
}

interface GooglePlacesResult {
  candidates: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    business_status?: string;
    opening_hours?: {
      weekday_text: string[];
    };
    formatted_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
  }>;
  status: string;
}

class EnhancedBusinessLocationService {
  private coordinateCache = new Map<string, any>();
  private googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  async searchBusinessesWithLocations(query: string): Promise<EnhancedBusinessLocation[]> {
    console.log(`Enhanced business search for: "${query}"`);
    
    // Get businesses from ABR
    const abrResults = await searchBusinessesByName(query);
    
    if (!abrResults.businesses || abrResults.businesses.length === 0) {
      console.log('No businesses found in ABR');
      return [];
    }

    console.log(`Found ${abrResults.businesses.length} businesses from ABR`);
    
    // Enhance each business with Google Maps location data
    const enhancedBusinesses: EnhancedBusinessLocation[] = [];
    
    for (const business of abrResults.businesses) {
      try {
        const enhanced = await this.enhanceBusinessLocation(business);
        enhancedBusinesses.push(enhanced);
      } catch (error) {
        console.error(`Error enhancing business ${business.entityName}:`, error);
        // Fallback to basic ABR data
        enhancedBusinesses.push(this.createFallbackBusiness(business));
      }
    }

    return enhancedBusinesses;
  }

  private async enhanceBusinessLocation(business: ABRBusinessDetails): Promise<EnhancedBusinessLocation> {
    const cacheKey = `${business.abn}_${business.entityName}`;
    
    // Check cache first
    if (this.coordinateCache.has(cacheKey)) {
      const cached = this.coordinateCache.get(cacheKey);
      console.log(`Using cached location for ${business.entityName}`);
      return this.buildEnhancedBusiness(business, cached);
    }

    // Try Google Maps enhancement
    const googleData = await this.getGoogleMapsData(business);
    
    if (googleData) {
      this.coordinateCache.set(cacheKey, googleData);
      console.log(`Enhanced ${business.entityName} with Google Maps data`);
      return this.buildEnhancedBusiness(business, googleData);
    }

    // Fallback to postcode-based coordinates
    const fallbackCoords = this.getPostcodeCoordinates(business);
    return this.buildEnhancedBusiness(business, {
      coordinates: fallbackCoords,
      accuracy: 'postcode',
      source: 'postcode_mapping'
    });
  }

  private async getGoogleMapsData(business: ABRBusinessDetails): Promise<any> {
    if (!this.googleMapsApiKey) {
      console.log('Google Maps API key not available');
      return null;
    }

    try {
      // Create search query for Google Places
      const searchQuery = this.buildGoogleSearchQuery(business);
      
      // Try Google Places API first for business-specific data
      const placesData = await this.searchGooglePlaces(searchQuery);
      
      if (placesData && placesData.candidates.length > 0) {
        const place = placesData.candidates[0];
        
        return {
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            accuracy: 'precise',
            source: 'google_maps'
          },
          googleMapsData: {
            placeId: place.place_id,
            businessStatus: place.business_status,
            openingHours: place.opening_hours?.weekday_text,
            phoneNumber: place.formatted_phone_number,
            website: place.website,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total
          }
        };
      }

      // Fallback to geocoding if places search fails
      const geocodeData = await this.geocodeAddress(business);
      
      if (geocodeData && geocodeData.results.length > 0) {
        const result = geocodeData.results[0];
        
        return {
          coordinates: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            accuracy: result.geometry.location_type === 'ROOFTOP' ? 'precise' : 'approximate',
            source: 'google_maps'
          }
        };
      }

      return null;

    } catch (error) {
      console.error('Google Maps API error:', error);
      return null;
    }
  }

  private buildGoogleSearchQuery(business: ABRBusinessDetails): string {
    const parts = [business.entityName];
    
    if (business.address.suburb) {
      parts.push(business.address.suburb);
    }
    
    if (business.address.stateCode) {
      parts.push(business.address.stateCode);
    }
    
    if (business.address.postcode) {
      parts.push(business.address.postcode);
    }
    
    return parts.join(', ');
  }

  private async searchGooglePlaces(query: string): Promise<GooglePlacesResult | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,business_status,opening_hours,formatted_phone_number,website,rating,user_ratings_total&key=${this.googleMapsApiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Google Places API request failed:', response.status);
        return null;
      }

      const data = await response.json() as GooglePlacesResult;
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', data.status);
        return null;
      }

      return data;

    } catch (error) {
      console.error('Google Places search error:', error);
      return null;
    }
  }

  private async geocodeAddress(business: ABRBusinessDetails): Promise<GoogleMapsGeocodingResult | null> {
    try {
      const addressQuery = this.buildAddressQuery(business);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${this.googleMapsApiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Google Geocoding API request failed:', response.status);
        return null;
      }

      const data = await response.json() as GoogleMapsGeocodingResult;
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Geocoding API error:', data.status);
        return null;
      }

      return data;

    } catch (error) {
      console.error('Google geocoding error:', error);
      return null;
    }
  }

  private buildAddressQuery(business: ABRBusinessDetails): string {
    const parts = [];
    
    if (business.address.streetAddress) {
      parts.push(business.address.streetAddress);
    }
    
    if (business.address.suburb) {
      parts.push(business.address.suburb);
    }
    
    if (business.address.stateCode) {
      parts.push(business.address.stateCode);
    }
    
    if (business.address.postcode) {
      parts.push(business.address.postcode);
    }
    
    parts.push('Australia');
    
    return parts.join(', ');
  }

  private getPostcodeCoordinates(business: ABRBusinessDetails): any {
    // Simple postcode mapping for major Australian cities
    const postcodeMap: Record<string, { lat: number; lng: number }> = {
      '6000': { lat: -31.9505, lng: 115.8605 }, // Perth CBD
      '6100': { lat: -32.0569, lng: 115.7975 }, // South Perth
      '3000': { lat: -37.8136, lng: 144.9631 }, // Melbourne CBD
      '2000': { lat: -33.8688, lng: 151.2093 }, // Sydney CBD
      '4000': { lat: -27.4698, lng: 153.0251 }, // Brisbane CBD
      '5000': { lat: -34.9285, lng: 138.6007 }, // Adelaide CBD
    };

    const postcode = business.address.postcode;
    
    if (postcode && postcodeMap[postcode]) {
      return postcodeMap[postcode];
    }

    // Default to business coordinates if available
    if (business.lat && business.lng) {
      return { lat: business.lat, lng: business.lng };
    }

    // Default to Perth center for WA businesses
    if (business.address.stateCode === 'WA') {
      return { lat: -31.9505, lng: 115.8605 };
    }

    // Default to Australian center
    return { lat: -25.2744, lng: 133.7751 };
  }

  private buildEnhancedBusiness(business: ABRBusinessDetails, locationData: any): EnhancedBusinessLocation {
    return {
      id: `abr-${business.abn}`,
      abn: business.abn,
      entityName: business.entityName,
      entityType: business.entityType,
      status: business.status,
      address: business.address,
      coordinates: locationData.coordinates || this.getPostcodeCoordinates(business),
      businessInfo: {
        businessType: business.entityType,
        supplyNationVerified: business.supplyNationVerified || false,
        verificationSource: 'abr_data',
        verificationConfidence: 'medium'
      },
      googleMapsData: locationData.googleMapsData
    };
  }

  private createFallbackBusiness(business: ABRBusinessDetails): EnhancedBusinessLocation {
    const fallbackCoords = this.getPostcodeCoordinates(business);
    
    return {
      id: `abr-${business.abn}`,
      abn: business.abn,
      entityName: business.entityName,
      entityType: business.entityType,
      status: business.status,
      address: business.address,
      coordinates: {
        lat: fallbackCoords.lat,
        lng: fallbackCoords.lng,
        accuracy: 'postcode',
        source: 'postcode_mapping'
      },
      businessInfo: {
        businessType: business.entityType,
        supplyNationVerified: business.supplyNationVerified || false,
        verificationSource: 'abr_data',
        verificationConfidence: 'low'
      }
    };
  }

  clearCache(): void {
    this.coordinateCache.clear();
    console.log('Business location cache cleared');
  }

  getCacheStats(): { size: number } {
    return { size: this.coordinateCache.size };
  }
}

export const enhancedBusinessLocationService = new EnhancedBusinessLocationService();