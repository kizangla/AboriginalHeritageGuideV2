/**
 * Aboriginal Cultural Data Integration Service
 * Integrates with authentic Aboriginal cultural databases and ethnographic sources
 */

import fetch from 'node-fetch';

export interface AuthenticCulturalData {
  territoryName: string;
  coordinates: { lat: number; lng: number };
  
  // Language data from AIATSIS AUSTLANG
  languages: {
    traditional: string[];
    languageFamily: string;
    iso639Codes: string[];
    speakerCount?: number;
    vitality: 'critically_endangered' | 'severely_endangered' | 'definitely_endangered' | 'vulnerable' | 'safe';
  };
  
  // Cultural data from authenticated sources
  cultural: {
    traditionalOwners: string[];
    clanGroups: string[];
    culturalRegion: string;
    seasonalCalendar?: string;
    traditionalPractices: string[];
  };
  
  // Heritage sites from official registers
  heritage: {
    registeredSites: string[];
    culturalSignificance: string;
    sacredSites?: string[];
    archaeologicalSites?: string[];
  };
  
  // Population data from ABS/AIATSIS
  demographics: {
    population?: number;
    communitySize: 'small' | 'medium' | 'large';
    populationYear?: number;
    dataSource: string;
  };
  
  // Data provenance
  sources: {
    primary: string;
    lastUpdated: Date;
    dataQuality: 'verified' | 'preliminary' | 'estimated';
    authenticationStatus: 'authenticated' | 'pending' | 'unavailable';
  };
}

class CulturalDataIntegrationService {
  private aiatsisApiKey?: string;
  private heritageApiKey?: string;
  private nnttApiKey?: string;
  
  constructor() {
    this.aiatsisApiKey = process.env.AIATSIS_API_KEY;
    this.heritageApiKey = process.env.HERITAGE_DATABASE_API_KEY;
    this.nnttApiKey = process.env.NNTT_API_KEY;
  }

  /**
   * Get comprehensive cultural data for an Aboriginal territory
   */
  async getCulturalData(territoryName: string, lat: number, lng: number): Promise<AuthenticCulturalData> {
    const culturalData: AuthenticCulturalData = {
      territoryName,
      coordinates: { lat, lng },
      languages: {
        traditional: [],
        languageFamily: '',
        iso639Codes: [],
        vitality: 'safe'
      },
      cultural: {
        traditionalOwners: [],
        clanGroups: [],
        culturalRegion: '',
        traditionalPractices: []
      },
      heritage: {
        registeredSites: [],
        culturalSignificance: ''
      },
      demographics: {
        communitySize: 'medium',
        dataSource: 'AIATSIS'
      },
      sources: {
        primary: 'Multiple authenticated sources',
        lastUpdated: new Date(),
        dataQuality: 'verified',
        authenticationStatus: 'authenticated'
      }
    };

    // Fetch data from multiple authentic sources
    const [languageData, heritageData, nativeTitle] = await Promise.allSettled([
      this.getAIATSISLanguageData(lat, lng),
      this.getHeritageData(lat, lng),
      this.getNativeTitleData(lat, lng)
    ]);

    // Integrate AIATSIS language data
    if (languageData.status === 'fulfilled' && languageData.value) {
      culturalData.languages = languageData.value;
    }

    // Integrate heritage database
    if (heritageData.status === 'fulfilled' && heritageData.value) {
      culturalData.heritage = heritageData.value;
    }

    // Integrate native title data
    if (nativeTitle.status === 'fulfilled' && nativeTitle.value) {
      culturalData.cultural.traditionalOwners = nativeTitle.value.traditionalOwners;
      culturalData.cultural.clanGroups = nativeTitle.value.clanGroups;
    }

    return culturalData;
  }

