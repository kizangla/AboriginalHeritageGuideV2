/**
 * Native Title Cache Service
 * Optimized caching for Australian Government Native Title data
 */

import fetch from 'node-fetch';

interface CachedNativeTitleData {
  determinations: any[];
  applications: any[];
  lastUpdated: Date;
  expiresAt: Date;
}

interface GeographicIndex {
  [region: string]: {
    determinations: any[];
    applications: any[];
    lastUpdated: Date;
  };
}

class NativeTitleCacheService {
  private cache: Map<string, CachedNativeTitleData> = new Map();
  private geographicIndex: GeographicIndex = {};
  private globalDataCache: { data: any; lastFetch: Date } | null = null;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly GLOBAL_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for global data

  /**
   * Get cached determinations data or fetch fresh data
   */
  async getCachedDeterminations(): Promise<any[]> {
    const now = new Date();
    
    // Check if we have fresh global data
    if (this.globalDataCache && 
        (now.getTime() - this.globalDataCache.lastFetch.getTime()) < this.GLOBAL_CACHE_DURATION) {
      console.log('Using cached Native Title determinations data');
      return this.globalDataCache.data;
    }

    console.log('Fetching fresh Native Title determinations from Australian Government...');
    try {
      const response = await fetch(
        'https://data.gov.au/geoserver/native-title-determinations-national-native-title-register/wfs?request=GetFeature&typeName=ckan_ecdbbb6c_c374_4649_9cd3_0677f44182c9&outputFormat=json'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as any;
      const determinations = data.features || [];

      // Cache the global data
      this.globalDataCache = {
        data: determinations,
        lastFetch: now
      };

      console.log(`Cached ${determinations.length} Native Title determinations`);
      return determinations;
    } catch (error) {
      console.error('Failed to fetch Native Title determinations:', error);
      
      // Return cached data if available, even if expired
      if (this.globalDataCache) {
        console.log('Using expired cached data due to fetch failure');
        return this.globalDataCache.data;
      }
      
      return [];
    }
  }

  /**
   * Get Native Title data for specific coordinates with geographic optimization
   */
  async getNativeTitleForLocation(lat: number, lng: number): Promise<{
    applications: any[];
    determinations: any[];
  }> {
    const regionKey = this.getRegionKey(lat, lng);
    
    // Check regional cache first
    if (this.geographicIndex[regionKey]) {
      const cached = this.geographicIndex[regionKey];
      const now = new Date();
      
      if ((now.getTime() - cached.lastUpdated.getTime()) < this.CACHE_DURATION) {
        console.log(`Using cached regional data for ${regionKey}`);
        return {
          applications: cached.applications,
          determinations: cached.determinations
        };
      }
    }

    // Get fresh determinations data
    const allDeterminations = await this.getCachedDeterminations();
    
    // Filter for location with optimized geographic matching
    const relevantDeterminations = this.filterByLocation(allDeterminations, lat, lng);
    
    // For now, we'll return determinations as both applications and determinations
    // This can be refined based on the actual data structure
    const result = {
      applications: relevantDeterminations.slice(0, 50), // Limit to prevent UI overflow
      determinations: relevantDeterminations
    };

    // Cache the regional result
    this.geographicIndex[regionKey] = {
      ...result,
      lastUpdated: new Date()
    };

    console.log(`Cached ${result.determinations.length} determinations for region ${regionKey}`);
    return result;
  }

  /**
   * Create a geographic region key for caching
   */
  private getRegionKey(lat: number, lng: number): string {
    // Round to 1 decimal place to create regional buckets
    const roundedLat = Math.round(lat * 10) / 10;
    const roundedLng = Math.round(lng * 10) / 10;
    return `${roundedLat}_${roundedLng}`;
  }

  /**
   * Filter determinations by location with optimized geographic matching
   */
  private filterByLocation(determinations: any[], lat: number, lng: number): any[] {
    const tolerance = 5.0; // Increased tolerance for broader regional matching
    
    return determinations.filter(det => {
      if (!det.geometry) return false;
      
      try {
        // Simple bounding box check for performance
        const geometry = det.geometry;
        
        if (geometry.type === 'Point') {
          const [detLng, detLat] = geometry.coordinates;
          return Math.abs(detLat - lat) <= tolerance && Math.abs(detLng - lng) <= tolerance;
        }
        
        if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
          // Simple bounding box approximation for polygons
          return this.isPointInBoundingBox(lat, lng, geometry, tolerance);
        }
        
        return false;
      } catch (error) {
        console.warn('Error processing geometry for determination:', error);
        return false;
      }
    });
  }

  /**
   * Check if point is within bounding box of geometry with tolerance
   */
  private isPointInBoundingBox(lat: number, lng: number, geometry: any, tolerance: number): boolean {
    try {
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      
      const processCoordinates = (coords: any) => {
        if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number') {
          const [coordLng, coordLat] = coords;
          minLat = Math.min(minLat, coordLat);
          maxLat = Math.max(maxLat, coordLat);
          minLng = Math.min(minLng, coordLng);
          maxLng = Math.max(maxLng, coordLng);
        } else if (Array.isArray(coords)) {
          coords.forEach(processCoordinates);
        }
      };
      
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(processCoordinates);
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
          polygon.forEach(processCoordinates);
        });
      }
      
      // Expand bounding box by tolerance
      return lat >= (minLat - tolerance) && lat <= (maxLat + tolerance) &&
             lng >= (minLng - tolerance) && lng <= (maxLng + tolerance);
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.geographicIndex = {};
    this.globalDataCache = null;
    console.log('Native Title cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    regions: number;
    globalCached: boolean;
    lastGlobalFetch: Date | null;
  } {
    return {
      regions: Object.keys(this.geographicIndex).length,
      globalCached: !!this.globalDataCache,
      lastGlobalFetch: this.globalDataCache?.lastFetch || null
    };
  }
}

export const nativeTitleCacheService = new NativeTitleCacheService();