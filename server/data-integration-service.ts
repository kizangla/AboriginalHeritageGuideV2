import { searchBusinessesByName, enrichBusinessWithLocation, ABRBusinessDetails } from './abr-service';
import { indigenousBusinessMatcher } from './indigenous-business-matcher';

export interface IntegratedBusiness {
  // ABR Data
  abn: string;
  entityName: string;
  entityType: string;
  status: string;
  address: {
    stateCode?: string;
    postcode?: string;
    suburb?: string;
    streetAddress?: string;
    fullAddress?: string;
  };
  gst: boolean;
  dgr?: boolean;
  lat?: number;
  lng?: number;
  
  // Verification Data
  supplyNationVerified: boolean;
  verificationSource: 'abr_only' | 'supply_nation' | 'both' | 'indigenous_analysis';
  verificationConfidence: 'high' | 'medium' | 'low';
  lastVerified: Date;
}

export interface IntegratedSearchResult {
  businesses: IntegratedBusiness[];
  totalResults: number;
  searchQuery: string;
  dataSource: {
    abr: { found: number; processed: number };
    supplyNation: { found: number; processed: number };
  };
  timestamp: Date;
}

class DataIntegrationService {
  async searchIntegratedBusinesses(
    query: string,
    location?: string,
    includeSupplyNation: boolean = true
  ): Promise<IntegratedSearchResult> {
    try {
      console.log(`Starting integrated search for: "${query}"`);
      const startTime = Date.now();

      // Search ABR database
      console.log('Searching ABR database...');
      const abrResults = await searchBusinessesByName(query, location);
      console.log(`ABR found ${abrResults.businesses.length} businesses`);

      const searchResults: IntegratedBusiness[] = [];

      // Process ABR businesses with Indigenous analysis
      for (const abrBusiness of abrResults.businesses) {
        try {
          // Enrich with location data from ABR and geocode for map coordinates
          const enrichedBusiness = await enrichBusinessWithLocation(abrBusiness);
          
          // Analyze business for Indigenous ownership indicators
          const indigenousAnalysis = indigenousBusinessMatcher.analyzeBusinessForIndigenousOwnership(enrichedBusiness);
          console.log(`Indigenous analysis for ${enrichedBusiness.entityName}:`, {
            isLikelyIndigenous: indigenousAnalysis.isLikelyIndigenous,
            confidence: indigenousAnalysis.confidence,
            indicators: indigenousAnalysis.indicators
          });
          
          let verificationSource: 'abr_only' | 'supply_nation' | 'both' | 'indigenous_analysis' = 'abr_only';
          let verificationConfidence: 'high' | 'medium' | 'low' = 'low';
          let supplyNationVerified = false;

          // Determine verification based on Indigenous analysis
          if (indigenousAnalysis.isLikelyIndigenous) {
            verificationSource = 'indigenous_analysis';
            verificationConfidence = indigenousAnalysis.confidence;
            supplyNationVerified = indigenousAnalysis.confidence === 'high';
            console.log(`Set verification for ${enrichedBusiness.entityName}: ${verificationSource} with ${verificationConfidence} confidence`);
          }

          const integratedBusiness: IntegratedBusiness = {
            abn: enrichedBusiness.abn,
            entityName: enrichedBusiness.entityName,
            entityType: enrichedBusiness.entityType,
            status: enrichedBusiness.status,
            address: enrichedBusiness.address,
            gst: enrichedBusiness.gst,
            dgr: enrichedBusiness.dgr,
            lat: enrichedBusiness.lat,
            lng: enrichedBusiness.lng,
            supplyNationVerified,
            verificationSource,
            verificationConfidence,
            lastVerified: new Date()
          };
          
          searchResults.push(integratedBusiness);
          
        } catch (error) {
          console.error(`Error processing business ${abrBusiness.abn}:`, error);
        }
      }

      const endTime = Date.now();
      console.log(`Integrated search completed in ${endTime - startTime}ms`);

      return {
        businesses: searchResults,
        totalResults: searchResults.length,
        searchQuery: query,
        dataSource: {
          abr: { found: abrResults.businesses.length, processed: searchResults.length },
          supplyNation: { found: 0, processed: 0 }
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Integrated search failed:', error);
      throw error;
    }
  }
}

export const dataIntegrationService = new DataIntegrationService();