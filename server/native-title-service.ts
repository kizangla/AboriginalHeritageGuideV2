/**
 * Native Title Data Service
 * Integrates with official Australian Government Native Title data
 */

import fetch from 'node-fetch';

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
      // Use broader search area to find overlapping Native Title applications
      const buffer = 0.5; // 0.5 degree buffer for better coverage
      const bbox = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`;
      
      const url = `${this.baseUrl}&bbox=${bbox}&srsName=EPSG:4326`;
      
      console.log(`Searching Native Title data for coordinates: ${lat}, ${lng}`);
      console.log(`Using URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Native Title API returned ${response.status}: ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log(`Found ${data.features?.length || 0} Native Title features in search area`);
      
      if (data.features && data.features.length > 0) {
        console.log('Sample feature properties:', Object.keys(data.features[0].properties || {}));
      }
      
      return data.features || [];
    } catch (error) {
      console.error('Native Title API fetch error:', error);
      return [];
    }
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