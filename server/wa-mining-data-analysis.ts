/**
 * Western Australia Mining Data Analysis
 * Examines available WFS endpoints from WA DEMIRS for mining tenements and operations
 */

import fetch from 'node-fetch';

interface WFSCapability {
  serviceName: string;
  endpoint: string;
  layers: string[];
  description: string;
  dataFormat: string;
  spatialExtent?: string;
}

interface MiningTenementData {
  tenementId: string;
  tenementType: string;
  status: string;
  holder: string;
  commodity: string[];
  grantDate: string;
  expiryDate: string;
  area: number;
  geometry: any;
}

interface ActiveMineData {
  mineId: string;
  mineName: string;
  operator: string;
  mineType: string;
  primaryCommodity: string;
  secondaryCommodities: string[];
  productionData?: {
    annualTonnage: number;
    value: number;
    employees: number;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  operationalStatus: string;
  geometry: any;
}

export class WAMiningDataAnalyzer {
  private baseEndpoints = {
    demirs: 'https://services.slip.wa.gov.au/public/services/SLIP_Public_Services/SLIP_Public_Industry_and_Mining/MapServer/WFSServer',
    geoserver: 'https://catalogue.data.wa.gov.au/geoserver/wfs',
    dataWA: 'https://data.wa.gov.au/api/3/action'
  };

  /**
   * Discover available WFS services for mining data
   */
  async discoverMiningServices(): Promise<WFSCapability[]> {
    const capabilities: WFSCapability[] = [];
    
    try {
      console.log('Discovering WA DEMIRS mining data services...');
      
      // Check SLIP Public Services
      const slipResponse = await this.getWFSCapabilities(this.baseEndpoints.demirs);
      if (slipResponse) {
        capabilities.push({
          serviceName: 'SLIP Public Industry and Mining',
          endpoint: this.baseEndpoints.demirs,
          layers: slipResponse.layers || [],
          description: 'Official WA government mining and industry data',
          dataFormat: 'WFS',
          spatialExtent: 'Western Australia'
        });
      }

      // Check general geoserver
      const geoResponse = await this.getWFSCapabilities(this.baseEndpoints.geoserver);
      if (geoResponse) {
        capabilities.push({
          serviceName: 'WA Data Catalogue Geoserver',
          endpoint: this.baseEndpoints.geoserver,
          layers: geoResponse.layers || [],
          description: 'State government spatial data services',
          dataFormat: 'WFS'
        });
      }

    } catch (error) {
      console.error('Error discovering mining services:', error);
    }

    return capabilities;
  }

  /**
   * Get WFS capabilities from endpoint
   */
  private async getWFSCapabilities(endpoint: string): Promise<{ layers: string[] } | null> {
    try {
      const capabilitiesUrl = `${endpoint}?service=WFS&request=GetCapabilities&version=2.0.0`;
      console.log(`Checking capabilities: ${capabilitiesUrl}`);
      
      const response = await fetch(capabilitiesUrl, {
        headers: {
          'User-Agent': 'Indigenous-Australia-Map/1.0',
          'Accept': 'application/xml, text/xml'
        },
        timeout: 10000
      });

      if (!response.ok) {
        console.log(`WFS endpoint returned ${response.status}: ${response.statusText}`);
        return null;
      }

      const xmlText = await response.text();
      console.log(`Received capabilities XML (${xmlText.length} characters)`);
      
      // Extract layer names from capabilities XML
      const layers = this.parseLayerNames(xmlText);
      
      return { layers };

    } catch (error) {
      console.error(`Failed to get capabilities from ${endpoint}:`, error);
      return null;
    }
  }

  /**
   * Parse layer names from WFS capabilities XML
   */
  private parseLayerNames(xmlText: string): string[] {
    const layers: string[] = [];
    
    try {
      // Look for mining-related layer names in the XML
      const miningKeywords = [
        'mining', 'tenement', 'lease', 'mine', 'mineral', 'exploration',
        'prospect', 'quarry', 'extractive', 'resource', 'commodity'
      ];
      
      // Basic XML parsing to find FeatureType names
      const featureTypeRegex = /<(?:wfs:)?FeatureType[^>]*>[\s\S]*?<(?:wfs:)?Name[^>]*>([^<]+)<\/(?:wfs:)?Name>[\s\S]*?<\/(?:wfs:)?FeatureType>/gi;
      let match;
      
      while ((match = featureTypeRegex.exec(xmlText)) !== null) {
        const layerName = match[1].trim();
        
        // Check if layer name contains mining-related keywords
        const isMiningRelated = miningKeywords.some(keyword => 
          layerName.toLowerCase().includes(keyword)
        );
        
        if (isMiningRelated) {
          layers.push(layerName);
          console.log(`Found mining-related layer: ${layerName}`);
        }
      }

      // Also check for any layer names that might be abbreviated
      const allLayerRegex = /<(?:wfs:)?Name[^>]*>([^<]+)<\/(?:wfs:)?Name>/gi;
      let allMatch;
      
      while ((allMatch = allLayerRegex.exec(xmlText)) !== null) {
        const layerName = allMatch[1].trim();
        
        // Look for common abbreviations
        if (layerName.match(/^(DEMIRS|SLIP|MIN|TEN|EXP|PROD)/i)) {
          if (!layers.includes(layerName)) {
            layers.push(layerName);
            console.log(`Found potential mining layer: ${layerName}`);
          }
        }
      }
      
    } catch (error) {
      console.error('Error parsing layer names:', error);
    }
    
    return layers;
  }

