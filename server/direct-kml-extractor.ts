/**
 * Direct KML Extractor - Fast tenement extraction from WA DMIRS KML
 */

export interface DirectMiningTenement {
  id: string;
  type: string;
  status: string;
  holder: string;
  coordinates: number[][];
}

export async function extractTenementsDirect(): Promise<DirectMiningTenement[]> {
  try {
    const fs = await import('fs');
    
    console.log('Direct extraction from WA DMIRS KML data...');
    
    // Read file in chunks and extract first valid tenements
    const stream = fs.createReadStream('./attached_assets/doc.kml', { 
      encoding: 'utf8',
      start: 15000, // Skip header
      end: 5000000   // Read first 5MB after header
    });
    
    let content = '';
    
    return new Promise((resolve) => {
      stream.on('data', (chunk: string) => {
        content += chunk;
      });
      
      stream.on('end', () => {
        const tenements = parseKMLContent(content);
        console.log(`Extracted ${tenements.length} tenements from WA DMIRS`);
        resolve(tenements);
      });
      
      stream.on('error', () => {
        resolve([]);
      });
    });
    
  } catch (error) {
    console.error('Direct extraction error:', error);
    return [];
  }
}

function parseKMLContent(content: string): DirectMiningTenement[] {
  const tenements: DirectMiningTenement[] = [];
  
  // Find Placemark elements
  const placemarkMatches = content.match(/<Placemark[^>]*>[\s\S]*?<\/Placemark>/g);
  if (!placemarkMatches) return tenements;
  
  let processed = 0;
  for (const placemark of placemarkMatches) {
    if (processed >= 20) break; // Limit for quick response
    
    try {
      // Extract name (fallback ID)
      const nameMatch = placemark.match(/<name>(.*?)<\/name>/);
      const name = nameMatch ? nameMatch[1].trim() : '';
      
      // Extract tenement details from description table
      const tenementId = extractTableValue(placemark, 'Tenement ID') || name;
      const tenementType = extractTableValue(placemark, 'Tenement Type');
      const tenureStatus = extractTableValue(placemark, 'Tenure Status');
      const holder = extractTableValue(placemark, 'Tenement Holder 1');
      
      if (!tenementId || tenementId.trim() === '') continue;
      
      // Extract coordinates
      const coordsMatch = placemark.match(/<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/);
      if (!coordsMatch) continue;
      
      const coordinates = parseCoordinates(coordsMatch[1]);
      if (coordinates.length === 0) continue;
      
      tenements.push({
        id: tenementId.trim(),
        type: tenementType?.trim() || 'Mining Tenement',
        status: tenureStatus?.trim() || 'Active',
        holder: holder?.trim() || 'Not Listed',
        coordinates
      });
      
      processed++;
      
    } catch (error) {
      continue; // Skip problematic entries
    }
  }
  
  return tenements;
}

function extractTableValue(content: string, fieldName: string): string {
  // Match HTML table row with field name
  const regex = new RegExp(`<th[^>]*>${fieldName}</th>\\s*<td[^>]*>(.*?)</td>`, 'is');
  const match = content.match(regex);
  return match ? match[1].replace(/<[^>]*>/g, '').trim() : '';
}

function parseCoordinates(coordString: string): number[][] {
  try {
    const coords = coordString.trim()
      .split(/\s+/)
      .slice(0, 100) // Limit points for performance
      .map(coord => {
        const parts = coord.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) {
            return [lng, lat];
          }
        }
        return null;
      })
      .filter(coord => coord !== null) as number[][];
      
    return coords;
  } catch {
    return [];
  }
}