import { db } from './db';
import { supplyNationBusinesses } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import type { SupplyNationBusiness } from './supply-nation-scraper';

export class SupplyNationCache {
  private static readonly CACHE_DURATION_HOURS = 24; // Cache for 24 hours

  /**
   * Store scraped Supply Nation businesses in the database
   */
  async storeBusiness(business: SupplyNationBusiness): Promise<void> {
    try {
      const businessData = {
        abn: business.abn,
        companyName: business.companyName,
        verified: business.verified ? 1 : 0,
        categories: business.categories,
        location: business.location,
        email: business.contactInfo?.email,
        phone: business.contactInfo?.phone,
        website: business.contactInfo?.website,
        description: business.description,
        supplynationId: business.supplynationId,
        capabilities: business.capabilities || [],
        certifications: business.certifications || [],
        lastScraped: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await db.insert(supplyNationBusinesses)
        .values(businessData)
        .onConflictDoUpdate({
          target: supplyNationBusinesses.supplynationId,
          set: {
            companyName: businessData.companyName,
            categories: businessData.categories,
            location: businessData.location,
            email: businessData.email,
            phone: businessData.phone,
            website: businessData.website,
            description: businessData.description,
            capabilities: businessData.capabilities,
            certifications: businessData.certifications,
            lastScraped: businessData.lastScraped
          }
        });

      console.log(`Cached Supply Nation business: ${business.companyName}`);
    } catch (error) {
      console.error(`Error caching business ${business.companyName}:`, error);
    }
  }

  /**
   * Store multiple businesses in a batch
   */
  async storeBusinesses(businesses: SupplyNationBusiness[]): Promise<void> {
    console.log(`Caching ${businesses.length} Supply Nation businesses to database`);
    
    for (const business of businesses) {
      await this.storeBusiness(business);
    }

    console.log(`Successfully cached ${businesses.length} businesses`);
  }

  /**
   * Search cached Supply Nation businesses
   */
  async searchCachedBusinesses(query: string): Promise<SupplyNationBusiness[]> {
    try {
      const cacheExpiry = new Date();
      cacheExpiry.setHours(cacheExpiry.getHours() - SupplyNationCache.CACHE_DURATION_HOURS);

      const results = await db.select()
        .from(supplyNationBusinesses)
        .where(
          and(
            gte(supplyNationBusinesses.lastScraped, cacheExpiry.toISOString())
          )
        );

      // Filter results by query match
      const filteredResults = results.filter(business => 
        business.companyName.toLowerCase().includes(query.toLowerCase()) ||
        (business.abn && business.abn.includes(query)) ||
        (business.categories && business.categories.some(cat => 
          cat.toLowerCase().includes(query.toLowerCase())
        ))
      );

      console.log(`Found ${filteredResults.length} cached businesses for query: ${query}`);
      
      return filteredResults.map(this.convertDbToSupplyNationBusiness);
    } catch (error) {
      console.error('Error searching cached businesses:', error);
      return [];
    }
  }

  /**
   * Get business by ABN from cache
   */
  async getBusinessByABN(abn: string): Promise<SupplyNationBusiness | null> {
    try {
      const cacheExpiry = new Date();
      cacheExpiry.setHours(cacheExpiry.getHours() - SupplyNationCache.CACHE_DURATION_HOURS);

      const [result] = await db.select()
        .from(supplyNationBusinesses)
        .where(
          and(
            eq(supplyNationBusinesses.abn, abn),
            gte(supplyNationBusinesses.lastScraped, cacheExpiry.toISOString())
          )
        );

      return result ? this.convertDbToSupplyNationBusiness(result) : null;
    } catch (error) {
      console.error(`Error getting cached business by ABN ${abn}:`, error);
      return null;
    }
  }

  /**
   * Check if we have fresh data for a query
   */
  async hasFreshData(query: string): Promise<boolean> {
    try {
      const cacheExpiry = new Date();
      cacheExpiry.setHours(cacheExpiry.getHours() - SupplyNationCache.CACHE_DURATION_HOURS);

      const results = await db.select({ count: supplyNationBusinesses.id })
        .from(supplyNationBusinesses)
        .where(
          gte(supplyNationBusinesses.lastScraped, cacheExpiry.toISOString())
        );

      return results.length > 0;
    } catch (error) {
      console.error('Error checking cache freshness:', error);
      return false;
    }
  }

  /**
   * Convert database record to SupplyNationBusiness format
   */
  private convertDbToSupplyNationBusiness(dbRecord: any): SupplyNationBusiness {
    return {
      abn: dbRecord.abn,
      companyName: dbRecord.companyName,
      verified: dbRecord.verified === 1,
      categories: dbRecord.categories || [],
      location: dbRecord.location || '',
      contactInfo: {
        email: dbRecord.email,
        phone: dbRecord.phone,
        website: dbRecord.website
      },
      description: dbRecord.description,
      supplynationId: dbRecord.supplynationId,
      capabilities: dbRecord.capabilities || [],
      certifications: dbRecord.certifications || []
    };
  }

  /**
   * Clear old cached data
   */
  async clearOldCache(): Promise<void> {
    try {
      const cacheExpiry = new Date();
      cacheExpiry.setHours(cacheExpiry.getHours() - SupplyNationCache.CACHE_DURATION_HOURS);

      await db.delete(supplyNationBusinesses)
        .where(sql`${supplyNationBusinesses.createdAt} < ${cacheExpiry.toISOString()}`);

      console.log('Cleared old Supply Nation cache data');
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }
}

export const supplyNationCache = new SupplyNationCache();