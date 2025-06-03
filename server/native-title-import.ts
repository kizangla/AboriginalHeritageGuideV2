/**
 * Native Title Data Import Service
 * Downloads complete dataset from Australian Government and stores in database
 */

import { db } from './db';
import { nativeTitleClaims, type insertNativeTitleClaimSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface NativeTitleFeature {
  type: string;
  properties: {
    Application_ID?: string;
    Tribunal_Number?: string;
    Applicant_Name?: string;
    Status?: string;
    Determination_Date?: string;
    State?: string;
    Outcome?: string;
    Area_sqkm?: number;
    Federal_Court_Number?: string;
    Registration_Date?: string;
    [key: string]: any;
  };
  geometry: any;
}

interface NativeTitleDataset {
  type: string;
  features: NativeTitleFeature[];
  totalFeatures?: number;
}

export class NativeTitleImportService {
  private readonly dataUrl = 'https://data.gov.au/geoserver/native-title-determination-applications-register/wfs?request=GetFeature&typeName=ckan_00602301_ad90_4657_abd9_8025d9bf485a&outputFormat=json';

  /**
   * Download complete Native Title dataset from Australian Government
   */
  async downloadNativeTitleData(): Promise<NativeTitleDataset> {
    console.log('Downloading complete Native Title dataset from Australian Government...');
    
    try {
      const response = await fetch(this.dataUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download Native Title data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Downloaded ${data.features?.length || 0} Native Title applications from government source`);
      
      return data;
    } catch (error) {
      console.error('Error downloading Native Title data:', error);
      throw error;
    }
  }

  /**
   * Parse government Native Title feature into database format
   */
  private parseNativeTitleFeature(feature: NativeTitleFeature): typeof insertNativeTitleClaimSchema._type {
    const props = feature.properties;
    
    // Extract traditional owners from applicant name
    const traditionalOwners = this.extractTraditionalOwners(props.Applicant_Name || '');

    return {
      applicationId: props.Application_ID || `unknown_${Date.now()}`,
      tribunalNumber: props.Tribunal_Number || null,
      applicantName: props.Applicant_Name || 'Unknown Applicant',
      status: props.Status || 'Unknown',
      determinationDate: props.Determination_Date || null,
      state: props.State || 'Unknown',
      outcome: props.Outcome || null,
      area: props.Area_sqkm || null,
      geometry: feature.geometry,
      traditionalOwners,
      federalCourtNumber: props.Federal_Court_Number || null,
      registrationDate: props.Registration_Date || null,
      lastUpdated: new Date().toISOString(),
      dataSource: 'Australian Government Native Title Tribunal'
    };
  }

  /**
   * Extract traditional owner names from applicant string
   */
  private extractTraditionalOwners(applicantName: string): string[] {
    if (!applicantName) return [];
    
    // Common patterns in Native Title applicant names
    const patterns = [
      /on behalf of the (.+?) people/i,
      /(.+?) people/i,
      /(.+?) nation/i,
      /(.+?) group/i
    ];

    for (const pattern of patterns) {
      const match = applicantName.match(pattern);
      if (match && match[1]) {
        return [match[1].trim()];
      }
    }

    // Fallback: return the full applicant name
    return [applicantName];
  }

  /**
   * Import Native Title data into database
   */
  async importNativeTitleData(): Promise<{ imported: number; updated: number; errors: number }> {
    let imported = 0;
    let updated = 0;
    let errors = 0;

    try {
      const dataset = await this.downloadNativeTitleData();
      
      if (!dataset.features || dataset.features.length === 0) {
        console.warn('No Native Title features found in government dataset');
        return { imported: 0, updated: 0, errors: 0 };
      }

      console.log(`Processing ${dataset.features.length} Native Title applications...`);

      for (const feature of dataset.features) {
        try {
          const parsedClaim = this.parseNativeTitleFeature(feature);
          
          // Check if application already exists
          const existing = await db
            .select()
            .from(nativeTitleClaims)
            .where(eq(nativeTitleClaims.applicationId, parsedClaim.applicationId))
            .limit(1);

          if (existing.length > 0) {
            // Update existing record
            await db
              .update(nativeTitleClaims)
              .set({
                ...parsedClaim,
                lastUpdated: new Date().toISOString()
              })
              .where(eq(nativeTitleClaims.applicationId, parsedClaim.applicationId));
            updated++;
          } else {
            // Insert new record
            await db.insert(nativeTitleClaims).values(parsedClaim);
            imported++;
          }

        } catch (featureError) {
          console.error('Error processing feature:', featureError);
          errors++;
        }
      }

      console.log(`Native Title import complete: ${imported} imported, ${updated} updated, ${errors} errors`);
      return { imported, updated, errors };

    } catch (error) {
      console.error('Native Title import failed:', error);
      throw error;
    }
  }

  /**
   * Get import status and statistics
   */
  async getImportStatus(): Promise<{
    totalClaims: number;
    lastImport: string | null;
    statusBreakdown: Record<string, number>;
    stateBreakdown: Record<string, number>;
  }> {
    try {
      // Get total count
      const totalResult = await db
        .select({ count: nativeTitleClaims.id })
        .from(nativeTitleClaims);
      
      const totalClaims = totalResult.length;

      // Get latest import date
      const latestImport = await db
        .select({ lastUpdated: nativeTitleClaims.lastUpdated })
        .from(nativeTitleClaims)
        .orderBy(nativeTitleClaims.lastUpdated)
        .limit(1);

      const lastImport = latestImport[0]?.lastUpdated || null;

      // Get status breakdown
      const statusResults = await db
        .select({
          status: nativeTitleClaims.status,
          count: nativeTitleClaims.id
        })
        .from(nativeTitleClaims);

      const statusBreakdown: Record<string, number> = {};
      statusResults.forEach(result => {
        const status = result.status || 'Unknown';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });

      // Get state breakdown
      const stateResults = await db
        .select({
          state: nativeTitleClaims.state,
          count: nativeTitleClaims.id
        })
        .from(nativeTitleClaims);

      const stateBreakdown: Record<string, number> = {};
      stateResults.forEach(result => {
        const state = result.state || 'Unknown';
        stateBreakdown[state] = (stateBreakdown[state] || 0) + 1;
      });

      return {
        totalClaims,
        lastImport,
        statusBreakdown,
        stateBreakdown
      };

    } catch (error) {
      console.error('Error getting import status:', error);
      throw error;
    }
  }
}

export const nativeTitleImportService = new NativeTitleImportService();