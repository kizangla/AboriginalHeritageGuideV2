/**
 * Tasmania MRT Service - Mining Tenements
 * Fetches mining data from Mineral Resources Tasmania ArcGIS REST API
 * 
 * Data Source: Mineral Resources Tasmania (MRT)
 * Covers mining leases, exploration licences, and fossicking areas
 */

export interface TasMiningLease {
  id: string;
  leaseNumber: string;
  leaseType: string;
  status: string;
  holder: string;
  commodity: string;
  area: number;
  grantDate: string;
  expiryDate: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  geometry?: [number, number][];
  dataSource: 'tas_mrt';
}

export interface TasMRTResult {
  leases: TasMiningLease[];
  totalCount: number;
  dataSource: 'tas_mrt';
  serviceUrl: string;
  lastUpdated: Date;
}

interface TasQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  leaseType?: string;
  limit?: number;
}

const TAS_MRT_URL = 'https://data.stategrowth.tas.gov.au/ags/rest/services/MRT/TenementsWFS/MapServer';

class TasMrtService {
  private cache: Map<string, { data: TasMRTResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch mining leases
   */
  async getMiningLeases(options: TasQueryOptions = {}): Promise<TasMRTResult> {
    const cacheKey = `tas_leases_${options.leaseType || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached Tasmania MRT data');
      return cached.data;
    }

    console.log('Fetching mining leases from Tasmania MRT...');

    try {
      const leases = await this.queryArcGIS(options);

      const result: TasMRTResult = {
        leases,
        totalCount: leases.length,
        dataSource: 'tas_mrt',
        serviceUrl: TAS_MRT_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Fetched ${leases.length} mining leases from Tasmania MRT`);

      return result;
    } catch (error) {
      console.error('Error fetching Tasmania MRT data:', error);
      throw error;
    }
  }

  /**
   * Query Tasmania MRT ArcGIS REST API
   */
  private async queryArcGIS(options: TasQueryOptions): Promise<TasMiningLease[]> {
    const limit = options.limit || 500;
    const leases: TasMiningLease[] = [];

    // Try different layer IDs for mining leases
    const layerIds = [0, 1, 2, 3, 4];

    for (const layerId of layerIds) {
      try {
        let geometryFilter = '';
        if (options.bounds) {
          geometryFilter = `&geometry=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`;
        }

        const url = `${TAS_MRT_URL}/${layerId}/query?where=1=1&outFields=*&f=json&resultRecordCount=${limit}${geometryFilter}&outSR=4326`;

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Indigenous-Map-Platform/1.0'
          }
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
          continue;
        }

        for (const feature of data.features) {
          const attrs = feature.attributes;
          const geometry = feature.geometry;

          let lat = 0, lng = 0;
          let coords: [number, number][] = [];

          if (geometry) {
            if (geometry.x && geometry.y) {
              lng = geometry.x;
              lat = geometry.y;
            } else if (geometry.rings && geometry.rings[0]) {
              coords = geometry.rings[0];
              const centroid = this.calculateCentroid(coords);
              lat = centroid.lat;
              lng = centroid.lng;
            }
          }

          if (!lat || !lng) continue;

          // Check if this is a duplicate
          const existingId = `${attrs.OBJECTID}_${layerId}`;
          if (leases.some(l => l.id === existingId)) continue;

          leases.push({
            id: existingId,
            leaseNumber: attrs.LEASE_NO || attrs.TenementNo || attrs.Title_No || 'Unknown',
            leaseType: attrs.LEASE_TYPE || attrs.TenementType || attrs.Type || 'Mining Lease',
            status: attrs.STATUS || attrs.Status || 'Active',
            holder: attrs.HOLDER || attrs.Holder || attrs.Operator || 'Unknown',
            commodity: attrs.COMMODITY || attrs.Commodity || '',
            area: parseFloat(attrs.AREA_HA || attrs.Area || attrs.Shape__Area) || 0,
            grantDate: attrs.GRANT_DATE || attrs.GrantDate || '',
            expiryDate: attrs.EXPIRY_DATE || attrs.ExpiryDate || '',
            coordinates: { lat, lng },
            geometry: coords.length > 0 ? coords : undefined,
            dataSource: 'tas_mrt'
          });
        }

        if (leases.length >= limit) break;
      } catch (error) {
        console.error(`Error querying TAS MRT layer ${layerId}:`, error);
        continue;
      }
    }

    return leases;
  }

  private calculateCentroid(coords: [number, number][]): { lat: number; lng: number } {
    if (!coords || coords.length === 0) return { lat: 0, lng: 0 };
    
    let sumLat = 0, sumLng = 0;
    for (const coord of coords) {
      sumLng += coord[0];
      sumLat += coord[1];
    }
    return {
      lat: sumLat / coords.length,
      lng: sumLng / coords.length
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const tasMrtService = new TasMrtService();
