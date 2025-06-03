/**
 * Debug script to examine Native Title Determinations property structure
 */

import fetch from 'node-fetch';

async function debugDeterminationsProperties() {
  console.log('Debugging Native Title Determinations properties...');
  
  try {
    const response = await fetch('https://data.gov.au/geoserver/native-title-determinations-national-native-title-register/wfs?request=GetFeature&typeName=ckan_ecdbbb6c_c374_4649_9cd3_0677f44182c9&outputFormat=json&maxFeatures=5');
    
    if (!response.ok) {
      console.log('Response status:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json() as any;
    console.log('Total determinations available:', data.features?.length || 0);
    
    if (data.features && data.features.length > 0) {
      console.log('\n=== SAMPLE DETERMINATION PROPERTIES ===');
      
      // Show properties from first determination
      const sample = data.features[0];
      const props = sample.properties;
      
      console.log('All available properties:');
      Object.keys(props).sort().forEach(key => {
        console.log(`  ${key}: ${props[key]}`);
      });
      
      console.log('\n=== LOOKING FOR STATUS/OUTCOME FIELDS ===');
      
      // Look for fields that might contain determination status/outcome
      const statusFields = Object.keys(props).filter(key => 
        key.toLowerCase().includes('status') ||
        key.toLowerCase().includes('outcome') ||
        key.toLowerCase().includes('result') ||
        key.toLowerCase().includes('determination') ||
        key.toLowerCase().includes('decision')
      );
      
      console.log('Potential status/outcome fields:', statusFields);
      
      statusFields.forEach(field => {
        console.log(`  ${field}: ${props[field]}`);
      });
      
      console.log('\n=== CHECKING MULTIPLE DETERMINATIONS ===');
      
      // Check first 3 determinations for status variations
      data.features.slice(0, 3).forEach((feature: any, i: number) => {
        console.log(`\nDetermination ${i + 1}:`);
        console.log(`  NAME: ${feature.properties.NAME || 'N/A'}`);
        console.log(`  TRIBID: ${feature.properties.TRIBID || 'N/A'}`);
        
        statusFields.forEach(field => {
          if (feature.properties[field]) {
            console.log(`  ${field}: ${feature.properties[field]}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('Error debugging determinations:', error);
  }
}

debugDeterminationsProperties()
  .then(() => {
    console.log('\nDebugging complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
  });