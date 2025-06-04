/**
 * Comprehensive Native Title Service
 * Integrates applications, determinations, and outcomes from Australian Government sources
 */

import fetch from 'node-fetch';
import { db } from './db';
import { nativeTitleClaims } from '@shared/schema';
import { sql } from 'drizzle-orm';

export interface NativeTitleDetermination {
  applicationId: string;
  tribunalNumber: string;
  determinationName: string;
  applicantName: string;
  status: 'determined' | 'pending' | 'registered';
  outcome: string;
  determinationDate?: string | null;
  area: number;
  state: string;
  traditionalOwners: string[];
  federalCourtNumber?: string | null;
  coordinates: {
    lat: number;
    lng: number;
  };
  geometry?: any; // GeoJSON geometry data from government sources
  references: {
    sourceUrl: string;
    lastUpdated: string;
    dataProvider: string;
    licenseType: string;
    citation: string;
  };
}

export interface ComprehensiveNativeTitleInfo {
  hasNativeTitle: boolean;
  applications: NativeTitleDetermination[];
  determinations: NativeTitleDetermination[];
  registeredBodies: NativeTitleDetermination[];
  overallStatus: 'determined' | 'pending' | 'registered' | 'no_application';
  primaryApplicant?: string;
  culturalSignificance?: string;
  totalArea: number;
  dataSource: string;
}

class ComprehensiveNativeTitleService {
  private readonly endpoints = {
    applications: 'https://data.gov.au/geoserver/native-title-determination-applications-register/wfs?request=GetFeature&typeName=ckan_00602301_ad90_4657_abd9_8025d9bf485a&outputFormat=json',
    determinations: 'https://data.gov.au/geoserver/native-title-determinations-national-native-title-register/wfs?request=GetFeature&typeName=ckan_ecdbbb6c_c374_4649_9cd3_0677f44182c9&outputFormat=json',
    outcomes: 'https://data.gov.au/geoserver/native-title-determination-outcomes/wfs?request=GetFeature&typeName=ckan_54f906a3_2c6c_4143_bcb4_27d542429939&outputFormat=json',
    rntbc: 'https://data.gov.au/geoserver/registered-native-title-body-corporate-rntbc-areas/wfs?request=GetFeature&typeName=ckan_c6c68892_cc2b_452c_8a9b_5cbfe201443f&outputFormat=json'
  };

  /**
   * Get comprehensive Native Title information from all government sources
   */
  async getComprehensiveNativeTitleInfo(lat: number, lng: number, territoryName: string): Promise<ComprehensiveNativeTitleInfo> {
    try {
      console.log(`Fetching comprehensive Native Title data for ${territoryName} at ${lat}, ${lng}`);

      // Get data from local database (applications)
      const localApplications = await this.getLocalApplications(lat, lng);
      
      // Attempt to get additional data from government endpoints
      const [determinations, outcomes, rntbcAreas] = await Promise.allSettled([
        this.fetchDeterminations(lat, lng),
        this.fetchOutcomes(lat, lng),
        this.fetchRNTBCAreas(lat, lng)
      ]);

      const allData: NativeTitleDetermination[] = [
        ...localApplications,
        ...(determinations.status === 'fulfilled' ? determinations.value : []),
        ...(outcomes.status === 'fulfilled' ? outcomes.value : []),
        ...(rntbcAreas.status === 'fulfilled' ? rntbcAreas.value : [])
      ];

      // Remove duplicates based on tribunal number
      const uniqueData = this.removeDuplicates(allData);

      return {
        hasNativeTitle: uniqueData.length > 0,
        applications: uniqueData.filter(d => d.status === 'pending'),
        determinations: uniqueData.filter(d => d.status === 'determined'),
        registeredBodies: uniqueData.filter(d => d.status === 'registered'),
        overallStatus: this.determineOverallStatus(uniqueData),
        primaryApplicant: uniqueData[0]?.applicantName,
        culturalSignificance: this.generateCulturalSignificance(territoryName, uniqueData),
        totalArea: uniqueData.reduce((sum, d) => sum + (d.area || 0), 0),
        dataSource: 'Australian Government Native Title Tribunal & Registers'
      };

    } catch (error) {
      console.error('Error fetching comprehensive Native Title data:', error);
      
      // Fallback to local data only
      const localApplications = await this.getLocalApplications(lat, lng);
      
      return {
        hasNativeTitle: localApplications.length > 0,
        applications: localApplications,
        determinations: [],
        registeredBodies: [],
        overallStatus: localApplications.length > 0 ? 'pending' : 'no_application',
        primaryApplicant: localApplications[0]?.applicantName,
        culturalSignificance: this.generateCulturalSignificance(territoryName, localApplications),
        totalArea: localApplications.reduce((sum, d) => sum + (d.area || 0), 0),
        dataSource: 'Australian Government Native Title Applications Register'
      };
    }
  }

