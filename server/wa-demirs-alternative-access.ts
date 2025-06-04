/**
 * Alternative WA DEMIRS Mining Data Access
 * Multiple authentic government endpoints for mining tenement data
 */

import fetch from 'node-fetch';

export interface AlternativeMiningEndpoint {
  name: string;
  url: string;
  format: 'geojson' | 'wfs' | 'arcgis';
  status: 'active' | 'testing' | 'fallback';
}

// Authentic WA Government mining data sources
export const WA_MINING_ENDPOINTS: AlternativeMiningEndpoint[] = [
  {
    name: 'WA SLIP Public Services - Mining Tenements',
    url: 'https://services-api.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/SLIP_Public_Cadastre_and_Imagery/MapServer/43/query',
    format: 'arcgis',
    status: 'active'
  },
  {
    name: 'WA Data Portal - Mining Tenements GeoJSON',
    url: 'https://catalogue.data.wa.gov.au/api/3/action/datastore_search_sql',
    format: 'geojson',
    status: 'testing'
  },
  {
    name: 'WA DMIRS Direct API',
    url: 'https://www.dmp.wa.gov.au/api/GeoSpatial/v1/Tenements',
    format: 'geojson',
    status: 'fallback'
  },
  {
    name: 'Data.gov.au - WA Mining Tenements',
    url: 'https://data.gov.au/geoserver/wa-mining-tenements/wfs',
    format: 'wfs',
    status: 'fallback'
  }
];

export interface MiningTenementData {
  id: string;
  tenementNumber: string;
  tenementType: string;
  holder: string;
  status: string;
  area: number;
  grantDate?: string;
  expiryDate?: string;
  commodities: string[];
  geometry: any;
  overlapsAboriginalTerritory?: boolean;
  aboriginalTerritoryNames?: string[];
}

export class AlternativeWAMiningService {
  private cache: Map<string, any> = new Map();

  async testMiningEndpoints(): Promise<AlternativeMiningEndpoint[]> {
    console.log('Testing WA mining data endpoints...');
    const results = [];

    for (const endpoint of WA_MINING_ENDPOINTS) {
      try {
        console.log(`Testing ${endpoint.name}...`);
        const testResult = await this.testEndpoint(endpoint);
        results.push({
          ...endpoint,
          status: testResult ? 'active' : 'inactive'
        });
      } catch (error) {
        console.error(`Endpoint ${endpoint.name} failed:`, error.message);
        results.push({
          ...endpoint,
          status: 'inactive'
        });
      }
    }

    return results;
  }

  private async testEndpoint(endpoint: AlternativeMiningEndpoint): Promise<boolean> {
    try {
      let testUrl = endpoint.url;
      
      // Add test parameters based on format
      if (endpoint.format === 'arcgis') {
        testUrl += '?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultRecordCount=1';
      } else if (endpoint.format === 'wfs') {
        testUrl += '?service=WFS&version=2.0.0&request=GetFeature&maxFeatures=1&outputFormat=application/json';
      }

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Aboriginal-Australia-Map/1.0'
        },
        timeout: 10000
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async fetchMiningData(bbox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<{
    tenements: MiningTenementData[];
    source: string;
    totalResults: number;
  }> {
    // Test endpoints to find working one
    const workingEndpoints = await this.testMiningEndpoints();
    const activeEndpoint = workingEndpoints.find(e => e.status === 'active');

    if (!activeEndpoint) {
      throw new Error('No working WA mining data endpoints available');
    }

    console.log(`Using working endpoint: ${activeEndpoint.name}`);
    
    try {
      const data = await this.fetchFromEndpoint(activeEndpoint, bbox);
      return {
        tenements: data.tenements,
        source: activeEndpoint.name,
        totalResults: data.tenements.length
      };
    } catch (error) {
      console.error(`Failed to fetch from ${activeEndpoint.name}:`, error);
      throw new Error(`Mining data unavailable: ${error.message}`);
    }
  }

  private async fetchFromEndpoint(
    endpoint: AlternativeMiningEndpoint, 
    bbox?: { north: number; south: number; east: number; west: number; }
  ): Promise<{ tenements: MiningTenementData[] }> {
    let url = endpoint.url;

    if (endpoint.format === 'arcgis') {
      // ArcGIS REST API format
      const params = new URLSearchParams({
        'where': '1=1',
        'outFields': '*',
        'outSR': '4326',
        'f': 'geojson',
        'resultRecordCount': '1000'
      });

      if (bbox) {
        params.set('geometry', `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
        params.set('geometryType', 'esriGeometryEnvelope');
        params.set('spatialRel', 'esriSpatialRelIntersects');
      }

      url += '?' + params.toString();
    }

    console.log(`Fetching mining data from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Aboriginal-Australia-Map/1.0'
      },
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as any;

    if (!data.features || !Array.isArray(data.features)) {
      console.warn('No features found in mining data response');
      return { tenements: [] };
    }

    console.log(`Retrieved ${data.features.length} mining tenements`);

    const tenements = data.features.map((feature: any) => this.transformMiningFeature(feature));
    
    return { tenements };
  }

  private transformMiningFeature(feature: any): MiningTenementData {
    const props = feature.properties || {};
    
    return {
      id: props.OBJECTID || props.id || `tenement_${Date.now()}_${Math.random()}`,
      tenementNumber: props.TENNO || props.tenement_number || props.TEN_ID || 'Unknown',
      tenementType: props.TEN_TYPE || props.TYPE || props.TENEMENT_TYPE || 'Mining Lease',
      holder: props.HOLDER || props.CURRENT_HOLDER || props.TENEMENT_HOLDER || 'Unknown Holder',
      status: props.TEN_STATUS || props.STATUS || props.TENEMENT_STATUS || 'Active',
      area: parseFloat(props.AREA_HA || props.AREA || props.SHAPE_AREA || '0'),
      grantDate: props.GRANT_DATE || props.DATE_GRANTED || null,
      expiryDate: props.EXPIRY_DATE || props.DATE_EXPIRES || null,
      commodities: this.extractCommodities(props),
      geometry: feature.geometry,
      overlapsAboriginalTerritory: false, // Will be calculated
      aboriginalTerritoryNames: []
    };
  }

  private extractCommodities(props: any): string[] {
    const commodityFields = [
      'COMMODITIES', 'COMMODITY', 'COMMOD', 'PRIMARY_COMMODITY',
      'SECONDARY_COMMODITY', 'TARGET_COMMODITY'
    ];

    for (const field of commodityFields) {
      if (props[field]) {
        const value = String(props[field]);
        return value.split(/[,;|]/).map(c => c.trim()).filter(c => c.length > 0);
      }
    }

    return ['Mineral'];
  }

  async getEndpointStatus(): Promise<{
    endpoints: AlternativeMiningEndpoint[];
    activeCount: number;
    recommendedEndpoint?: string;
  }> {
    const endpoints = await this.testMiningEndpoints();
    const activeCount = endpoints.filter(e => e.status === 'active').length;
    const recommended = endpoints.find(e => e.status === 'active')?.name;

    return {
      endpoints,
      activeCount,
      recommendedEndpoint: recommended
    };
  }
}

export const alternativeWAMiningService = new AlternativeWAMiningService();