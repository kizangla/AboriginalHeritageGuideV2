/**
 * WA DMIRS Mining Tenements Service
 * Fetches authentic mining tenement data from WA Department of Mines, Industry Regulation and Safety
 * Data source: SLIP Public Services - Industry and Mining (Layer 3: Mining Tenements)
 */

export interface MiningTenement {
  id: string;
  tenementId: string;
  type: string;
  status: string;
  surveyStatus: string;
  holderCount: number;
  holders: Array<{
    name: string;
    address: string;
  }>;
  geometry: any;
  area?: number;
}

export interface MiningTenementsResult {
  tenements: MiningTenement[];
  totalFound: number;
  bbox: string;
  source: 'wa_dmirs_arcgis';
  serviceAvailable: boolean;
}

const DMIRS_ARCGIS_URL = 'https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Industry_and_Mining/MapServer/3/query';

export async function fetchMiningTenementsForTerritory(
  lat: number,
  lng: number,
  territoryName: string,
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): Promise<MiningTenementsResult> {
  try {
    const bbox = bounds 
      ? `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`
      : `${lng - 1},${lat - 1},${lng + 1},${lat + 1}`;

    console.log(`Fetching mining tenements for ${territoryName} from WA DMIRS...`);

    let geometryParam: string;
    if (bounds) {
      geometryParam = JSON.stringify({
        xmin: bounds.minLng,
        ymin: bounds.minLat,
        xmax: bounds.maxLng,
        ymax: bounds.maxLat,
        spatialReference: { wkid: 4326 }
      });
    } else {
      geometryParam = JSON.stringify({
        x: lng,
        y: lat,
        spatialReference: { wkid: 4326 }
      });
    }

    const queryParams = new URLSearchParams({
      f: 'json',
      geometry: geometryParam,
      geometryType: bounds ? 'esriGeometryEnvelope' : 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'tenid,type,survstatus,tenstatus,holdercnt,holder1,addr1,holder2,addr2,holder3,addr3,holder4,addr4',
      returnGeometry: 'true',
      outSR: '4326',
      resultRecordCount: '100'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${DMIRS_ARCGIS_URL}?${queryParams.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Indigenous-Australia-App/1.0',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`WA DMIRS service error: ${response.status} ${response.statusText}`);
      return {
        tenements: [],
        totalFound: 0,
        bbox,
        source: 'wa_dmirs_arcgis',
        serviceAvailable: false
      };
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`WA DMIRS query error:`, data.error);
      return {
        tenements: [],
        totalFound: 0,
        bbox,
        source: 'wa_dmirs_arcgis',
        serviceAvailable: false
      };
    }

    if (!data.features || !Array.isArray(data.features)) {
      console.log(`No mining tenements found for ${territoryName}`);
      return {
        tenements: [],
        totalFound: 0,
        bbox,
        source: 'wa_dmirs_arcgis',
        serviceAvailable: true
      };
    }

    const tenements: MiningTenement[] = data.features.map((feature: any, index: number) => {
      const attrs = feature.attributes || {};

      const holders: Array<{ name: string; address: string }> = [];
      if (attrs.holder1) holders.push({ name: attrs.holder1.trim(), address: attrs.addr1?.trim() || '' });
      if (attrs.holder2) holders.push({ name: attrs.holder2.trim(), address: attrs.addr2?.trim() || '' });
      if (attrs.holder3) holders.push({ name: attrs.holder3.trim(), address: attrs.addr3?.trim() || '' });
      if (attrs.holder4) holders.push({ name: attrs.holder4.trim(), address: attrs.addr4?.trim() || '' });

      let geometry = null;
      if (feature.geometry && feature.geometry.rings) {
        geometry = {
          type: "Polygon",
          coordinates: feature.geometry.rings
        };
      }

      return {
        id: `tenement_${index}`,
        tenementId: attrs.tenid?.trim() || `TEN_${index}`,
        type: attrs.type || 'Unknown',
        status: attrs.tenstatus || 'Unknown',
        surveyStatus: attrs.survstatus || 'Unknown',
        holderCount: attrs.holdercnt || holders.length,
        holders,
        geometry
      };
    });

    console.log(`Found ${tenements.length} mining tenements for ${territoryName}`);

    return {
      tenements,
      totalFound: tenements.length,
      bbox,
      source: 'wa_dmirs_arcgis',
      serviceAvailable: true
    };

  } catch (error: any) {
    console.error('Error fetching mining tenements:', error.message);
    return {
      tenements: [],
      totalFound: 0,
      bbox: `${lng - 1},${lat - 1},${lng + 1},${lat + 1}`,
      source: 'wa_dmirs_arcgis',
      serviceAvailable: false
    };
  }
}

export async function fetchAllMiningTenements(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): Promise<MiningTenementsResult> {
  try {
    console.log(`Fetching mining tenements for map view...`);

    const geometryParam = JSON.stringify({
      xmin: bounds.minLng,
      ymin: bounds.minLat,
      xmax: bounds.maxLng,
      ymax: bounds.maxLat,
      spatialReference: { wkid: 4326 }
    });

    const queryParams = new URLSearchParams({
      f: 'json',
      geometry: geometryParam,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'tenid,type,tenstatus,holder1',
      returnGeometry: 'true',
      outSR: '4326',
      resultRecordCount: '500'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${DMIRS_ARCGIS_URL}?${queryParams.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Indigenous-Australia-App/1.0',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`WA DMIRS service error: ${response.status}`);
      return {
        tenements: [],
        totalFound: 0,
        bbox: `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`,
        source: 'wa_dmirs_arcgis',
        serviceAvailable: false
      };
    }

    const data = await response.json();

    if (data.error || !data.features) {
      return {
        tenements: [],
        totalFound: 0,
        bbox: `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`,
        source: 'wa_dmirs_arcgis',
        serviceAvailable: data.error ? false : true
      };
    }

    const tenements: MiningTenement[] = data.features.map((feature: any, index: number) => {
      const attrs = feature.attributes || {};

      let geometry = null;
      if (feature.geometry && feature.geometry.rings) {
        geometry = {
          type: "Polygon",
          coordinates: feature.geometry.rings
        };
      }

      return {
        id: `tenement_${index}`,
        tenementId: attrs.tenid?.trim() || `TEN_${index}`,
        type: attrs.type || 'Unknown',
        status: attrs.tenstatus || 'Unknown',
        surveyStatus: 'Unknown',
        holderCount: 1,
        holders: attrs.holder1 ? [{ name: attrs.holder1.trim(), address: '' }] : [],
        geometry
      };
    });

    console.log(`Fetched ${tenements.length} mining tenements for map view`);

    return {
      tenements,
      totalFound: tenements.length,
      bbox: `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`,
      source: 'wa_dmirs_arcgis',
      serviceAvailable: true
    };

  } catch (error: any) {
    console.error('Error fetching mining tenements for map:', error.message);
    return {
      tenements: [],
      totalFound: 0,
      bbox: `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`,
      source: 'wa_dmirs_arcgis',
      serviceAvailable: false
    };
  }
}