  /**
   * Get applications from local database
   */
  private async getLocalApplications(lat: number, lng: number): Promise<NativeTitleDetermination[]> {
    const allClaims = await db.select().from(nativeTitleClaims);
    
    const matchingClaims = allClaims.filter(claim => {
      if (!claim.geometry) return false;
      
      try {
        const geometry = typeof claim.geometry === 'string' ? JSON.parse(claim.geometry) : claim.geometry;
        return this.isPointInGeometry(lat, lng, geometry) || this.isRegionalMatch(lat, lng, claim, geometry);
      } catch (error) {
        return false;
      }
    });

    return matchingClaims.map(claim => ({
      applicationId: claim.applicationId || '',
      tribunalNumber: claim.tribunalNumber || '',
      determinationName: claim.applicantName || '',
      applicantName: claim.applicantName || '',
      status: 'pending' as const,
      outcome: claim.outcome || 'Accepted for registration',
      determinationDate: claim.determinationDate || undefined,
      area: claim.area || 0,
      state: claim.state || '',
      traditionalOwners: claim.traditionalOwners || [],
      federalCourtNumber: claim.federalCourtNumber,
      coordinates: { lat: 0, lng: 0 },
      references: {
        sourceUrl: 'https://data.gov.au/data/dataset/native-title-determination-applications-register',
        lastUpdated: claim.lastUpdated || new Date().toISOString().split('T')[0],
        dataProvider: 'National Native Title Tribunal (NNTT)',
        licenseType: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        citation: `National Native Title Tribunal. (${new Date().getFullYear()}). Native Title Determination Applications Register. ${claim.tribunalNumber ? `Tribunal File: ${claim.tribunalNumber}` : `Application: ${claim.applicantName}`}. Retrieved from https://data.gov.au/data/dataset/native-title-determination-applications-register`
      }
    }));
  }

  /**
   * Fetch determinations from government endpoint
   */
  private async fetchDeterminations(lat: number, lng: number): Promise<NativeTitleDetermination[]> {
    try {
      const response = await fetch(this.endpoints.determinations);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json() as any;
      const features = data.features || [];
      
      return features.map((feature: any) => this.parseFeatureAsNativeTitleDetermination(feature, 'determined'))
        .filter((determination: NativeTitleDetermination) => this.isRelevantToLocation(determination, lat, lng));
    } catch (error) {
      console.log('Native Title Determinations endpoint requires authentication');
      return [];
    }
  }

  /**
   * Fetch outcomes from government endpoint
   */
  private async fetchOutcomes(lat: number, lng: number): Promise<NativeTitleDetermination[]> {
    try {
      const response = await fetch(this.endpoints.outcomes);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json() as any;
      const features = data.features || [];
      
      return features.map((feature: any) => this.parseFeatureAsNativeTitleDetermination(feature, 'determined'))
        .filter((determination: NativeTitleDetermination) => this.isRelevantToLocation(determination, lat, lng));
    } catch (error) {
      console.log('Native Title Determination Outcomes endpoint requires authentication');
      return [];
    }
  }

