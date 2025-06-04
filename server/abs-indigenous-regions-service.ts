/**
 * ABS Indigenous Regions Service
 * Fetches authentic Indigenous Regions (IREG) data from Australian Bureau of Statistics
 */

import { dataCacheService } from './data-cache-service';

export interface ABSIndigenousRegion {
  id: string;
  regionCode: string;
  regionName: string;
  state: string;
  area: number;
  population?: number;
  geometry: any;
  originalProperties: any;
}

export interface ABSIndigenousRegionsResult {
  regions: ABSIndigenousRegion[];
  totalFound: number;
  bbox: string;
  source: 'abs_government_wfs';
}

export async function fetchABSIndigenousRegions(
  lat: number, 
  lng: number, 
  territoryName: string
): Promise<ABSIndigenousRegionsResult> {
  try {
    // Check cache first
    const cacheKey = `abs_ireg_${Math.round(lat * 10) / 10}_${Math.round(lng * 10) / 10}`;
    const cachedData = dataCacheService.getRATSIBData(lat, lng); // Reuse cache infrastructure
    if (cachedData) {
      console.log(`Using cached ABS Indigenous Regions data for ${territoryName}`);
      return cachedData as any;
    }

    // Create bounding box around area
    const bbox = `${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}`;
    
    // ABS Indigenous Regions WFS service
    const wfsUrl = 'https://geo.abs.gov.au/arcgis/services/ASGS2021/IREG/MapServer/WFSServer?request=GetFeature&service=WFS&version=2.0.0&typeName=IREG&outputFormat=application/json';
    
    console.log(`Fetching ABS Indigenous Regions for ${territoryName} from Australian Bureau of Statistics...`);
    
    const response = await fetch(wfsUrl, {
      headers: {
        'User-Agent': 'Indigenous-Australia-App/1.0',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.warn(`ABS Indigenous Regions WFS service error: ${response.status} ${response.statusText}`);
      return {
        regions: [],
        totalFound: 0,
        bbox,
        source: 'abs_government_wfs'
      };
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ABS Indigenous Regions data`);
    
    if (!data.features || !Array.isArray(data.features)) {
      console.log(`No ABS Indigenous Regions features found`);
      return {
        regions: [],
        totalFound: 0,
        bbox,
        source: 'abs_government_wfs'
      };
    }
    
    // Filter features by proximity
    const relevantFeatures = data.features.filter((feature: any) => {
      if (feature.geometry && feature.geometry.coordinates) {
        // Basic proximity check for polygons/multipolygons
        const geom = feature.geometry;
        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          // Simple bounding box intersection check
          return true; // For now, include all features
        }
      }
      return true;
    });
    
    const regions: ABSIndigenousRegion[] = relevantFeatures.map((feature: any, index: number) => {
      const props = feature.properties || {};
      
      // Debug: Log property names for first feature
      if (index === 0) {
        console.log('ABS Indigenous Regions property keys:', Object.keys(props));
        console.log('Sample ABS IREG properties:', props);
      }
      
      return {
        id: props.IREG_CODE_2021 || props.IREG_CODE || props.id || `abs_ireg_${index}`,
        regionCode: props.IREG_CODE_2021 || props.IREG_CODE || 'Unknown',
        regionName: props.IREG_NAME_2021 || props.IREG_NAME || props.name || 'Indigenous Region',
        state: props.STE_NAME_2021 || props.STE_NAME || props.state || 'Unknown',
        area: props.AREA_ALBERS_SQKM || props.area || 0,
        population: props.population || undefined,
        geometry: feature.geometry || {
          type: "Point",
          coordinates: [lng, lat]
        },
        originalProperties: props
      };
    });
    
    console.log(`Found ${regions.length} ABS Indigenous Regions for ${territoryName}`);
    
    const result: ABSIndigenousRegionsResult = {
      regions,
      totalFound: regions.length,
      bbox,
      source: 'abs_government_wfs'
    };

    // Cache the result
    dataCacheService.cacheRATSIBData(lat, lng, result as any);
    
    return result;
    
  } catch (error) {
    console.error('Error fetching ABS Indigenous Regions:', error);
    throw error;
  }
}