  /**
   * Analyze specific mining tenement data structure
   */
  async analyzeTenementDataStructure(layerName: string, endpoint: string): Promise<any> {
    try {
      console.log(`Analyzing tenement data structure for layer: ${layerName}`);
      
      // Get feature info with small sample
      const featureUrl = `${endpoint}?service=WFS&request=GetFeature&version=2.0.0&typeName=${layerName}&count=5&outputFormat=application/json`;
      
      const response = await fetch(featureUrl, {
        headers: {
          'User-Agent': 'Indigenous-Australia-Map/1.0',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (!response.ok) {
        console.log(`Feature request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const sampleFeature = data.features[0];
        console.log('Sample tenement properties:', Object.keys(sampleFeature.properties || {}));
        console.log('Sample values:', sampleFeature.properties);
        
        return {
          layerName,
          totalFeatures: data.totalFeatures || data.features.length,
          sampleProperties: sampleFeature.properties,
          geometryType: sampleFeature.geometry?.type,
          hasCoordinates: !!sampleFeature.geometry?.coordinates
        };
      }

      return null;

    } catch (error) {
      console.error(`Error analyzing ${layerName}:`, error);
      return null;
    }
  }

  /**
   * Check for active mine production data
   */
  async checkProductionDataAvailability(): Promise<any> {
    try {
      console.log('Checking for mine production data sources...');
      
      // Look for production-related endpoints
      const productionKeywords = ['production', 'output', 'tonnage', 'value', 'employment'];
      
      // This would typically check multiple known production data sources
      const potentialSources = [
        'https://data.wa.gov.au/api/3/action/package_search?q=mining+production',
        'https://catalogue.data.wa.gov.au/api/3/action/package_search?q=mine+output'
      ];

      const results = [];
      
      for (const source of potentialSources) {
        try {
          const response = await fetch(source, {
            headers: { 'User-Agent': 'Indigenous-Australia-Map/1.0' },
            timeout: 10000
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Found ${data.result?.count || 0} production-related datasets`);
            results.push({
              source,
              datasets: data.result?.results || []
            });
          }
        } catch (error) {
          console.log(`Could not access ${source}`);
        }
      }

      return results;

    } catch (error) {
      console.error('Error checking production data:', error);
      return [];
    }
  }

  /**
   * Generate mining data integration report
   */
  async generateIntegrationReport(): Promise<any> {
    console.log('=== WA Mining Data Integration Analysis ===\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      services: [] as any[],
      dataStructures: [] as any[],
      productionSources: [] as any[],
      recommendations: [] as string[]
    };

    // Discover services
    const services = await this.discoverMiningServices();
    report.services = services;
    
    console.log(`Found ${services.length} WFS services`);

    // Analyze data structures for each service
    for (const service of services) {
      if (service.layers.length > 0) {
        console.log(`\nAnalyzing layers in ${service.serviceName}:`);
        
        for (const layer of service.layers.slice(0, 3)) { // Limit to first 3 layers
          const structure = await this.analyzeTenementDataStructure(layer, service.endpoint);
          if (structure) {
            report.dataStructures.push(structure);
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Check production data
    const productionData = await this.checkProductionDataAvailability();
    report.productionSources = productionData;

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  private generateRecommendations(report: any): string[] {
    const recommendations = [];
    
    if (report.services.length > 0) {
      recommendations.push('WFS services are available for real-time mining tenement data');
    }
    
    if (report.dataStructures.length > 0) {
      recommendations.push('Tenement boundary data can be integrated with Aboriginal territories');
    }
    
    if (report.productionSources.length > 0) {
      recommendations.push('Production data sources identified for economic impact analysis');
    }

    recommendations.push('Implement caching strategy for large spatial datasets');
    recommendations.push('Add conflict detection between mining areas and Native Title');
    recommendations.push('Create aggregated statistics by Aboriginal territory');

    return recommendations;
  }
}

// Analysis function for testing
export async function analyzeMiningDataSources() {
  const analyzer = new WAMiningDataAnalyzer();
  
  try {
    const report = await analyzer.generateIntegrationReport();
    
    console.log('\n=== MINING DATA ANALYSIS COMPLETE ===');
    console.log('Services found:', report.services.length);
    console.log('Data structures analyzed:', report.dataStructures.length);
    console.log('Production sources:', report.productionSources.length);
    console.log('\nRecommendations:');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    
    return report;
    
  } catch (error) {
    console.error('Mining data analysis failed:', error);
    return null;
  }
}