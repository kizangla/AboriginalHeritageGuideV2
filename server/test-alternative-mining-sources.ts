/**
 * Test Alternative WA Mining Data Sources
 * Explores different endpoints and data formats for mining information
 */

import fetch from 'node-fetch';

interface DataSource {
  name: string;
  url: string;
  type: 'WFS' | 'REST' | 'API' | 'CKAN';
  accessible: boolean;
  dataFound?: any;
  error?: string;
}

export class AlternativeMiningSourceTester {
  private sources = [
    // DEMIRS direct endpoints
    {
      name: 'DEMIRS Tenements WFS',
      url: 'https://dasc.dmp.wa.gov.au/dasc/wfs',
      type: 'WFS' as const
    },
    {
      name: 'SLIP Public REST Services',
      url: 'https://services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/SLIP_Public_Industry_and_Mining/MapServer',
      type: 'REST' as const
    },
    {
      name: 'WA Data Catalogue Mining Search',
      url: 'https://catalogue.data.wa.gov.au/api/3/action/package_search?q=mining+tenements',
      type: 'CKAN' as const
    },
    {
      name: 'Data WA Mining Resources',
      url: 'https://data.wa.gov.au/api/3/action/package_search?q=demirs+mining',
      type: 'CKAN' as const
    },
    {
      name: 'SLIP Cadastre WFS',
      url: 'https://services.slip.wa.gov.au/public/services/SLIP_Public_Services/SLIP_Public_Cadastre/MapServer/WFSServer',
      type: 'WFS' as const
    }
  ];

