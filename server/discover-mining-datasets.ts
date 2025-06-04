/**
 * CKAN Mining Dataset Discovery
 * Explores available mining datasets through WA Data Catalogue API
 */

import fetch from 'node-fetch';

interface CKANDataset {
  id: string;
  name: string;
  title: string;
  notes: string;
  organization: {
    name: string;
    title: string;
  };
  resources: CKANResource[];
  tags: Array<{ name: string }>;
  metadata_created: string;
  metadata_modified: string;
}

interface CKANResource {
  id: string;
  name: string;
  description: string;
  format: string;
  url: string;
  size?: number;
  created: string;
  last_modified?: string;
}

interface MiningDatasetSummary {
  datasetId: string;
  title: string;
  description: string;
  organization: string;
  spatialFormats: string[];
  downloadableResources: number;
  wfsEndpoints: string[];
  relevanceScore: number;
  lastUpdated: string;
}

export class MiningDatasetDiscovery {
  private ckanEndpoints = [
    'https://catalogue.data.wa.gov.au/api/3/action',
    'https://data.wa.gov.au/api/3/action'
  ];

  async discoverMiningDatasets(): Promise<MiningDatasetSummary[]> {
    console.log('Discovering mining datasets through CKAN API...\n');
    
    const allDatasets: MiningDatasetSummary[] = [];
    
    for (const endpoint of this.ckanEndpoints) {
      console.log(`Searching ${endpoint}...`);
      const datasets = await this.searchMiningDatasets(endpoint);
      allDatasets.push(...datasets);
    }
    
    // Remove duplicates and sort by relevance
    const uniqueDatasets = this.deduplicateDatasets(allDatasets);
    const sortedDatasets = uniqueDatasets.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return sortedDatasets;
  }

