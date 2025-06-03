import { db } from './db';
import { eq, like, or } from 'drizzle-orm';
import { supplyNationBusinesses } from '../shared/schema';
import { SupplyNationBusiness } from './supply-nation-scraper';

/**
 * Supply Nation verification database for matching ABN data with verified Indigenous businesses
 * This approach uses authentic verification data while addressing the technical challenges
 * of dynamic content extraction from Supply Nation's website
 */
export class SupplyNationVerificationDB {
  
  /**
   * Verify if a business is Supply Nation certified by ABN or company name
   */
  async verifyBusiness(abn?: string, companyName?: string): Promise<SupplyNationBusiness | null> {
    try {
      if (!abn && !companyName) {
        return null;
      }

      let verificationRecord = null;

      // First try ABN match (most reliable)
      if (abn) {
        const [record] = await db
          .select()
          .from(supplyNationBusinesses)
          .where(eq(supplyNationBusinesses.abn, abn))
          .limit(1);
        
        if (record) {
          verificationRecord = record;
        }
      }

      // If no ABN match, try company name matching
      if (!verificationRecord && companyName) {
        const normalizedSearchName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const [record] = await db
          .select()
          .from(supplyNationBusinesses)
          .where(like(supplyNationBusinesses.company_name, `%${companyName}%`))
          .limit(1);
        
        if (record) {
          verificationRecord = record;
        }
      }

      if (verificationRecord) {
        return this.convertDbRecordToBusiness(verificationRecord);
      }

      return null;
    } catch (error) {
      console.error('Verification lookup failed:', error);
      return null;
    }
  }

  /**
   * Search for verified businesses by name or location
   */
  async searchVerifiedBusinesses(query: string): Promise<SupplyNationBusiness[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const records = await db
        .select()
        .from(supplyNationBusinesses)
        .where(
          or(
            like(supplyNationBusinesses.company_name, searchTerm),
            like(supplyNationBusinesses.location, searchTerm),
            like(supplyNationBusinesses.description, searchTerm)
          )
        )
        .limit(20);

      return records.map(record => this.convertDbRecordToBusiness(record));
    } catch (error) {
      console.error('Search verification failed:', error);
      return [];
    }
  }

  /**
   * Store verified businesses when successfully extracted
   */
  async storeVerifiedBusiness(business: SupplyNationBusiness): Promise<void> {
    try {
      await db
        .insert(supplyNationBusinesses)
        .values({
          supply_nation_id: business.supplynationId,
          company_name: business.companyName,
          abn: business.abn,
          location: business.location,
          contact_email: business.contactInfo?.email,
          contact_phone: business.contactInfo?.phone,
          contact_website: business.contactInfo?.website,
          contact_person: business.contactInfo?.contactPerson,
          description: business.description,
          capabilities: business.capabilities || [],
          certifications: business.certifications || [],
          trading_name: business.tradingName,
          detailed_address: business.detailedAddress ? JSON.stringify(business.detailedAddress) : null,
          acn: business.acn,
          last_updated: business.lastUpdated || new Date().toISOString(),
          verified: business.verified,
          categories: business.categories || []
        })
        .onConflictDoUpdate({
          target: supplyNationBusinesses.supply_nation_id,
          set: {
            company_name: business.companyName,
            abn: business.abn,
            location: business.location,
            contact_email: business.contactInfo?.email,
            contact_phone: business.contactInfo?.phone,
            contact_website: business.contactInfo?.website,
            contact_person: business.contactInfo?.contactPerson,
            description: business.description,
            capabilities: business.capabilities || [],
            certifications: business.certifications || [],
            trading_name: business.tradingName,
            detailed_address: business.detailedAddress ? JSON.stringify(business.detailedAddress) : null,
            acn: business.acn,
            last_updated: new Date().toISOString(),
            verified: business.verified,
            categories: business.categories || []
          }
        });

      console.log(`Stored verified business: ${business.companyName}`);
    } catch (error) {
      console.error('Failed to store verified business:', error);
    }
  }

  /**
   * Check if we have recent verification data for a business
   */
  async hasRecentVerification(abn?: string, companyName?: string): Promise<boolean> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      let hasRecent = false;

      if (abn) {
        const [record] = await db
          .select({ last_updated: supplyNationBusinesses.last_updated })
          .from(supplyNationBusinesses)
          .where(eq(supplyNationBusinesses.abn, abn))
          .limit(1);

        if (record && new Date(record.last_updated) > oneWeekAgo) {
          hasRecent = true;
        }
      }

      if (!hasRecent && companyName) {
        const [record] = await db
          .select({ last_updated: supplyNationBusinesses.last_updated })
          .from(supplyNationBusinesses)
          .where(like(supplyNationBusinesses.company_name, `%${companyName}%`))
          .limit(1);

        if (record && new Date(record.last_updated) > oneWeekAgo) {
          hasRecent = true;
        }
      }

      return hasRecent;
    } catch (error) {
      console.error('Recent verification check failed:', error);
      return false;
    }
  }

  /**
   * Convert database record to SupplyNationBusiness format
   */
  private convertDbRecordToBusiness(record: any): SupplyNationBusiness {
    return {
      supplynationId: record.supply_nation_id,
      companyName: record.company_name,
      abn: record.abn,
      verified: record.verified,
      categories: record.categories || [],
      location: record.location,
      contactInfo: {
        email: record.contact_email,
        phone: record.contact_phone,
        website: record.contact_website,
        contactPerson: record.contact_person
      },
      description: record.description,
      capabilities: record.capabilities || [],
      certifications: record.certifications || [],
      tradingName: record.trading_name,
      detailedAddress: record.detailed_address ? JSON.parse(record.detailed_address) : undefined,
      acn: record.acn,
      lastUpdated: record.last_updated
    };
  }

  /**
   * Initialize with known verified businesses (seed data)
   * This would be populated from successful extractions or manual verification
   */
  async initializeKnownBusinesses(): Promise<void> {
    try {
      const knownVerifiedBusinesses = [
        // These would be businesses we've successfully verified through Supply Nation
        // This list would grow as the scraper successfully extracts authentic data
      ];

      for (const business of knownVerifiedBusinesses) {
        await this.storeVerifiedBusiness(business);
      }

      console.log(`Initialized ${knownVerifiedBusinesses.length} known verified businesses`);
    } catch (error) {
      console.error('Failed to initialize known businesses:', error);
    }
  }
}

export const supplyNationVerificationDB = new SupplyNationVerificationDB();