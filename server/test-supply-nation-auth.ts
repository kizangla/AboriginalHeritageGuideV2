import { supplyNationSimpleScraper } from './supply-nation-simple-scraper';

async function testSupplyNationAuth() {
  console.log('=== Testing Supply Nation Authentication ===');
  
  try {
    const authenticated = await supplyNationSimpleScraper.authenticate();
    
    if (authenticated) {
      console.log('✅ Authentication successful - testing search...');
      
      const businesses = await supplyNationSimpleScraper.searchVerifiedBusinesses('Maali Group');
      console.log(`Found ${businesses.length} verified businesses`);
      
      if (businesses.length > 0) {
        console.log('Sample business:', businesses[0]);
      }
    } else {
      console.log('❌ Authentication failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSupplyNationAuth();