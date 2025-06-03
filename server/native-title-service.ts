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
      console.log(`Processing ${allClaims.length} Native Title claims for geographic matching`);
      
      // Find claims that geographically intersect with the territory
      const matchingClaims = allClaims.filter(claim => {
        if (!claim.geometry) return false;
        
        try {
          const geometry = typeof claim.geometry === 'string' ? JSON.parse(claim.geometry) : claim.geometry;
          return this.isPointInGeometry(lat, lng, geometry);
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
   * Check if a point is within a GeoJSON geometry using basic polygon intersection
   */
  private isPointInGeometry(lat: number, lng: number, geometry: any): boolean {
    if (!geometry || !geometry.type) return false;
    
    try {
      if (geometry.type === 'Point') {
        const [geoLng, geoLat] = geometry.coordinates;
        const distance = Math.sqrt(Math.pow(lat - geoLat, 2) + Math.pow(lng - geoLng, 2));
        return distance < 0.5; // Within 0.5 degrees
      }
      
      if (geometry.type === 'Polygon') {
        return this.isPointInPolygon(lat, lng, geometry.coordinates[0]);
      }
      
      if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((polygon: any) => 
          this.isPointInPolygon(lat, lng, polygon[0])
        );
      }
      
      // For other geometry types, use bounding box check
      if (geometry.coordinates) {
        return this.isPointInBoundingBox(lat, lng, geometry.coordinates);
      }
      
      return false;
    } catch (error) {
      console.warn('Geometry intersection error:', error);
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
    
    return {
      applicationId: props.Application_ID || '',
      tribunalNumber: props.Tribunal_Number || '',
      applicantName: props.Applicant_Name || 'Unknown',
      status: props.Status || 'Unknown',
      determinationDate: props.Determination_Date,
      area: props.Area_sqkm || 0,
      state: props.State || '',
      outcome: props.Outcome,
      traditionalOwners: this.extractTraditionalOwners(props.Applicant_Name),
      coordinates: coords
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
      if (match) {
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