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
    
    // Australian Government RATSIB WFS endpoint
    const wfsUrl = `https://data.gov.au/geoserver/ratsib-boundaries/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=ratsib-boundaries:ratsib-boundaries&outputFormat=application/json&bbox=${bbox}`;
    
    console.log(`Fetching RATSIB boundaries for ${territoryName} at ${lat}, ${lng}`);
    console.log(`WFS URL: ${wfsUrl}`);
    
    const response = await fetch(wfsUrl, {
      headers: {
        'User-Agent': 'Indigenous-Australia-App/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.warn(`RATSIB WFS service error: ${response.status} ${response.statusText}`);
      // Try alternative endpoint format
      const altUrl = `https://data.gov.au/data/api/3/action/datastore_search?resource_id=ratsib-boundaries&q=${territoryName}`;
      console.log(`Trying alternative CKAN API: ${altUrl}`);
      
      const altResponse = await fetch(altUrl);
      if (!altResponse.ok) {
        throw new Error(`Both WFS and CKAN APIs failed: ${response.status}, ${altResponse.status}`);
      }
      
      const altData = await altResponse.json();
      return processAlternativeRATSIBData(altData, territoryName);
    }
    
    const data = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      console.log(`No RATSIB boundaries found for ${territoryName}`);
      return {
        boundaries: [],
        totalFound: 0,
        bbox,
        source: 'australian_government_wfs'
      };
    }
    
    const boundaries: RATSIBBoundary[] = data.features.map((feature: any, index: number) => {
      const props = feature.properties || {};
      
      return {
        id: props.id || props.objectid || `ratsib_${index}`,
        name: props.name || props.organisation_name || props.corp_name || 'Aboriginal Corporation',
        organizationName: props.organisation_name || props.corp_name || props.name || 'Unknown Organization',
        corporationType: props.corporation_type || props.type || props.corp_type || 'Aboriginal Corporation',
        registrationDate: props.registration_date || props.reg_date || props.date_registered,
        status: props.status || props.corp_status || 'Active',
        abn: props.abn || props.australian_business_number,
        address: props.address || props.postal_address || props.street_address,
        contact: props.contact || props.phone || props.email,
        geometry: feature.geometry
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

function processAlternativeRATSIBData(data: any, territoryName: string): RATSIBResult {
  const records = data.result?.records || [];
  
  const boundaries: RATSIBBoundary[] = records.map((record: any, index: number) => ({
    id: record._id || `ratsib_alt_${index}`,
    name: record.organisation_name || record.name || 'Aboriginal Corporation',
    organizationName: record.organisation_name || record.name || 'Unknown Organization',
    corporationType: record.corporation_type || 'Aboriginal Corporation',
    registrationDate: record.registration_date,
    status: record.status || 'Active',
    abn: record.abn,
    address: record.address,
    contact: record.contact,
    geometry: null // Alternative API may not have geometry
  }));
  
  return {
    boundaries,
    totalFound: boundaries.length,
    bbox: 'alternative_api',
    source: 'australian_government_wfs'
  };
}