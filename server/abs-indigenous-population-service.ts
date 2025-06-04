/**
 * Australian Bureau of Statistics Indigenous Population Service
 * Fetches authentic Indigenous population data from ABS Census and demographic datasets
 */

export interface ABSIndigenousPopulationData {
  regionName: string;
  regionCode: string;
  indigenousPopulation: number;
  totalPopulation: number;
  indigenousPercentage: number;
  ageGroups: {
    '0-14': number;
    '15-64': number;
    '65+': number;
  };
  languageGroups: string[];
  dataYear: number;
  source: 'abs_census_2021' | 'abs_census_2016' | 'abs_estimated';
  lastUpdated: Date;
}

export interface ABSPopulationResult {
  populationData: ABSIndigenousPopulationData[];
  totalFound: number;
  searchQuery: string;
  dataSource: 'australian_bureau_statistics';
  requiresApiKey: boolean;
}

export class ABSIndigenousPopulationService {
  
  /**
   * Fetch authentic Indigenous population data from Australian Bureau of Statistics
   */
  async fetchIndigenousPopulation(
    regionName?: string,
    coordinates?: { lat: number; lng: number }
  ): Promise<ABSPopulationResult> {
    
    // Check if ABS API credentials are available
    const absApiKey = process.env.ABS_API_KEY;
    if (!absApiKey) {
      return {
        populationData: [],
        totalFound: 0,
        searchQuery: regionName || 'coordinates',
        dataSource: 'australian_bureau_statistics',
        requiresApiKey: true
      };
    }

    try {
      // ABS Census API endpoints for Indigenous population data
      const baseUrl = 'https://api.abs.gov.au/data';
      let apiUrl: string;

      if (regionName) {
        // Search by region name using ABS Statistical Area Level data
        apiUrl = `${baseUrl}/ABS,C16,1.0.0/Indigenous.Population+Total.Population.ASGS_2016?dimensionAtObservation=AllDimensions&region=${encodeURIComponent(regionName)}`;
      } else if (coordinates) {
        // Search by coordinates using ABS Geographic API
        apiUrl = `${baseUrl}/geographic/search?lat=${coordinates.lat}&lng=${coordinates.lng}&radius=50000&format=json`;
      } else {
        throw new Error('Either region name or coordinates must be provided');
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${absApiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'Aboriginal-Australia-Map/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`ABS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const populationData = this.parseABSPopulationData(data);

      return {
        populationData,
        totalFound: populationData.length,
        searchQuery: regionName || `${coordinates?.lat},${coordinates?.lng}`,
        dataSource: 'australian_bureau_statistics',
        requiresApiKey: false
      };

    } catch (error) {
      console.error('Error fetching ABS Indigenous population data:', error);
      return {
        populationData: [],
        totalFound: 0,
        searchQuery: regionName || 'coordinates',
        dataSource: 'australian_bureau_statistics',
        requiresApiKey: true
      };
    }
  }

  private parseABSPopulationData(data: any): ABSIndigenousPopulationData[] {
    const populationData: ABSIndigenousPopulationData[] = [];

    try {
      // Parse ABS Census data structure
      if (data.dataSets && data.dataSets[0] && data.dataSets[0].observations) {
        const observations = data.dataSets[0].observations;
        const structure = data.structure;

        for (const [key, value] of Object.entries(observations)) {
          const observation = value as any;
          
          // Extract population figures from ABS data structure
          const regionData: ABSIndigenousPopulationData = {
            regionName: this.extractRegionName(structure, key),
            regionCode: this.extractRegionCode(structure, key),
            indigenousPopulation: observation.indigenous || 0,
            totalPopulation: observation.total || 0,
            indigenousPercentage: observation.indigenous && observation.total 
              ? (observation.indigenous / observation.total) * 100 
              : 0,
            ageGroups: {
              '0-14': observation.age_0_14 || 0,
              '15-64': observation.age_15_64 || 0,
              '65+': observation.age_65_plus || 0
            },
            languageGroups: this.extractLanguageGroups(observation),
            dataYear: 2021, // Latest ABS Census
            source: 'abs_census_2021',
            lastUpdated: new Date()
          };

          populationData.push(regionData);
        }
      }
    } catch (error) {
      console.error('Error parsing ABS population data:', error);
    }

    return populationData;
  }

  private extractRegionName(structure: any, key: string): string {
    try {
      // Extract region name from ABS data structure
      const dimensions = structure.dimensions.observation;
      return dimensions.find((d: any) => d.id === 'REGION')?.values[0]?.name || 'Unknown Region';
    } catch {
      return 'Unknown Region';
    }
  }

  private extractRegionCode(structure: any, key: string): string {
    try {
      // Extract ABS region code
      const dimensions = structure.dimensions.observation;
      return dimensions.find((d: any) => d.id === 'REGION')?.values[0]?.id || 'UNK';
    } catch {
      return 'UNK';
    }
  }

  private extractLanguageGroups(observation: any): string[] {
    // Extract Indigenous language information from ABS data
    const languages: string[] = [];
    
    if (observation.languages) {
      for (const lang of observation.languages) {
        if (lang.indigenous && lang.name) {
          languages.push(lang.name);
        }
      }
    }

    return languages;
  }

  /**
   * Get cached population data or return placeholder indicating ABS credentials needed
   */
  async getPopulationForTerritory(territoryName: string, coordinates: { lat: number; lng: number }): Promise<number | null> {
    const result = await this.fetchIndigenousPopulation(territoryName, coordinates);
    
    if (result.requiresApiKey) {
      // Return null to indicate authentic data requires ABS API credentials
      return null;
    }

    const territoryData = result.populationData.find(data => 
      data.regionName.toLowerCase().includes(territoryName.toLowerCase())
    );

    return territoryData?.indigenousPopulation || null;
  }
}

export const absIndigenousPopulationService = new ABSIndigenousPopulationService();