  async testAllSources(): Promise<DataSource[]> {
    console.log('Testing alternative WA mining data sources...\n');
    
    const results: DataSource[] = [];
    
    for (const source of this.sources) {
      console.log(`Testing ${source.name}...`);
      const result = await this.testSource(source);
      results.push(result);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  private async testSource(source: any): Promise<DataSource> {
    const result: DataSource = {
      name: source.name,
      url: source.url,
      type: source.type,
      accessible: false
    };

    try {
      switch (source.type) {
        case 'WFS':
          await this.testWFS(source, result);
          break;
        case 'REST':
          await this.testREST(source, result);
          break;
        case 'CKAN':
          await this.testCKAN(source, result);
          break;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${result.error}`);
    }

    return result;
  }

  private async testWFS(source: any, result: DataSource): Promise<void> {
    const capabilitiesUrl = `${source.url}?service=WFS&request=GetCapabilities&version=2.0.0`;
    
    const response = await fetch(capabilitiesUrl, {
      headers: {
        'User-Agent': 'Indigenous-Australia-Map/1.0',
        'Accept': 'application/xml'
      }
    });

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      console.log(`  ❌ Failed: ${result.error}`);
      return;
    }

    const xmlText = await response.text();
    const layers = this.extractLayerNames(xmlText);
    
    result.accessible = true;
    result.dataFound = {
      layerCount: layers.length,
      layers: layers,
      xmlSize: xmlText.length
    };
    
    console.log(`  ✅ Accessible - ${layers.length} layers found`);
    if (layers.length > 0) {
      console.log(`    First 5 layers: ${layers.slice(0, 5).join(', ')}`);
    }
  }

  private async testREST(source: any, result: DataSource): Promise<void> {
    const response = await fetch(`${source.url}?f=json`, {
      headers: {
        'User-Agent': 'Indigenous-Australia-Map/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      console.log(`  ❌ Failed: ${result.error}`);
      return;
    }

    const data = await response.json() as any;
    
    result.accessible = true;
    result.dataFound = {
      serviceName: data.serviceDescription || data.mapName,
      layers: data.layers?.length || 0,
      capabilities: data.capabilities
    };
    
    console.log(`  ✅ Accessible - Service: ${data.serviceDescription || 'Unknown'}`);
    console.log(`    Layers: ${data.layers?.length || 0}`);
  }

  private async testCKAN(source: any, result: DataSource): Promise<void> {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Indigenous-Australia-Map/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      console.log(`  ❌ Failed: ${result.error}`);
      return;
    }

    const data = await response.json() as any;
    
    result.accessible = true;
    result.dataFound = {
      datasetCount: data.result?.count || 0,
      datasets: data.result?.results?.slice(0, 3).map((pkg: any) => ({
        name: pkg.name,
        title: pkg.title,
        resources: pkg.resources?.length || 0
      })) || []
    };
    
    console.log(`  ✅ Accessible - ${data.result?.count || 0} datasets found`);
  }

  private extractLayerNames(xmlText: string): string[] {
    const layers: string[] = [];
    
    // Extract all layer names from WFS capabilities
    const nameRegex = /<(?:wfs:)?Name[^>]*>([^<]+)<\/(?:wfs:)?Name>/gi;
    let match;
    
    while ((match = nameRegex.exec(xmlText)) !== null) {
      const layerName = match[1].trim();
      if (layerName && !layerName.includes(':') || layerName.includes('mining') || layerName.includes('tenement')) {
        layers.push(layerName);
      }
    }
    
    return layers;
  }

  generateSourceReport(results: DataSource[]): void {
    console.log('\n=== ALTERNATIVE MINING DATA SOURCES REPORT ===\n');
    
    const accessible = results.filter(r => r.accessible);
    const failed = results.filter(r => !r.accessible);
    
    console.log(`✅ Accessible sources: ${accessible.length}/${results.length}`);
    console.log(`❌ Failed sources: ${failed.length}/${results.length}\n`);
    
    if (accessible.length > 0) {
      console.log('ACCESSIBLE SOURCES:\n');
      
      accessible.forEach(source => {
        console.log(`📡 ${source.name} (${source.type})`);
        console.log(`   URL: ${source.url}`);
        
        if (source.type === 'WFS' && source.dataFound) {
          console.log(`   Layers: ${source.dataFound.layerCount}`);
          if (source.dataFound.layers.length > 0) {
            console.log(`   Sample layers: ${source.dataFound.layers.slice(0, 3).join(', ')}`);
          }
        }
        
        if (source.type === 'REST' && source.dataFound) {
          console.log(`   Service: ${source.dataFound.serviceName}`);
          console.log(`   Layers: ${source.dataFound.layers}`);
        }
        
        if (source.type === 'CKAN' && source.dataFound) {
          console.log(`   Datasets: ${source.dataFound.datasetCount}`);
          source.dataFound.datasets.forEach((ds: any) => {
            console.log(`   - ${ds.title} (${ds.resources} resources)`);
          });
        }
        
        console.log('');
      });
    }
    
    if (failed.length > 0) {
      console.log('FAILED SOURCES:\n');
      failed.forEach(source => {
        console.log(`❌ ${source.name}`);
        console.log(`   Error: ${source.error}\n`);
      });
    }
    
    console.log('=== RECOMMENDATIONS ===');
    
    const wfsSources = accessible.filter(s => s.type === 'WFS');
    const restSources = accessible.filter(s => s.type === 'REST');
    const ckanSources = accessible.filter(s => s.type === 'CKAN');
    
    if (wfsSources.length > 0) {
      console.log('✅ WFS services available for direct spatial data access');
    }
    if (restSources.length > 0) {
      console.log('✅ REST services available for map layer integration');
    }
    if (ckanSources.length > 0) {
      console.log('✅ CKAN APIs available for dataset discovery');
    }
    
    if (accessible.length === 0) {
      console.log('❌ No accessible data sources found');
      console.log('🔐 Authentication may be required for DEMIRS data');
      console.log('📞 Contact DEMIRS for API access credentials');
    } else {
      console.log('🚀 Integration possible with accessible sources');
      console.log('⚡ Recommend hybrid approach using multiple sources');
    }
  }
}

export async function testAlternativeMiningsources() {
  const tester = new AlternativeMiningSourceTester();
  
  try {
    const results = await tester.testAllSources();
    tester.generateSourceReport(results);
    
    return results;
    
  } catch (error) {
    console.error('Alternative source testing failed:', error);
    return [];
  }
}