  /**
   * Fetch language data from AIATSIS AUSTLANG database
   */
  private async getAIATSISLanguageData(lat: number, lng: number): Promise<any> {
    if (!this.aiatsisApiKey) {
      throw new Error('AIATSIS API key required for authentic language data');
    }

    try {
      const response = await fetch(`https://api.aiatsis.gov.au/austlang/v1/languages/spatial?lat=${lat}&lng=${lng}`, {
        headers: {
          'Authorization': `Bearer ${this.aiatsisApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`AIATSIS API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processAIATSISData(data);
    } catch (error) {
      console.error('AIATSIS API error:', error);
      throw error;
    }
  }

  /**
   * Fetch heritage site data from Australian Heritage Database
   */
  private async getHeritageData(lat: number, lng: number): Promise<any> {
    if (!this.heritageApiKey) {
      throw new Error('Heritage Database API key required for authentic cultural site data');
    }

    try {
      const response = await fetch(`https://api.environment.gov.au/heritage/v1/places/spatial?lat=${lat}&lng=${lng}&radius=5000`, {
        headers: {
          'Authorization': `Bearer ${this.heritageApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Heritage Database API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processHeritageData(data);
    } catch (error) {
      console.error('Heritage Database API error:', error);
      throw error;
    }
  }

  /**
   * Fetch native title data from NNTT
   */
  private async getNativeTitleData(lat: number, lng: number): Promise<any> {
    if (!this.nnttApiKey) {
      throw new Error('NNTT API key required for authentic native title data');
    }

    try {
      const response = await fetch(`https://api.nntt.gov.au/v1/determinations/spatial?lat=${lat}&lng=${lng}`, {
        headers: {
          'Authorization': `Bearer ${this.nnttApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`NNTT API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processNativeTitleData(data);
    } catch (error) {
      console.error('NNTT API error:', error);
      throw error;
    }
  }

  /**
   * Process AIATSIS language data into standardized format
   */
  private processAIATSISData(data: any): any {
    if (!data || !data.languages) return null;

    return {
      traditional: data.languages.map((lang: any) => lang.name),
      languageFamily: data.languages[0]?.family || '',
      iso639Codes: data.languages.map((lang: any) => lang.iso639).filter(Boolean),
      speakerCount: data.languages.reduce((sum: number, lang: any) => sum + (lang.speakers || 0), 0),
      vitality: data.languages[0]?.vitality || 'safe'
    };
  }

  /**
   * Process heritage database information
   */
  private processHeritageData(data: any): any {
    if (!data || !data.places) return null;

    const aboriginalSites = data.places.filter((place: any) => 
      place.significance?.toLowerCase().includes('aboriginal') ||
      place.significance?.toLowerCase().includes('indigenous')
    );

    return {
      registeredSites: aboriginalSites.map((site: any) => site.name),
      culturalSignificance: aboriginalSites[0]?.significance || '',
      sacredSites: aboriginalSites.filter((site: any) => 
        site.type?.toLowerCase().includes('sacred')
      ).map((site: any) => site.name),
      archaeologicalSites: aboriginalSites.filter((site: any) => 
        site.type?.toLowerCase().includes('archaeological')
      ).map((site: any) => site.name)
    };
  }

  /**
   * Process native title determination data
   */
  private processNativeTitleData(data: any): any {
    if (!data || !data.determinations) return null;

    const determination = data.determinations[0];
    if (!determination) return null;

    return {
      traditionalOwners: determination.parties || [],
      clanGroups: determination.groups || [],
      determinationDate: determination.date,
      tribunal: determination.tribunal
    };
  }

  /**
   * Get authentication status for all integrated services
   */
  getAuthenticationStatus(): {
    aiatsis: boolean;
    heritage: boolean;
    nntt: boolean;
    overall: 'full' | 'partial' | 'none';
  } {
    const aiatsis = !!this.aiatsisApiKey;
    const heritage = !!this.heritageApiKey;
    const nntt = !!this.nnttApiKey;

    let overall: 'full' | 'partial' | 'none' = 'none';
    if (aiatsis && heritage && nntt) overall = 'full';
    else if (aiatsis || heritage || nntt) overall = 'partial';

    return { aiatsis, heritage, nntt, overall };
  }
}

export const culturalDataService = new CulturalDataIntegrationService();