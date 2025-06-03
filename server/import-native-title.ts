/**
 * Script to import Native Title data from Australian Government
 */

import { nativeTitleImportService } from './native-title-import';

async function main() {
  try {
    console.log('Starting Native Title data import from Australian Government...');
    
    const result = await nativeTitleImportService.importNativeTitleData();
    
    console.log('Import Results:');
    console.log(`- Imported: ${result.imported} new claims`);
    console.log(`- Updated: ${result.updated} existing claims`);
    console.log(`- Errors: ${result.errors} failed records`);
    
    const status = await nativeTitleImportService.getImportStatus();
    console.log('\nDatabase Status:');
    console.log(`- Total Native Title claims: ${status.totalClaims}`);
    console.log(`- Last import: ${status.lastImport}`);
    console.log('- Status breakdown:', status.statusBreakdown);
    console.log('- State breakdown:', status.stateBreakdown);
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}