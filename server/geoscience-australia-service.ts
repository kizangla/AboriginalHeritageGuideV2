/**
 * Geoscience Australia Service - National Critical Minerals & Deposits
 * Fetches nationwide mineral deposits from GA ArcGIS REST API
 * 
 * Data Source: Geoscience Australia - Australian Critical Minerals Map
 * Covers 1000+ major deposits for 60+ commodities across all states/territories
 */

export interface GADeposit {
  id: string;
  name: string;
  state: string;
  commodities: string;
  primaryCommodity: string;
  depositType: string;
  status: string; // Operating, Developing, Care & Maintenance, Deposit
  owner: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  dataSource: 'geoscience_australia';
}

export interface GAResult {
  deposits: GADeposit[];
  totalCount: number;
  dataSource: 'geoscience_australia';
  serviceUrl: string;
  lastUpdated: Date;
}

interface GAQueryOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  state?: string;
  commodity?: string;
  status?: string;
  limit?: number;
}

const GA_CRITICAL_MINERALS_URL = 'https://services.ga.gov.au/gis/rest/services/AustralianCriticalMineralsOperatingMinesAndDeposits/MapServer/0';

class GeoscienceAustraliaService {
  private cache: Map<string, { data: GAResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour (national data changes less frequently)

  /**
   * Fetch all critical mineral deposits nationwide
   */
  async getAllDeposits(options: GAQueryOptions = {}): Promise<GAResult> {
    const cacheKey = `ga_deposits_${options.state || 'all'}_${options.commodity || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached Geoscience Australia data');
      return cached.data;
    }

    console.log('Fetching critical minerals from Geoscience Australia...');

    try {
      const deposits = await this.queryGAAPI(options);

      const result: GAResult = {
        deposits,
        totalCount: deposits.length,
        dataSource: 'geoscience_australia',
        serviceUrl: GA_CRITICAL_MINERALS_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Fetched ${deposits.length} critical mineral deposits from Geoscience Australia`);

      return result;
    } catch (error) {
      console.error('Error fetching Geoscience Australia data:', error);
      throw error;
    }
  }

  /**
   * Fetch deposits for a specific state
   */
  async getDepositsByState(state: string): Promise<GAResult> {
    return this.getAllDeposits({ state });
  }

  /**
   * Fetch deposits within map bounds
   */
  async getDepositsInBounds(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): Promise<GAResult> {
    return this.getAllDeposits({
      bounds: {
        north: bounds.maxLat,
        south: bounds.minLat,
        east: bounds.maxLng,
        west: bounds.minLng
      }
    });
  }

  /**
   * Query GA ArcGIS REST API
   */
  private async queryGAAPI(options: GAQueryOptions): Promise<GADeposit[]> {
    const deposits: GADeposit[] = [];
    let offset = 0;
    const pageSize = 1000;
    const limit = options.limit || 2000;

    while (deposits.length < limit) {
      const whereClauses: string[] = ['1=1'];
      
      if (options.state) {
        whereClauses.push(`State = '${options.state}'`);
      }
      if (options.commodity) {
        whereClauses.push(`Commodities LIKE '%${options.commodity}%'`);
      }
      if (options.status) {
        whereClauses.push(`Status = '${options.status}'`);
      }

      const whereClause = whereClauses.join(' AND ');
      
      const geometryFilter = options.bounds 
        ? `&geometry=${options.bounds.west},${options.bounds.south},${options.bounds.east},${options.bounds.north}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`
        : '';

      const url = `${GA_CRITICAL_MINERALS_URL}/query?where=${encodeURIComponent(whereClause)}&outFields=*&f=json&resultOffset=${offset}&resultRecordCount=${pageSize}${geometryFilter}&outSR=4326`;

      console.log(`Querying Geoscience Australia API: offset=${offset}`);

      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Indigenous-Map-Platform/1.0'
          }
        });

        if (!response.ok) {
          console.error(`GA API error: ${response.status}`);
          break;
        }

        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
          break;
        }

        for (const feature of data.features) {
          const attrs = feature.attributes;
          const geometry = feature.geometry;

          if (!geometry || !geometry.x || !geometry.y) continue;

          deposits.push({
            id: attrs.objectid?.toString() || `ga_${deposits.length}`,
            name: attrs.projectname || attrs.ProjectName || attrs.Name || 'Unknown Deposit',
            state: attrs.state || attrs.State || 'Unknown',
            commodities: attrs.commodities || attrs.Commodities || '',
            primaryCommodity: this.extractPrimaryCommodity(attrs.commodities || attrs.Commodities || ''),
            depositType: attrs.deposit_type || attrs.Deposit_Type || 'Mineral Deposit',
            status: attrs.status || attrs.Status || 'Unknown',
            owner: attrs.owner_operator || attrs.Owner_Operator || attrs.owner || attrs.Owner || 'Not specified',
            coordinates: {
              lat: geometry.y,
              lng: geometry.x
            },
            dataSource: 'geoscience_australia'
          });
        }

        if (data.features.length < pageSize) {
          break;
        }

        offset += pageSize;
      } catch (error) {
        console.error('Error querying GA API:', error);
        break;
      }
    }

    return deposits;
  }

  private extractPrimaryCommodity(commodities: string): string {
    if (!commodities) return 'Unknown';
    const parts = commodities.split(/[,;]/);
    return parts[0]?.trim() || 'Unknown';
  }

  clearCache(): void {
    this.cache.clear();
    console.log('Geoscience Australia cache cleared');
  }
}

export const geoscienceAustraliaService = new GeoscienceAustraliaService();
