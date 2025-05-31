import { searchSupplyNationWithPuppeteer, SupplyNationBusiness } from './supply-nation-scraper';
import { searchBusinessesByName, enrichBusinessWithLocation, ABRBusinessDetails } from './abr-service';
import { supplyNationCache } from './supply-nation-cache';

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
    
    // Search Supply Nation with database caching
    let supplyNationResults: SupplyNationBusiness[] = [];
    if (includeSupplyNation) {
      try {
        // Check cache first for fresh data
        console.log('Checking Supply Nation cache...');
        const cachedResults = await supplyNationCache.searchCachedBusinesses(query);
        const hasFreshData = await supplyNationCache.hasFreshData(query);
        console.log(`Cache check: hasFreshData=${hasFreshData}, cachedResults=${cachedResults.length}`);
        
        if (hasFreshData && cachedResults.length > 0) {
          console.log(`Using cached Supply Nation data: ${cachedResults.length} businesses`);
          supplyNationResults = cachedResults;
        } else {
          console.log('Searching fresh Supply Nation data using HTTP method...');
          const { searchSupplyNationBusinesses } = await import('./abr-service');
          const snResults = await searchSupplyNationBusinesses(query, location);
          supplyNationResults = snResults.businesses;
          console.log(`Found ${supplyNationResults.length} businesses from Supply Nation HTTP search`);
          
          // Store fresh data in database cache
          if (supplyNationResults.length > 0) {
            console.log('Storing Supply Nation data in database...');
            try {
              await supplyNationCache.storeBusinesses(supplyNationResults);
              console.log(`Successfully cached ${supplyNationResults.length} Supply Nation businesses to database`);
            } catch (cacheError) {
              console.error('Failed to cache Supply Nation data:', cacheError);
            }
          } else {
            console.log('No Supply Nation businesses to cache');
          }
        }
        console.log(`Supply Nation found ${supplyNationResults.length} businesses`);
      } catch (error) {
        console.error('Supply Nation search failed, checking cache:', error);
        // Fallback to any cached data available
        supplyNationResults = await supplyNationCache.searchCachedBusinesses(query);
        if (supplyNationResults.length > 0) {
          console.log(`Using fallback cached data: ${supplyNationResults.length} businesses`);
        }
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
          
          // If we have a Supply Nation ID, fetch detailed profile information using HTTP extractor
          if (matchedSupplyNationData.supplynationId && matchedSupplyNationData.supplynationId !== 'unknown') {
            try {
              const { httpExtractor } = await import('./supply-nation-http-extractor');
              const detailedProfile = await httpExtractor.extractProfile(matchedSupplyNationData.supplynationId);
              
              if (detailedProfile) {
                console.log(`Enhanced Supply Nation data for ${enrichedBusiness.entityName} with HTTP-extracted profile`);
                // Merge detailed profile data with existing Supply Nation data
                matchedSupplyNationData = {
                  ...matchedSupplyNationData,
                  ...detailedProfile,
                  // Preserve original data if detailed profile doesn't have it
                  description: detailedProfile.description || matchedSupplyNationData.description,
                  location: detailedProfile.location || matchedSupplyNationData.location
                };

                // Use Supply Nation detailed address for more accurate geocoding
                if (detailedProfile.detailedAddress && detailedProfile.detailedAddress.streetAddress) {
                  const supplyNationAddress = `${detailedProfile.detailedAddress.streetAddress}, ${detailedProfile.detailedAddress.suburb}, ${detailedProfile.detailedAddress.state} ${detailedProfile.detailedAddress.postcode}, Australia`;
                  console.log(`Geocoding business using Supply Nation address: ${enrichedBusiness.entityName} at ${supplyNationAddress}`);
                  
                  try {
                    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(supplyNationAddress)}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=AU&limit=1`;
                    console.log(`Supply Nation geocoding URL: ${geocodeUrl.replace(process.env.MAPBOX_ACCESS_TOKEN || '', '[TOKEN]')}`);
                    
                    const response = await fetch(geocodeUrl);
                    console.log(`Supply Nation geocoding response status: ${response.status}`);
                    
                    if (response.ok) {
                      const data = await response.json();
                      console.log(`Supply Nation geocoding response:`, JSON.stringify(data, null, 2).substring(0, 500));
                      
                      if (data.features && data.features.length > 0) {
                        const [lng, lat] = data.features[0].center;
                        enrichedBusiness.lat = lat;
                        enrichedBusiness.lng = lng;
                        // Update address to use Supply Nation detailed address
                        enrichedBusiness.address = {
                          ...enrichedBusiness.address,
                          streetAddress: detailedProfile.detailedAddress.streetAddress,
                          suburb: detailedProfile.detailedAddress.suburb,
                          stateCode: detailedProfile.detailedAddress.state,
                          postcode: detailedProfile.detailedAddress.postcode,
                          fullAddress: supplyNationAddress
                        };
                        console.log(`Geocoded ${enrichedBusiness.entityName} using Supply Nation address to coordinates: [${lat}, ${lng}]`);
                      }
                    }
                  } catch (geocodeError) {
                    console.log(`Supply Nation geocoding failed for ${supplyNationAddress}:`, geocodeError);
                  }
                }
              }
            } catch (error) {
              console.error(`Failed to fetch detailed profile for ${enrichedBusiness.entityName}:`, error);
              // Continue with basic Supply Nation data if detailed extraction fails
            }
          }

          // Fallback to ABR geocoding if Supply Nation geocoding wasn't done
          if (!enrichedBusiness.lat && enrichedBusiness.address?.postcode && enrichedBusiness.address?.stateCode) {
            const geocodeAddress = `${enrichedBusiness.address.postcode}, ${enrichedBusiness.address.stateCode}, Australia`;
            console.log(`Fallback geocoding business: ${enrichedBusiness.entityName} at ${geocodeAddress}`);
            
            try {
              const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geocodeAddress)}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=AU&limit=1`;
              console.log(`Fallback geocoding URL: ${geocodeUrl.replace(process.env.MAPBOX_ACCESS_TOKEN || '', '[TOKEN]')}`);
              
              const response = await fetch(geocodeUrl);
              console.log(`Fallback geocoding response status: ${response.status}`);
              
              if (response.ok) {
                const data = await response.json();
                console.log(`Fallback geocoding response:`, JSON.stringify(data, null, 2).substring(0, 500));
                
                if (data.features && data.features.length > 0) {
                  const [lng, lat] = data.features[0].center;
                  enrichedBusiness.lat = lat;
                  enrichedBusiness.lng = lng;
                  enrichedBusiness.address.fullAddress = data.features[0].place_name;
                  console.log(`Fallback geocoded ${enrichedBusiness.entityName} to coordinates: [${lat}, ${lng}]`);
                }
              }
            } catch (geocodeError) {
              console.log(`Fallback geocoding failed for ${geocodeAddress}:`, geocodeError);
            }
          }
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