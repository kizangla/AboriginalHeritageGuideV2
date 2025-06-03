/**
 * Asynchronous Geocoding Service for Australian Business Addresses
 * Provides immediate postcode-based coordinates and asynchronously improves accuracy
 */

import type { ABRBusinessDetails } from "./abr-service";

export interface AsyncGeocodingResult {
  lat: number;
  lng: number;
  accuracy: 'postcode' | 'precise' | 'approximate';
  source: 'postcode_mapping' | 'google_maps' | 'cached';
  lastUpdated: Date;
}

class AsyncGeocodingService {
  private coordinateCache: Map<string, AsyncGeocodingResult> = new Map();
  private pendingRequests: Set<string> = new Set();

  /**
   * Get immediate coordinates for business display (non-blocking)
   */
  getImmediateCoordinates(business: ABRBusinessDetails): AsyncGeocodingResult {
    const cacheKey = this.createCacheKey(business);
    
    // Return cached result if available
    if (this.coordinateCache.has(cacheKey)) {
      return this.coordinateCache.get(cacheKey)!;
    }

    // Get immediate postcode-based coordinates
    const postcodeResult = this.getPostcodeCoordinates(business);
    
    if (postcodeResult) {
      const result: AsyncGeocodingResult = {
        lat: postcodeResult.lat,
        lng: postcodeResult.lng,
        accuracy: 'postcode',
        source: 'postcode_mapping',
        lastUpdated: new Date()
      };
      
      this.coordinateCache.set(cacheKey, result);
      
      // Start background geocoding for better accuracy
      this.backgroundGeocode(business, cacheKey);
      
      return result;
    }

    // Return default coordinates if no postcode match
    return {
      lat: 0,
      lng: 0,
      accuracy: 'approximate',
      source: 'postcode_mapping',
      lastUpdated: new Date()
    };
  }

  /**
   * Background geocoding to improve coordinate accuracy
   */
  private async backgroundGeocode(business: ABRBusinessDetails, cacheKey: string): Promise<void> {
    // Avoid duplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return;
    }

    this.pendingRequests.add(cacheKey);

    try {
      const addressQuery = this.createAddressQuery(business);
      
      if (process.env.GOOGLE_MAPS_API_KEY && addressQuery !== 'Australia') {
        const preciseResult = await this.geocodeWithGoogleMaps(addressQuery);
        
        if (preciseResult) {
          const result: AsyncGeocodingResult = {
            lat: preciseResult.lat,
            lng: preciseResult.lng,
            accuracy: 'precise',
            source: 'google_maps',
            lastUpdated: new Date()
          };
          
          this.coordinateCache.set(cacheKey, result);
          console.log(`Background geocoded ${business.entityName} to precise coordinates: ${result.lat}, ${result.lng}`);
        }
      }
    } catch (error) {
      console.log(`Background geocoding failed for ${business.entityName}: ${error}`);
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private createCacheKey(business: ABRBusinessDetails): string {
    return `${business.abn}-${business.address.postcode}-${business.address.stateCode}`;
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

  private async geocodeWithGoogleMaps(addressQuery: string): Promise<{ lat: number; lng: number } | null> {
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
        lng: location.lng
      };
    }

    return null;
  }

  private getPostcodeCoordinates(business: ABRBusinessDetails): { lat: number; lng: number } | null {
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
      '6035': { lat: -31.5503, lng: 115.6333 }, // Yanchep
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
      '3128': { lat: -37.8183, lng: 145.1478 }, // Box Hill
      '3076': { lat: -37.7417, lng: 145.0750 }, // Rosanna
      '3074': { lat: -37.7531, lng: 145.0689 }, // Heidelberg
      
      // New South Wales expanded
      '2144': { lat: -33.8764, lng: 151.0031 }, // Auburn
      '2178': { lat: -33.9556, lng: 150.8647 }, // Voyager Point
      '2161': { lat: -33.7792, lng: 151.0869 }, // Guildford
      '2484': { lat: -28.6833, lng: 153.4833 }, // Murwillumbah
      '2529': { lat: -34.7833, lng: 150.6167 }, // Kiama
      
      // Queensland expanded
      '4053': { lat: -27.4097, lng: 152.9931 }, // Everton Park
      '4815': { lat: -19.2564, lng: 146.8183 }, // Townsville
      
      // South Australia expanded
      '5017': { lat: -34.8667, lng: 138.5333 }  // Kilburn
    };

    return postcodeMap[business.address.postcode] || null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; pending: number } {
    return {
      size: this.coordinateCache.size,
      pending: this.pendingRequests.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.coordinateCache.clear();
    this.pendingRequests.clear();
  }
}

export const asyncGeocodingService = new AsyncGeocodingService();