/**
 * Geocoding Service for Australian Business Addresses
 * Uses Google Maps API to get precise coordinates from ABR address data
 */

import type { ABRBusinessDetails } from "./abr-service";

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
  source: 'google_maps' | 'postcode_fallback' | 'not_found';
}

class GeocodingService {
  private geocodeCache: Map<string, GeocodingResult> = new Map();

  /**
   * Get coordinates for a business using Google Maps API
   */
  async geocodeBusiness(business: ABRBusinessDetails): Promise<GeocodingResult> {
    // Return existing coordinates if available
    if (business.lat && business.lng && business.lat !== 0 && business.lng !== 0) {
      return {
        lat: business.lat,
        lng: business.lng,
        source: 'google_maps'
      };
    }

    // Create address query from ABR data
    const addressQuery = this.createAddressQuery(business);
    const cacheKey = `${addressQuery}`;

    // Check cache first
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey)!;
    }

    // Use postcode lookup as primary method for Australian businesses
    const postcodeResult = this.geocodeWithPostcode(business);
    if (postcodeResult) {
      this.geocodeCache.set(cacheKey, postcodeResult);
      return postcodeResult;
    }

    // Try Google Maps API if postcode lookup fails and API is available
    if (process.env.GOOGLE_MAPS_API_KEY && addressQuery !== 'Australia') {
      try {
        const result = await this.geocodeWithGoogleMaps(addressQuery);
        if (result) {
          this.geocodeCache.set(cacheKey, result);
          return result;
        }
      } catch (error) {
        console.log(`Google Maps geocoding failed for ${business.entityName}: ${error}`);
      }
    }

    // No coordinates found
    const notFoundResult: GeocodingResult = {
      lat: 0,
      lng: 0,
      source: 'not_found'
    };
    
    this.geocodeCache.set(cacheKey, notFoundResult);
    return notFoundResult;
  }

  private createAddressQuery(business: ABRBusinessDetails): string {
    const parts = [
      business.address.suburb,
      business.address.stateCode,
      business.address.postcode,
      'Australia'
    ].filter(Boolean);
    
    return parts.join(' ').trim();
  }

  private async geocodeWithGoogleMaps(addressQuery: string): Promise<GeocodingResult | null> {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      throw new Error(`Google Maps API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: data.results[0].formatted_address,
        source: 'google_maps'
      };
    }

    return null;
  }

  private geocodeWithPostcode(business: ABRBusinessDetails): GeocodingResult | null {
    if (!business.address.postcode || !business.address.stateCode) {
      return null;
    }

    const postcodeMap: { [key: string]: { lat: number; lng: number } } = {
      // Major Australian cities
      '2000': { lat: -33.8688, lng: 151.2093 }, // Sydney CBD
      '3000': { lat: -37.8136, lng: 144.9631 }, // Melbourne CBD
      '4000': { lat: -27.4698, lng: 153.0251 }, // Brisbane CBD
      '5000': { lat: -34.9285, lng: 138.6007 }, // Adelaide CBD
      '6000': { lat: -31.9505, lng: 115.8605 }, // Perth CBD
      '7000': { lat: -42.8821, lng: 147.3272 }, // Hobart CBD
      '0800': { lat: -12.4634, lng: 130.8456 }, // Darwin CBD
      '2600': { lat: -35.2809, lng: 149.1300 }, // Canberra CBD
      
      // Western Australia
      '6714': { lat: -20.7403, lng: 116.8469 }, // Karratha
      '6160': { lat: -32.0569, lng: 115.7975 }, // Fremantle
      '6050': { lat: -31.9354, lng: 115.8072 }, // Mount Lawley
      '6100': { lat: -32.0569, lng: 115.7975 }, // Fremantle area
      '6035': { lat: -31.8857, lng: 115.8042 }, // Osborne Park
      '6165': { lat: -32.1271, lng: 115.7819 }, // Hope Valley
      '6021': { lat: -31.8857, lng: 115.8042 }, // Balcatta
      
      // New South Wales
      '2150': { lat: -33.8096, lng: 151.0189 }, // Parramatta
      '2170': { lat: -33.9297, lng: 150.8671 }, // Liverpool
      '2176': { lat: -33.9239, lng: 150.8446 }, // Warwick Farm
      '2179': { lat: -33.9406, lng: 150.8694 }, // Holsworthy
      '2195': { lat: -33.9481, lng: 151.1419 }, // Revesby
      '2060': { lat: -33.8365, lng: 151.2008 }, // North Sydney
      '2519': { lat: -34.4278, lng: 150.8931 }, // Albion Park
      '2204': { lat: -33.9631, lng: 151.1187 }, // Marrickville
      '2220': { lat: -34.0039, lng: 151.1350 }, // Hurstville
      '2570': { lat: -34.0736, lng: 150.6206 }, // Camden
      
      // Queensland
      '4223': { lat: -27.9285, lng: 153.3479 }, // Currumbin
      '4101': { lat: -27.4833, lng: 153.0167 }, // South Brisbane
      
      // Northern Territory
      '0820': { lat: -12.4381, lng: 130.8411 }, // Nightcliff
      
      // South Australia
      '5038': { lat: -35.0297, lng: 138.5653 }, // Edwardstown
      '5039': { lat: -35.0297, lng: 138.5653 }, // Morphettville
      
      // Victoria
      '3124': { lat: -37.8477, lng: 145.0806 }, // Camberwell
      '3500': { lat: -36.3615, lng: 144.9547 }, // Bendigo
      '3184': { lat: -37.9267, lng: 145.0581 }, // Elwood
      '3128': { lat: -37.8183, lng: 145.1478 }  // Box Hill
    };

    const coordinates = postcodeMap[business.address.postcode];
    
    if (coordinates) {
      return {
        lat: coordinates.lat,
        lng: coordinates.lng,
        source: 'postcode_fallback'
      };
    }

    return null;
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.geocodeCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.geocodeCache.size,
      keys: Array.from(this.geocodeCache.keys())
    };
  }
}

export const geocodingService = new GeocodingService();