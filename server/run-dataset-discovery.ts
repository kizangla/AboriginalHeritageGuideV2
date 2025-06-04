import { discoverMiningDatasets } from './discover-mining-datasets';

async function main() {
  console.log('Starting mining dataset discovery...\n');
  
  const datasets = await discoverMiningDatasets();
  
  console.log('\n=== DISCOVERY COMPLETE ===');
  console.log(`Total datasets discovered: ${datasets.length}`);
  console.log(`Datasets with spatial data: ${datasets.filter(d => d.spatialFormats.length > 0).length}`);
  console.log(`Datasets with WFS endpoints: ${datasets.filter(d => d.wfsEndpoints.length > 0).length}`);
}

main().catch(console.error);