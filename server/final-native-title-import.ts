/**
 * Final Native Title Import - Complete the remaining applications
 */

import { db } from './db';
import { nativeTitleClaims } from '@shared/schema';
import fetch from 'node-fetch';

async function finalImportRemainingClaims() {
  console.log('Starting final import to complete Native Title dataset...');
  
  try {
    // Get existing tribunal numbers
    const existing = await db.select({ tribunalNumber: nativeTitleClaims.tribunalNumber }).from(nativeTitleClaims);
    const existingNumbers = new Set(existing.map(e => e.tribunalNumber).filter(Boolean));
    
    console.log(`Current database contains ${existingNumbers.size} Native Title applications`);
    
    // Download complete dataset
    const response = await fetch('https://data.gov.au/geoserver/native-title-determination-applications-register/wfs?request=GetFeature&typeName=ckan_00602301_ad90_4657_abd9_8025d9bf485a&outputFormat=json');
    const data = await response.json() as any;
    const features = data.features || [];
    
    console.log(`Government dataset contains ${features.length} total applications`);
    
    // Process in smaller chunks to avoid timeout
    const newFeatures = features.filter((feature: any) => {
      const tribunalNumber = feature.properties.TRIBID || feature.properties.Tribunal_Number;
      return tribunalNumber && !existingNumbers.has(tribunalNumber);
    });
    
    console.log(`Found ${newFeatures.length} new applications to import`);
    
    let imported = 0;
    const chunkSize = 15; // Process in smaller chunks
    
    for (let i = 0; i < newFeatures.length; i += chunkSize) {
      const chunk = newFeatures.slice(i, i + chunkSize);
      
      for (const feature of chunk) {
        try {
          const props = feature.properties;
          
          const applicationId = props.TRIBID || props.Application_ID || `claim_${Date.now()}_${imported}`;
          const tribunalNumber = props.TRIBID || props.Tribunal_Number;
          const applicantName = props.NAME || props.Applicant_Name || 'Unknown Claim';
          const status = props.STATUS || props.Status || 'Unknown';
          const state = props.JURIS || props.State || 'Unknown';
          const area = props.AREASQKM || props.Area_sqkm || null;
          const outcome = props.RTSTATUS || props.Outcome || null;
          const determinationDate = props.DATELODGED || props.Determination_Date || null;
          const registrationDate = props.DATEREG || props.Registration_Date || null;
          const lastUpdated = props.DT_EXTRACT || props.DATECURR || new Date().toISOString();
          
          const traditionalOwners = extractTraditionalOwners(applicantName);
          
          const claimData = {
            applicationId,
            tribunalNumber,
            applicantName,
            status,
            determinationDate,
            state,
            outcome,
            area,
            geometry: feature.geometry,
            traditionalOwners,
            federalCourtNumber: props.FCNO || props.Federal_Court_Number || null,
            registrationDate,
            lastUpdated,
            dataSource: 'Australian Government Native Title Tribunal'
          };
          
          await db.insert(nativeTitleClaims).values(claimData);
          imported++;
          
        } catch (error) {
          console.error(`Error processing application:`, error);
        }
      }
      
      console.log(`Imported ${imported} applications (chunk ${Math.floor(i/chunkSize) + 1})`);
      
      // Break if we've imported enough for this session
      if (imported >= 30) {
        console.log('Session limit reached, saving progress...');
        break;
      }
    }
    
    // Final verification
    const finalCount = await db.select().from(nativeTitleClaims);
    console.log(`\nFinal Import Results:`);
    console.log(`- New applications imported: ${imported}`);
    console.log(`- Total in database: ${finalCount.length}`);
    console.log(`- Government dataset total: ${features.length}`);
    console.log(`- Coverage: ${((finalCount.length / features.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Final import failed:', error);
  }
}

function extractTraditionalOwners(applicantName: string): string[] {
  if (!applicantName) return [];
  
  const patterns = [
    /(.+?)\s+People/gi,
    /(.+?)\s+Nation/gi,
    /(.+?)\s+Clan/gi,
    /(.+?)\s+Group/gi,
    /(.+?)\s+Community/gi
  ];

  for (const pattern of patterns) {
    const match = applicantName.match(pattern);
    if (match && match[1]) {
      return [match[1].trim()];
    }
  }

  return [applicantName];
}

finalImportRemainingClaims()
  .then(() => {
    console.log('Final Native Title import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Final import failed:', error);
    process.exit(1);
  });