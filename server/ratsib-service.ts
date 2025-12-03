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
    
    // Fetch authentic RATSIB data from NNTT ArcGIS Feature Service (more reliable than data.gov.au WFS)
    // Layer 9 = RATSIB Areas in the NNTT Custodial AGOL service
    const arcgisUrl = 'https://services2.arcgis.com/rzk7fNEt0xoEp3cX/arcgis/rest/services/NNTT_Custodial_AGOL/FeatureServer/9/query';
    
    // Create a spatial filter using the territory coordinates
    const geometryParam = JSON.stringify({
      x: lng,
      y: lat,
      spatialReference: { wkid: 4326 }
    });
    
    const queryParams = new URLSearchParams({
      f: 'json',
      geometry: geometryParam,
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326'
    });
    
    console.log(`Fetching RATSIB boundaries for ${territoryName} from NNTT ArcGIS service...`);
    
    const response = await fetch(`${arcgisUrl}?${queryParams.toString()}`, {
      headers: {
        'User-Agent': 'Indigenous-Australia-App/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.warn(`RATSIB ArcGIS service error: ${response.status} ${response.statusText}`);
      return {
        boundaries: [],
        totalFound: 0,
        bbox,
        source: 'australian_government_wfs'
      };
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.warn(`RATSIB ArcGIS query error:`, data.error);
      return {
        boundaries: [],
        totalFound: 0,
        bbox,
        source: 'australian_government_wfs'
      };
    }
    
    console.log(`Successfully fetched RATSIB data from NNTT ArcGIS service`);
    
    if (!data.features || !Array.isArray(data.features)) {
      console.log(`No RATSIB features found in NNTT data`);
      return {
        boundaries: [],
        totalFound: 0,
        bbox,
        source: 'australian_government_wfs'
      };
    }
    
    // ArcGIS returns features with spatial intersection already applied
    // The spatial query already filtered to only include features that intersect the point
    const relevantFeatures = data.features;
    
    // Map ArcGIS feature format to our boundary format
    const boundaries: RATSIBBoundary[] = relevantFeatures.map((feature: any, index: number) => {
      const attrs = feature.attributes || {};
      
      // Debug: Log actual property names from NNTT ArcGIS service
      if (index === 0) {
        console.log('RATSIB fields from NNTT ArcGIS:', Object.keys(attrs));
        console.log('Sample RATSIB attributes:', attrs);
      }
      
      // Convert ArcGIS rings format to GeoJSON format if needed
      let geometry = {
        type: "Point" as const,
        coordinates: [lng, lat]
      };
      
      if (feature.geometry && feature.geometry.rings) {
        geometry = {
          type: "Polygon" as any,
          coordinates: feature.geometry.rings
        };
      }
      
      return {
        id: attrs.ID?.toString() || attrs.OBJECTID?.toString() || `ratsib_${index}`,
        name: attrs.Name || attrs.Organisation || 'RATSIB Area',
        organizationName: attrs.Organisation || 'Aboriginal Organization',
        corporationType: attrs.RATSIB_Type || 'Representative Body',
        registrationDate: attrs.Date_Extracted ? new Date(attrs.Date_Extracted).toISOString() : undefined,
        status: 'Active',
        abn: undefined,
        address: undefined,
        contact: undefined,
        legislativeAuthority: attrs.Legislative_Authority || undefined,
        website: attrs.RATSIB_Link || undefined,
        jurisdiction: attrs.Jurisdiction || undefined,
        geometry,
        originalProperties: attrs
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