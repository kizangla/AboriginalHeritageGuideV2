import { businessDatabaseService } from './business-database-service';
import { supplyNationRobustScraper } from './supply-nation-robust-scraper';
import { searchBusinessesByName, getBusinessByABN } from './abr-service';

/**
 * Cached search service that prioritizes database-stored results
 * Only falls back to external APIs when data is not in cache
 */
export class CachedSearchService {

  /**
   * Search for businesses using cached data first, external APIs as fallback
   */
  async searchBusinesses(query: string, location?: string): Promise<any> {
    console.log(`Starting cached search for: "${query}"`);
    
    // First, search our cached database
    const cachedResults = await businessDatabaseService.searchCachedBusinesses(query, location);
    
    if (cachedResults.length > 0) {
      console.log(`Found ${cachedResults.length} results in cache for "${query}"`);
      return {
        businesses: cachedResults,
        totalResults: cachedResults.length,
        dataSource: 'cached',
        searchQuery: query,
        timestamp: new Date()
      };
    }
    
    // If no cached results, extract from external sources and cache them
    console.log(`No cached results for "${query}", extracting from external sources...`);
    
    const externalResults = await this.extractAndCacheBusinesses(query, location);
    
    return {
      businesses: externalResults,
      totalResults: externalResults.length,
      dataSource: 'external_cached',
      searchQuery: query,
      timestamp: new Date()
    };
  }
  
  /**
   * Get business by ABN, checking cache first
   */
  async getBusinessByABN(abn: string): Promise<any | null> {
    console.log(`Looking up ABN: ${abn}`);
    
    // Check cache first
    const cachedBusiness = await businessDatabaseService.getBusinessByABN(abn);
    if (cachedBusiness) {
      console.log(`Found cached business for ABN: ${abn}`);
      return cachedBusiness;
    }
    
    // If not in cache, fetch from ABR and cache it
    console.log(`ABN ${abn} not in cache, fetching from ABR...`);
    try {
      const abrBusiness = await getBusinessByABN(abn);
      if (abrBusiness) {
        await businessDatabaseService.cacheABRBusiness(abrBusiness);
        return abrBusiness;
      }
    } catch (error) {
      console.error(`Error fetching ABN ${abn} from ABR:`, error);
    }
    
    return null;
  }
  
  /**
   * Extract businesses from external sources and cache them
   */
  private async extractAndCacheBusinesses(query: string, location?: string): Promise<any[]> {
    const allBusinesses: any[] = [];
    
    try {
      // Extract from ABR
      console.log(`Extracting from ABR for: "${query}"`);
      const abrResults = await searchBusinessesByName(query);
      
      if (abrResults.businesses && abrResults.businesses.length > 0) {
        // Cache ABR businesses
        for (const business of abrResults.businesses) {
          await businessDatabaseService.cacheABRBusiness(business);
        }
        allBusinesses.push(...abrResults.businesses.map(b => ({
          ...b,
          source: 'abr_fresh',
          verificationSource: 'abr_only',
          verificationConfidence: 'medium'
        })));
        
        console.log(`Cached ${abrResults.businesses.length} ABR businesses`);
      }
      
      // Extract from Supply Nation using robust scraper
      console.log(`Checking Supply Nation for relevant businesses...`);
      await this.extractSupplyNationBusinesses(query);
      
      // Re-search cache for newly added businesses
      const newCachedResults = await businessDatabaseService.searchCachedBusinesses(query, location);
      allBusinesses.push(...newCachedResults);
      
    } catch (error) {
      console.error('Error extracting and caching businesses:', error);
    }
    
    return allBusinesses;
  }
  
  /**
   * Trigger Supply Nation business extraction if needed
   */
  private async extractSupplyNationBusinesses(query: string): Promise<void> {
    try {
      // Check if we have recent Supply Nation data
      const stats = await businessDatabaseService.getCacheStatistics();
      
      if (stats.supplyNationBusinesses === 0) {
        console.log('No Supply Nation businesses in cache, triggering extraction...');
        
        await supplyNationRobustScraper.initialize();
        const businesses = await supplyNationRobustScraper.extractBusinessDirectory();
        
        if (businesses.length > 0) {
          await supplyNationRobustScraper.saveBusinessesToDatabase(businesses);
          console.log(`Extracted and cached ${businesses.length} Supply Nation businesses`);
        }
        
        await supplyNationRobustScraper.close();
      } else {
        console.log(`Using existing ${stats.supplyNationBusinesses} cached Supply Nation businesses`);
      }
    } catch (error) {
      console.error('Error extracting Supply Nation businesses:', error);
    }
  }
  
  /**
   * Force refresh of all business data
   */
  async refreshAllBusinessData(): Promise<void> {
    console.log('Starting comprehensive business data refresh...');
    
    try {
      // Extract complete Supply Nation directory
      await supplyNationRobustScraper.initialize();
      const snBusinesses = await supplyNationRobustScraper.extractBusinessDirectory();
      
      if (snBusinesses.length > 0) {
        await supplyNationRobustScraper.saveBusinessesToDatabase(snBusinesses);
        console.log(`Refreshed ${snBusinesses.length} Supply Nation businesses`);
      }
      
      await supplyNationRobustScraper.close();
      
      // Extract Indigenous businesses from ABR
      const indigenousKeywords = [
        'aboriginal', 'indigenous', 'koori', 'murri', 'yolngu', 'anangu',
        'palawa', 'nunga', 'noongar', 'torres strait', 'first nations'
      ];
      
      for (const keyword of indigenousKeywords) {
        try {
          const abrResults = await searchBusinessesByName(keyword);
          if (abrResults.businesses) {
            for (const business of abrResults.businesses) {
              await businessDatabaseService.cacheABRBusiness(business);
            }
            console.log(`Cached ${abrResults.businesses.length} ABR businesses for "${keyword}"`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error extracting ABR data for "${keyword}":`, error);
        }
      }
      
      const finalStats = await businessDatabaseService.getCacheStatistics();
      console.log('Business data refresh completed:', finalStats);
      
    } catch (error) {
      console.error('Error refreshing business data:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    return await businessDatabaseService.getCacheStatistics();
  }
}

export const cachedSearchService = new CachedSearchService();