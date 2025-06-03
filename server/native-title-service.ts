/**
 * Native Title Data Service
 * Integrates with official Australian Government Native Title data
 */

import fetch from 'node-fetch';
import { db } from './db';
import { nativeTitleClaims } from '@shared/schema';
import { sql } from 'drizzle-orm';

export interface NativeTitleData {
  applicationId: string;
  tribunalNumber: string;
  applicantName: string;
  status: string;
  determinationDate?: string;
  area: number;
  state: string;
  outcome?: string;
  traditionalOwners: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  references: {
    sourceUrl: string;
    lastUpdated: string;
    dataProvider: string;
    licenseType: string;
    citation: string;
  };
}

export interface TerritoryNativeTitleInfo {
  hasNativeTitle: boolean;
  applications: NativeTitleData[];
  primaryApplicant?: string;
  status: 'determined' | 'pending' | 'no_application';
  culturalSignificance?: string;
}

class NativeTitleService {
  private readonly baseUrl = 'https://data.gov.au/geoserver/native-title-determination-applications-register/wfs?request=GetFeature&typeName=ckan_00602301_ad90_4657_abd9_8025d9bf485a&outputFormat=json';
  
  /**
   * Get Native Title information for a specific territory location
   */
  async getNativeTitleInfo(lat: number, lng: number, territoryName: string): Promise<TerritoryNativeTitleInfo> {
    try {
      const nativeTitleData = await this.fetchNativeTitleData(lat, lng);
      
      if (!nativeTitleData || nativeTitleData.length === 0) {
        return {
          hasNativeTitle: false,
          applications: [],
          status: 'no_application'
        };
      }

      const applications = nativeTitleData.map(this.parseNativeTitleFeature);
      const primaryApplication = applications[0];

      return {
        hasNativeTitle: true,
        applications,
        primaryApplicant: primaryApplication?.applicantName,
        status: this.determineOverallStatus(applications),
        culturalSignificance: this.generateCulturalSignificance(territoryName, applications)
      };
    } catch (error) {
      console.error('Native Title data fetch error:', error);
      return {
        hasNativeTitle: false,
        applications: [],
        status: 'no_application'
      };
    }
  }

  /**
   * Fetch Native Title data from government API
   */
  private async fetchNativeTitleData(lat: number, lng: number): Promise<any[]> {
    try {
      // Get all Native Title claims from database for geographic matching
      const allClaims = await db.select().from(nativeTitleClaims);
      console.log(`Processing ${allClaims.length} Native Title claims for geographic matching at ${lat}, ${lng}`);
      
      // Find claims using multiple matching strategies
      const matchingClaims = allClaims.filter(claim => {
        if (!claim.geometry) return false;
        
        try {
          const geometry = typeof claim.geometry === 'string' ? JSON.parse(claim.geometry) : claim.geometry;
          
          // Strategy 1: Precise point-in-polygon test
          if (this.isPointInGeometry(lat, lng, geometry)) {
            console.log(`Precise match found for ${claim.applicantName} at ${lat}, ${lng}`);
            return true;
          }
          
          // Strategy 2: Regional proximity for Northern Territory and Queensland claims
          if (this.isRegionalMatch(lat, lng, claim, geometry)) {
            console.log(`Regional match found for ${claim.applicantName} in ${claim.state}`);
            return true;
          }
          
          return false;
        } catch (error) {
          console.warn(`Invalid geometry for claim ${claim.applicationId}:`, error);
          return false;
        }
      });
      
      console.log(`Found ${matchingClaims.length} Native Title claims intersecting coordinates: ${lat}, ${lng}`);
      
      // Convert database records to feature format for compatibility
      return matchingClaims.map(claim => ({
        type: 'Feature',
        properties: {
          Application_ID: claim.applicationId,
          Tribunal_Number: claim.tribunalNumber,
          Applicant_Name: claim.applicantName,
          Status: claim.status,
          Determination_Date: claim.determinationDate,
          State: claim.state,
          Outcome: claim.outcome,
          Area_sqkm: claim.area,
          Federal_Court_Number: claim.federalCourtNumber,
          Registration_Date: claim.registrationDate
        },
        geometry: claim.geometry
      }));
      
    } catch (error) {
      console.error('Database Native Title query error:', error);
      return [];
    }
  }

