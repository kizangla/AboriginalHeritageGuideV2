/**
 * Fast KML Parser - Optimized for WA DMIRS large KML files
 */

export interface FastMiningTenement {
  id: string;
  type: string;
  status: string;
  holder: string;
  coordinates: number[][];
}

let cachedTenements: FastMiningTenement[] | null = null;
let isProcessing = false;

export async function getFastTenements(): Promise<FastMiningTenement[]> {
  if (cachedTenements) {
    return cachedTenements;
  }

  if (isProcessing) {
    // Return empty array while processing to avoid timeouts
    return [];
  }

  isProcessing = true;
  
  try {
    const fs = await import('fs/promises');
    console.log('Fast processing WA DMIRS KML data...');
    
    // Read specific chunk that contains tenement data
    const handle = await fs.open('./attached_assets/doc.kml', 'r');
    const buffer = Buffer.alloc(3 * 1024 * 1024); // 3MB chunk
    
    // Start reading from where placemarks begin
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 25000);
    await handle.close();
    
    const content = buffer.subarray(0, bytesRead).toString('utf8');
    const tenements = extractTenements(content);
    
    cachedTenements = tenements;
    console.log(`Cached ${tenements.length} WA DMIRS tenements`);
    
    return tenements;
    
  } catch (error) {
    console.error('Fast KML parsing error:', error);
    return [];
  } finally {
    isProcessing = false;
  }
}

function extractTenements(content: string): FastMiningTenement[] {
  const tenements: FastMiningTenement[] = [];
  
  // Split content into potential placemark chunks
  const chunks = content.split('<Placemark');
  
  for (let i = 1; i < chunks.length && tenements.length < 15; i++) {
    const chunk = '<Placemark' + chunks[i];
    
    try {
      // Find placemark end
      const endIndex = chunk.indexOf('</Placemark>');
      if (endIndex === -1) continue;
      
      const placemark = chunk.substring(0, endIndex + 12);
      
      // Extract name as fallback ID
      const nameMatch = placemark.match(/<name>(.*?)<\/name>/);
      const name = nameMatch ? nameMatch[1].trim() : `TENEMENT_${i}`;
      
      // Extract data from HTML table in description
      const tenementId = extractFromTable(placemark, 'Tenement ID') || name;
      const tenementType = extractFromTable(placemark, 'Tenement Type');
      const status = extractFromTable(placemark, 'Tenure Status');
      const holder = extractFromTable(placemark, 'Tenement Holder 1');
      
      // Extract coordinates
      const coordsMatch = placemark.match(/<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/);
      if (!coordsMatch) continue;
      
      const coordinates = parseCoords(coordsMatch[1]);
      if (coordinates.length === 0) continue;
      
      tenements.push({
        id: tenementId,
        type: tenementType || 'Mining Tenement',
        status: status || 'Current',
        holder: holder || 'Mining Company',
        coordinates
      });
      
    } catch (error) {
      continue;
    }
  }
  
  return tenements;
}

function extractFromTable(content: string, field: string): string {
  const pattern = new RegExp(`<th[^>]*>${field}</th>\\s*<td[^>]*>(.*?)</td>`, 'is');
  const match = content.match(pattern);
  if (match) {
    return match[1].replace(/<[^>]*>/g, '').trim();
  }
  return '';
}

function parseCoords(coordString: string): number[][] {
  try {
    return coordString.trim()
      .split(/\s+/)
      .slice(0, 50) // Limit points
      .map(coord => {
        const [lng, lat] = coord.split(',').map(parseFloat);
        if (!isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) {
          return [lng, lat];
        }
        return null;
      })
      .filter(coord => coord !== null) as number[][];
  } catch {
    return [];
  }
}