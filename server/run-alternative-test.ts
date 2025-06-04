import { testAlternativeMiningsources } from './test-alternative-mining-sources';

async function main() {
  console.log('Testing alternative WA mining data sources...\n');
  
  const results = await testAlternativeMiningsources();
  
  console.log('\n=== ALTERNATIVE SOURCE TEST COMPLETE ===');
  console.log(`Total sources tested: ${results.length}`);
  console.log(`Accessible sources: ${results.filter(r => r.accessible).length}`);
  console.log(`Failed sources: ${results.filter(r => !r.accessible).length}`);
}

main().catch(console.error);