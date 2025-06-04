import { examineDatasetStructures } from './examine-dataset-structure';

async function main() {
  console.log('Examining public mining dataset structures...\n');
  
  const structures = await examineDatasetStructures();
  
  console.log('\n=== EXAMINATION COMPLETE ===');
  console.log(`Structures analyzed: ${structures.length}`);
}

main().catch(console.error);