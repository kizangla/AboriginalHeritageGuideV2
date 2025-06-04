/**
 * Examine Structure of Public Mining Datasets
 * Analyzes actual data structure from WA CKAN API responses
 */

import fetch from 'node-fetch';

interface DatasetStructure {
  datasetId: string;
  title: string;
  organization: string;
  resources: ResourceStructure[];
  tags: string[];
  spatialCoverage?: string;
  temporalCoverage?: string;
}

interface ResourceStructure {
  id: string;
  name: string;
  format: string;
  url: string;
  size?: number;
  description: string;
  isAccessible: boolean;
  sampleData?: any;
}

export class DatasetStructureExaminer {
  private ckanEndpoint = 'https://catalogue.data.wa.gov.au/api/3/action';

  async examinePublicDatasets(): Promise<DatasetStructure[]> {
    console.log('Examining structure of public mining datasets...\n');
    
    // Get specific high-value mining datasets
    const targetDatasets = await this.findTargetDatasets();
    const structures: DatasetStructure[] = [];
    
    for (const dataset of targetDatasets.slice(0, 5)) { // Limit to first 5 for examination
      console.log(`\n=== EXAMINING: ${dataset.title} ===`);
      const structure = await this.analyzeDatasetStructure(dataset);
      if (structure) {
        structures.push(structure);
      }
    }
    
    return structures;
  }

