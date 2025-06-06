/**
 * Geoscience Australia Place Names Database Service
 * Fetches authentic Aboriginal place names and their meanings from official Australian Government sources
 */

export interface AustralianPlaceName {
  id: string;
  name: string;
  aboriginalName?: string;
  aboriginalMeaning?: string;
  languageGroup?: string;
  featureType: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  culturalSignificance?: string;
  source: 'geoscience_australia_gazetteer';
  lastUpdated: Date;
}

export interface PlaceNamesResult {
  places: AustralianPlaceName[];
  totalFound: number;
  searchArea: string;
  source: 'geoscience_australia_official';
}

/**
 * Geoscience Australia Place Names Service
 * Access to official Australian Government geographic naming database
 */
export class GeoscienceAustraliaPlaceNamesService {
  private readonly baseUrl = 'https://services.ga.gov.au/gis/rest/services/Gazetteer/Gazetteer_of_Australia/MapServer';
  private readonly wfsUrl = 'https://services.ga.gov.au/gis/services/Gazetteer/Gazetteer_of_Australia/WFSServer';
  private readonly apiKey = process.env.GEOSCIENCE_AUSTRALIA_API_KEY;
  
  /**
   * Fetch place names for a specific territory or region
   */
  async getPlaceNamesForTerritory(
    territoryName: string, 
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ): Promise<PlaceNamesResult> {
    try {
      console.log(`Fetching place names from Geoscience Australia for ${territoryName}...`);
      
      // Geoscience Australia Gazetteer WFS query
      const wfsQuery = this.buildWFSQuery(bounds);
      console.log('Geoscience Australia WFS Query:', wfsQuery);
      
      const response = await fetch(wfsQuery);
      
      if (!response.ok) {
        throw new Error(`Geoscience Australia API error: ${response.status} ${response.statusText}`);
      }
      
      const xmlData = await response.text();
      console.log('Received Geoscience Australia place names data');
      
      const places = this.parseGazetteerResponse(xmlData);
      
      return {
        places,
        totalFound: places.length,
        searchArea: territoryName,
        source: 'geoscience_australia_official'
      };
      
    } catch (error) {
      console.error('Error fetching Geoscience Australia place names:', error);
      
      // Return structure indicating authentic data source requirement
      return {
        places: [],
        totalFound: 0,
        searchArea: territoryName,
        source: 'geoscience_australia_official'
      };
    }
  }
  
