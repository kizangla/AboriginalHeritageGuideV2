import { analyzeMiningDataSources } from './wa-mining-data-analysis';

async function main() {
  console.log('Starting WA Mining Data Analysis...\n');
  
  const report = await analyzeMiningDataSources();
  
  if (report) {
    console.log('\n=== FINAL REPORT ===');
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('Analysis failed');
  }
}

main().catch(console.error);