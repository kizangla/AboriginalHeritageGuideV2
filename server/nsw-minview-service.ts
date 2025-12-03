/**
 * NSW MinView Service - Mining Titles
 * Fetches exploration and mining titles from NSW WFS endpoint
 * 
 * Data Source: NSW Resources Regulator / Geological Survey NSW
 * Covers current titles, applications, and historic tenements
 */

export interface NSWMiningTitle {
  id: string;
  titleNumber: string;
  titleType: string; // Exploration Licence, Mining Lease, etc.
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
  dataSource: 'nsw_minview';
}

export interface MinViewResult {
  titles: NSWMiningTitle[];
  totalCount: number;
  dataSource: 'nsw_minview';
  serviceUrl: string;
  lastUpdated: Date;
}

interface MinViewQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  titleType?: string;
  limit?: number;
}

const MINVIEW_WFS_URL = 'https://minview.geoscience.nsw.gov.au/geoserver/wfs';

class NswMinviewService {
  private cache: Map<string, { data: MinViewResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch mining titles
   */
  async getTitles(options: MinViewQueryOptions = {}): Promise<MinViewResult> {
    const cacheKey = `nsw_titles_${options.titleType || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached NSW MinView data');
      return cached.data;
    }

    console.log('Fetching mining titles from NSW MinView...');

    try {
      const titles = await this.queryWFS(options);

      const result: MinViewResult = {
        titles,
        totalCount: titles.length,
        dataSource: 'nsw_minview',
        serviceUrl: MINVIEW_WFS_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Fetched ${titles.length} mining titles from NSW MinView`);

      return result;
    } catch (error) {
      console.error('Error fetching NSW MinView data:', error);
      throw error;
    }
  }

  /**
   * Query NSW MinView WFS
   */
  private async queryWFS(options: MinViewQueryOptions): Promise<NSWMiningTitle[]> {
    const limit = options.limit || 500;
    
    let bboxParam = '';
    if (options.bounds) {
      bboxParam = `&bbox=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north},EPSG:4326`;
    }

    // Try to get exploration and mining titles
    const url = `${MINVIEW_WFS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeName=gsnsw:exploration_mining_titles&outputFormat=application/json&count=${limit}${bboxParam}`;

    console.log('Querying NSW MinView WFS...');

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Indigenous-Map-Platform/1.0'
        }
      });

      if (!response.ok) {
        console.error(`NSW MinView WFS error: ${response.status}`);
        // Try alternative layer name
        return await this.tryAlternativeLayer(options);
      }

      const data = await response.json();
      return this.parseFeatures(data);
    } catch (error) {
      console.error('Error querying NSW MinView WFS:', error);
      return [];
    }
  }

  private async tryAlternativeLayer(options: MinViewQueryOptions): Promise<NSWMiningTitle[]> {
    const limit = options.limit || 500;
    
    // Try common alternative layer names
    const layerNames = [
      'gsnsw:nsw_exploration_mining_titles',
      'gsnsw:current_titles',
      'nsw_mining_titles'
    ];

    for (const layerName of layerNames) {
      try {
        let bboxParam = '';
        if (options.bounds) {
          bboxParam = `&bbox=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north},EPSG:4326`;
        }

        const url = `${MINVIEW_WFS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&count=${limit}${bboxParam}`;
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Indigenous-Map-Platform/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            console.log(`Found NSW titles using layer: ${layerName}`);
            return this.parseFeatures(data);
          }
        }
      } catch {
        continue;
      }
    }

    console.log('Could not find valid NSW MinView layer');
    return [];
  }

  private parseFeatures(data: any): NSWMiningTitle[] {
    if (!data.features) {
      return [];
    }

    const titles: NSWMiningTitle[] = [];

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

      titles.push({
        id: props.objectid?.toString() || feature.id || `nsw_${titles.length}`,
        titleNumber: props.title_no || props.TitleNo || props.title_number || 'Unknown',
        titleType: props.title_type || props.TitleType || props.type || 'Unknown',
        status: props.status || props.Status || 'Unknown',
        holder: props.holder || props.Holder || props.applicant || 'Unknown',
        commodity: props.commodity || props.Commodity || '',
        area: props.area_ha || props.area || 0,
        grantDate: props.grant_date || props.GrantDate || '',
        expiryDate: props.expiry_date || props.ExpiryDate || '',
        coordinates: { lat, lng },
        geometry: coords.length > 0 ? coords : undefined,
        dataSource: 'nsw_minview'
      });
    }

    return titles;
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

export const nswMinviewService = new NswMinviewService();