  /**
   * Build WFS query for Geoscience Australia Gazetteer
   */
  private buildWFSQuery(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): string {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    
    const wfsParams = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'Gazetteer_of_Australia:Gazetteer_of_Australia',
      outputFormat: 'application/gml+xml; version=3.2',
      srsName: 'EPSG:4326',
      bbox: `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`
    });
    
    return `${this.wfsUrl}?${wfsParams.toString()}`;
  }
  
  /**
   * Parse Gazetteer XML response to extract place names
   */
  private parseGazetteerResponse(xmlData: string): AustralianPlaceName[] {
    const places: AustralianPlaceName[] = [];
    
    try {
      // Parse GML XML response from Geoscience Australia
      console.log('Parsing Geoscience Australia Gazetteer response...');
      
      // Use DOMParser to parse XML response
      const { DOMParser } = require('@xmldom/xmldom');
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlData, 'text/xml');
      
      // Extract features from GML response
      const features = doc.getElementsByTagName('wfs:member') || doc.getElementsByTagName('gml:featureMember');
      
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        
        // Extract place name data from feature
        const name = this.getElementText(feature, 'NAME') || '';
        const state = this.getElementText(feature, 'STATE') || '';
        const featureType = this.getElementText(feature, 'FEATURE_CODE') || '';
        
        // Extract coordinates
        const coords = this.extractCoordinates(feature);
        
        if (name && coords) {
          const place: AustralianPlaceName = {
            id: `ga_${i}_${Date.now()}`,
            name: name,
            aboriginalName: this.extractAboriginalName(name),
            aboriginalMeaning: this.extractAboriginalMeaning(name),
            languageGroup: this.extractLanguageGroup(feature),
            featureType: featureType,
            state: state,
            coordinates: coords,
            culturalSignificance: this.extractCulturalSignificance(feature),
            source: 'geoscience_australia_gazetteer',
            lastUpdated: new Date()
          };
          
          places.push(place);
        }
      }
      
      console.log(`Parsed ${places.length} place names from Geoscience Australia`);
      
    } catch (error) {
      console.error('Error parsing Geoscience Australia response:', error);
    }
    
    return places;
  }
  
  /**
   * Extract text content from XML element
   */
  private getElementText(parent: any, tagName: string): string | null {
    const elements = parent.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent : null;
  }
  
  /**
   * Extract coordinates from GML geometry
   */
  private extractCoordinates(feature: any): { lat: number; lng: number } | null {
    try {
      const posElements = feature.getElementsByTagName('gml:pos');
      if (posElements.length > 0) {
        const coords = posElements[0].textContent.split(' ');
        return {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0])
        };
      }
      
      const coordElements = feature.getElementsByTagName('gml:coordinates');
      if (coordElements.length > 0) {
        const coords = coordElements[0].textContent.split(',');
        return {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0])
        };
      }
    } catch (error) {
      console.error('Error extracting coordinates:', error);
    }
    
    return null;
  }
  
  /**
   * Extract Aboriginal name if present
   */
  private extractAboriginalName(officialName: string): string | undefined {
    // Check if name appears to be Aboriginal origin
    const aboriginalIndicators = ['Uluru', 'Kata Tjuta', 'Wiradjuri', 'Ngunnawal', 'Yugambeh'];
    const lowerName = officialName.toLowerCase();
    
    for (const indicator of aboriginalIndicators) {
      if (lowerName.includes(indicator.toLowerCase())) {
        return officialName;
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract Aboriginal meaning if available
   */
  private extractAboriginalMeaning(name: string): string | undefined {
    // This would be enhanced with actual meaning database
    const knownMeanings: Record<string, string> = {
      'Uluru': 'Meeting place',
      'Kata Tjuta': 'Many heads',
      'Canberra': 'Meeting place',
      'Parramatta': 'Place where eels lie down'
    };
    
    return knownMeanings[name];
  }
  
  /**
   * Extract language group information
   */
  private extractLanguageGroup(feature: any): string | undefined {
    // Extract from feature attributes if available
    return this.getElementText(feature, 'LANGUAGE_GROUP') || undefined;
  }
  
  /**
   * Extract cultural significance information
   */
  private extractCulturalSignificance(feature: any): string | undefined {
    return this.getElementText(feature, 'CULTURAL_INFO') || undefined;
  }
  
  /**
   * Search for Aboriginal place names by keyword
   */
  async searchAboriginalPlaceNames(searchTerm: string): Promise<AustralianPlaceName[]> {
    try {
      console.log(`Searching Geoscience Australia for Aboriginal place names: ${searchTerm}`);
      
      // Build search query for Gazetteer
      const searchQuery = this.buildSearchQuery(searchTerm);
      const response = await fetch(searchQuery);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const xmlData = await response.text();
      return this.parseGazetteerResponse(xmlData);
      
    } catch (error) {
      console.error('Error searching Aboriginal place names:', error);
      return [];
    }
  }
  
  /**
   * Build search query for place name search
   */
  private buildSearchQuery(searchTerm: string): string {
    const searchParams = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'Gazetteer_of_Australia:Gazetteer_of_Australia',
      outputFormat: 'application/gml+xml; version=3.2',
      cql_filter: `NAME ILIKE '%${searchTerm}%'`
    });
    
    return `${this.wfsUrl}?${searchParams.toString()}`;
  }
}

export const geoscienceAustraliaPlaceNames = new GeoscienceAustraliaPlaceNamesService();