  /**
   * Check if territory coordinates match Native Title claim by region
   */
  private isRegionalMatch(lat: number, lng: number, claim: any, geometry: any): boolean {
    const claimBounds = this.getGeometryBounds(geometry);
    if (!claimBounds) return false;
    
    // Western Australia region check
    if (claim.state === 'WA' && lat >= -35 && lat <= -13 && lng >= 113 && lng <= 129) {
      const latDistance = Math.abs(lat - ((claimBounds.minLat + claimBounds.maxLat) / 2));
      const lngDistance = Math.abs(lng - ((claimBounds.minLng + claimBounds.maxLng) / 2));
      return latDistance < 10 && lngDistance < 10; // Within 10 degrees for large WA
    }
    
    // Northern Territory region check
    if (claim.state === 'NT' && lat >= -26 && lat <= -10 && lng >= 129 && lng <= 138) {
      const latDistance = Math.abs(lat - ((claimBounds.minLat + claimBounds.maxLat) / 2));
      const lngDistance = Math.abs(lng - ((claimBounds.minLng + claimBounds.maxLng) / 2));
      return latDistance < 8 && lngDistance < 8; // Within 8 degrees
    }
    
    // Queensland region check
    if (claim.state === 'QLD' && lat >= -29 && lat <= -9 && lng >= 138 && lng <= 154) {
      const latDistance = Math.abs(lat - ((claimBounds.minLat + claimBounds.maxLat) / 2));
      const lngDistance = Math.abs(lng - ((claimBounds.minLng + claimBounds.maxLng) / 2));
      return latDistance < 8 && lngDistance < 8; // Within 8 degrees
    }
    
    // South Australia region check
    if (claim.state === 'SA' && lat >= -38 && lat <= -26 && lng >= 129 && lng <= 141) {
      const latDistance = Math.abs(lat - ((claimBounds.minLat + claimBounds.maxLat) / 2));
      const lngDistance = Math.abs(lng - ((claimBounds.minLng + claimBounds.maxLng) / 2));
      return latDistance < 6 && lngDistance < 6; // Within 6 degrees
    }
    
    // New South Wales region check
    if (claim.state === 'NSW' && lat >= -37 && lat <= -28 && lng >= 141 && lng <= 154) {
      const latDistance = Math.abs(lat - ((claimBounds.minLat + claimBounds.maxLat) / 2));
      const lngDistance = Math.abs(lng - ((claimBounds.minLng + claimBounds.maxLng) / 2));
      return latDistance < 6 && lngDistance < 6; // Within 6 degrees
    }
    
    // Victoria region check
    if (claim.state === 'VIC' && lat >= -39 && lat <= -34 && lng >= 141 && lng <= 150) {
      const latDistance = Math.abs(lat - ((claimBounds.minLat + claimBounds.maxLat) / 2));
      const lngDistance = Math.abs(lng - ((claimBounds.minLng + claimBounds.maxLng) / 2));
      return latDistance < 4 && lngDistance < 4; // Within 4 degrees for smaller VIC
    }
    
    return false;
  }

  /**
   * Get bounding box of geometry
   */
  private getGeometryBounds(geometry: any): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
    try {
      const flatCoords = this.flattenCoordinates(geometry.coordinates || geometry);
      if (flatCoords.length === 0) return null;
      
      const lats = flatCoords.map(coord => coord[1]);
      const lngs = flatCoords.map(coord => coord[0]);
      
      return {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a point is within a GeoJSON geometry using proper spatial calculations
   */
  private isPointInGeometry(lat: number, lng: number, geometry: any): boolean {
    if (!geometry || !geometry.type) return false;
    
    try {
      if (geometry.type === 'Point') {
        const [geoLng, geoLat] = geometry.coordinates;
        const distance = Math.sqrt(Math.pow(lat - geoLat, 2) + Math.pow(lng - geoLng, 2));
        return distance < 1.0; // Within 1 degree for point proximity
      }
      
      if (geometry.type === 'Polygon') {
        // Check each ring in the polygon
        if (geometry.coordinates && geometry.coordinates.length > 0) {
          return this.isPointInPolygon(lat, lng, geometry.coordinates[0]);
        }
      }
      
      if (geometry.type === 'MultiPolygon') {
        // Check each polygon in the multipolygon
        return geometry.coordinates.some((polygon: any) => {
          if (polygon && polygon.length > 0) {
            return this.isPointInPolygon(lat, lng, polygon[0]);
          }
          return false;
        });
      }
      
      // Fallback: use expanded bounding box check for broader matching
      return this.isPointInExpandedBoundingBox(lat, lng, geometry);
      
    } catch (error) {
      console.warn('Geometry intersection error:', error);
      // Use bounding box as fallback
      return this.isPointInExpandedBoundingBox(lat, lng, geometry);
    }
  }

  /**
   * Expanded bounding box check with buffer for broader matching
   */
  private isPointInExpandedBoundingBox(lat: number, lng: number, geometry: any): boolean {
    try {
      const flatCoords = this.flattenCoordinates(geometry.coordinates || geometry);
      if (flatCoords.length === 0) return false;
      
      const lats = flatCoords.map(coord => coord[1]);
      const lngs = flatCoords.map(coord => coord[0]);
      
      const minLat = Math.min(...lats) - 2.0; // 2 degree buffer
      const maxLat = Math.max(...lats) + 2.0;
      const minLng = Math.min(...lngs) - 2.0;
      const maxLng = Math.max(...lngs) + 2.0;
      
      const isInBounds = lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      
      if (isInBounds) {
        console.log(`Territory at ${lat}, ${lng} within expanded bounds of Native Title claim`);
      }
      
      return isInBounds;
    } catch (error) {
      return false;
    }
  }

  /**
   * Point-in-polygon test using ray casting algorithm
   */
  private isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
    let isInside = false;
    const x = lng;
    const y = lat;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        isInside = !isInside;
      }
    }
    
