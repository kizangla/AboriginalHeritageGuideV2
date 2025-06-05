/**
 * Western Australia Mining Tenements Service
 * Processes authentic mining data from WA Department of Mines, Industry Regulation and Safety
 */

export interface MiningTenement {
  id: string;
  tenementType: string;
  surveyStatus: string;
  tenureStatus: string;
  holders: string[];
  addresses: string[];
  geometry: any;
  area: number;
  grantDate?: string;
  expiryDate?: string;
  commodities: string[];
  originalProperties: any;
}

export interface TenementOverlapAnalysis {
  territoryName: string;
  totalTenements: number;
  activeTenements: number;
  pendingTenements: number;
  overlapPercentage: number;
  majorHolders: string[];
  commodityTypes: string[];
  potentialConflicts: boolean;
}

export interface MiningTenementsResult {
  tenements: MiningTenement[];
  totalFound: number;
  dataSource: 'wa_dmirs_government';
  lastUpdated: Date;
}

class WAMiningTenementsService {
  private tenementsCache: Map<string, MiningTenement[]> = new Map();
  private overlapAnalysisCache: Map<string, TenementOverlapAnalysis> = new Map();

  /**
   * Load and process WA mining tenements data from government KML files
   */
  async loadMiningTenements(): Promise<MiningTenementsResult> {
    try {
      console.log('Loading WA mining tenements from Department of Mines, Industry Regulation and Safety...');
      
      const fs = await import('fs/promises');
      const path = './attached_assets/doc.kml';
      
      const kmlData = await fs.readFile(path, 'utf-8');
      const tenements = this.parseKMLTenements(kmlData);
      
      console.log(`Successfully processed ${tenements.length} mining tenements from WA DMIRS`);
      
      return {
        tenements,
        totalFound: tenements.length,
        dataSource: 'wa_dmirs_government',
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('Error loading WA mining tenements:', error);
      return {
        tenements: [],
        totalFound: 0,
        dataSource: 'wa_dmirs_government',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Parse KML tenements data from WA DMIRS
   */
  private parseKMLTenements(kmlData: string): MiningTenement[] {
    const tenements: MiningTenement[] = [];
    
    try {
      // Extract Placemark elements containing tenement data
      const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
      let match;
      
      while ((match = placemarkRegex.exec(kmlData)) !== null) {
        const placemarkContent = match[1];
        
        // Extract extended data
        const extendedDataMatch = /<ExtendedData>(.*?)<\/ExtendedData>/s.exec(placemarkContent);
        if (!extendedDataMatch) continue;
        
        const extendedData = extendedDataMatch[1];
        const properties = this.parseExtendedData(extendedData);
        
        // Extract geometry
        const geometryMatch = /<coordinates>(.*?)<\/coordinates>/s.exec(placemarkContent);
        if (!geometryMatch) continue;
        
        const coordinates = this.parseCoordinates(geometryMatch[1]);
        
        const tenement: MiningTenement = {
          id: properties['Tenement ID'] || 'Unknown',
          tenementType: properties['Tenement Type'] || 'Unknown',
          surveyStatus: properties['Survey Status'] || 'Unknown',
          tenureStatus: properties['Tenure Status'] || 'Unknown',
          holders: this.extractHolders(properties),
          addresses: this.extractAddresses(properties),
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          },
          area: this.calculateArea(coordinates),
          grantDate: properties['Grant Date'],
          expiryDate: properties['Expiry Date'],
          commodities: this.extractCommodities(properties),
          originalProperties: properties
        };
        
        tenements.push(tenement);
      }
      
    } catch (error) {
      console.error('Error parsing KML tenements:', error);
    }
    
    return tenements;
  }

  private parseExtendedData(extendedData: string): { [key: string]: string } {
    const properties: { [key: string]: string } = {};
    
    const dataRegex = /<SimpleData name="([^"]*)">(.*?)<\/SimpleData>/g;
    let match;
    
    while ((match = dataRegex.exec(extendedData)) !== null) {
      const name = match[1];
      const value = match[2];
      properties[name] = value;
    }
    
    return properties;
  }

  private parseCoordinates(coordString: string): number[][] {
    return coordString.trim().split(/\s+/).map(coord => {
      const [lng, lat] = coord.split(',').map(Number);
      return [lng, lat];
    });
  }

  private extractHolders(properties: { [key: string]: string }): string[] {
    const holders: string[] = [];
    
    for (let i = 1; i <= 10; i++) {
      const holder = properties[`Tenement Holder ${i}`];
      if (holder && holder.trim()) {
        holders.push(holder.trim());
      }
    }
    
    return holders;
  }

  private extractAddresses(properties: { [key: string]: string }): string[] {
    const addresses: string[] = [];
    
    for (let i = 1; i <= 10; i++) {
      const address = properties[`Address for Holder ${i}`];
      if (address && address.trim()) {
        addresses.push(address.trim());
      }
    }
    
    return addresses;
  }

  private extractCommodities(properties: { [key: string]: string }): string[] {
    const commodities: string[] = [];
    
    // Extract from tenement type or other fields
    const type = properties['Tenement Type'] || '';
    if (type.includes('Gold')) commodities.push('Gold');
    if (type.includes('Iron')) commodities.push('Iron Ore');
    if (type.includes('Coal')) commodities.push('Coal');
    if (type.includes('Exploration')) commodities.push('Exploration');
    
    return commodities;
  }

  private calculateArea(coordinates: number[][]): number {
    // Simple area calculation for polygon
    if (coordinates.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length;
      area += coordinates[i][0] * coordinates[j][1];
      area -= coordinates[j][0] * coordinates[i][1];
    }
    
    return Math.abs(area / 2);
  }

  /**
   * Analyze tenement overlaps with Aboriginal territories
   */
  async analyzeTerritoryOverlaps(territoryName: string, territoryGeometry: any): Promise<TenementOverlapAnalysis> {
    const cacheKey = `overlap_${territoryName}`;
    
    if (this.overlapAnalysisCache.has(cacheKey)) {
      return this.overlapAnalysisCache.get(cacheKey)!;
    }

    try {
      const tenements = await this.loadMiningTenements();
      const overlappingTenements = tenements.tenements.filter(tenement => 
        this.checkGeometryOverlap(territoryGeometry, tenement.geometry)
      );

      const analysis: TenementOverlapAnalysis = {
        territoryName,
        totalTenements: overlappingTenements.length,
        activeTenements: overlappingTenements.filter(t => t.tenureStatus === 'Live').length,
        pendingTenements: overlappingTenements.filter(t => t.tenureStatus === 'Pending').length,
        overlapPercentage: this.calculateOverlapPercentage(territoryGeometry, overlappingTenements),
        majorHolders: this.getMajorHolders(overlappingTenements),
        commodityTypes: this.getUniqueCommodities(overlappingTenements),
        potentialConflicts: overlappingTenements.length > 0
      };

      this.overlapAnalysisCache.set(cacheKey, analysis);
      return analysis;

    } catch (error) {
      console.error('Error analyzing territory overlaps:', error);
      return {
        territoryName,
        totalTenements: 0,
        activeTenements: 0,
        pendingTenements: 0,
        overlapPercentage: 0,
        majorHolders: [],
        commodityTypes: [],
        potentialConflicts: false
      };
    }
  }

  private checkGeometryOverlap(territory: any, tenement: any): boolean {
    // Simplified overlap check - in production would use proper geometric intersection
    if (!territory.coordinates || !tenement.coordinates) return false;
    
    const territoryBounds = this.getBounds(territory.coordinates[0]);
    const tenementBounds = this.getBounds(tenement.coordinates[0]);
    
    return this.boundsIntersect(territoryBounds, tenementBounds);
  }

  private getBounds(coordinates: number[][]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const lats = coordinates.map(coord => coord[1]);
    const lngs = coordinates.map(coord => coord[0]);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  }

  private boundsIntersect(bounds1: any, bounds2: any): boolean {
    return !(bounds1.maxLat < bounds2.minLat || 
             bounds1.minLat > bounds2.maxLat || 
             bounds1.maxLng < bounds2.minLng || 
             bounds1.minLng > bounds2.maxLng);
  }

  private calculateOverlapPercentage(territory: any, tenements: MiningTenement[]): number {
    // Simplified calculation - in production would use proper geometric operations
    if (tenements.length === 0) return 0;
    return Math.min(tenements.length * 5, 100); // Rough estimate
  }

  private getMajorHolders(tenements: MiningTenement[]): string[] {
    const holderCounts: { [key: string]: number } = {};
    
    tenements.forEach(tenement => {
      tenement.holders.forEach(holder => {
        holderCounts[holder] = (holderCounts[holder] || 0) + 1;
      });
    });
    
    return Object.entries(holderCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([holder]) => holder);
  }

  private getUniqueCommodities(tenements: MiningTenement[]): string[] {
    const commodities = new Set<string>();
    
    tenements.forEach(tenement => {
      tenement.commodities.forEach(commodity => commodities.add(commodity));
    });
    
    return Array.from(commodities);
  }
}

export const waMiningTenementsService = new WAMiningTenementsService();