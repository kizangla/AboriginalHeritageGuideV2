/**
 * RATSIB (Registered Aboriginal and Torres Strait Islander Bodies) Service
 * Fetches authentic data from Australian Government WFS service
 */

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
  geometry: any;
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
    
    // Filter features by proximity to territory coordinates
    const relevantFeatures = data.features.filter((feature: any) => {
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = feature.geometry.coordinates;
        if (feature.geometry.type === 'Point') {
          const [fLng, fLat] = coords;
          const distance = Math.sqrt(Math.pow(fLat - lat, 2) + Math.pow(fLng - lng, 2));
          return distance <= 1.0; // Within approximately 100km
        }
      }
      return true; // Include features without coordinates for processing
    });
    
    const boundaries: RATSIBBoundary[] = relevantFeatures.map((feature: any, index: number) => {
      const props = feature.properties || {};
      
      return {
        id: props.id || props.objectid || props.icn || `ratsib_${index}`,
        name: props.name || props.organisation_name || props.corp_name || 'Aboriginal Corporation',
        organizationName: props.organisation_name || props.corp_name || props.name || 'Unknown Organization',
        corporationType: props.corporation_type || props.type || props.corp_type || 'Aboriginal Corporation',
        registrationDate: props.registration_date || props.reg_date || props.date_registered,
        status: props.status || props.corp_status || 'Active',
        abn: props.abn || props.australian_business_number,
        address: props.address || props.postal_address || props.street_address,
        contact: props.contact || props.phone || props.email,
        geometry: feature.geometry || {
          type: "Point",
          coordinates: [lng, lat] // Fallback to territory center
        }
      };
    });
    
    console.log(`Found ${boundaries.length} RATSIB boundaries for ${territoryName}`);
    
    return {
      boundaries,
      totalFound: boundaries.length,
      bbox,
      source: 'australian_government_wfs'
    };
    
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