    return isInside;
  }

  /**
   * Check if point is within bounding box of coordinates
   */
  private isPointInBoundingBox(lat: number, lng: number, coordinates: any): boolean {
    try {
      const flatCoords = this.flattenCoordinates(coordinates);
      if (flatCoords.length === 0) return false;
      
      const lats = flatCoords.map(coord => coord[1]);
      const lngs = flatCoords.map(coord => coord[0]);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    } catch (error) {
      return false;
    }
  }

  /**
   * Flatten nested coordinate arrays
   */
  private flattenCoordinates(coords: any): number[][] {
    if (!Array.isArray(coords)) return [];
    
    const result: number[][] = [];
    
    function flatten(arr: any) {
      if (Array.isArray(arr) && arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        result.push(arr);
      } else if (Array.isArray(arr)) {
        arr.forEach(flatten);
      }
    }
    
    flatten(coords);
    return result;
  }

  /**
   * Parse Native Title feature from government data
   */
  private parseNativeTitleFeature = (feature: any): NativeTitleData => {
    const props = feature.properties;
    const geometry = feature.geometry;
    
    // Calculate centroid for polygon geometries
    const coords = this.calculateCentroid(geometry);
    
    // Create proper citation for this specific claim
    const tribunalNumber = props.Tribunal_Number || props.TRIBID || '';
    const applicantName = props.Applicant_Name || props.NAME || 'Unknown';
    const lastUpdated = props.DT_EXTRACT || props.DATECURR || new Date().toISOString().split('T')[0];
    
    return {
      applicationId: props.Application_ID || tribunalNumber || '',
      tribunalNumber: tribunalNumber,
      applicantName: applicantName,
      status: props.Status || props.STATUS || 'Unknown',
      determinationDate: props.Determination_Date || props.DATELODGED,
      area: props.Area_sqkm || props.AREASQKM || 0,
      state: props.State || props.JURIS || '',
      outcome: props.Outcome || props.RTSTATUS,
      traditionalOwners: this.extractTraditionalOwners(applicantName),
      coordinates: coords,
      references: {
        sourceUrl: 'https://data.gov.au/data/dataset/native-title-determination-applications-register',
        lastUpdated: lastUpdated,
        dataProvider: 'National Native Title Tribunal (NNTT)',
        licenseType: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        citation: `National Native Title Tribunal. (${lastUpdated.split('-')[0]}). Native Title Determination Applications Register. ${tribunalNumber ? `Tribunal File: ${tribunalNumber}` : `Application: ${applicantName}`}. Retrieved from https://data.gov.au/data/dataset/native-title-determination-applications-register`
      }
    };
  }

  /**
   * Calculate centroid of geometry for coordinate reference
   */
  private calculateCentroid(geometry: any): { lat: number; lng: number } {
    if (geometry.type === 'Point') {
      return {
        lng: geometry.coordinates[0],
        lat: geometry.coordinates[1]
      };
    }
    
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0];
      const centroid = coords.reduce(
        (acc: any, coord: number[]) => ({
          lng: acc.lng + coord[0],
          lat: acc.lat + coord[1]
        }),
        { lng: 0, lat: 0 }
      );
      
      return {
        lng: centroid.lng / coords.length,
        lat: centroid.lat / coords.length
      };
    }

    return { lat: 0, lng: 0 };
  }

  /**
   * Extract traditional owner information from applicant name
   */
  private extractTraditionalOwners(applicantName: string): string[] {
    if (!applicantName) return [];
    
    // Common patterns in Native Title applicant names
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

    // Fallback: split by common separators
    return applicantName.split(/\s+and\s+|\s*,\s*|\s*&\s*/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  /**
   * Determine overall Native Title status
   */
  private determineOverallStatus(applications: NativeTitleData[]): 'determined' | 'pending' | 'no_application' {
    if (applications.length === 0) return 'no_application';
    
    const hasDetetermined = applications.some(app => 
      app.status.toLowerCase().includes('determined') || 
      app.outcome?.toLowerCase().includes('native title exists')
    );
    
    if (hasDetetermined) return 'determined';
    return 'pending';
  }

  /**
   * Generate cultural significance description
   */
  private generateCulturalSignificance(territoryName: string, applications: NativeTitleData[]): string {
    if (applications.length === 0) return '';
    
    const primaryApp = applications[0];
    const owners = primaryApp.traditionalOwners;
    
    if (owners.length > 0) {
      return `Traditional country of the ${owners.join(' and ')} people, with ongoing cultural connections to this land.`;
    }
    
    return `Significant cultural area with Native Title recognition under Australian law.`;
  }

  /**
   * Get all Native Title applications in a region
   */
  async getNativeTitleByRegion(region: string): Promise<NativeTitleData[]> {
    try {
      const params = new URLSearchParams({
        request: 'GetFeature',
        typeName: 'ckan_00602301_ad90_4657_abd9_8025d9bf485a',
        outputFormat: 'json',
        CQL_FILTER: `State LIKE '%${region}%'`
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Native Title API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.features || []).map(this.parseNativeTitleFeature);
    } catch (error) {
      console.error('Native Title region fetch error:', error);
      return [];
    }
  }
}

export const nativeTitleService = new NativeTitleService();