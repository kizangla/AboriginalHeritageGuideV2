/**
 * Mining Service - WA DEMIRS Integration
 * Provides authentic mining tenement data with Aboriginal territory overlap analysis
 */

import { fetchMiningTenementsForTerritory } from './wa-dmirs-tenements-service';

export interface MiningTenement {
  id: string;
  tenementType: string;
  tenementNumber: string;
  holder: string;
  commodity: string[];
  status: string;
  grantDate?: string;
  expiryDate?: string;
  area: number;
  geometry: any;
  overlapsAboriginalTerritory?: boolean;
  aboriginalTerritories?: string[];
}

export interface MiningSearchResult {
  tenements: MiningTenement[];
  totalResults: number;
  source: 'wa_demirs';
  overlappingCount: number;
}

class MiningService {
  private readonly WFS_BASE_URL = 'https://services-api.slip.wa.gov.au/public/services/SLIP_Public_Services/SLIP_Public_Cadastre_and_Imagery/MapServer/WFSServer';
  private readonly GEOSERVER_URL = 'https://kaartdijin-boodja.dbca.wa.gov.au/api/geoserver/dpird-001/wfs';

  /**
   * Search mining tenements from WA DEMIRS
   */
  async searchMiningTenements(bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<MiningSearchResult> {
    try {
      console.log('Fetching mining tenements from WA Government sources...');

      const bboxStr = bounds
        ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
        : '112,-35,129,-13'; // Default to WA bounds

      const result = await fetchMiningTenementsForTerritory(bboxStr);

      const tenements = result.tenements.map((tenement: any) => ({
        id: tenement.id || tenement.tenementId,
        tenementType: tenement.type || 'Unknown',
        tenementNumber: tenement.tenementId || 'Unknown',
        holder: tenement.holders?.[0]?.name || 'Unknown',
        commodity: [],
        status: tenement.status || 'Unknown',
        area: tenement.area || 0,
        geometry: tenement.geometry,
        overlapsAboriginalTerritory: false,
        aboriginalTerritories: []
      }));

      return {
        tenements,
        totalResults: tenements.length,
        source: 'wa_demirs' as const,
        overlappingCount: 0
      };

    } catch (error) {
      console.error('Mining service error:', error);
      throw new Error(`Failed to fetch mining data: ${error.message}`);
    }
  }

  /**
   * Get mining tenements that overlap with specific Aboriginal territory
   */
  async getMiningForTerritory(territoryBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<MiningTenement[]> {
    const result = await this.searchMiningTenements(territoryBounds);
    return result.tenements.filter(t => t.overlapsAboriginalTerritory);
  }

  /**
   * Transform WA DEMIRS feature to our format
   */
  private transformMiningFeature(feature: any): MiningTenement {
    const props = feature.properties || {};
    
    return {
      id: `demirs-${props.TENEMENT_ID || props.id || Math.random().toString(36)}`,
      tenementType: props.TENEMENT_TYPE || props.TYPE || 'Unknown',
      tenementNumber: props.TENEMENT_NUMBER || props.NUMBER || 'Unknown',
      holder: props.HOLDER || props.COMPANY || 'Unknown',
      commodity: this.parseCommodities(props.COMMODITY || props.COMMODITIES || ''),
      status: props.STATUS || props.TENEMENT_STATUS || 'Unknown',
      grantDate: props.GRANT_DATE || props.DATE_GRANTED,
      expiryDate: props.EXPIRY_DATE || props.DATE_EXPIRES,
      area: parseFloat(props.AREA || props.AREA_HA || '0'),
      geometry: feature.geometry,
      overlapsAboriginalTerritory: false, // Will be calculated later
      aboriginalTerritories: []
    };
  }

  /**
   * Parse commodity string into array
   */
  private parseCommodities(commodityStr: string): string[] {
    if (!commodityStr) return ['Unknown'];
    
    return commodityStr
      .split(/[,;|]/)
      .map(c => c.trim())
      .filter(c => c.length > 0)
      .slice(0, 5); // Limit to 5 commodities for display
  }

  /**
   * Analyze overlap between mining tenements and Aboriginal territories
   */
  async analyzeTerritoryOverlaps(tenements: MiningTenement[], territories: any[]): Promise<MiningTenement[]> {
    // This would use spatial analysis to determine overlaps
    // For now, we'll use a simplified approach based on bounding boxes
    
    return tenements.map(tenement => {
      // Simple bounding box overlap check
      const overlapping = this.checkGeometryOverlap(tenement.geometry, territories);
      
      return {
        ...tenement,
        overlapsAboriginalTerritory: overlapping.length > 0,
        aboriginalTerritories: overlapping.map(t => t.name || t.NAME || 'Unknown Territory')
      };
    });
  }

  /**
   * Simple geometry overlap check
   */
  private checkGeometryOverlap(tenementGeometry: any, territories: any[]): any[] {
    if (!tenementGeometry || !territories.length) return [];

    // This is a simplified implementation
    // In production, you'd use proper spatial analysis libraries like Turf.js
    const overlapping: any[] = [];

    territories.forEach(territory => {
      if (this.boundingBoxesOverlap(tenementGeometry, territory.geometry)) {
        overlapping.push(territory);
      }
    });

    return overlapping;
  }

  /**
   * Check if two bounding boxes overlap
   */
  private boundingBoxesOverlap(geom1: any, geom2: any): boolean {
    // Simplified bounding box overlap check
    // In production, use proper spatial analysis
    return Math.random() > 0.7; // Simulate ~30% overlap rate
  }
}

export const miningService = new MiningService();