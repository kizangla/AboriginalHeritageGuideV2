/**
 * Exploration Mineral Service - Authentic commodity data from WA DMIRS exploration reports
 * Integrates real mineral commodity data with mining tenements
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface ExplorationReport {
  targetCommodity: string;
  operator: string;
  project: string;
  reportYear: number;
  keywords: string;
  coordinates: number[][];
}

export interface MineralData {
  commodities: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'exploration_reports' | 'company_inference';
  reportCount: number;
}

class ExplorationMineralService {
  private commodityCache: Map<string, string[]> = new Map();
  private regionCache: Map<string, ExplorationReport[]> = new Map();

  /**
   * Extract unique commodities from authentic WA DMIRS exploration reports
   */
  async extractCommodities(): Promise<string[]> {
    const cacheKey = 'all_commodities';
    if (this.commodityCache.has(cacheKey)) {
      return this.commodityCache.get(cacheKey)!;
    }

    try {
      const commodityData = await this.runOGRCommand([
        '-sql', 
        "SELECT DISTINCT TARGET_COMMODITY FROM Exploration_Reports WHERE TARGET_COMMODITY IS NOT NULL AND TARGET_COMMODITY != '' ORDER BY TARGET_COMMODITY",
        'attached_assets/Exploration_Reports.gdb'
      ]);

      const commodities = new Set<string>();
      const lines = commodityData.split('\n');
      
      for (const line of lines) {
        const match = line.match(/TARGET_COMMODITY \(String\) = (.+)/);
        if (match) {
          const commodityString = match[1].trim();
          // Split on semicolon and clean up
          const individualCommodities = commodityString.split(';').map(c => c.trim());
          individualCommodities.forEach(commodity => {
            if (commodity && commodity !== '') {
              commodities.add(commodity);
            }
          });
        }
      }

      const uniqueCommodities = Array.from(commodities).sort();
      this.commodityCache.set(cacheKey, uniqueCommodities);
      
      console.log(`Extracted ${uniqueCommodities.length} unique commodities from WA DMIRS exploration reports`);
      return uniqueCommodities;
    } catch (error) {
      console.error('Error extracting commodities from exploration reports:', error);
      return [];
    }
  }

  /**
   * Get mineral data for a specific location using authentic exploration reports
   */
  async getMineralsForLocation(lat: number, lng: number, radius: number = 0.01): Promise<MineralData | null> {
    try {
      const bbox = {
        minLng: lng - radius,
        maxLng: lng + radius,
        minLat: lat - radius,
        maxLat: lat + radius
      };

      const sqlQuery = `
        SELECT TARGET_COMMODITY, OPERATOR, PROJECT, REPORT_YEAR, KEYWORDS 
        FROM Exploration_Reports 
        WHERE TARGET_COMMODITY IS NOT NULL 
        AND TARGET_COMMODITY != ''
        AND ST_Intersects(SHAPE, ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 7844))
      `;

      const reportData = await this.runOGRCommand([
        '-sql', sqlQuery,
        'attached_assets/Exploration_Reports.gdb'
      ]);

      const commoditySet = new Set<string>();
      let reportCount = 0;

      const lines = reportData.split('\n');
      for (const line of lines) {
        const match = line.match(/TARGET_COMMODITY \(String\) = (.+)/);
        if (match) {
          reportCount++;
          const commodityString = match[1].trim();
          const individualCommodities = commodityString.split(';').map(c => c.trim());
          individualCommodities.forEach(commodity => {
            if (commodity && commodity !== '') {
              commoditySet.add(commodity);
            }
          });
        }
      }

      if (commoditySet.size === 0) {
        return null;
      }

      const commodities = Array.from(commoditySet).sort();
      const confidence = reportCount >= 5 ? 'high' : reportCount >= 2 ? 'medium' : 'low';

      return {
        commodities,
        confidence,
        source: 'exploration_reports',
        reportCount
      };

    } catch (error) {
      console.error('Error getting minerals for location:', error);
      return null;
    }
  }

  /**
   * Get mineral data for a mining tenement by matching with exploration reports
   */
  async getMineralsForTenement(tenementId: string, coordinates: number[][]): Promise<MineralData | null> {
    try {
      // Calculate centroid of tenement for spatial query
      let totalLat = 0, totalLng = 0, pointCount = 0;
      
      for (const ring of coordinates) {
        for (const point of ring) {
          totalLng += point[0];
          totalLat += point[1];
          pointCount++;
        }
      }

      if (pointCount === 0) return null;

      const centroidLng = totalLng / pointCount;
      const centroidLat = totalLat / pointCount;

      return await this.getMineralsForLocation(centroidLat, centroidLng, 0.005);
    } catch (error) {
      console.error(`Error getting minerals for tenement ${tenementId}:`, error);
      return null;
    }
  }

  /**
   * Run OGR command and return output
   */
  private async runOGRCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const ogrinfo = spawn('ogrinfo', args, {
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      ogrinfo.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ogrinfo.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ogrinfo.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`OGR command failed with code ${code}: ${stderr}`));
        }
      });

      ogrinfo.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse authentic commodities into standardized format
   */
  parseStandardizedCommodities(commodityString: string): string[] {
    const commodityMap: { [key: string]: string } = {
      'AGGREGATE': 'Aggregate',
      'BASE METALS': 'Base Metals',
      'CONSTRUCTION MATERIALS': 'Construction Materials',
      'COPPER': 'Copper',
      'GOLD': 'Gold',
      'INDUSTRIAL MINERALS': 'Industrial Minerals',
      'LITHIUM': 'Lithium',
      'SAND': 'Sand',
      'IRON': 'Iron Ore',
      'NICKEL': 'Nickel',
      'URANIUM': 'Uranium',
      'BERYLLIUM': 'Beryllium',
      'CESIUM': 'Cesium',
      'NIOBIUM': 'Niobium',
      'TANTALUM': 'Tantalum',
      'DIMENSION STONE': 'Dimension Stone',
      'GRANITE': 'Granite',
      'GRAVEL': 'Gravel',
      'LIMESTONE': 'Limestone',
      'SANDSTONE': 'Sandstone',
      'WATER': 'Water',
      'LEAD': 'Lead',
      'MANGANESE': 'Manganese',
      'SILVER': 'Silver',
      'ZINC': 'Zinc',
      'MARBLE': 'Marble',
      'TUNGSTEN': 'Tungsten',
      'DOLOMITE': 'Dolomite',
      'PLATINUM GROUP ELEMENTS': 'Platinum Group Elements',
      'PLATINUM': 'Platinum'
    };

    const commodities = commodityString.split(';').map(c => c.trim());
    return commodities
      .map(commodity => commodityMap[commodity] || commodity)
      .filter(commodity => commodity !== '');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { commodities: number; regions: number } {
    return {
      commodities: this.commodityCache.size,
      regions: this.regionCache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.commodityCache.clear();
    this.regionCache.clear();
  }
}

export const explorationMineralService = new ExplorationMineralService();