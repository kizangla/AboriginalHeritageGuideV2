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
   * Search for all businesses using authentic ABR data with Indigenous verification status
   */
  async searchAboriginalBusinesses(query: string): Promise<BusinessSearchResult> {
    try {
      console.log(`Searching businesses for: "${query}"`);
      
      // Search Australian Business Register
      const abrResults = await searchBusinessesByName(query);
      console.log(`Found ${abrResults.totalResults} businesses in ABR`);
      
      // Get all businesses and check each for Indigenous verification
      const allBusinesses = abrResults.businesses;
      console.log(`Processing ${allBusinesses.length} businesses for verification`);
      
      // Enhanced verification for each business
      const verifiedBusinesses = allBusinesses.map((business: any) => {
        // Check if business name contains Indigenous indicators
        const searchText = `${business.entityName} ${business.address?.suburb || ''} ${business.address?.stateCode || ''}`.toLowerCase();
        const indigenousKeywords = ['aboriginal', 'indigenous', 'torres strait', 'first nations', 'koori', 'murri', 'yolngu'];
        const hasIndigenousIndicators = indigenousKeywords.some(keyword => searchText.includes(keyword));
        
        return {
          id: `abr-${business.abn}`,
          name: business.entityName,
          entityName: business.entityName,
          businessType: business.entityType,
          entityType: business.entityType,
          address: business.address?.fullAddress || 
                  `${business.address?.suburb || ''} ${business.address?.stateCode || ''} ${business.address?.postcode || ''}`.trim(),
          abn: business.abn,
          status: business.status,
          lat: business.lat || 0,
          lng: business.lng || 0,
          isVerified: hasIndigenousIndicators,
          verificationSource: 'abr_pattern_analysis' as const,
          verificationConfidence: hasIndigenousIndicators ? 'high' : 'low',
          supplyNationVerified: false,
          source: 'ABR' as const
        };
      });

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