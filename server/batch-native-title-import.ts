/**
 * Batch Native Title Import - Complete remaining applications
 */

import { db } from './db';
import { nativeTitleClaims } from '@shared/schema';
import fetch from 'node-fetch';
import { eq } from 'drizzle-orm';

async function batchImportRemainingClaims() {
  console.log('Starting batch import of remaining Native Title claims...');
  
  try {
    // Get existing tribunal numbers to avoid duplicates
    const existing = await db.select({ tribunalNumber: nativeTitleClaims.tribunalNumber }).from(nativeTitleClaims);
    const existingNumbers = new Set(existing.map(e => e.tribunalNumber).filter(Boolean));
    
    console.log(`Found ${existingNumbers.size} existing claims in database`);
    
    // Download complete dataset
    const response = await fetch('https://data.gov.au/geoserver/native-title-determination-applications-register/wfs?request=GetFeature&typeName=ckan_00602301_ad90_4657_abd9_8025d9bf485a&outputFormat=json');
    const data = await response.json();
    const features = data.features || [];
    
    console.log(`Processing ${features.length} total applications from government dataset`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const feature of features) {
      const props = feature.properties;
      const tribunalNumber = props.TRIBID || props.Tribunal_Number;
      
      // Skip if already exists
      if (tribunalNumber && existingNumbers.has(tribunalNumber)) {
        skipped++;
        continue;
      }
      
      try {
        const applicationId = props.TRIBID || props.Application_ID || `claim_${Date.now()}_${imported}`;
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
        
        if (imported % 5 === 0) {
          console.log(`Imported ${imported} new applications...`);
        }
        
        // Batch processing - limit to prevent timeout
        if (imported >= 25) {
          console.log('Batch limit reached, saving progress...');
          break;
        }
        
      } catch (error) {
        console.error(`Error processing application ${tribunalNumber}:`, error);
      }
    }
    
    console.log(`\nBatch Import Results:`);
    console.log(`- New applications imported: ${imported}`);
    console.log(`- Existing applications skipped: ${skipped}`);
    
    // Final count
    const finalCount = await db.select().from(nativeTitleClaims);
    console.log(`- Total in database: ${finalCount.length}`);
    
  } catch (error) {
    console.error('Batch import failed:', error);
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

batchImportRemainingClaims()
  .then(() => {
    console.log('Batch import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Batch import failed:', error);
    process.exit(1);
  });