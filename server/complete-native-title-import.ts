/**
 * Complete Native Title Data Import - All 102 Applications
 * Downloads and imports the full dataset from Australian Government
 */

import { db } from './db';
import { nativeTitleClaims } from '@shared/schema';
import fetch from 'node-fetch';

interface NativeTitleFeature {
  type: string;
  properties: {
    [key: string]: any;
  };
  geometry: any;
}

async function importCompleteNativeTitleDataset() {
  console.log('Starting complete Native Title dataset import...');
  
  try {
    // Download complete dataset
    const response = await fetch('https://data.gov.au/geoserver/native-title-determination-applications-register/wfs?request=GetFeature&typeName=ckan_00602301_ad90_4657_abd9_8025d9bf485a&outputFormat=json');
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const features = data.features || [];
    
    console.log(`Processing ${features.length} Native Title applications from Australian Government...`);
    
    let imported = 0;
    let errors = 0;
    
    for (const feature of features) {
      try {
        const props = feature.properties;
        
        // Map Australian Government property names to our schema
        const applicationId = props.TRIBID || props.Application_ID || `claim_${Date.now()}_${imported}`;
        const tribunalNumber = props.TRIBID || props.Tribunal_Number || null;
        const applicantName = props.NAME || props.Applicant_Name || 'Unknown Claim';
        const status = props.STATUS || props.Status || 'Unknown';
        const state = props.JURIS || props.State || 'Unknown';
        const area = props.AREASQKM || props.Area_sqkm || null;
        const outcome = props.RTSTATUS || props.Outcome || null;
        const determinationDate = props.DATELODGED || props.Determination_Date || null;
        const registrationDate = props.DATEREG || props.Registration_Date || null;
        const lastUpdated = props.DT_EXTRACT || props.DATECURR || new Date().toISOString();
        
        // Extract traditional owners from applicant name
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
        
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} applications...`);
        }
        
      } catch (error) {
        console.error(`Error processing application:`, error);
        errors++;
      }
    }
    
    console.log(`\nImport Complete:`);
    console.log(`- Successfully imported: ${imported} Native Title applications`);
    console.log(`- Errors: ${errors}`);
    console.log(`- Total in government dataset: ${features.length}`);
    
    // Verify import
    const verifyResult = await db.select().from(nativeTitleClaims);
    console.log(`- Verified in database: ${verifyResult.length} records`);
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

function extractTraditionalOwners(applicantName: string): string[] {
  if (!applicantName) return [];
  
  // Common patterns in Native Title applicant names
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

  // Fallback: return the full applicant name
  return [applicantName];
}

// Run the import
importCompleteNativeTitleDataset()
  .then(() => {
    console.log('Native Title import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Native Title import failed:', error);
    process.exit(1);
  });