/**
 * Data Cache Service - Speed up repeated data loading
 * Implements intelligent caching for Australian Government data sources
 */

import { RATSIBResult } from './ratsib-service';

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiry: Date;
  hitCount: number;
}

class DataCacheService {
  private ratsibCache = new Map<string, CacheEntry<RATSIBResult>>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Get cached RATSIB data or return null if not cached/expired
   */
  getRATSIBData(lat: number, lng: number): RATSIBResult | null {
    const key = this.generateRATSIBKey(lat, lng);
    const entry = this.ratsibCache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry has expired
    if (new Date() > entry.expiry) {
      this.ratsibCache.delete(key);
      return null;
    }
    
    // Update hit count for cache analytics
    entry.hitCount++;
    console.log(`RATSIB cache HIT for ${key} (hits: ${entry.hitCount})`);
    
    return entry.data;
  }

  /**
   * Cache RATSIB data with intelligent key generation
   */
  cacheRATSIBData(lat: number, lng: number, data: RATSIBResult): void {
    const key = this.generateRATSIBKey(lat, lng);
    
    // Clean up cache if it's getting too large
    if (this.ratsibCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupOldestEntries();
    }
    
    const entry: CacheEntry<RATSIBResult> = {
      data,
      timestamp: new Date(),
      expiry: new Date(Date.now() + this.CACHE_DURATION),
      hitCount: 0
    };
    
    this.ratsibCache.set(key, entry);
    console.log(`RATSIB data cached for ${key} (${data.boundaries.length} boundaries)`);
  }

  /**
   * Generate cache key based on approximate location to allow cache hits for nearby requests
   */
  private generateRATSIBKey(lat: number, lng: number): string {
    // Round coordinates to reduce precision for better cache hits
    const roundedLat = Math.round(lat * 10) / 10; // 0.1 degree precision (~11km)
    const roundedLng = Math.round(lng * 10) / 10;
    return `ratsib_${roundedLat}_${roundedLng}`;
  }

  /**
   * Remove oldest cache entries to maintain performance
   */
  private cleanupOldestEntries(): void {
    const entries = Array.from(this.ratsibCache.entries())
      .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.ratsibCache.delete(entries[i][0]);
    }
    
    console.log(`Cache cleanup: removed ${toRemove} old entries`);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    const totalEntries = this.ratsibCache.size;
    const totalHits = Array.from(this.ratsibCache.values())
      .reduce((sum, entry) => sum + entry.hitCount, 0);
    
    return {
      ratsib: {
        entries: totalEntries,
        totalHits,
        maxSize: this.MAX_CACHE_SIZE,
        cacheDurationMinutes: this.CACHE_DURATION / (60 * 1000)
      }
    };
  }

  /**
   * Clear all caches (for development/testing)
   */
  clearAllCaches(): void {
    this.ratsibCache.clear();
    console.log('All caches cleared');
  }
}

export const dataCacheService = new DataCacheService();