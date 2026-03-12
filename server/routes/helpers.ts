// Australian postcode coordinate lookup for business positioning
export function getPostcodeCoordinates(postcode: string, stateCode: string): { lat: number; lng: number } | null {
  const postcodeMap: { [key: string]: { lat: number; lng: number } } = {
    // Major Australian cities and postcodes
    '2000': { lat: -33.8688, lng: 151.2093 }, // Sydney CBD
    '3000': { lat: -37.8136, lng: 144.9631 }, // Melbourne CBD
    '4000': { lat: -27.4698, lng: 153.0251 }, // Brisbane CBD
    '5000': { lat: -34.9285, lng: 138.6007 }, // Adelaide CBD
    '6000': { lat: -31.9505, lng: 115.8605 }, // Perth CBD
    '7000': { lat: -42.8821, lng: 147.3272 }, // Hobart CBD
    '0800': { lat: -12.4634, lng: 130.8456 }, // Darwin CBD
    '2600': { lat: -35.2809, lng: 149.1300 }, // Canberra CBD

    // WA postcodes
    '6714': { lat: -20.7403, lng: 116.8469 }, // Karratha area
    '6160': { lat: -32.0569, lng: 115.7975 }, // Fremantle
    '6050': { lat: -31.9354, lng: 115.8072 }, // Mount Lawley
    '6100': { lat: -32.0569, lng: 115.7975 }, // Fremantle area
    '6035': { lat: -31.8857, lng: 115.8042 }, // Osborne Park area

    // NSW postcodes
    '2150': { lat: -33.8096, lng: 151.0189 }, // Parramatta
    '2170': { lat: -33.9297, lng: 150.8671 }, // Liverpool
    '2176': { lat: -33.9239, lng: 150.8446 }, // Warwick Farm
    '2179': { lat: -33.9406, lng: 150.8694 }, // Holsworthy
    '2195': { lat: -33.9481, lng: 151.1419 }, // Revesby
    '2060': { lat: -33.8365, lng: 151.2008 }, // North Sydney

    // QLD postcodes
    '4223': { lat: -27.9285, lng: 153.3479 }, // Currumbin
    '4101': { lat: -27.4833, lng: 153.0167 }, // South Brisbane

    // NT postcodes
    '0820': { lat: -12.4381, lng: 130.8411 }, // Nightcliff

    // SA postcodes
    '5038': { lat: -35.0297, lng: 138.5653 }, // Edwardstown
    '5039': { lat: -35.0297, lng: 138.5653 }, // Morphettville

    // VIC postcodes
    '3124': { lat: -37.8477, lng: 145.0806 }, // Camberwell
    '3500': { lat: -36.3615, lng: 144.9547 }  // Bendigo
  };

  return postcodeMap[postcode] || null;
}

// Helper to extract bounds from territory GeoJSON geometry
export function getTerritoryBounds(territory: any): { north: number; south: number; east: number; west: number } {
  try {
    let coords: number[][] = [];
    const geometry = territory.geometry;

    if (geometry?.type === 'Polygon' && geometry.coordinates?.[0]) {
      coords = geometry.coordinates[0];
    } else if (geometry?.type === 'MultiPolygon' && geometry.coordinates) {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        if (polygon[0]) {
          coords = coords.concat(polygon[0]);
        }
      });
    }

    if (coords.length === 0) {
      // Fallback: use center point with larger buffer (1.5 degrees ~ 150km)
      const center = territory.center || { lat: -25, lng: 133 };
      console.log(`Territory ${territory.name} has no geometry, using center point buffer`);
      return {
        north: center.lat + 1.5,
        south: center.lat - 1.5,
        east: center.lng + 1.5,
        west: center.lng - 1.5
      };
    }

    // Calculate bounds from coordinates [lng, lat]
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    coords.forEach(coord => {
      const lng = coord[0];
      const lat = coord[1];
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    return { north: maxLat, south: minLat, east: maxLng, west: minLng };
  } catch (error) {
    console.error('Error calculating territory bounds:', error);
    return { north: -10, south: -45, east: 155, west: 110 }; // Australia-wide fallback
  }
}

// Reduce coordinate precision to 5 decimal places (~1m accuracy) to shrink payload
export function simplifyCoordinates(coords: any): any {
  if (Array.isArray(coords)) {
    if (typeof coords[0] === 'number') {
      return [
        Math.round(coords[0] * 100000) / 100000,
        Math.round(coords[1] * 100000) / 100000,
      ];
    }
    return coords.map(simplifyCoordinates);
  }
  return coords;
}
