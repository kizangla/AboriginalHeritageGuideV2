/**
 * AIATSIS Indigenous Language Boundaries Service
 * Fetches authentic language group data from Australian Institute of Aboriginal and Torres Strait Islander Studies
 */

import { dataCacheService } from './data-cache-service';

export interface AIATSISLanguageGroup {
  id: string;
  languageName: string;
  languageCode: string;
  alternativeNames: string[];
  languageFamily: string;
  state: string;
  status: string;
  speakers: number | null;
  geometry: any;
  originalProperties: any;
}

export interface AIATSISLanguageResult {
  languageGroups: AIATSISLanguageGroup[];
  totalFound: number;
  bbox: string;
  source: 'aiatsis_government_wfs';
}

export async function fetchAIATSISLanguageBoundaries(
  lat: number, 
  lng: number, 
  territoryName: string
): Promise<AIATSISLanguageResult> {
  try {
    // Check cache first
    const cacheKey = `aiatsis_lang_${Math.round(lat * 10) / 10}_${Math.round(lng * 10) / 10}`;
    const cachedData = dataCacheService.getRATSIBData(lat, lng);
    if (cachedData && (cachedData as any).source === 'aiatsis_government_wfs') {
      console.log(`Using cached AIATSIS Language data for ${territoryName}`);
      return cachedData as any;
    }

    // Create bounding box around area
    const bbox = `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`;
    
    // AIATSIS Language Groups WFS service
    const wfsUrl = 'https://data.gov.au/geoserver/aiatsis-language-groups/wfs?request=GetFeature&typeName=ckan_aiatsis_language_groups&outputFormat=application/json';
    
    console.log(`Fetching AIATSIS Language Boundaries for ${territoryName} from AIATSIS...`);
    
    const response = await fetch(wfsUrl, {
      headers: {
        'User-Agent': 'Indigenous-Australia-App/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.warn(`AIATSIS Language WFS service error: ${response.status} ${response.statusText}`);
      return {
        languageGroups: [],
        totalFound: 0,
        bbox,
        source: 'aiatsis_government_wfs'
      };
    }
    
    const data = await response.json();
    console.log(`Successfully fetched AIATSIS Language data`);
    
    if (!data.features || !Array.isArray(data.features)) {
      console.log(`No AIATSIS Language features found`);
      return {
        languageGroups: [],
        totalFound: 0,
        bbox,
        source: 'aiatsis_government_wfs'
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
        // For polygons, include all for now (more complex intersection would be needed)
        return true;
      }
      return true;
    });
    
    const languageGroups: AIATSISLanguageGroup[] = relevantFeatures.map((feature: any, index: number) => {
      const props = feature.properties || {};
      
      // Debug: Log property names for first feature
      if (index === 0) {
        console.log('AIATSIS Language property keys:', Object.keys(props));
        console.log('Sample AIATSIS Language properties:', props);
      }
      
      return {
        id: props.language_code || props.id || `aiatsis_lang_${index}`,
        languageName: props.language_name || props.name || 'Indigenous Language',
        languageCode: props.language_code || props.code || 'Unknown',
        alternativeNames: props.alternative_names ? props.alternative_names.split(';') : [],
        languageFamily: props.language_family || props.family || 'Unknown Family',
        state: props.state || props.jurisdiction || 'Unknown',
        status: props.status || props.vitality || 'Unknown',
        speakers: props.speakers ? parseInt(props.speakers) : null,
        geometry: feature.geometry || {
          type: "Point",
          coordinates: [lng, lat]
        },
        originalProperties: props
      };
    });
    
    console.log(`Found ${languageGroups.length} AIATSIS Language Groups for ${territoryName}`);
    
    const result: AIATSISLanguageResult = {
      languageGroups,
      totalFound: languageGroups.length,
      bbox,
      source: 'aiatsis_government_wfs'
    };

    // Cache the result
    dataCacheService.cacheRATSIBData(lat, lng, result as any);
    
    return result;
    
  } catch (error) {
    console.error('Error fetching AIATSIS Language Boundaries:', error);
    throw error;
  }
}