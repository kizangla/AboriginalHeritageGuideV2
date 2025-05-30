import { db } from './db';
import { supplyNationBusinesses, abrBusinesses } from '@shared/schema';
import { eq, like, or, and } from 'drizzle-orm';

/**
 * Database service for managing cached business data
 * Serves all searches from local database instead of external APIs
 */
export class BusinessDatabaseService {
  
  /**
   * Search for businesses in local database (Supply Nation + ABR combined)
   */
  async searchCachedBusinesses(query: string, location?: string): Promise<any[]> {
    console.log(`Searching cached businesses for: "${query}"`);
    
    const businesses: any[] = [];
    
    // Search Supply Nation businesses
    const supplyNationResults = await this.searchSupplyNationCache(query, location);
    businesses.push(...supplyNationResults);
    
    // Search ABR businesses
    const abrResults = await this.searchABRCache(query, location);
    businesses.push(...abrResults);
    
    // Remove duplicates based on ABN
    const uniqueBusinesses = this.removeDuplicatesByABN(businesses);
    
    console.log(`Found ${uniqueBusinesses.length} cached businesses for "${query}"`);
    return uniqueBusinesses;
  }
  
  /**
   * Search Supply Nation cached businesses
   */
  async searchSupplyNationCache(query: string, location?: string): Promise<any[]> {
    try {
      let whereConditions = [
        like(supplyNationBusinesses.companyName, `%${query}%`),
        like(supplyNationBusinesses.tradingName, `%${query}%`),
        like(supplyNationBusinesses.description, `%${query}%`)
      ];
      
      // Add location filter if provided
      if (location) {
        whereConditions.push(
          like(supplyNationBusinesses.suburb, `%${location}%`),
          like(supplyNationBusinesses.state, `%${location}%`),
          like(supplyNationBusinesses.fullAddress, `%${location}%`)
        );
      }
      
      const results = await db.select().from(supplyNationBusinesses)
        .where(or(...whereConditions))
        .limit(50);
      
      return results.map(business => ({
        ...business,
        source: 'supply_nation_cached',
        verificationSource: 'supply_nation',
        verificationConfidence: 'high',
        supplyNationVerified: true,
        supplyNationData: business
      }));
      
    } catch (error) {
      console.error('Error searching Supply Nation cache:', error);
      return [];
    }
  }
  
  /**
   * Search ABR cached businesses
   */
  async searchABRCache(query: string, location?: string): Promise<any[]> {
    try {
      let whereConditions = [
        like(abrBusinesses.entityName, `%${query}%`),
        like(abrBusinesses.abn, `%${query}%`)
      ];
      
      // Add location filter if provided
      if (location) {
        whereConditions.push(
          like(abrBusinesses.addressSuburb, `%${location}%`),
          like(abrBusinesses.addressState, `%${location}%`),
          like(abrBusinesses.fullAddress, `%${location}%`)
        );
      }
      
      const results = await db.select().from(abrBusinesses)
        .where(or(...whereConditions))
        .limit(50);
      
      return results.map(business => ({
        abn: business.abn,
        entityName: business.entityName,
        entityType: business.entityType,
        status: business.abnStatus,
        address: {
          stateCode: business.addressState,
          postcode: business.addressPostcode,
          suburb: business.addressSuburb,
          streetAddress: business.addressStreet,
          fullAddress: business.fullAddress
        },
        gst: business.gstStatus === 1,
        dgr: business.dgrStatus === 1,
        lat: business.lat,
        lng: business.lng,
        source: 'abr_cached',
        verificationSource: 'abr_only',
        verificationConfidence: 'medium'
      }));
      
    } catch (error) {
      console.error('Error searching ABR cache:', error);
      return [];
    }
  }
  
  /**
   * Get business by ABN from cache
   */
  async getBusinessByABN(abn: string): Promise<any | null> {
    // First check Supply Nation cache
    const snBusiness = await db.select().from(supplyNationBusinesses)
      .where(eq(supplyNationBusinesses.abn, abn))
      .limit(1);
    
    if (snBusiness.length > 0) {
      return {
        ...snBusiness[0],
        source: 'supply_nation_cached',
        verificationSource: 'supply_nation',
        verificationConfidence: 'high',
        supplyNationVerified: true
      };
    }
    
    // Then check ABR cache
    const abrBusiness = await db.select().from(abrBusinesses)
      .where(eq(abrBusinesses.abn, abn))
      .limit(1);
    
    if (abrBusiness.length > 0) {
      const business = abrBusiness[0];
      return {
        abn: business.abn,
        entityName: business.entityName,
        entityType: business.entityType,
        status: business.abnStatus,
        address: {
          stateCode: business.addressState,
          postcode: business.addressPostcode,
          suburb: business.addressSuburb,
          streetAddress: business.addressStreet,
          fullAddress: business.fullAddress
        },
        gst: business.gstStatus === 1,
        dgr: business.dgrStatus === 1,
        lat: business.lat,
        lng: business.lng,
        source: 'abr_cached',
        verificationSource: 'abr_only',
        verificationConfidence: 'medium'
      };
    }
    
    return null;
  }
  
  /**
   * Store ABR business data in cache
   */
  async cacheABRBusiness(business: any): Promise<void> {
    try {
      // Check if business already exists
      const existing = await db.select().from(abrBusinesses)
        .where(eq(abrBusinesses.abn, business.abn))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(abrBusinesses).values({
          abn: business.abn,
          acn: business.acn || '',
          entityName: business.entityName,
          entityType: business.entityType,
          abnStatus: business.status,
          abnStatusEffectiveFrom: business.abnStatusEffectiveFrom || '',
          addressPostcode: business.address?.postcode || '',
          addressState: business.address?.stateCode || '',
          addressSuburb: business.address?.suburb || '',
          addressStreet: business.address?.streetAddress || '',
          fullAddress: business.address?.fullAddress || '',
          businessNames: business.businessNames || [],
          gstStatus: business.gst ? 1 : 0,
          dgrStatus: business.dgr ? 1 : 0,
          lat: business.lat,
          lng: business.lng,
          lastFetched: new Date().toISOString(),
          dataSource: 'abr'
        });
        
        console.log(`Cached ABR business: ${business.entityName}`);
      }
    } catch (error) {
      console.error(`Error caching ABR business ${business.entityName}:`, error);
    }
  }
  
  /**
   * Remove duplicate businesses based on ABN
   */
  private removeDuplicatesByABN(businesses: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];
    
    for (const business of businesses) {
      const abn = business.abn || '';
      if (abn && !seen.has(abn)) {
        seen.add(abn);
        unique.push(business);
      } else if (!abn) {
        // Include businesses without ABN (but they might be duplicates)
        unique.push(business);
      }
    }
    
    return unique;
  }
  
  /**
   * Get statistics about cached data
   */
  async getCacheStatistics(): Promise<any> {
    try {
      const supplyNationCount = await db.select().from(supplyNationBusinesses);
      const abrCount = await db.select().from(abrBusinesses);
      
      return {
        supplyNationBusinesses: supplyNationCount.length,
        abrBusinesses: abrCount.length,
        totalCachedBusinesses: supplyNationCount.length + abrCount.length,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      return {
        supplyNationBusinesses: 0,
        abrBusinesses: 0,
        totalCachedBusinesses: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

export const businessDatabaseService = new BusinessDatabaseService();