  private async searchMiningDatasets(endpoint: string): Promise<MiningDatasetSummary[]> {
    const datasets: MiningDatasetSummary[] = [];
    
    try {
      // Search for mining-related datasets
      const searchTerms = [
        'mining tenements',
        'mining leases', 
        'mineral exploration',
        'demirs mining',
        'extractive industries',
        'mining operations'
      ];
      
      for (const term of searchTerms) {
        console.log(`  Searching for: "${term}"`);
        const results = await this.performSearch(endpoint, term);
        
        if (results) {
          console.log(`    Found ${results.length} datasets`);
          datasets.push(...results);
        }
        
        // Small delay between searches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`Error searching ${endpoint}:`, error);
    }
    
    return datasets;
  }

  private async performSearch(endpoint: string, query: string): Promise<MiningDatasetSummary[]> {
    try {
      const searchUrl = `${endpoint}/package_search?q=${encodeURIComponent(query)}&rows=50`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Indigenous-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`    Search failed: ${response.status}`);
        return [];
      }

      const data = await response.json() as any;
      const packages = data.result?.results || [];
      
      return packages.map((pkg: any) => this.analyzeDataset(pkg));
      
    } catch (error) {
      console.log(`    Search error: ${error}`);
      return [];
    }
  }

  private analyzeDataset(dataset: any): MiningDatasetSummary {
    const resources = dataset.resources || [];
    
    // Identify spatial formats
    const spatialFormats = resources
      .map((r: any) => r.format?.toUpperCase())
      .filter((format: string) => 
        ['SHP', 'KML', 'GEOJSON', 'WFS', 'WMS', 'GPKG', 'TAB'].includes(format)
      );
    
    // Find WFS endpoints
    const wfsEndpoints = resources
      .filter((r: any) => 
        r.format?.toLowerCase() === 'wfs' || 
        r.url?.toLowerCase().includes('wfs') ||
        r.name?.toLowerCase().includes('wfs')
      )
      .map((r: any) => r.url);
    
    // Calculate relevance score
    const relevanceScore = this.calculateRelevance(dataset, resources);
    
    return {
      datasetId: dataset.id,
      title: dataset.title || dataset.name,
      description: (dataset.notes || '').substring(0, 200),
      organization: dataset.organization?.title || 'Unknown',
      spatialFormats: [...new Set(spatialFormats)],
      downloadableResources: resources.length,
      wfsEndpoints,
      relevanceScore,
      lastUpdated: dataset.metadata_modified || dataset.metadata_created
    };
  }

  private calculateRelevance(dataset: any, resources: any[]): number {
    let score = 0;
    
    const title = (dataset.title || '').toLowerCase();
    const description = (dataset.notes || '').toLowerCase();
    const tags = (dataset.tags || []).map((t: any) => t.name.toLowerCase());
    
    // High-value keywords
    const highValueTerms = ['tenement', 'mining lease', 'mineral title', 'exploration permit'];
    const mediumValueTerms = ['mining', 'mineral', 'extraction', 'demirs'];
    const lowValueTerms = ['industry', 'resource', 'land use'];
    
    // Score based on keywords
    highValueTerms.forEach(term => {
      if (title.includes(term)) score += 10;
      if (description.includes(term)) score += 5;
      if (tags.some(tag => tag.includes(term))) score += 3;
    });
    
    mediumValueTerms.forEach(term => {
      if (title.includes(term)) score += 5;
      if (description.includes(term)) score += 2;
      if (tags.some(tag => tag.includes(term))) score += 1;
    });
    
    lowValueTerms.forEach(term => {
      if (title.includes(term)) score += 1;
    });
    
    // Bonus for spatial data
    const hasSpatialData = resources.some((r: any) => 
      ['SHP', 'KML', 'GEOJSON', 'WFS', 'WMS'].includes(r.format?.toUpperCase())
    );
    if (hasSpatialData) score += 5;
    
    // Bonus for WFS endpoints
    if (resources.some((r: any) => r.format?.toLowerCase() === 'wfs')) score += 8;
    
    // Bonus for recent updates
    const lastUpdate = new Date(dataset.metadata_modified || dataset.metadata_created);
    const monthsOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld < 12) score += 3;
    
    return score;
  }

  private deduplicateDatasets(datasets: MiningDatasetSummary[]): MiningDatasetSummary[] {
    const seen = new Set<string>();
    return datasets.filter(dataset => {
      if (seen.has(dataset.datasetId)) {
        return false;
      }
      seen.add(dataset.datasetId);
      return true;
    });
  }

  generateDiscoveryReport(datasets: MiningDatasetSummary[]): void {
    console.log('\n=== MINING DATASETS DISCOVERY REPORT ===\n');
    
    console.log(`Total unique datasets found: ${datasets.length}\n`);
    
    // Group by organization
    const byOrg = datasets.reduce((acc, dataset) => {
      const org = dataset.organization;
      if (!acc[org]) acc[org] = [];
      acc[org].push(dataset);
      return acc;
    }, {} as Record<string, MiningDatasetSummary[]>);
    
    console.log('DATASETS BY ORGANIZATION:');
    Object.entries(byOrg).forEach(([org, orgDatasets]) => {
      console.log(`\n📊 ${org} (${orgDatasets.length} datasets)`);
      
      orgDatasets.slice(0, 3).forEach(dataset => {
        console.log(`   • ${dataset.title}`);
        console.log(`     Relevance: ${dataset.relevanceScore}/10`);
        if (dataset.spatialFormats.length > 0) {
          console.log(`     Spatial formats: ${dataset.spatialFormats.join(', ')}`);
        }
        if (dataset.wfsEndpoints.length > 0) {
          console.log(`     WFS endpoints: ${dataset.wfsEndpoints.length}`);
        }
        console.log(`     Resources: ${dataset.downloadableResources}`);
        console.log('');
      });
    });
    
    // Top datasets by relevance
    console.log('\nTOP 5 MOST RELEVANT DATASETS:');
    datasets.slice(0, 5).forEach((dataset, index) => {
      console.log(`\n${index + 1}. ${dataset.title}`);
      console.log(`   Organization: ${dataset.organization}`);
      console.log(`   Relevance Score: ${dataset.relevanceScore}`);
      console.log(`   Description: ${dataset.description}...`);
      console.log(`   Spatial Formats: ${dataset.spatialFormats.join(', ') || 'None'}`);
      console.log(`   WFS Endpoints: ${dataset.wfsEndpoints.length}`);
      console.log(`   Last Updated: ${dataset.lastUpdated}`);
    });
    
    // Summary statistics
    const withSpatialData = datasets.filter(d => d.spatialFormats.length > 0);
    const withWFS = datasets.filter(d => d.wfsEndpoints.length > 0);
    const highRelevance = datasets.filter(d => d.relevanceScore >= 15);
    
    console.log('\n=== INTEGRATION POTENTIAL ===');
    console.log(`Datasets with spatial data: ${withSpatialData.length}/${datasets.length}`);
    console.log(`Datasets with WFS endpoints: ${withWFS.length}/${datasets.length}`);
    console.log(`High relevance datasets: ${highRelevance.length}/${datasets.length}`);
    
    if (withWFS.length > 0) {
      console.log('\n✅ WFS integration possible');
      console.log('✅ Real-time mining data overlay feasible');
    }
    
    if (withSpatialData.length > 0) {
      console.log('✅ Spatial data integration available');
      console.log('✅ Mining tenement boundary overlay possible');
    }
    
    console.log('\n=== NEXT STEPS ===');
    if (withWFS.length > 0) {
      console.log('1. Test WFS endpoints for data access');
      console.log('2. Analyze spatial data structure');
      console.log('3. Implement mining layer overlay');
    } else {
      console.log('1. Download spatial datasets for analysis');
      console.log('2. Convert to compatible format');
      console.log('3. Implement static overlay integration');
    }
  }
}

export async function discoverMiningDatasets() {
  const discovery = new MiningDatasetDiscovery();
  
  try {
    const datasets = await discovery.discoverMiningDatasets();
    discovery.generateDiscoveryReport(datasets);
    
    return datasets;
    
  } catch (error) {
    console.error('Dataset discovery failed:', error);
    return [];
  }
}