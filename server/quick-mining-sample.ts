/**
 * Quick Mining Sample - Extract sample data from WA DMIRS KML for immediate testing
 */

export interface QuickMiningTenement {
  id: string;
  type: string;
  status: string;
  holder: string;
  coordinates: number[][];
}

export async function extractSampleTenements(): Promise<QuickMiningTenement[]> {
  try {
    const fs = await import('fs');
    
    console.log('Extracting sample mining tenements from WA DMIRS KML data...');
    
    // Use streaming approach for better performance
    const stream = fs.createReadStream('./attached_assets/doc.kml', { 
      encoding: 'utf8',
      highWaterMark: 1024 * 1024 // 1MB chunks
    });
    
    let buffer = '';
    const tenements: QuickMiningTenement[] = [];
    let processedCount = 0;
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: string) => {
        buffer += chunk;
        
        // Process complete Placemark elements
        let placemarkStart = buffer.indexOf('<Placemark');
        while (placemarkStart !== -1 && processedCount < 100) {
          const placemarkEnd = buffer.indexOf('</Placemark>', placemarkStart);
          if (placemarkEnd === -1) break;
          
          const placemarkContent = buffer.substring(placemarkStart, placemarkEnd + 12);
          buffer = buffer.substring(placemarkEnd + 12);
          
          // Extract tenement data
          const tenementId = extractValue(placemarkContent, 'Tenement ID');
          const tenementType = extractValue(placemarkContent, 'Tenement Type');
          const tenureStatus = extractValue(placemarkContent, 'Tenure Status');
          const holder = extractValue(placemarkContent, 'Tenement Holder 1');
          
          if (tenementId && tenementId.trim() !== '') {
            // Extract coordinates
            const coordsMatch = placemarkContent.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
            if (coordsMatch) {
              const coordinates = parseCoordinates(coordsMatch[1]);
              if (coordinates.length > 0) {
                tenements.push({
                  id: tenementId.trim(),
                  type: tenementType?.trim() || 'Unknown',
                  status: tenureStatus?.trim() || 'Unknown', 
                  holder: holder?.trim() || 'Unknown',
                  coordinates
                });
                processedCount++;
              }
            }
          }
          
          placemarkStart = buffer.indexOf('<Placemark');
        }
        
        // Stop early if we have enough samples
        if (processedCount >= 100) {
          stream.destroy();
        }
      });
      
      stream.on('end', () => {
        console.log(`Successfully extracted ${tenements.length} sample mining tenements from WA DMIRS`);
        resolve(tenements);
      });
      
      stream.on('error', (error) => {
        console.error('Error streaming KML file:', error);
        resolve([]); // Return empty array instead of rejecting
      });
    });
    
  } catch (error) {
    console.error('Error extracting sample tenements:', error);
    return [];
  }
}

function extractValue(content: string, fieldName: string): string {
  const regex = new RegExp(`<SimpleData name="${fieldName}">(.*?)</SimpleData>`);
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseCoordinates(coordString: string): number[][] {
  try {
    return coordString.trim()
      .split(/\s+/)
      .slice(0, 50) // Limit points for performance
      .map(coord => {
        const parts = coord.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lng) && !isNaN(lat)) {
            return [lng, lat];
          }
        }
        return null;
      })
      .filter(coord => coord !== null) as number[][];
  } catch {
    return [];
  }
}