/**
 * Northern Territory STRIKE Service - Mineral Tenements
 * Fetches mining data from NT Geological Survey WFS
 * 
 * Data Source: Northern Territory Geological Survey
 * Covers mineral tenements, mines, and mineral occurrences
 */

export interface NTMineralTenement {
  id: string;
  tenementNumber: string;
  tenementType: string;
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
  dataSource: 'nt_strike';
}

export interface NTStrikeResult {
  tenements: NTMineralTenement[];
  totalCount: number;
  dataSource: 'nt_strike';
  serviceUrl: string;
  lastUpdated: Date;
}

interface NTQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  tenementType?: string;
  limit?: number;
}

const NT_WFS_URL = 'http://geology.data.nt.gov.au/geoserver/wfs';

class NtStrikeService {
  private cache: Map<string, { data: NTStrikeResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch mineral tenements
   */
  async getTenements(options: NTQueryOptions = {}): Promise<NTStrikeResult> {
    const cacheKey = `nt_tenements_${options.tenementType || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached NT STRIKE data');
      return cached.data;
    }

    console.log('Fetching mineral tenements from NT STRIKE...');

    try {
      const tenements = await this.queryWFS(options);

      const result: NTStrikeResult = {
        tenements,
        totalCount: tenements.length,
        dataSource: 'nt_strike',
        serviceUrl: NT_WFS_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Fetched ${tenements.length} mineral tenements from NT STRIKE`);

      return result;
    } catch (error) {
      console.error('Error fetching NT STRIKE data:', error);
      throw error;
    }
  }

  /**
   * Query NT STRIKE WFS
   */
  private async queryWFS(options: NTQueryOptions): Promise<NTMineralTenement[]> {
    const limit = options.limit || 500;
    
    let bboxParam = '';
    if (options.bounds) {
      bboxParam = `&bbox=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north},EPSG:4326`;
    }

    // Try mineral tenement layer
    const layerNames = [
      'ntgs:mineral_tenement',
      'ntgs:mineral_tenements',
      'MineralTenement'
    ];

    for (const layerName of layerNames) {
      try {
        const url = `${NT_WFS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&count=${limit}${bboxParam}`;

        console.log(`Trying NT layer: ${layerName}`);

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Indigenous-Map-Platform/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            console.log(`Found NT tenements using layer: ${layerName}`);
            return this.parseFeatures(data);
          }
        }
      } catch {
        continue;
      }
    }

    // Try open data portal as fallback
    return await this.tryOpenDataPortal(options);
  }

  private async tryOpenDataPortal(options: NTQueryOptions): Promise<NTMineralTenement[]> {
    const openDataUrl = 'https://data.nt.gov.au/api/3/action/datastore_search?resource_id=mineral_tenements&limit=500';
    
    try {
      const response = await fetch(openDataUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Indigenous-Map-Platform/1.0'
        }
      });

      if (!response.ok) {
        console.log('NT Open Data endpoint not available');
        return [];
      }

      const data = await response.json();
      
      if (!data.success || !data.result?.records) {
        return [];
      }

      const tenements: NTMineralTenement[] = [];

      for (const record of data.result.records) {
        const lat = parseFloat(record.latitude || record.lat || record.LATITUDE);
        const lng = parseFloat(record.longitude || record.lon || record.LONGITUDE);

        if (!lat || !lng) continue;

        tenements.push({
          id: record._id?.toString() || `nt_${tenements.length}`,
          tenementNumber: record.tenement_no || record.TenementNo || 'Unknown',
          tenementType: record.tenement_type || record.Type || 'Unknown',
          status: record.status || record.Status || 'Unknown',
          holder: record.holder || record.Holder || 'Unknown',
          commodity: record.commodity || record.Commodity || '',
          area: parseFloat(record.area_ha || record.Area) || 0,
          grantDate: record.grant_date || '',
          expiryDate: record.expiry_date || '',
          coordinates: { lat, lng },
          dataSource: 'nt_strike'
        });
      }

      console.log(`Fetched ${tenements.length} tenements from NT Open Data`);
      return tenements;
    } catch (error) {
      console.error('Error fetching from NT Open Data:', error);
      return [];
    }
  }

  private parseFeatures(data: any): NTMineralTenement[] {
    if (!data.features) {
      return [];
    }

    const tenements: NTMineralTenement[] = [];

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
        id: props.objectid?.toString() || feature.id || `nt_${tenements.length}`,
        tenementNumber: props.tenement_no || props.TenementNo || 'Unknown',
        tenementType: props.tenement_type || props.Type || 'Unknown',
        status: props.status || props.Status || 'Unknown',
        holder: props.holder || props.Holder || 'Unknown',
        commodity: props.commodity || props.Commodity || '',
        area: parseFloat(props.area_ha || props.Area) || 0,
        grantDate: props.grant_date || '',
        expiryDate: props.expiry_date || '',
        coordinates: { lat, lng },
        geometry: coords.length > 0 ? coords : undefined,
        dataSource: 'nt_strike'
      });
    }

    return tenements;
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

export const ntStrikeService = new NtStrikeService();
