/**
 * Frontend Data Optimization - Client-side performance improvements
 * Implements request deduplication, debouncing, and intelligent prefetching
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class DataOptimizationService {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes client cache
  private readonly REQUEST_TIMEOUT = 30 * 1000; // 30 seconds

  /**
   * Optimized fetch with request deduplication and caching
   */
  async optimizedFetch(url: string, options?: RequestInit): Promise<any> {
    const cacheKey = this.generateCacheKey(url, options);
    
    // Check client-side cache first
    const cached = this.requestCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`Client cache HIT for ${url}`);
      return cached.data;
    }

    // Check if request is already pending (deduplication)
    const pending = this.pendingRequests.get(cacheKey);
    if (pending && (Date.now() - pending.timestamp) < this.REQUEST_TIMEOUT) {
      console.log(`Request deduplication for ${url}`);
      return pending.promise;
    }

    // Make new request
    console.log(`Making optimized request to ${url}`);
    const promise = this.makeRequest(url, options);
    
    // Store pending request
    this.pendingRequests.set(cacheKey, {
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      
      // Cache successful result
      this.requestCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
      
      return result;
    } catch (error) {
      // Clean up failed request
      this.pendingRequests.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Debounced RATSIB boundaries loading
   */
  private ratsibDebounceTimer: NodeJS.Timeout | null = null;
  
  debouncedRATSIBLoad(lat: number, lng: number, callback: (data: any) => void, delay: number = 500): void {
    if (this.ratsibDebounceTimer) {
      clearTimeout(this.ratsibDebounceTimer);
    }
    
    this.ratsibDebounceTimer = setTimeout(async () => {
      try {
        const data = await this.optimizedFetch(`/api/territories/map-view/ratsib?lat=${lat}&lng=${lng}`);
        callback(data);
      } catch (error) {
        console.warn('Debounced RATSIB load failed:', error);
      }
    }, delay);
  }

  /**
   * Prefetch nearby RATSIB data for smoother map navigation
   */
  async prefetchNearbyRATSIB(lat: number, lng: number, radius: number = 0.5): Promise<void> {
    const prefetchPoints = [
      { lat: lat + radius, lng: lng },
      { lat: lat - radius, lng: lng },
      { lat: lat, lng: lng + radius },
      { lat: lat, lng: lng - radius }
    ];

    const prefetchPromises = prefetchPoints.map(point => 
      this.optimizedFetch(`/api/territories/map-view/ratsib?lat=${point.lat}&lng=${point.lng}`)
        .catch(error => console.log(`Prefetch failed for ${point.lat},${point.lng}:`, error))
    );

    // Run prefetch in background without blocking
    Promise.all(prefetchPromises).then(() => {
      console.log(`Prefetched RATSIB data for 4 nearby areas around ${lat},${lng}`);
    });
  }

  /**
   * Progressive data loading - load minimal data first, then enhance
   */
  async progressiveRATSIBLoad(lat: number, lng: number): Promise<{ quick: any; detailed: any }> {
    // First, try to get any cached data for immediate display
    const quickData = await this.getQuickRATSIBData(lat, lng);
    
    // Then fetch/enhance with full data
    const detailedData = await this.optimizedFetch(`/api/territories/map-view/ratsib?lat=${lat}&lng=${lng}`);
    
    return { quick: quickData, detailed: detailedData };
  }

  private async getQuickRATSIBData(lat: number, lng: number): Promise<any> {
    // Check for any nearby cached data that can be shown immediately
    for (const [key, cached] of this.requestCache.entries()) {
      if (key.includes('ratsib') && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        // Very basic proximity check
        if (key.includes(`${Math.round(lat)}`) || key.includes(`${Math.round(lng)}`)) {
          return cached.data;
        }
      }
    }
    return null;
  }

  private generateCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private async makeRequest(url: string, options?: RequestInit): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get optimization statistics
   */
  getStats() {
    return {
      cacheSize: this.requestCache.size,
      pendingRequests: this.pendingRequests.size,
      cacheDuration: this.CACHE_DURATION / (60 * 1000),
      requestTimeout: this.REQUEST_TIMEOUT / 1000
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
    if (this.ratsibDebounceTimer) {
      clearTimeout(this.ratsibDebounceTimer);
      this.ratsibDebounceTimer = null;
    }
    console.log('Client-side cache cleared');
  }
}

export const dataOptimizationService = new DataOptimizationService();