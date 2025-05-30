import { searchSupplyNationWithPuppeteer, SupplyNationBusiness } from './supply-nation-scraper';
import { searchBusinessesByName, enrichBusinessWithLocation, ABRBusinessDetails } from './abr-service';

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
  
  // Supply Nation Data
  supplyNationVerified: boolean;
  supplyNationData?: SupplyNationBusiness;
  
  // Verification Metadata
  verificationSource: 'abr_only' | 'supply_nation' | 'both';
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
    console.log(`Starting integrated search for: "${query}"`);
    
    const startTime = Date.now();
    const searchResults: IntegratedBusiness[] = [];
    
    // Search ABR first (reliable government data)
    console.log('Searching ABR database...');
    const abrResults = await searchBusinessesByName(query);
    console.log(`ABR found ${abrResults.totalResults} businesses`);
    
    // Search Supply Nation if enabled
    let supplyNationResults: SupplyNationBusiness[] = [];
    if (includeSupplyNation) {
      try {
        console.log('Searching Supply Nation with Puppeteer...');
        const snResults = await searchSupplyNationWithPuppeteer(query, location);
        supplyNationResults = snResults.businesses;
        console.log(`Supply Nation found ${supplyNationResults.length} businesses`);
      } catch (error) {
        console.error('Supply Nation search failed:', error);
        // Continue with ABR data only
      }
    }
    
    // Create a map of Supply Nation businesses by ABN and name for matching
    const supplyNationMap = new Map<string, SupplyNationBusiness>();
    const supplyNationNameMap = new Map<string, SupplyNationBusiness>();
    
    supplyNationResults.forEach(snBusiness => {
      if (snBusiness.abn) {
        supplyNationMap.set(snBusiness.abn, snBusiness);
      }
      // Also map by normalized company name for fuzzy matching
      const normalizedName = snBusiness.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      supplyNationNameMap.set(normalizedName, snBusiness);
    });
    
    // Process ABR businesses and enrich with Supply Nation data
    for (const abrBusiness of abrResults.businesses) {
      try {
        // Enrich with location data from ABR and geocode for map coordinates
        const enrichedBusiness = await enrichBusinessWithLocation(abrBusiness);
        
        // Add geocoding for accurate map placement
        if (enrichedBusiness.address?.postcode && enrichedBusiness.address?.stateCode && !enrichedBusiness.lat) {
          const geocodeAddress = `${enrichedBusiness.address.postcode}, ${enrichedBusiness.address.stateCode}, Australia`;
          try {
            const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geocodeAddress)}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=AU`);
            if (response.ok) {
              const data = await response.json();
              if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                enrichedBusiness.lat = lat;
                enrichedBusiness.lng = lng;
                enrichedBusiness.address.fullAddress = data.features[0].place_name;
              }
            }
          } catch (geocodeError) {
            console.log(`Geocoding failed for ${geocodeAddress}:`, geocodeError);
          }
        }
        
        // Check for Supply Nation verification
        const supplyNationData = supplyNationMap.get(abrBusiness.abn);
        let verificationSource: 'abr_only' | 'supply_nation' | 'both' = 'abr_only';
        let verificationConfidence: 'high' | 'medium' | 'low' = 'low';
        
        // Try name-based matching if ABN match fails
        let matchedSupplyNationData = supplyNationData;
        if (!matchedSupplyNationData) {
          const normalizedAbrName = abrBusiness.entityName.toLowerCase().replace(/[^a-z0-9]/g, '');
          matchedSupplyNationData = supplyNationNameMap.get(normalizedAbrName);
          
          // Fuzzy matching for similar names
          if (!matchedSupplyNationData) {
            const entries = Array.from(supplyNationNameMap.entries());
            for (const [snName, snData] of entries) {
              if (this.calculateSimilarity(normalizedAbrName, snName) > 0.8) {
                matchedSupplyNationData = snData;
                break;
              }
            }
          }
        }
        
        if (matchedSupplyNationData) {
          verificationSource = supplyNationData ? 'both' : 'supply_nation';
          verificationConfidence = 'high'; // Supply Nation verification is high confidence
        }
        
        const integratedBusiness: IntegratedBusiness = {
          abn: enrichedBusiness.abn,
          entityName: enrichedBusiness.entityName,
          entityType: enrichedBusiness.entityType,
          status: enrichedBusiness.status,
          address: enrichedBusiness.address,
          gst: enrichedBusiness.gst,
          dgr: enrichedBusiness.dgr,
          supplyNationVerified: !!matchedSupplyNationData,
          supplyNationData: matchedSupplyNationData,
          verificationSource,
          verificationConfidence,
          lastVerified: new Date()
        };
        
        searchResults.push(integratedBusiness);
        
      } catch (error) {
        console.error(`Error processing business ${abrBusiness.abn}:`, error);
      }
    }
    
    // Add Supply Nation-only businesses (those not found in ABR)
    for (const snBusiness of supplyNationResults) {
      if (snBusiness.abn && !supplyNationMap.has(snBusiness.abn)) {
        // This business is in Supply Nation but not found in our ABR search
        const integratedBusiness: IntegratedBusiness = {
          abn: snBusiness.abn,
          entityName: snBusiness.companyName,
          entityType: 'Indigenous Business',
          status: 'Active',
          address: {
            fullAddress: snBusiness.location
          },
          gst: false,
          supplyNationVerified: true,
          supplyNationData: snBusiness,
          verificationSource: 'supply_nation',
          verificationConfidence: 'high',
          lastVerified: new Date()
        };
        
        searchResults.push(integratedBusiness);
      }
    }
    
    const endTime = Date.now();
    console.log(`Integrated search completed in ${endTime - startTime}ms`);
    
    return {
      businesses: searchResults,
      totalResults: searchResults.length,
      searchQuery: query,
      dataSource: {
        abr: { 
          found: abrResults.totalResults, 
          processed: abrResults.businesses.length 
        },
        supplyNation: { 
          found: supplyNationResults.length, 
          processed: supplyNationResults.length 
        }
      },
      timestamp: new Date()
    };
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - matrix[str2.length][str1.length] / maxLength;
  }
}

export const dataIntegrationService = new DataIntegrationService();