/**
 * Victoria GeoVic Service - Mines and Mineral Occurrences
 * Fetches mining data from Victoria Earth Resources WFS
 * 
 * Data Source: Geological Survey of Victoria (GSV)
 * Covers mines, mineral occurrences, and current mining licences
 */

export interface VicMineralSite {
  id: string;
  name: string;
  siteType: string; // Mine, Occurrence, Prospect
  commodity: string;
  commodityCategory: string;
  mineSize: string; // Major, Intermediate, Minor
  status: string;
  depositStyle: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  dataSource: 'vic_geovic';
}

export interface GeoVicResult {
  sites: VicMineralSite[];
  totalCount: number;
  dataSource: 'vic_geovic';
  serviceUrl: string;
  lastUpdated: Date;
}

interface GeoVicQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  siteType?: string;
  commodity?: string;
  limit?: number;
}

const GEOVIC_WFS_URL = 'http://geology.data.vic.gov.au/services/earthresourceml/wfs';

class VicGeovicService {
  private cache: Map<string, { data: GeoVicResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch mineral sites
   */
  async getMineralSites(options: GeoVicQueryOptions = {}): Promise<GeoVicResult> {
    const cacheKey = `vic_sites_${options.siteType || 'all'}_${options.commodity || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached Victoria GeoVic data');
      return cached.data;
    }

    console.log('Fetching mineral sites from Victoria GeoVic...');

    try {
      const sites = await this.queryWFS(options);

      const result: GeoVicResult = {
        sites,
        totalCount: sites.length,
        dataSource: 'vic_geovic',
        serviceUrl: GEOVIC_WFS_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Fetched ${sites.length} mineral sites from Victoria GeoVic`);

      return result;
    } catch (error) {
      console.error('Error fetching Victoria GeoVic data:', error);
      throw error;
    }
  }

  /**
   * Query Victoria GeoVic WFS
   */
  private async queryWFS(options: GeoVicQueryOptions): Promise<VicMineralSite[]> {
    const limit = options.limit || 500;
    
    let bboxParam = '';
    if (options.bounds) {
      bboxParam = `&bbox=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north},EPSG:4326`;
    }

    // Try EarthResourceML endpoint
    const url = `${GEOVIC_WFS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeName=gsv:mines&outputFormat=application/json&count=${limit}${bboxParam}`;

    console.log('Querying Victoria GeoVic WFS...');

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Indigenous-Map-Platform/1.0'
        }
      });

      if (!response.ok) {
        console.error(`Victoria GeoVic WFS error: ${response.status}`);
        // Try alternative endpoint
        return await this.tryDataVicEndpoint(options);
      }

      const data = await response.json();
      return this.parseFeatures(data);
    } catch (error) {
      console.error('Error querying Victoria GeoVic WFS:', error);
      return await this.tryDataVicEndpoint(options);
    }
  }

  private async tryDataVicEndpoint(options: GeoVicQueryOptions): Promise<VicMineralSite[]> {
    // Try the Data.vic.gov.au CSV/GeoJSON endpoint
    const dataVicUrl = 'https://discover.data.vic.gov.au/api/3/action/datastore_search?resource_id=mines_and_mineral_occurrence_sites&limit=500';
    
    try {
      const response = await fetch(dataVicUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Indigenous-Map-Platform/1.0'
        }
      });

      if (!response.ok) {
        console.log('Data.vic endpoint not available');
        return [];
      }

      const data = await response.json();
      
      if (!data.success || !data.result?.records) {
        return [];
      }

      const sites: VicMineralSite[] = [];

      for (const record of data.result.records) {
        const lat = parseFloat(record.latitude || record.lat || record.LATITUDE);
        const lng = parseFloat(record.longitude || record.lon || record.LONGITUDE);

        if (!lat || !lng) continue;

        sites.push({
          id: record._id?.toString() || `vic_${sites.length}`,
          name: record.name || record.NAME || 'Unknown',
          siteType: record.site_type || record.SITE_TYPE || 'Unknown',
          commodity: record.commodity || record.COMMODITY || '',
          commodityCategory: record.commodity_category || '',
          mineSize: record.mine_size || record.MINE_SIZE || 'Unknown',
          status: record.status || record.STATUS || 'Unknown',
          depositStyle: record.deposit_style || '',
          coordinates: { lat, lng },
          dataSource: 'vic_geovic'
        });
      }

      console.log(`Fetched ${sites.length} sites from Data.vic`);
      return sites;
    } catch (error) {
      console.error('Error fetching from Data.vic:', error);
      return [];
    }
  }

  private parseFeatures(data: any): VicMineralSite[] {
    if (!data.features) {
      return [];
    }

    const sites: VicMineralSite[] = [];

    for (const feature of data.features) {
      const props = feature.properties;
      const geometry = feature.geometry;

      let lat = 0, lng = 0;

      if (geometry) {
        if (geometry.type === 'Point') {
          lng = geometry.coordinates[0];
          lat = geometry.coordinates[1];
        }
      }

      if (!lat || !lng) continue;

      sites.push({
        id: props.objectid?.toString() || feature.id || `vic_${sites.length}`,
        name: props.name || props.NAME || 'Unknown',
        siteType: props.site_type || props.SITE_TYPE || 'Unknown',
        commodity: props.commodity || props.COMMODITY || '',
        commodityCategory: props.commodity_category || '',
        mineSize: props.mine_size || props.MINE_SIZE || 'Unknown',
        status: props.status || props.STATUS || 'Unknown',
        depositStyle: props.deposit_style || '',
        coordinates: { lat, lng },
        dataSource: 'vic_geovic'
      });
    }

    return sites;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const vicGeovicService = new VicGeovicService();
