/**
 * Simple Mining Overlay Service
 * Processes authentic WA Department of Mines KML data for territory overlay analysis
 */

export interface SimpleMiningTenement {
  id: string;
  type: string;
  status: string;
  holder: string;
  coordinates: number[][];
}

export interface MiningOverlayResult {
  territoryName: string;
  totalTenements: number;
  dataSource: 'wa_dmirs_kml';
  tenements: SimpleMiningTenement[];
}

class SimpleMiningOverlayService {
  private tenementsData: SimpleMiningTenement[] | null = null;

  async loadMiningData(): Promise<SimpleMiningTenement[]> {
    if (this.tenementsData) {
      return this.tenementsData;
    }

    try {
      const fs = await import('fs/promises');
      const kmlData = await fs.readFile('./attached_assets/doc.kml', 'utf-8');
      
      console.log('Processing WA Department of Mines KML data...');
      this.tenementsData = this.extractBasicTenements(kmlData);
      
      console.log(`Processed ${this.tenementsData.length} mining tenements from WA DMIRS`);
      return this.tenementsData;
      
    } catch (error) {
      console.error('Error loading mining KML data:', error);
      return [];
    }
  }

  private extractBasicTenements(kmlData: string): SimpleMiningTenement[] {
    const tenements: SimpleMiningTenement[] = [];
    
    try {
      // Simple extraction using string matching
      const placemarksStart = kmlData.indexOf('<Placemark>');
      if (placemarksStart === -1) return tenements;
      
      const sections = kmlData.split('<Placemark>');
      
      for (let i = 1; i < Math.min(sections.length, 101); i++) { // Limit to first 100 for performance
        const section = sections[i];
        const endIndex = section.indexOf('</Placemark>');
        if (endIndex === -1) continue;
        
        const placemarkContent = section.substring(0, endIndex);
        
        // Extract basic properties
        const tenementId = this.extractValue(placemarkContent, 'Tenement ID');
        const tenementType = this.extractValue(placemarkContent, 'Tenement Type');
        const tenureStatus = this.extractValue(placemarkContent, 'Tenure Status');
        const holder = this.extractValue(placemarkContent, 'Tenement Holder 1');
        
        // Extract coordinates
        const coordsMatch = placemarkContent.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        if (!coordsMatch) continue;
        
        const coordinates = this.parseSimpleCoordinates(coordsMatch[1]);
        if (coordinates.length === 0) continue;
        
        tenements.push({
          id: tenementId || `tenement_${i}`,
          type: tenementType || 'Unknown',
          status: tenureStatus || 'Unknown',
          holder: holder || 'Unknown',
          coordinates
        });
      }
      
    } catch (error) {
      console.error('Error extracting tenements:', error);
    }
    
    return tenements;
  }

  private extractValue(content: string, fieldName: string): string {
    const regex = new RegExp(`<SimpleData name="${fieldName}">(.*?)</SimpleData>`);
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  private parseSimpleCoordinates(coordString: string): number[][] {
    try {
      return coordString.trim()
        .split(/\s+/)
        .slice(0, 100) // Limit points for performance
        .map(coord => {
          const parts = coord.split(',');
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lng) && !isNaN(lat)) {
              return [lng, lat];
            }
          }
          return null;
        })
        .filter(coord => coord !== null) as number[][];
    } catch {
      return [];
    }
  }

  async getMiningOverlayForTerritory(territoryName: string, territoryGeometry: any): Promise<MiningOverlayResult> {
    const tenements = await this.loadMiningData();
    
    // Simple overlap detection using bounding boxes
    const overlapping = tenements.filter(tenement => 
      this.checkSimpleOverlap(territoryGeometry, tenement.coordinates)
    );

    return {
      territoryName,
      totalTenements: overlapping.length,
      dataSource: 'wa_dmirs_kml',
      tenements: overlapping
    };
  }

  private checkSimpleOverlap(territoryGeometry: any, tenementCoords: number[][]): boolean {
    if (!territoryGeometry?.coordinates?.[0] || tenementCoords.length === 0) {
      return false;
    }

    try {
      const territoryBounds = this.getBounds(territoryGeometry.coordinates[0]);
      const tenementBounds = this.getBounds(tenementCoords);
      
      return this.boundsIntersect(territoryBounds, tenementBounds);
    } catch {
      return false;
    }
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
}

export const simpleMiningOverlayService = new SimpleMiningOverlayService();