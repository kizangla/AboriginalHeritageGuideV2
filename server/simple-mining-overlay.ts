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
      const fs = await import('fs');
      const path = './attached_assets/doc.kml';
      
      console.log('Processing WA Department of Mines KML data (streaming)...');
      
      // Stream processing for large KML file
      const stream = fs.createReadStream(path, { encoding: 'utf8' });
      let buffer = '';
      let tenements: SimpleMiningTenement[] = [];
      let processedCount = 0;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: string) => {
          buffer += chunk;
          
          // Process complete Placemark elements
          let placemarkStart = buffer.indexOf('<Placemark');
          while (placemarkStart !== -1) {
            const placemarkEnd = buffer.indexOf('</Placemark>', placemarkStart);
            if (placemarkEnd === -1) break;
            
            const placemarkContent = buffer.substring(placemarkStart, placemarkEnd + 12);
            buffer = buffer.substring(placemarkEnd + 12);
            
            // Extract tenement data
            const tenement = this.parsePlacemarkContent(placemarkContent, processedCount);
            if (tenement) {
              tenements.push(tenement);
              processedCount++;
              
              // Limit for performance (first 1000 tenements)
              if (processedCount >= 1000) {
                stream.destroy();
                break;
              }
            }
            
            placemarkStart = buffer.indexOf('<Placemark');
          }
        });
        
        stream.on('end', () => {
          console.log(`Successfully processed ${tenements.length} mining tenements from WA DMIRS`);
          this.tenementsData = tenements;
          resolve(tenements);
        });
        
        stream.on('error', (error) => {
          console.error('Error streaming KML file:', error);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('Error loading mining KML data:', error);
      return [];
    }
  }

  private parsePlacemarkContent(content: string, index: number): SimpleMiningTenement | null {
    try {
      // Extract basic properties
      const tenementId = this.extractValue(content, 'Tenement ID');
      const tenementType = this.extractValue(content, 'Tenement Type');
      const tenureStatus = this.extractValue(content, 'Tenure Status');
      const holder = this.extractValue(content, 'Tenement Holder 1');
      
      // Skip if no valid tenement ID
      if (!tenementId || tenementId.trim() === '' || tenementId.trim() === ' ') {
        return null;
      }
      
      // Extract coordinates
      const coordsMatch = content.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (!coordsMatch) return null;
      
      const coordinates = this.parseSimpleCoordinates(coordsMatch[1]);
      if (coordinates.length === 0) return null;
      
      return {
        id: tenementId.trim(),
        type: tenementType?.trim() || 'Unknown',
        status: tenureStatus?.trim() || 'Unknown',
        holder: holder?.trim() || 'Unknown',
        coordinates
      };
      
    } catch (error) {
      return null;
    }
  }

  private extractBasicTenements(kmlData: string): SimpleMiningTenement[] {
    const tenements: SimpleMiningTenement[] = [];
    
    try {
      // Extract all Placemark sections properly
      const placemarkMatches = kmlData.match(/<Placemark[^>]*>[\s\S]*?<\/Placemark>/g);
      if (!placemarkMatches) return tenements;
      
      console.log(`Found ${placemarkMatches.length} Placemark elements`);
      
      for (let i = 0; i < Math.min(placemarkMatches.length, 500); i++) { // Process first 500 for performance
        const placemarkContent = placemarkMatches[i];
        
        // Extract basic properties from SimpleData elements
        const tenementId = this.extractValue(placemarkContent, 'Tenement ID');
        const tenementType = this.extractValue(placemarkContent, 'Tenement Type');
        const tenureStatus = this.extractValue(placemarkContent, 'Tenure Status');
        const holder = this.extractValue(placemarkContent, 'Tenement Holder 1');
        const grantDate = this.extractValue(placemarkContent, 'Grant Date');
        const endDate = this.extractValue(placemarkContent, 'End Date');
        
        // Skip if no tenement ID
        if (!tenementId || tenementId.trim() === '') continue;
        
        // Extract coordinates
        const coordsMatch = placemarkContent.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        if (!coordsMatch) continue;
        
        const coordinates = this.parseSimpleCoordinates(coordsMatch[1]);
        if (coordinates.length === 0) continue;
        
        tenements.push({
          id: tenementId.trim(),
          type: tenementType?.trim() || 'Unknown',
          status: tenureStatus?.trim() || 'Unknown',
          holder: holder?.trim() || 'Unknown',
          coordinates
        });
        
        if (i % 100 === 0) {
          console.log(`Processed ${i + 1} tenements...`);
        }
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