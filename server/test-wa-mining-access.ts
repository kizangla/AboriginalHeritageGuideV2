/**
 * Test WA DEMIRS WFS Service Access
 * Verifies connectivity and data availability from official mining endpoints
 */

import fetch from 'node-fetch';

interface WFSTestResult {
  endpoint: string;
  accessible: boolean;
  layersFound: string[];
  sampleData?: any;
  error?: string;
}

export class WAMiningAccessTester {
  private knownEndpoints = [
    'https://services.slip.wa.gov.au/public/services/SLIP_Public_Services/SLIP_Public_Industry_and_Mining/MapServer/WFSServer',
    'https://catalogue.data.wa.gov.au/geoserver/wfs',
    'https://gisservices.slip.wa.gov.au/public/services/SLIP_Public_Services/SLIP_Public_Industry_and_Mining/MapServer/WFSServer'
  ];

  async testAllEndpoints(): Promise<WFSTestResult[]> {
    console.log('Testing WA DEMIRS WFS endpoint accessibility...\n');
    
    const results: WFSTestResult[] = [];
    
    for (const endpoint of this.knownEndpoints) {
      console.log(`Testing endpoint: ${endpoint}`);
      const result = await this.testSingleEndpoint(endpoint);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  private async testSingleEndpoint(endpoint: string): Promise<WFSTestResult> {
    const result: WFSTestResult = {
      endpoint,
      accessible: false,
      layersFound: []
    };

    try {
      // Test GetCapabilities
      const capabilitiesUrl = `${endpoint}?service=WFS&request=GetCapabilities&version=2.0.0`;
      console.log(`  Requesting capabilities...`);
      
      const response = await fetch(capabilitiesUrl, {
        headers: {
          'User-Agent': 'Indigenous-Australia-Map/1.0 (Research)',
          'Accept': 'application/xml, text/xml'
        }
      });

      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
        console.log(`  ❌ Failed: ${result.error}`);
        return result;
      }

      const xmlText = await response.text();
      console.log(`  ✅ Response received (${xmlText.length} chars)`);
      
      // Parse layer names
      const layers = this.extractMiningLayers(xmlText);
      result.layersFound = layers;
      result.accessible = true;
      
      console.log(`  📊 Found ${layers.length} mining-related layers`);
      layers.forEach(layer => console.log(`    - ${layer}`));

      // Try to get sample data from first layer
      if (layers.length > 0) {
        const sampleData = await this.getSampleData(endpoint, layers[0]);
        if (sampleData) {
          result.sampleData = sampleData;
          console.log(`  🔍 Sample data retrieved from ${layers[0]}`);
        }
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${result.error}`);
    }

    console.log('');
    return result;
  }

  private extractMiningLayers(xmlText: string): string[] {
    const layers: string[] = [];
    
    // Mining-related keywords
    const miningKeywords = [
      'mining', 'tenement', 'lease', 'mine', 'mineral', 'exploration',
      'prospect', 'quarry', 'extractive', 'resource', 'commodity',
      'demirs', 'slip', 'industry'
    ];
    
    // Extract FeatureType names
    const featureTypeRegex = /<(?:wfs:)?FeatureType[^>]*>([\s\S]*?)<\/(?:wfs:)?FeatureType>/gi;
    let match;
    
    while ((match = featureTypeRegex.exec(xmlText)) !== null) {
      const featureTypeContent = match[1];
      
      // Extract layer name
      const nameMatch = featureTypeContent.match(/<(?:wfs:)?Name[^>]*>([^<]+)<\/(?:wfs:)?Name>/);
      if (nameMatch) {
        const layerName = nameMatch[1].trim();
        
        // Check if mining-related
        const isMiningLayer = miningKeywords.some(keyword => 
          layerName.toLowerCase().includes(keyword)
        );
        
        if (isMiningLayer || layerName.match(/^(DEMIRS|SLIP|MIN|TEN|EXP|PROD)/i)) {
          layers.push(layerName);
        }
      }
    }
    
    return layers;
  }

  private async getSampleData(endpoint: string, layerName: string): Promise<any> {
    try {
      const featureUrl = `${endpoint}?service=WFS&request=GetFeature&version=2.0.0&typeName=${layerName}&count=1&outputFormat=application/json`;
      
      const response = await fetch(featureUrl, {
        headers: {
          'User-Agent': 'Indigenous-Australia-Map/1.0 (Research)',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) return null;

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          properties: Object.keys(feature.properties || {}),
          geometryType: feature.geometry?.type,
          sampleProperties: feature.properties
        };
      }

      return null;

    } catch (error) {
      console.log(`    Warning: Could not retrieve sample data - ${error}`);
      return null;
    }
  }

  generateAccessReport(results: WFSTestResult[]): void {
    console.log('=== WA MINING WFS ACCESS REPORT ===\n');
    
    const accessible = results.filter(r => r.accessible);
    const failed = results.filter(r => !r.accessible);
    
    console.log(`✅ Accessible endpoints: ${accessible.length}/${results.length}`);
    console.log(`❌ Failed endpoints: ${failed.length}/${results.length}\n`);
    
    if (accessible.length > 0) {
      console.log('ACCESSIBLE SERVICES:');
      accessible.forEach(result => {
        console.log(`\n📡 ${result.endpoint}`);
        console.log(`   Layers found: ${result.layersFound.length}`);
        result.layersFound.forEach(layer => {
          console.log(`   - ${layer}`);
        });
        
        if (result.sampleData) {
          console.log(`   Sample properties: ${result.sampleData.properties.join(', ')}`);
          console.log(`   Geometry type: ${result.sampleData.geometryType}`);
        }
      });
    }
    
    if (failed.length > 0) {
      console.log('\nFAILED ENDPOINTS:');
      failed.forEach(result => {
        console.log(`\n❌ ${result.endpoint}`);
        console.log(`   Error: ${result.error}`);
      });
    }
    
    // Integration recommendations
    console.log('\n=== INTEGRATION RECOMMENDATIONS ===');
    
    if (accessible.length > 0) {
      console.log('✅ WFS services are accessible for mining data integration');
      console.log('✅ Multiple mining layers available for overlay analysis');
      console.log('✅ Real-time data integration is feasible');
      console.log('✅ Spatial intersection analysis can be implemented');
      
      const totalLayers = accessible.reduce((sum, r) => sum + r.layersFound.length, 0);
      console.log(`📊 Total mining layers available: ${totalLayers}`);
    } else {
      console.log('❌ No accessible WFS endpoints found');
      console.log('🔍 Alternative data sources may be needed');
      console.log('📞 Direct DEMIRS API access might require authentication');
    }
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Implement caching layer for WFS data');
    console.log('2. Create mining tenement overlay component');
    console.log('3. Build conflict detection algorithms');
    console.log('4. Add filtering controls for mining data');
    console.log('5. Integrate with existing Aboriginal territory visualization');
  }
}

export async function testWAMiningAccess() {
  const tester = new WAMiningAccessTester();
  
  try {
    const results = await tester.testAllEndpoints();
    tester.generateAccessReport(results);
    
    return results;
    
  } catch (error) {
    console.error('Mining access test failed:', error);
    return [];
  }
}