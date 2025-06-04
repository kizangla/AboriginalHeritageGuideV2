/**
 * RATSIB (Registered Aboriginal and Torres Strait Islander Bodies) Service
 * Fetches authentic data from Australian Government WFS service
 * Optimized with intelligent caching for improved performance
 */

import { dataCacheService } from './data-cache-service';

export interface RATSIBBoundary {
  id: string;
  name: string;
  organizationName: string;
  corporationType: string;
  registrationDate?: string;
  status: string;
  abn?: string;
  address?: string;
  contact?: string;
  legislativeAuthority?: string;
  website?: string;
  jurisdiction?: string;
  geometry: any;
  originalProperties?: any;
}

export interface RATSIBResult {
  boundaries: RATSIBBoundary[];
  totalFound: number;
  bbox: string;
  source: 'australian_government_wfs';
}

export async function fetchRATSIBBoundaries(
  lat: number, 
  lng: number, 
  territoryName: string
): Promise<RATSIBResult> {
  try {
    // Check cache first for faster loading
    const cachedData = dataCacheService.getRATSIBData(lat, lng);
    if (cachedData) {
      console.log(`Using cached RATSIB data for ${territoryName} (${cachedData.boundaries.length} boundaries)`);
      return cachedData;
    }

    // Create bounding box around territory (approximately 50km radius)
    const bbox = `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`;
    
    // Fetch authentic RATSIB data from Australian Government WFS service
    const wfsUrl = 'https://data.gov.au/geoserver/ratsib-boundaries/wfs?request=GetFeature&typeName=ckan_0d32262b_e13b_4475_adc6_3618811c029a&outputFormat=json';
    
    console.log(`Fetching RATSIB boundaries for ${territoryName} from Australian Government...`);
    
    const response = await fetch(wfsUrl, {
      headers: {
        'User-Agent': 'Indigenous-Australia-App/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.warn(`RATSIB WFS service error: ${response.status} ${response.statusText}`);
      return {
        boundaries: [],
        totalFound: 0,
        bbox,
        source: 'australian_government_wfs'
      };
    }
    
    const data = await response.json();
    console.log(`Successfully fetched RATSIB data from Australian Government`);
    
    if (!data.features || !Array.isArray(data.features)) {
      console.log(`No RATSIB features found in government data`);
      return {
        boundaries: [],
        totalFound: 0,
        bbox,
        source: 'australian_government_wfs'
      };
    }
    
    // Filter features by precise geographic coverage and service area
    const relevantFeatures = data.features.filter((feature: any) => {
      const props = feature.properties || {};
      
      // First filter by jurisdiction
      let jurisdictionMatch = false;
      if (lat >= -35 && lat <= -13 && lng >= 113 && lng <= 129) { // Western Australia
        jurisdictionMatch = props.JURIS === 'WA';
      } else if (lat >= -29 && lat <= -9 && lng >= 138 && lng <= 154) { // Queensland
        jurisdictionMatch = props.JURIS === 'QLD';
      } else if (lat >= -37 && lat <= -28 && lng >= 141 && lng <= 154) { // New South Wales
        jurisdictionMatch = props.JURIS === 'NSW';
      } else if (lat >= -39 && lat <= -34 && lng >= 141 && lng <= 150) { // Victoria
        jurisdictionMatch = props.JURIS === 'VIC';
      } else if (lat >= -38 && lat <= -26 && lng >= 129 && lng <= 141) { // South Australia
        jurisdictionMatch = props.JURIS === 'SA';
      } else if (lat >= -43 && lat <= -39 && lng >= 144 && lng <= 149) { // Tasmania
        jurisdictionMatch = props.JURIS === 'TAS';
      } else if (lat >= -26 && lat <= -10 && lng >= 129 && lng <= 138) { // Northern Territory
        jurisdictionMatch = props.JURIS === 'NT';
      }
      
      if (!jurisdictionMatch) return false;
      
      // Enhanced geographic filtering based on service area coverage
      if (feature.geometry && feature.geometry.coordinates) {
        try {
          const geometry = feature.geometry;
          
          // Check if point is within service area polygon
          if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
            return isPointInGeometry(lat, lng, geometry);
          }
          
          // For point geometries, use proximity with smaller radius for precision
          if (geometry.type === 'Point') {
            const [fLng, fLat] = geometry.coordinates;
            const distance = Math.sqrt(Math.pow(fLat - lat, 2) + Math.pow(fLng - lng, 2));
            return distance <= 0.5; // Within approximately 50km for more precision
          }
        } catch (error) {
          // Fallback to name-based regional matching for WA specific areas
          if (props.JURIS === 'WA') {
            const serviceName = (props.NAME || '').toLowerCase();
            const orgName = (props.ORG || '').toLowerCase();
            
            // For Malpa territory (Goldfields region), match specific services
            if (lat < -29 && lng > 119) { // Goldfields/Southern WA region
              return serviceName.includes('goldfields') || 
                     serviceName.includes('central desert') ||
                     orgName.includes('goldfields') || 
                     orgName.includes('central desert');
            }
          }
          return false;
        }
      }
      
      return false;
    });
    
    const boundaries: RATSIBBoundary[] = relevantFeatures.map((feature: any, index: number) => {
      const props = feature.properties || {};
      
      // Debug: Log actual property names from government dataset
      if (index === 0) {
        console.log('RATSIB property keys from Australian Government:', Object.keys(props));
        console.log('Sample RATSIB properties:', props);
      }
      
      return {
        id: props.ID || props.id || `ratsib_${index}`,
        name: props.NAME || props.name || 'Aboriginal Territory',
        organizationName: props.ORG || props.org || 'Aboriginal Organization',
        corporationType: props.RATSIBTYPE || props.ratsibtype || 'Aboriginal Corporation',
        registrationDate: props.DT_EXTRACT || props.dt_extract,
        status: props.COMMENTS || props.comments || 'Active',
        abn: props.abn || props.australian_business_number,
        address: props.address || props.postal_address || props.street_address,
        contact: props.contact || props.phone || props.email,
        legislativeAuthority: props.LEGISAUTH || props.legisauth,
        website: props.RATSIBLINK || props.ratsiblink,
        jurisdiction: props.JURIS || props.juris,
        geometry: feature.geometry || {
          type: "Point",
          coordinates: [lng, lat] // Fallback to territory center
        },
        originalProperties: props // Preserve all original fields from government dataset
      };
    });
    
    console.log(`Found ${boundaries.length} RATSIB boundaries for ${territoryName}`);
    
    const result: RATSIBResult = {
      boundaries,
      totalFound: boundaries.length,
      bbox,
      source: 'australian_government_wfs'
    };

    // Cache the result for faster future loading
    dataCacheService.cacheRATSIBData(lat, lng, result);
    
    return result;
    
  } catch (error) {
    console.error('Error fetching RATSIB boundaries:', error);
    throw error;
  }
}

function processORICRecords(records: any[], territoryName: string, lat: number, lng: number): RATSIBResult {
  const boundaries: RATSIBBoundary[] = records.map((record: any, index: number) => ({
    id: record._id || record.id || `oric_${index}`,
    name: record.organisation_name || record.corp_name || record.name || 'Aboriginal Corporation',
    organizationName: record.organisation_name || record.corp_name || record.name || 'Unknown Organization',
    corporationType: record.corporation_type || record.corp_type || 'Aboriginal Corporation',
    registrationDate: record.registration_date || record.date_registered,
    status: record.status || record.corp_status || 'Active',
    abn: record.abn || record.australian_business_number,
    address: record.address || record.postal_address,
    contact: record.contact || record.phone,
    geometry: {
      type: "Point",
      coordinates: [lng, lat] // Use territory coordinates as fallback
    }
  }));
  
  return {
    boundaries,
    totalFound: boundaries.length,
    bbox: `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`,
    source: 'australian_government_wfs'
  };
}

function processORICCorporations(corporations: any[], territoryName: string, lat: number, lng: number): RATSIBResult {
  const boundaries: RATSIBBoundary[] = corporations.map((corp: any, index: number) => ({
    id: corp.icn || corp.id || `corp_${index}`,
    name: corp.name || 'Aboriginal Corporation',
    organizationName: corp.name || 'Unknown Organization',
    corporationType: corp.type || 'Aboriginal Corporation',
    registrationDate: corp.registrationDate,
    status: corp.status || 'Active',
    abn: corp.abn,
    address: corp.address,
    contact: corp.contact,
    geometry: {
      type: "Point",
      coordinates: [lng, lat] // Use territory coordinates as fallback
    }
  }));
  
  return {
    boundaries,
    totalFound: boundaries.length,
    bbox: `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`,
    source: 'australian_government_wfs'
  };
}

/**
 * Check if a point is within a geometric polygon
 */
function isPointInGeometry(lat: number, lng: number, geometry: any): boolean {
  try {
    if (geometry.type === 'Polygon') {
      return isPointInPolygon(lat, lng, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.some((polygon: any) => 
        isPointInPolygon(lat, lng, polygon[0])
      );
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Ray casting algorithm to determine if point is inside polygon
 */
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  const x = lng;
  const y = lat;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}