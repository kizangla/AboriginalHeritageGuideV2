/**
 * Request Compression and Response Optimization
 * Reduces data transfer size and improves loading speeds
 */

export function compressRATSIBResponse(ratsibData: any): any {
  // Remove redundant data and optimize geometry for transfer
  const compressed = {
    ...ratsibData,
    ratsib: {
      ...ratsibData.ratsib,
      boundaries: ratsibData.ratsib.boundaries.map((boundary: any) => ({
        id: boundary.id,
        name: boundary.name,
        organizationName: boundary.organizationName,
        corporationType: boundary.corporationType,
        legislativeAuthority: boundary.legislativeAuthority,
        website: boundary.website,
        jurisdiction: boundary.jurisdiction,
        status: boundary.status,
        // Compress geometry by reducing coordinate precision
        geometry: compressGeometry(boundary.geometry),
        // Keep essential original properties only
        originalProperties: {
          ORG: boundary.originalProperties?.ORG,
          NAME: boundary.originalProperties?.NAME,
          RATSIBTYPE: boundary.originalProperties?.RATSIBTYPE,
          LEGISAUTH: boundary.originalProperties?.LEGISAUTH,
          RATSIBLINK: boundary.originalProperties?.RATSIBLINK,
          JURIS: boundary.originalProperties?.JURIS,
          ID: boundary.originalProperties?.ID,
          COMMENTS: boundary.originalProperties?.COMMENTS,
          DT_EXTRACT: boundary.originalProperties?.DT_EXTRACT
        }
      }))
    }
  };
  
  return compressed;
}

function compressGeometry(geometry: any): any {
  if (!geometry || !geometry.coordinates) return geometry;
  
  return {
    ...geometry,
    coordinates: compressCoordinates(geometry.coordinates)
  };
}

function compressCoordinates(coords: any): any {
  if (Array.isArray(coords)) {
    if (typeof coords[0] === 'number') {
      // Individual coordinate pair - reduce precision to 6 decimal places (~0.1m accuracy)
      return [
        Math.round(coords[0] * 1000000) / 1000000,
        Math.round(coords[1] * 1000000) / 1000000
      ];
    } else {
      // Nested array - recurse
      return coords.map(compressCoordinates);
    }
  }
  return coords;
}