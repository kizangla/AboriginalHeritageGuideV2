/**
 * Mining Demonstration Service
 * Shows mining overlay functionality while clearly indicating data source status
 */

export interface DemoMiningTenement {
  id: string;
  tenementType: string;
  tenementNumber: string;
  holder: string;
  status: 'Active' | 'Application' | 'Expired';
  area: number;
  grantDate?: string;
  expiryDate?: string;
  commodities: string[];
  geometry: any;
  overlapsAboriginalTerritory: boolean;
  aboriginalTerritoryNames: string[];
  dataSource: 'demonstration' | 'wa_government';
}

export interface MiningDemoResult {
  tenements: DemoMiningTenement[];
  totalResults: number;
  source: string;
  overlappingCount: number;
  isDemo: boolean;
  governmentDataStatus: 'available' | 'unavailable' | 'testing';
  message: string;
}

export class MiningDemoService {
  
  async getMiningOverlayData(bbox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<MiningDemoResult> {
    
    // Create demonstration tenements that would overlap with Aboriginal territories
    const demoTenements: DemoMiningTenement[] = [
      {
        id: 'demo_ml_001',
        tenementType: 'Mining Lease',
        tenementNumber: 'ML 70/1234',
        holder: 'Example Mining Co Pty Ltd',
        status: 'Active',
        area: 850.5,
        grantDate: '2018-03-15',
        expiryDate: '2028-03-15',
        commodities: ['Iron Ore', 'Gold'],
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [133.5, -25.5],
            [133.7, -25.5], 
            [133.7, -25.3],
            [133.5, -25.3],
            [133.5, -25.5]
          ]]
        },
        overlapsAboriginalTerritory: true,
        aboriginalTerritoryNames: ['Arrernte', 'Luritja'],
        dataSource: 'demonstration'
      },
      {
        id: 'demo_el_002',
        tenementType: 'Exploration Licence',
        tenementNumber: 'EL 45/5678',
        holder: 'Territory Exploration Ltd',
        status: 'Application',
        area: 1250.0,
        grantDate: undefined,
        expiryDate: undefined,
        commodities: ['Copper', 'Lithium'],
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [134.0, -24.8],
            [134.3, -24.8],
            [134.3, -24.5],
            [134.0, -24.5],
            [134.0, -24.8]
          ]]
        },
        overlapsAboriginalTerritory: true,
        aboriginalTerritoryNames: ['Warlpiri'],
        dataSource: 'demonstration'
      },
      {
        id: 'demo_pl_003',
        tenementType: 'Prospecting Licence',
        tenementNumber: 'PL 15/9012',
        holder: 'Central Desert Resources',
        status: 'Active',
        area: 425.2,
        grantDate: '2020-07-22',
        expiryDate: '2025-07-22',
        commodities: ['Rare Earth Elements'],
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [132.8, -26.2],
            [133.0, -26.2],
            [133.0, -26.0],
            [132.8, -26.0],
            [132.8, -26.2]
          ]]
        },
        overlapsAboriginalTerritory: true,
        aboriginalTerritoryNames: ['Pitjantjatjara'],
        dataSource: 'demonstration'
      }
    ];

    // Filter by bounding box if provided
    let filteredTenements = demoTenements;
    if (bbox) {
      filteredTenements = demoTenements.filter(tenement => {
        if (tenement.geometry?.type === 'Polygon' && tenement.geometry.coordinates?.[0]) {
          const coords = tenement.geometry.coordinates[0];
          return coords.some((coord: number[]) => 
            coord[0] >= bbox.west && coord[0] <= bbox.east &&
            coord[1] >= bbox.south && coord[1] <= bbox.north
          );
        }
        return false;
      });
    }

    const overlappingCount = filteredTenements.filter(t => t.overlapsAboriginalTerritory).length;

    return {
      tenements: filteredTenements,
      totalResults: filteredTenements.length,
      source: 'Mining Overlay Demonstration',
      overlappingCount,
      isDemo: true,
      governmentDataStatus: 'unavailable',
      message: `Displaying ${filteredTenements.length} demonstration mining tenements. ${overlappingCount} overlap with Aboriginal territories. Authentic WA Government data requires accessible DEMIRS service.`
    };
  }

  async checkGovernmentDataAccess(): Promise<{
    available: boolean;
    endpoint: string;
    error?: string;
  }> {
    try {
      // Test the primary WA DEMIRS endpoint
      const testUrl = 'https://services-api.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/SLIP_Public_Cadastre_and_Imagery/MapServer/43/query?where=1%3D1&outFields=*&outSR=4326&f=geojson&resultRecordCount=1';
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Aboriginal-Australia-Map/1.0'
        }
      });

      return {
        available: response.ok,
        endpoint: 'WA DEMIRS SLIP Services',
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        available: false,
        endpoint: 'WA DEMIRS SLIP Services',
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }
}

export const miningDemoService = new MiningDemoService();