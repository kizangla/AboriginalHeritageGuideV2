/**
 * South Australia SARIG Service - Mineral Tenements
 * Fetches mineral tenements from SA SARIG WFS endpoint
 * 
 * Data Source: SA Department for Energy and Mining
 * Covers exploration licences, mining leases, mineral claims
 */

export interface SAMineralTenement {
  id: string;
  tenementNumber: string;
  tenementType: string; // EL, ML, MC, EML
  status: string;
  holder: string;
  commodity: string;
  area: number;
  applicationDate: string;
  expiryDate: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  geometry?: [number, number][];
  dataSource: 'sa_sarig';
}

export interface SARIGResult {
  tenements: SAMineralTenement[];
  totalCount: number;
  dataSource: 'sa_sarig';
  serviceUrl: string;
  lastUpdated: Date;
}

interface SARIGQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  tenementType?: string;
  limit?: number;
}

const SARIG_WFS_URL = 'https://services.sarig.sa.gov.au/vector/mineral_tenements/wfs';

class SASarigService {
  private cache: Map<string, { data: SARIGResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch all mineral tenements
   */
  async getTenements(options: SARIGQueryOptions = {}): Promise<SARIGResult> {
    const cacheKey = `sa_tenements_${options.tenementType || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached SA SARIG data');
      return cached.data;
    }

    console.log('Fetching mineral tenements from SA SARIG...');

    try {
      const tenements = await this.queryWFS(options);

      const result: SARIGResult = {
        tenements,
        totalCount: tenements.length,
        dataSource: 'sa_sarig',
        serviceUrl: SARIG_WFS_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Fetched ${tenements.length} mineral tenements from SA SARIG`);

      return result;
    } catch (error) {
      console.error('Error fetching SA SARIG data:', error);
      throw error;
    }
  }

  /**
   * Query SA SARIG WFS
   */
  private async queryWFS(options: SARIGQueryOptions): Promise<SAMineralTenement[]> {
    const limit = options.limit || 500;
    
    let bboxParam = '';
    if (options.bounds) {
      bboxParam = `&bbox=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north},EPSG:4326`;
    }

    const url = `${SARIG_WFS_URL}?service=WFS&version=1.1.0&request=GetFeature&typeName=mt:MineralTenement&outputFormat=application/json&maxFeatures=${limit}${bboxParam}`;

    console.log('Querying SA SARIG WFS...');

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Indigenous-Map-Platform/1.0'
        }
      });

      if (!response.ok) {
        console.error(`SA SARIG WFS error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!data.features) {
        console.log('No features in SA SARIG response');
        return [];
      }

      const tenements: SAMineralTenement[] = [];

      for (const feature of data.features) {
        const props = feature.properties;
        const geometry = feature.geometry;

        let lat = 0, lng = 0;
        let coords: [number, number][] = [];

        if (geometry) {
          if (geometry.type === 'Point') {
            lng = geometry.coordinates[0];
            lat = geometry.coordinates[1];
          } else if (geometry.type === 'Polygon' && geometry.coordinates?.[0]) {
            coords = geometry.coordinates[0];
            const centroid = this.calculateCentroid(coords);
            lat = centroid.lat;
            lng = centroid.lng;
          } else if (geometry.type === 'MultiPolygon' && geometry.coordinates?.[0]?.[0]) {
            coords = geometry.coordinates[0][0];
            const centroid = this.calculateCentroid(coords);
            lat = centroid.lat;
            lng = centroid.lng;
          }
        }

        if (!lat || !lng) continue;

        tenements.push({
          id: props.gid?.toString() || feature.id || `sa_${tenements.length}`,
          tenementNumber: props.tenement_no || props.TenementNo || 'Unknown',
          tenementType: props.tenement_type || props.TenementType || 'Unknown',
          status: props.status || props.Status || 'Unknown',
          holder: props.holder || props.Holder || 'Unknown',
          commodity: props.commodity || props.Commodity || '',
          area: props.area_ha || props.Area || 0,
          applicationDate: props.application_date || props.StartDate || '',
          expiryDate: props.expiry_date || props.EndDate || '',
          coordinates: { lat, lng },
          geometry: coords.length > 0 ? coords : undefined,
          dataSource: 'sa_sarig'
        });
      }

      return tenements;
    } catch (error) {
      console.error('Error querying SA SARIG WFS:', error);
      return [];
    }
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

export const saSarigService = new SASarigService();
