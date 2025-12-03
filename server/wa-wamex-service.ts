/**
 * WA WAMEX Service - Mineral Exploration Reports of Western Australia
 * Fetches authentic data from WA SLIP ArcGIS Feature Service (Layer 22)
 * 
 * Data Source: WA Department of Mines, Industry Regulation and Safety (DMIRS)
 * WAMEX database contains statutory mineral exploration reports submitted by
 * companies as part of their reporting commitments on mining leases.
 */

export interface WamexReport {
  id: string;
  aNumber: number;
  title: string;
  reportYear: number;
  authorName: string | null;
  authorCompany: string | null;
  reportType: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  project: string;
  operator: string;
  abstract: string | null;
  keywords: string | null;
  targetCommodity: string | null;
  dateReleased: Date | null;
  abstractUrl: string | null;
  reportUrl: string | null;
  hasDigitalFile: boolean;
  coordinates: number[][] | null;
  dataSource: 'wa_dmirs_wamex';
}

export interface WamexResult {
  reports: WamexReport[];
  totalCount: number;
  territoryName: string;
  dataSource: 'wa_dmirs_wamex';
  serviceUrl: string;
  lastUpdated: Date;
}

interface WamexQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  reportType?: string;
  targetCommodity?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

const WAMEX_ARCGIS_URL = 'https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Industry_and_Mining/MapServer/22';

class WaWamexService {
  private cache: Map<string, { data: WamexResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch exploration reports for a specific territory
   */
  async getReportsForTerritory(
    territoryName: string,
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ): Promise<WamexResult> {
    const cacheKey = `wamex_${territoryName}_${bounds.minLat.toFixed(2)}_${bounds.maxLat.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`Using cached WAMEX data for ${territoryName}`);
      return cached.data;
    }

    console.log(`Fetching WAMEX reports for territory: ${territoryName}`);

    try {
      const reports = await this.queryWamexAPI({
        bounds: {
          north: bounds.maxLat,
          south: bounds.minLat,
          east: bounds.maxLng,
          west: bounds.minLng
        },
        limit: 200
      });

      const result: WamexResult = {
        reports,
        totalCount: reports.length,
        territoryName,
        dataSource: 'wa_dmirs_wamex',
        serviceUrl: WAMEX_ARCGIS_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Found ${reports.length} WAMEX reports for ${territoryName}`);

      return result;
    } catch (error) {
      console.error(`Error fetching WAMEX data for ${territoryName}:`, error);
      throw error;
    }
  }

  /**
   * Query WAMEX ArcGIS REST API
   */
  private async queryWamexAPI(options: WamexQueryOptions): Promise<WamexReport[]> {
    const reports: WamexReport[] = [];
    let offset = 0;
    const pageSize = 500;
    const limit = options.limit || 200;

    while (reports.length < limit) {
      const whereClause = this.buildWhereClause(options);
      const geometryFilter = options.bounds 
        ? `&geometry=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`
        : '';

      const url = `${WAMEX_ARCGIS_URL}/query?where=${encodeURIComponent(whereClause)}&outFields=*&f=json&resultOffset=${offset}&resultRecordCount=${pageSize}${geometryFilter}&orderByFields=report_year+DESC`;

      console.log(`Querying WAMEX API: offset=${offset}, limit=${pageSize}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`WAMEX API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`WAMEX API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (!data.features || data.features.length === 0) {
        break;
      }

      for (const feature of data.features) {
        if (reports.length >= limit) break;
        
        const report = this.parseFeature(feature);
        if (report) {
          reports.push(report);
        }
      }

      if (!data.exceededTransferLimit || data.features.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return reports;
  }

  /**
   * Build WHERE clause for ArcGIS query
   */
  private buildWhereClause(options: WamexQueryOptions): string {
    const conditions: string[] = ['1=1'];

    if (options.reportType) {
      conditions.push(`report_type = '${options.reportType}'`);
    }

    if (options.targetCommodity) {
      conditions.push(`target_commodity LIKE '%${options.targetCommodity}%'`);
    }

    if (options.yearFrom) {
      conditions.push(`report_year >= ${options.yearFrom}`);
    }

    if (options.yearTo) {
      conditions.push(`report_year <= ${options.yearTo}`);
    }

    return conditions.join(' AND ');
  }

  /**
   * Parse ArcGIS feature to WamexReport
   */
  private parseFeature(feature: any): WamexReport | null {
    try {
      const attrs = feature.attributes;
      const geom = feature.geometry;

      let coordinates: number[][] | null = null;
      if (geom && geom.rings && geom.rings.length > 0) {
        coordinates = geom.rings[0];
      }

      return {
        id: `wamex_${attrs.anumber || attrs.objectid}`,
        aNumber: attrs.anumber || 0,
        title: attrs.title || '',
        reportYear: attrs.report_year || 0,
        authorName: attrs.author_name || null,
        authorCompany: attrs.author_company || null,
        reportType: attrs.report_type || '',
        dateFrom: attrs.date_from ? new Date(attrs.date_from) : null,
        dateTo: attrs.date_to ? new Date(attrs.date_to) : null,
        project: attrs.project || '',
        operator: attrs.operator || '',
        abstract: attrs.abstract || null,
        keywords: attrs.keywords || null,
        targetCommodity: attrs.target_commodity || null,
        dateReleased: attrs.date_released ? new Date(attrs.date_released) : null,
        abstractUrl: attrs.dpxe_abs || null,
        reportUrl: attrs.dpxe_rep || null,
        hasDigitalFile: attrs.digital_file === -1 || attrs.digital_file === 1,
        coordinates,
        dataSource: 'wa_dmirs_wamex'
      };
    } catch (error) {
      console.error('Error parsing WAMEX feature:', error);
      return null;
    }
  }

  /**
   * Get unique report types
   */
  async getReportTypes(): Promise<string[]> {
    try {
      const url = `${WAMEX_ARCGIS_URL}/query?where=1=1&outFields=report_type&returnDistinctValues=true&f=json&resultRecordCount=50`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return ['Annual', 'Final', 'Partial Surrender', 'Combined', 'Quarterly'];
      }

      const data = await response.json();
      const types = data.features?.map((f: any) => f.attributes.report_type).filter(Boolean) || [];
      return Array.from(new Set(types)) as string[];
    } catch (error) {
      console.error('Error fetching report types:', error);
      return ['Annual', 'Final', 'Partial Surrender', 'Combined', 'Quarterly'];
    }
  }

  /**
   * Get unique target commodities
   */
  async getTargetCommodities(): Promise<string[]> {
    try {
      const url = `${WAMEX_ARCGIS_URL}/query?where=1=1&outFields=target_commodity&returnDistinctValues=true&f=json&resultRecordCount=100`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return ['GOLD', 'IRON ORE', 'COPPER', 'NICKEL', 'LITHIUM'];
      }

      const data = await response.json();
      const commodities: Set<string> = new Set();
      
      data.features?.forEach((f: any) => {
        const commodityStr = f.attributes.target_commodity;
        if (commodityStr) {
          commodityStr.split(';').forEach((c: string) => {
            const trimmed = c.trim();
            if (trimmed) commodities.add(trimmed);
          });
        }
      });

      return Array.from(commodities).sort();
    } catch (error) {
      console.error('Error fetching target commodities:', error);
      return ['GOLD', 'IRON ORE', 'COPPER', 'NICKEL', 'LITHIUM'];
    }
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

export const waWamexService = new WaWamexService();
