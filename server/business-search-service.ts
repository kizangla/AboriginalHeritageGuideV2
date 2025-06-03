import { searchBusinessesByName, filterIndigenousBusinesses, type ABRBusinessDetails } from './abr-service';
import { enhancedIndigenousVerification } from './enhanced-indigenous-verification';

export interface SearchableBusiness {
  id: string;
  name: string;
  entityName: string;
  businessType: string;
  entityType: string;
  address: string;
  abn: string;
  status: string;
  lat: number;
  lng: number;
  isVerified: boolean;
  verificationSource: 'abr_pattern_analysis' | 'supply_nation' | 'location_analysis';
  verificationConfidence: 'high' | 'medium' | 'low';
  supplyNationVerified: boolean;
  source: 'ABR';
}

export interface BusinessSearchResult {
  businesses: SearchableBusiness[];
  totalResults: number;
  searchQuery: string;
  timestamp: Date;
}

class BusinessSearchService {
  /**
   * Search for Aboriginal businesses using authentic ABR data with enhanced verification
   */
  async searchAboriginalBusinesses(query: string): Promise<BusinessSearchResult> {
    try {
      console.log(`Searching Aboriginal businesses for: "${query}"`);
      
      // Search Australian Business Register
      const abrResults = await searchBusinessesByName(query);
      console.log(`Found ${abrResults.totalResults} businesses in ABR`);
      
      // Apply authentic Indigenous business filtering
      const indigenousBusinesses = filterIndigenousBusinesses(abrResults.businesses);
      console.log(`Filtered to ${indigenousBusinesses.length} Indigenous businesses`);
      
      // Enhanced verification for each business
      const verifiedBusinesses = await Promise.all(
        indigenousBusinesses.map(async (business) => {
          const verification = await enhancedIndigenousVerification.verifyBusiness(business);
          
          return {
            id: `abr-${business.abn}`,
            name: business.entityName,
            entityName: business.entityName,
            businessType: business.entityType,
            entityType: business.entityType,
            address: business.address.fullAddress || 
                    `${business.address.suburb || ''} ${business.address.stateCode || ''} ${business.address.postcode || ''}`.trim(),
            abn: business.abn,
            status: business.status,
            lat: business.lat || 0,
            lng: business.lng || 0,
            isVerified: verification.isVerified,
            verificationSource: verification.verificationSource === 'supply_nation' ? 'supply_nation' : 
                              verification.verificationSource === 'not_verified' ? 'abr_pattern_analysis' : 
                              'abr_pattern_analysis',
            verificationConfidence: verification.confidence,
            supplyNationVerified: verification.verificationSource === 'supply_nation',
            source: 'ABR' as const
          };
        })
      );

      return {
        businesses: verifiedBusinesses,
        totalResults: verifiedBusinesses.length,
        searchQuery: query,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Aboriginal business search error:', error);
      return {
        businesses: [],
        totalResults: 0,
        searchQuery: query,
        timestamp: new Date()
      };
    }
  }

  /**
   * Search for all businesses (not filtered for Indigenous ownership)
   */
  async searchAllBusinesses(query: string): Promise<BusinessSearchResult> {
    try {
      console.log(`Searching all businesses for: "${query}"`);
      
      const abrResults = await searchBusinessesByName(query);
      console.log(`Found ${abrResults.totalResults} businesses in ABR`);
      
      const allBusinesses = abrResults.businesses.map((business): SearchableBusiness => ({
        id: `abr-${business.abn}`,
        name: business.entityName,
        entityName: business.entityName,
        businessType: business.entityType,
        entityType: business.entityType,
        address: business.address.fullAddress || 
                `${business.address.suburb || ''} ${business.address.stateCode || ''} ${business.address.postcode || ''}`.trim(),
        abn: business.abn,
        status: business.status,
        lat: business.lat || 0,
        lng: business.lng || 0,
        isVerified: false,
        verificationSource: 'abr_pattern_analysis',
        verificationConfidence: 'low',
        supplyNationVerified: false,
        source: 'ABR'
      }));

      return {
        businesses: allBusinesses.slice(0, 20), // Limit results for performance
        totalResults: abrResults.totalResults,
        searchQuery: query,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Business search error:', error);
      return {
        businesses: [],
        totalResults: 0,
        searchQuery: query,
        timestamp: new Date()
      };
    }
  }
}

export const businessSearchService = new BusinessSearchService();