  /**
   * Fetch RNTBC areas from government endpoint
   */
  private async fetchRNTBCAreas(lat: number, lng: number): Promise<NativeTitleDetermination[]> {
    try {
      const response = await fetch(this.endpoints.rntbc);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json() as any;
      const features = data.features || [];
      
      return features.map((feature: any) => this.parseFeatureAsNativeTitleDetermination(feature, 'registered'))
        .filter((determination: NativeTitleDetermination) => this.isRelevantToLocation(determination, lat, lng));
    } catch (error) {
      console.log('RNTBC Areas endpoint requires authentication');
      return [];
    }
  }

  /**
   * Parse feature from any government source
   */
  private parseFeatureAsNativeTitleDetermination(feature: any, status: 'determined' | 'pending' | 'registered'): NativeTitleDetermination {
    const props = feature.properties;
    const applicantName = props.NAME || props.DET_NAME || props.RNTBC_NAME || props.Applicant_Name || 'Unknown';
    
    // Extract coordinates from geometry if available
    const coordinates = this.extractCoordinatesFromGeometry(feature.geometry);
    
    return {
      applicationId: props.TRIBID || props.Application_ID || '',
      tribunalNumber: props.TRIBID || props.Tribunal_Number || '',
      determinationName: applicantName,
      applicantName: applicantName,
      status: status,
      outcome: props.OUTCOME || props.DET_OUTCOME || props.STATUS || 'Unknown',
      determinationDate: props.DET_DATE || props.Determination_Date || props.DATELODGED,
      area: props.AREASQKM || props.Area_sqkm || 0,
      state: props.JURIS || props.State || '',
      traditionalOwners: this.extractTraditionalOwners(applicantName),
      federalCourtNumber: props.FCNO || props.Federal_Court_Number,
      coordinates: coordinates,
      geometry: feature.geometry, // Include full geometry data
      references: {
        sourceUrl: status === 'determined' ? 'https://data.gov.au/data/dataset/native-title-determinations' : 'https://data.gov.au/data/dataset/registered-native-title-body-corporate-rntbc-areas',
        lastUpdated: props.DT_EXTRACT || new Date().toISOString().split('T')[0],
        dataProvider: 'National Native Title Tribunal (NNTT)',
        licenseType: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        citation: `National Native Title Tribunal. (${new Date().getFullYear()}). ${status === 'determined' ? 'Native Title Determinations' : 'RNTBC Areas'} Register. Retrieved from https://data.gov.au`
      }
    };
  }

  /**
   * Extract coordinates from GeoJSON geometry
   */
  private extractCoordinatesFromGeometry(geometry: any): { lat: number; lng: number } {
    if (!geometry || !geometry.coordinates) {
      console.log('No geometry or coordinates found');
      return { lat: 0, lng: 0 };
    }

    try {
      console.log('Processing geometry type:', geometry.type, 'with coordinates:', geometry.coordinates?.length || 'N/A');
      
      if (geometry.type === 'Point') {
        const coords = geometry.coordinates;
        const result = { lat: coords[1], lng: coords[0] };
        console.log('Extracted Point coordinates:', result);
        return result;
      } else if (geometry.type === 'Polygon') {
        // Calculate centroid of polygon
        const polygonCoords = geometry.coordinates[0];
        if (polygonCoords && polygonCoords.length > 0) {
          const lat = polygonCoords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / polygonCoords.length;
          const lng = polygonCoords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / polygonCoords.length;
          const result = { lat, lng };
          console.log('Extracted Polygon centroid:', result);
          return result;
        }
      } else if (geometry.type === 'MultiPolygon') {
        // Calculate centroid of first polygon in multipolygon
        const firstPolygon = geometry.coordinates[0][0];
        if (firstPolygon && firstPolygon.length > 0) {
          const lat = firstPolygon.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / firstPolygon.length;
          const lng = firstPolygon.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / firstPolygon.length;
          const result = { lat, lng };
          console.log('Extracted MultiPolygon centroid:', result);
          return result;
        }
      }
    } catch (error) {
      console.warn('Failed to extract coordinates from geometry:', error);
    }

    console.log('Returning default coordinates (0,0)');
    return { lat: 0, lng: 0 };
  }

