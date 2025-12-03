/**
 * WA MINEDEX Service - Mines and Mineral Deposits of Western Australia
 * Fetches authentic data from WA SLIP ArcGIS Feature Service
 * 
 * Data Source: WA Department of Mines, Industry Regulation and Safety (DMIRS)
 * MINEDEX provides mine and site locations, mineral resources, production data,
 * and environmental reports.
 */

export interface MinedexSite {
  id: string;
  siteCode: string;
  siteTitle: string;
  shortName: string;
  siteCommodities: string;
  siteType: string;
  siteSubType: string;
  siteStage: string;
  targetCommodity: string;
  commodityCategory: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  webLink: string;
  extractDate: Date;
  dataSource: 'wa_dmirs_minedex';
}

export interface MinedexResult {
  sites: MinedexSite[];
  totalCount: number;
  territoryName: string;
  dataSource: 'wa_dmirs_minedex';
  serviceUrl: string;
  lastUpdated: Date;
}

interface MinedexQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  siteType?: string;
  commodityCategory?: string;
  siteStage?: string;
  limit?: number;
}

const MINEDEX_ARCGIS_URL = 'https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Industry_and_Mining/MapServer/0';

class WaMinedexService {
  private cache: Map<string, { data: MinedexResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch mines and mineral deposits for a specific territory
   */
  async getSitesForTerritory(
    territoryName: string,
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ): Promise<MinedexResult> {
    const cacheKey = `minedex_${territoryName}_${bounds.minLat}_${bounds.maxLat}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`Using cached MINEDEX data for ${territoryName}`);
      return cached.data;
    }

    console.log(`Fetching MINEDEX sites for territory: ${territoryName}`);

    try {
      const sites = await this.queryMinedexAPI({
        bounds: {
          north: bounds.maxLat,
          south: bounds.minLat,
          east: bounds.maxLng,
          west: bounds.minLng
        },
        limit: 500
      });

      const result: MinedexResult = {
        sites,
        totalCount: sites.length,
        territoryName,
        dataSource: 'wa_dmirs_minedex',
        serviceUrl: MINEDEX_ARCGIS_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Found ${sites.length} MINEDEX sites for ${territoryName}`);

      return result;
    } catch (error) {
      console.error(`Error fetching MINEDEX data for ${territoryName}:`, error);
      throw error;
    }
  }

  /**
   * Query MINEDEX ArcGIS REST API
   */
  private async queryMinedexAPI(options: MinedexQueryOptions): Promise<MinedexSite[]> {
    const sites: MinedexSite[] = [];
    let offset = 0;
    const pageSize = 1000;
    const limit = options.limit || 500;

    while (sites.length < limit) {
      const whereClause = this.buildWhereClause(options);
      const geometryFilter = options.bounds 
        ? `&geometry=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`
        : '';

      const url = `${MINEDEX_ARCGIS_URL}/query?where=${encodeURIComponent(whereClause)}&outFields=*&f=json&resultOffset=${offset}&resultRecordCount=${pageSize}${geometryFilter}`;

      console.log(`Querying MINEDEX API: offset=${offset}, limit=${pageSize}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`MINEDEX API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`MINEDEX API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (!data.features || data.features.length === 0) {
        break;
      }

      for (const feature of data.features) {
        if (sites.length >= limit) break;
        
        const site = this.parseFeature(feature);
        if (site) {
          sites.push(site);
        }
      }

      if (!data.exceededTransferLimit || data.features.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return sites;
  }

  /**
   * Build WHERE clause for ArcGIS query
   */
  private buildWhereClause(options: MinedexQueryOptions): string {
    const conditions: string[] = ['1=1'];

    if (options.siteType) {
      conditions.push(`site_type_ = '${options.siteType}'`);
    }

    if (options.commodityCategory) {
      conditions.push(`commodity = '${options.commodityCategory}'`);
    }

    if (options.siteStage) {
      conditions.push(`site_stage = '${options.siteStage}'`);
    }

    return conditions.join(' AND ');
  }

  /**
   * Parse ArcGIS feature to MinedexSite
   */
  private parseFeature(feature: any): MinedexSite | null {
    try {
      const attrs = feature.attributes;
      const geom = feature.geometry;

      if (!geom || geom.x === null || geom.y === null) {
        return null;
      }

      return {
        id: `minedex_${attrs.site_code || attrs.oid}`,
        siteCode: attrs.site_code || '',
        siteTitle: attrs.site_title || '',
        shortName: attrs.short_name || attrs.site_title || '',
        siteCommodities: attrs.site_commo || '',
        siteType: attrs.site_type_ || '',
        siteSubType: attrs.site_sub_t || '',
        siteStage: attrs.site_stage || '',
        targetCommodity: attrs.target_com || '',
        commodityCategory: attrs.commodity || '',
        coordinates: {
          lat: geom.y,
          lng: geom.x
        },
        webLink: attrs.web_link || '',
        extractDate: attrs.extract_da ? new Date(attrs.extract_da) : new Date(),
        dataSource: 'wa_dmirs_minedex'
      };
    } catch (error) {
      console.error('Error parsing MINEDEX feature:', error);
      return null;
    }
  }

  /**
   * Get unique site types from cached data or API
   */
  async getSiteTypes(): Promise<string[]> {
    try {
      const url = `${MINEDEX_ARCGIS_URL}/query?where=1=1&outFields=site_type_&returnDistinctValues=true&f=json&resultRecordCount=100`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return ['Mine', 'Deposit', 'Prospect', 'Occurrence'];
      }

      const data = await response.json();
      const types = data.features?.map((f: any) => f.attributes.site_type_).filter(Boolean) || [];
      return Array.from(new Set(types)) as string[];
    } catch (error) {
      console.error('Error fetching site types:', error);
      return ['Mine', 'Deposit', 'Prospect', 'Occurrence'];
    }
  }

  /**
   * Get unique commodity categories
   */
  async getCommodityCategories(): Promise<string[]> {
    try {
      const url = `${MINEDEX_ARCGIS_URL}/query?where=1=1&outFields=commodity&returnDistinctValues=true&f=json&resultRecordCount=100`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return ['PRECIOUS METAL', 'BASE METAL', 'IRON ORE', 'INDUSTRIAL MINERAL'];
      }

      const data = await response.json();
      const categories = data.features?.map((f: any) => f.attributes.commodity).filter(Boolean) || [];
      return Array.from(new Set(categories)) as string[];
    } catch (error) {
      console.error('Error fetching commodity categories:', error);
      return ['PRECIOUS METAL', 'BASE METAL', 'IRON ORE', 'INDUSTRIAL MINERAL'];
    }
  }

  /**
   * Get unique site stages
   */
  async getSiteStages(): Promise<string[]> {
    try {
      const url = `${MINEDEX_ARCGIS_URL}/query?where=1=1&outFields=site_stage&returnDistinctValues=true&f=json&resultRecordCount=100`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return ['Operating', 'Care and Maintenance', 'Closed', 'Proposed'];
      }

      const data = await response.json();
      const stages = data.features?.map((f: any) => f.attributes.site_stage).filter(Boolean) || [];
      return Array.from(new Set(stages)) as string[];
    } catch (error) {
      console.error('Error fetching site stages:', error);
      return ['Operating', 'Care and Maintenance', 'Closed', 'Proposed'];
    }
  }

  /**
   * Check if coordinates are within WA boundaries
   */
  isWithinWA(lat: number, lng: number): boolean {
    return lat >= -35.5 && lat <= -13.5 && lng >= 112.5 && lng <= 129.5;
  }

  /**
   * Check if territory bounds overlap with WA
   */
  territoryOverlapsWA(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): boolean {
    const waBounds = {
      minLat: -35.5,
      maxLat: -13.5,
      minLng: 112.5,
      maxLng: 129.5
    };

    return !(bounds.maxLat < waBounds.minLat || 
             bounds.minLat > waBounds.maxLat ||
             bounds.maxLng < waBounds.minLng || 
             bounds.minLng > waBounds.maxLng);
  }
}

export const waMinedexService = new WaMinedexService();
