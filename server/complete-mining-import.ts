/**
 * Complete Mining Tenements Data Import Service
 * Processes the full 144MB WA DMIRS KML file and stores in database
 */

import fs from 'fs';
import path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import { db } from './db';
import { miningTenements, type InsertMiningTenement } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface KMLTenement {
  id: string;
  type: string;
  status: string;
  holder: string;
  coordinates: number[][];
  grantDate?: string;
  expiryDate?: string;
  area?: number;
  mineralTypes?: string[];
}

class CompleteMiningImportService {
  private majorCompanies = [
    'BHP', 'RIO TINTO', 'FORTESCUE', 'NEWCREST', 'NORTHERN STAR',
    'GOLD FIELDS', 'CHEVRON', 'WOODSIDE', 'ALCOA', 'HAMERSLEY',
    'PILBARA MINERALS', 'MINERAL RESOURCES', 'IGO', 'SANDFIRE',
    'PERSEUS MINING', 'ILUKA RESOURCES', 'WESFARMERS'
  ];

  /**
   * Import complete mining tenements dataset from KML file
   */
  async importCompleteDataset(): Promise<{ imported: number; errors: number }> {
    console.log('Starting complete mining tenements import from 144MB KML file...');
    
    const kmlPath = path.join(process.cwd(), 'attached_assets', 'doc.kml');
    
    if (!fs.existsSync(kmlPath)) {
      throw new Error('KML file not found at attached_assets/doc.kml');
    }

    const kmlData = fs.readFileSync(kmlPath, 'utf8');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlData, 'text/xml');

    let imported = 0;
    let errors = 0;