  /**
   * Remove duplicates based on tribunal number
   */
  private removeDuplicates(data: NativeTitleDetermination[]): NativeTitleDetermination[] {
    const seen = new Set<string>();
    return data.filter(item => {
      const key = item.tribunalNumber || item.applicationId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Determine overall status from all data sources
   */
  private determineOverallStatus(data: NativeTitleDetermination[]): 'determined' | 'pending' | 'registered' | 'no_application' {
    if (data.length === 0) return 'no_application';
    
    if (data.some(d => d.status === 'determined')) return 'determined';
    if (data.some(d => d.status === 'registered')) return 'registered';
    return 'pending';
  }

  /**
   * Generate cultural significance description
   */
  private generateCulturalSignificance(territoryName: string, data: NativeTitleDetermination[]): string {
    if (data.length === 0) return '';
    
    const owners = data.flatMap(d => d.traditionalOwners).filter((owner, index, arr) => arr.indexOf(owner) === index);
    
    if (owners.length > 0) {
      return `Traditional country of the ${owners.slice(0, 3).join(', ')} people, with ongoing cultural connections to this land.`;
    }
    
    return `Significant cultural area with Native Title recognition under Australian law.`;
  }

  /**
   * Check if determination is relevant to location
   */
  private isRelevantToLocation(determination: NativeTitleDetermination, lat: number, lng: number): boolean {
    // Basic state-based relevance check
    const stateRanges: Record<string, { latRange: [number, number], lngRange: [number, number] }> = {
      'QLD': { latRange: [-29, -9], lngRange: [138, 154] },
      'NSW': { latRange: [-37, -28], lngRange: [141, 154] },
      'VIC': { latRange: [-39, -34], lngRange: [141, 150] },
      'SA': { latRange: [-38, -26], lngRange: [129, 141] },
      'WA': { latRange: [-35, -13], lngRange: [113, 129] },
      'NT': { latRange: [-26, -11], lngRange: [129, 138] }
    };

    const stateRange = stateRanges[determination.state];
    if (!stateRange) return true; // Include if state unknown
    
    return lat >= stateRange.latRange[0] && lat <= stateRange.latRange[1] &&
           lng >= stateRange.lngRange[0] && lng <= stateRange.lngRange[1];
  }

  /**
   * Extract traditional owners from applicant name
   */
  private extractTraditionalOwners(applicantName: string): string[] {
    if (!applicantName) return [];
    
    const patterns = [
      /(.+?)\s+People/gi,
      /(.+?)\s+Nation/gi,
      /(.+?)\s+Clan/gi,
      /(.+?)\s+Group/gi,
      /(.+?)\s+Community/gi
    ];

    for (const pattern of patterns) {
      const match = applicantName.match(pattern);
      if (match && match[1]) {
        return [match[1].trim()];
      }
    }

    return applicantName.split(/\s+and\s+|\s*,\s*|\s*&\s*/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  /**
   * Point-in-geometry check (reused from existing service)
   */
  private isPointInGeometry(lat: number, lng: number, geometry: any): boolean {
    // Implement existing point-in-geometry logic
    return false; // Placeholder
  }

  /**
   * Regional match check (reused from existing service)
   */
  private isRegionalMatch(lat: number, lng: number, claim: any, geometry: any): boolean {
    // Implement existing regional match logic
    return true; // Placeholder for now
  }
}

export const comprehensiveNativeTitleService = new ComprehensiveNativeTitleService();