import { supplyNationRobustScraper, SupplyNationBusinessData } from './supply-nation-robust-scraper';
import { supplyNationCache } from './supply-nation-cache';

/**
 * Bulk synchronization service for Supply Nation business directory
 * Extracts complete business listings and maintains a local database cache
 */
export class SupplyNationBulkSync {
  private isRunning: boolean = false;
  private lastSyncTimestamp: Date | null = null;

  constructor() {
    // Start weekly sync on service initialization
    this.scheduleWeeklySync();
  }

  /**
   * Schedule automatic weekly synchronization
   */
  private scheduleWeeklySync(): void {
    // Run sync every Sunday at 2 AM
    const weeklyInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    setInterval(async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const hour = now.getHours();
      
      // Only run on Sunday between 2-3 AM
      if (dayOfWeek === 0 && hour === 2) {
        console.log('Starting scheduled weekly Supply Nation sync...');
        await this.performFullSync();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Perform a complete sync of Supply Nation business directory
   */
  async performFullSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Supply Nation sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting robust Supply Nation directory extraction...');

    try {
      // Initialize the robust scraper
      await supplyNationRobustScraper.initialize();

      // Extract the complete business directory
      console.log('Extracting complete Supply Nation business directory...');
      const businesses = await supplyNationRobustScraper.extractBusinessDirectory();

      console.log(`Extracted ${businesses.length} authentic Supply Nation businesses`);

      // Save businesses directly to database
      if (businesses.length > 0) {
        console.log('Saving businesses to database...');
        await supplyNationRobustScraper.saveBusinessesToDatabase(businesses);
        console.log(`Successfully saved ${businesses.length} Supply Nation businesses to database`);
      }

      this.lastSyncTimestamp = new Date();
      console.log(`Supply Nation directory sync completed at ${this.lastSyncTimestamp.toISOString()}`);

    } catch (error) {
      console.error('Supply Nation directory sync failed:', error);
    } finally {
      await supplyNationRobustScraper.close();
      this.isRunning = false;
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus(): { isRunning: boolean; lastSync: Date | null } {
    return {
      isRunning: this.isRunning,
      lastSync: this.lastSyncTimestamp
    };
  }

  /**
   * Manually trigger a full sync (for testing or immediate updates)
   */
  async triggerManualSync(): Promise<void> {
    console.log('Manual Supply Nation sync triggered...');
    await this.performFullSync();
  }

  /**
   * Extract specific business profiles for detailed information
   */
  async extractDetailedProfiles(profileUrls: string[]): Promise<SupplyNationBusiness[]> {
    const detailedBusinesses: SupplyNationBusiness[] = [];

    for (const profileUrl of profileUrls) {
      try {
        console.log(`Extracting detailed profile: ${profileUrl}`);
        const business = await supplyNationDirect.getBusinessProfile(profileUrl);
        
        if (business) {
          detailedBusinesses.push(business);
          console.log(`Extracted detailed profile for: ${business.companyName}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error extracting profile ${profileUrl}:`, error);
      }
    }

    return detailedBusinesses;
  }

  /**
   * Search for businesses by Australian state to ensure complete coverage
   */
  async syncByState(): Promise<void> {
    const australianStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
    const allBusinesses: SupplyNationBusiness[] = [];

    for (const state of australianStates) {
      try {
        console.log(`Extracting Supply Nation businesses in ${state}...`);
        const results = await supplyNationDirect.searchBusinesses('', state);
        
        if (results.businesses.length > 0) {
          const newBusinesses = results.businesses.filter(business => 
            !allBusinesses.some(existing => 
              existing.abn === business.abn && existing.abn !== ''
            )
          );
          
          allBusinesses.push(...newBusinesses);
          console.log(`Found ${newBusinesses.length} businesses in ${state}`);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`Error syncing state ${state}:`, error);
      }
    }

    if (allBusinesses.length > 0) {
      await supplyNationCache.storeBusinesses(allBusinesses);
      console.log(`Cached ${allBusinesses.length} state-based businesses`);
    }
  }
}

export const supplyNationBulkSync = new SupplyNationBulkSync();