    try {
      // Check if data already exists
      const existingCount = await db.select().from(miningTenements);
      if (existingCount.length > 10) {
        console.log(`Database already contains ${existingCount.length} mining tenements`);
        return { imported: existingCount.length, errors: 0 };
      }

      const placemarks = xmlDoc.getElementsByTagName('Placemark');
      console.log(`Found ${placemarks.length} placemarks in KML file`);

      const batchSize = 100;
      const tenements: InsertMiningTenement[] = [];

      for (let i = 0; i < placemarks.length; i++) {
        try {
          const placemark = placemarks[i];
          const tenement = this.parsePlacemark(placemark);
          
          if (tenement) {
            tenements.push(tenement);
            
            // Insert in batches for performance
            if (tenements.length >= batchSize) {
              await this.insertBatch(tenements);
              imported += tenements.length;
              tenements.length = 0;
              console.log(`Imported ${imported} tenements...`);
            }
          }
        } catch (error) {
          errors++;
          console.error(`Error processing placemark ${i}:`, error);
        }
      }

      // Insert remaining tenements
      if (tenements.length > 0) {
        await this.insertBatch(tenements);
        imported += tenements.length;
      }

      console.log(`Import complete: ${imported} tenements imported, ${errors} errors`);
      return { imported, errors };

    } catch (error) {
      console.error('Error during mining tenements import:', error);
      throw error;
    }
  }

  /**
   * Parse a KML Placemark element into a mining tenement
   */
  private parsePlacemark(placemark: Element): InsertMiningTenement | null {
    try {
      // Extract name (tenement ID)
      const nameElement = placemark.getElementsByTagName('name')[0];
      if (!nameElement?.textContent) return null;
      
      const tenementId = nameElement.textContent.trim();
      
      // Extract extended data
      const extendedData = placemark.getElementsByTagName('ExtendedData')[0];
      if (!extendedData) return null;

      const simpleData = extendedData.getElementsByTagName('SimpleData');
      const data: { [key: string]: string } = {};
      
      for (let i = 0; i < simpleData.length; i++) {
        const name = simpleData[i].getAttribute('name');
        const value = simpleData[i].textContent;
        if (name && value) {
          data[name] = value;
        }
      }

      // Extract coordinates
      const coordinates = this.extractCoordinates(placemark);
      if (!coordinates || coordinates.length === 0) return null;

      // Calculate center point
      const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
      const centerLng = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;

      // Determine if this is a major company
      const holder = data['HOLDERNAME'] || data['HOLDER'] || 'Unknown';
      const majorCompany = this.isMajorCompany(holder) ? 1 : 0;

      // Extract mineral types from tenement type or other fields
      const mineralTypes = this.extractMineralTypes(data);

      const tenement: InsertMiningTenement = {
        tenementId,
        tenementType: data['TENTYPE'] || data['TYPE'] || 'Unknown',
        status: data['STATUS'] || 'Unknown',
        holder,
        state: data['STATE'] || 'WA',
        area: data['AREA'] ? parseFloat(data['AREA']) : undefined,
        geometry: { type: 'Polygon', coordinates: [coordinates] },
        centerLat,
        centerLng,
        grantDate: data['GRANTDATE'] || data['GRANT_DATE'],
        expiryDate: data['EXPIRYDATE'] || data['EXPIRY_DATE'],
        mineralTypes,
        holderNormalized: holder.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        majorCompany
      };

      return tenement;

    } catch (error) {
      console.error('Error parsing placemark:', error);
      return null;
    }
  }

  /**
   * Extract coordinates from KML placemark
   */
  private extractCoordinates(placemark: Element): number[][] | null {
    try {
      const coordinatesElement = placemark.getElementsByTagName('coordinates')[0];
      if (!coordinatesElement?.textContent) return null;

      const coordsText = coordinatesElement.textContent.trim();
      const coordPairs = coordsText.split(/\s+/);
      
      const coordinates: number[][] = [];
      
      for (const pair of coordPairs) {
        const parts = pair.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          
          if (!isNaN(lng) && !isNaN(lat)) {
            coordinates.push([lng, lat]);
          }
        }
      }

      return coordinates;
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      return null;
    }
  }

  /**
   * Check if a company is a major mining company
   */
  private isMajorCompany(holder: string): boolean {
    const normalizedHolder = holder.toUpperCase();
    return this.majorCompanies.some(company => 
      normalizedHolder.includes(company)
    );
  }

  /**
   * Extract mineral types from tenement data
   */
  private extractMineralTypes(data: { [key: string]: string }): string[] {
    const minerals: string[] = [];
    
    // Check various fields for mineral information
    const fields = ['COMMODITY', 'MINERAL', 'TENTYPE', 'PURPOSE'];
    
    for (const field of fields) {
      const value = data[field];
      if (value) {
        const detected = this.detectMinerals(value);
        minerals.push(...detected);
      }
    }

    return [...new Set(minerals)]; // Remove duplicates
  }

  /**
   * Detect mineral types from text
   */
  private detectMinerals(text: string): string[] {
    const mineralKeywords = [
      'IRON ORE', 'GOLD', 'COPPER', 'NICKEL', 'COAL', 'URANIUM',
      'LITHIUM', 'RARE EARTH', 'BAUXITE', 'DIAMOND', 'SILVER',
      'LEAD', 'ZINC', 'TIN', 'TUNGSTEN', 'MANGANESE'
    ];

    const detected: string[] = [];
    const upperText = text.toUpperCase();

    for (const mineral of mineralKeywords) {
      if (upperText.includes(mineral)) {
        detected.push(mineral);
      }
    }

    return detected;
  }

  /**
   * Insert a batch of tenements into the database
   */
  private async insertBatch(tenements: InsertMiningTenement[]): Promise<void> {
    try {
      await db.insert(miningTenements).values(tenements).onConflictDoNothing();
    } catch (error) {
      console.error('Error inserting batch:', error);
      // Try inserting one by one if batch fails
      for (const tenement of tenements) {
        try {
          await db.insert(miningTenements).values(tenement).onConflictDoNothing();
        } catch (singleError) {
          console.error(`Error inserting tenement ${tenement.tenementId}:`, singleError);
        }
      }
    }
  }

  /**
   * Get tenement statistics
   */
  async getTenementStats(): Promise<{
    total: number;
    byType: { [type: string]: number };
    byStatus: { [status: string]: number };
    byState: { [state: string]: number };
    majorCompanies: number;
  }> {
    const tenements = await db.select().from(miningTenements);
    
    const stats = {
      total: tenements.length,
      byType: {} as { [type: string]: number },
      byStatus: {} as { [status: string]: number },
      byState: {} as { [state: string]: number },
      majorCompanies: 0
    };

    for (const tenement of tenements) {
      // Count by type
      const type = tenement.tenementType || 'Unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by status
      const status = tenement.status || 'Unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by state
      const state = tenement.state || 'Unknown';
      stats.byState[state] = (stats.byState[state] || 0) + 1;

      // Count major companies
      if (tenement.majorCompany) {
        stats.majorCompanies++;
      }
    }

    return stats;
  }
}

export const completeMiningImportService = new CompleteMiningImportService();

// Auto-import on startup if database is empty
export async function initializeMiningData(): Promise<void> {
  try {
    const existingCount = await db.select().from(miningTenements);
    if (existingCount.length === 0) {
      console.log('Mining tenements database is empty, starting import...');
      await completeMiningImportService.importCompleteDataset();
    } else {
      console.log(`Database contains ${existingCount.length} mining tenements`);
    }
  } catch (error) {
    console.error('Error initializing mining data:', error);
  }
}