  private async findTargetDatasets(): Promise<any[]> {
    try {
      const searchUrl = `${this.ckanEndpoint}/package_search?q=mining+tenements&rows=20`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Indigenous-Australia-Map/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('Failed to search datasets');
        return [];
      }

      const data = await response.json() as any;
      return data.result?.results || [];
      
    } catch (error) {
      console.error('Error finding target datasets:', error);
      return [];
    }
  }

  private async analyzeDatasetStructure(dataset: any): Promise<DatasetStructure | null> {
    try {
      console.log(`Dataset ID: ${dataset.id}`);
      console.log(`Title: ${dataset.title}`);
      console.log(`Organization: ${dataset.organization?.title || 'Unknown'}`);
      console.log(`Resources: ${dataset.resources?.length || 0}`);
      console.log(`Tags: ${dataset.tags?.map((t: any) => t.name).join(', ') || 'None'}`);
      
      // Analyze each resource
      const resourceStructures: ResourceStructure[] = [];
      
      if (dataset.resources && dataset.resources.length > 0) {
        console.log('\nRESOURCES:');
        
        for (const [index, resource] of dataset.resources.entries()) {
          console.log(`\n  Resource ${index + 1}:`);
          console.log(`    Name: ${resource.name || 'Unnamed'}`);
          console.log(`    Format: ${resource.format || 'Unknown'}`);
          console.log(`    URL: ${resource.url || 'No URL'}`);
          console.log(`    Size: ${resource.size ? `${Math.round(resource.size / 1024)}KB` : 'Unknown'}`);
          console.log(`    Description: ${(resource.description || '').substring(0, 100)}...`);
          
          const resourceStructure: ResourceStructure = {
            id: resource.id,
            name: resource.name || 'Unnamed',
            format: resource.format || 'Unknown',
            url: resource.url || '',
            size: resource.size,
            description: resource.description || '',
            isAccessible: false
          };
          
          // Test accessibility and get sample data
          if (resource.url) {
            const sampleData = await this.getSampleData(resource);
            resourceStructure.isAccessible = sampleData !== null;
            resourceStructure.sampleData = sampleData;
          }
          
          resourceStructures.push(resourceStructure);
        }
      }
      
      const structure: DatasetStructure = {
        datasetId: dataset.id,
        title: dataset.title,
        organization: dataset.organization?.title || 'Unknown',
        resources: resourceStructures,
        tags: dataset.tags?.map((t: any) => t.name) || [],
        spatialCoverage: dataset.spatial_coverage,
        temporalCoverage: dataset.temporal_coverage
      };
      
      return structure;
      
    } catch (error) {
      console.error(`Error analyzing dataset ${dataset.id}:`, error);
      return null;
    }
  }

  private async getSampleData(resource: any): Promise<any> {
    try {
      console.log(`    Testing accessibility...`);
      
      // Skip very large files
      if (resource.size && resource.size > 50 * 1024 * 1024) { // 50MB
        console.log(`    Skipping large file (${Math.round(resource.size / 1024 / 1024)}MB)`);
        return { note: 'File too large for sample extraction' };
      }
      
      const response = await fetch(resource.url, {
        method: 'HEAD', // Just check headers first
        headers: {
          'User-Agent': 'Indigenous-Australia-Map/1.0'
        }
      });
      
      if (!response.ok) {
        console.log(`    ❌ Not accessible: ${response.status}`);
        return null;
      }
      
      console.log(`    ✅ Accessible (${response.headers.get('content-type')})`);
      
      // For specific formats, try to get sample data
      const format = resource.format?.toLowerCase();
      
      if (format === 'json' || format === 'geojson') {
        return await this.getSampleJSON(resource.url);
      } else if (format === 'csv') {
        return await this.getSampleCSV(resource.url);
      } else if (format === 'xml') {
        return await this.getSampleXML(resource.url);
      } else if (resource.url.includes('wfs')) {
        return await this.getSampleWFS(resource.url);
      }
      
      return { 
        accessible: true, 
        contentType: response.headers.get('content-type'),
        size: response.headers.get('content-length')
      };
      
    } catch (error) {
      console.log(`    ❌ Error: ${error}`);
      return null;
    }
  }

  private async getSampleJSON(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Indigenous-Australia-Map/1.0' }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // Return structure info for GeoJSON
      if (data.type === 'FeatureCollection') {
        const sample = {
          type: 'GeoJSON FeatureCollection',
          totalFeatures: data.features?.length || 0,
          sampleFeature: data.features?.[0] ? {
            properties: Object.keys(data.features[0].properties || {}),
            geometryType: data.features[0].geometry?.type
          } : null
        };
        
        console.log(`    📊 GeoJSON: ${sample.totalFeatures} features`);
        if (sample.sampleFeature) {
          console.log(`    📋 Properties: ${sample.sampleFeature.properties.join(', ')}`);
          console.log(`    🗺️ Geometry: ${sample.sampleFeature.geometryType}`);
        }
        
        return sample;
      }
      
      return { type: 'JSON', structure: Object.keys(data) };
      
    } catch (error) {
      console.log(`    JSON parsing error: ${error}`);
      return null;
    }
  }

  private async getSampleCSV(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Indigenous-Australia-Map/1.0' }
      });
      
      if (!response.ok) return null;
      
      const text = await response.text();
      const lines = text.split('\n').slice(0, 5); // First 5 lines
      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      
      console.log(`    📋 CSV Headers: ${headers.join(', ')}`);
      console.log(`    📊 Estimated rows: ${text.split('\n').length}`);
      
      return {
        type: 'CSV',
        headers,
        sampleRows: lines.slice(1, 3),
        estimatedRows: text.split('\n').length
      };
      
    } catch (error) {
      console.log(`    CSV parsing error: ${error}`);
      return null;
    }
  }

  private async getSampleXML(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Indigenous-Australia-Map/1.0' }
      });
      
      if (!response.ok) return null;
      
      const text = await response.text();
      const rootElement = text.match(/<(\w+)[^>]*>/)?.[1];
      
      console.log(`    📄 XML Root: ${rootElement}`);
      console.log(`    📏 Size: ${Math.round(text.length / 1024)}KB`);
      
      return {
        type: 'XML',
        rootElement,
        size: text.length
      };
      
    } catch (error) {
      console.log(`    XML parsing error: ${error}`);
      return null;
    }
  }

  private async getSampleWFS(url: string): Promise<any> {
    try {
      // Try GetCapabilities on WFS endpoint
      const capabilitiesUrl = url.includes('?') 
        ? `${url}&service=WFS&request=GetCapabilities`
        : `${url}?service=WFS&request=GetCapabilities`;
      
      const response = await fetch(capabilitiesUrl, {
        headers: { 'User-Agent': 'Indigenous-Australia-Map/1.0' }
      });
      
      if (!response.ok) return null;
      
      const xml = await response.text();
      const layerNames = this.extractWFSLayers(xml);
      
      console.log(`    🌐 WFS Layers: ${layerNames.join(', ')}`);
      
      return {
        type: 'WFS',
        layers: layerNames,
        endpoint: url
      };
      
    } catch (error) {
      console.log(`    WFS error: ${error}`);
      return null;
    }
  }

  private extractWFSLayers(xml: string): string[] {
    const layers: string[] = [];
    const nameRegex = /<(?:wfs:)?Name[^>]*>([^<]+)<\/(?:wfs:)?Name>/gi;
    let match;
    
    while ((match = nameRegex.exec(xml)) !== null) {
      layers.push(match[1].trim());
    }
    
    return layers;
  }

  generateStructureReport(structures: DatasetStructure[]): void {
    console.log('\n\n=== DATASET STRUCTURE ANALYSIS REPORT ===\n');
    
    console.log(`Examined ${structures.length} public mining datasets\n`);
    
    structures.forEach((structure, index) => {
      console.log(`${index + 1}. ${structure.title}`);
      console.log(`   Organization: ${structure.organization}`);
      console.log(`   Total Resources: ${structure.resources.length}`);
      
      const accessibleResources = structure.resources.filter(r => r.isAccessible);
      console.log(`   Accessible Resources: ${accessibleResources.length}`);
      
      const spatialFormats = structure.resources
        .filter(r => ['geojson', 'shp', 'kml', 'wfs'].includes(r.format.toLowerCase()))
        .map(r => r.format);
      
      if (spatialFormats.length > 0) {
        console.log(`   Spatial Data: ${spatialFormats.join(', ')}`);
      }
      
      // Show sample data insights
      structure.resources.forEach(resource => {
        if (resource.sampleData && resource.isAccessible) {
          console.log(`   Resource: ${resource.name}`);
          if (resource.sampleData.type === 'GeoJSON FeatureCollection') {
            console.log(`     - ${resource.sampleData.totalFeatures} spatial features`);
            console.log(`     - Properties: ${resource.sampleData.sampleFeature?.properties.join(', ')}`);
          }
          if (resource.sampleData.type === 'CSV') {
            console.log(`     - ${resource.sampleData.estimatedRows} rows`);
            console.log(`     - Headers: ${resource.sampleData.headers.join(', ')}`);
          }
        }
      });
      
      console.log('');
    });
    
    console.log('=== INTEGRATION ASSESSMENT ===');
    
    const totalResources = structures.reduce((sum, s) => sum + s.resources.length, 0);
    const accessibleResources = structures.reduce((sum, s) => 
      sum + s.resources.filter(r => r.isAccessible).length, 0);
    
    console.log(`Total resources examined: ${totalResources}`);
    console.log(`Accessible resources: ${accessibleResources}`);
    
    const spatialDatasets = structures.filter(s => 
      s.resources.some(r => ['geojson', 'shp', 'kml', 'wfs'].includes(r.format.toLowerCase()))
    );
    
    console.log(`Datasets with spatial data: ${spatialDatasets.length}`);
    
    if (spatialDatasets.length > 0) {
      console.log('\n✅ Spatial mining data integration feasible');
      console.log('✅ Tenement boundary overlay possible');
      console.log('✅ Conflict analysis with Aboriginal territories viable');
    }
  }
}

export async function examineDatasetStructures() {
  const examiner = new DatasetStructureExaminer();
  
  try {
    const structures = await examiner.examinePublicDatasets();
    examiner.generateStructureReport(structures);
    
    return structures;
    
  } catch (error) {
    console.error('Dataset structure examination failed:', error);
    return [];
  }
}