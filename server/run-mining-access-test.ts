import { testWAMiningAccess } from './test-wa-mining-access';

async function main() {
  console.log('Starting WA DEMIRS WFS Access Test...\n');
  
  const results = await testWAMiningAccess();
  
  console.log('\n=== TEST COMPLETE ===');
  console.log(`Tested ${results.length} endpoints`);
  console.log(`Accessible: ${results.filter(r => r.accessible).length}`);
  console.log(`Failed: ${results.filter(r => !r.accessible).length}`);
}

main().catch(console.error);