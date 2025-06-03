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

      let supplyNationBusinesses: any[] = [];
      let supplyNationFound = 0;
      
      // First search Supply Nation if requested
      if (includeSupplyNation) {
        try {
          console.log('Searching Supply Nation database...');
          const { supplyNationSimpleScraper } = await import('./supply-nation-simple-scraper');
          
          // Authenticate first, then search
          const authenticated = await supplyNationSimpleScraper.authenticate();
          if (authenticated) {
            supplyNationBusinesses = await supplyNationSimpleScraper.searchVerifiedBusinesses(query);
            supplyNationFound = supplyNationBusinesses.length;
            console.log(`Supply Nation found ${supplyNationFound} verified businesses`);
          } else {
            console.log('Supply Nation authentication failed - this may require updated credentials or captcha handling');
            // Continue with ABR-only search
          }
        } catch (error) {
          console.log(`Supply Nation search failed: ${error}`);
          // Continue with ABR-only search
        }
      }

      // Search ABR database
      console.log('Searching ABR database...');
      const abrResults = await searchBusinessesByName(query, location);
      console.log(`ABR found ${abrResults.businesses.length} businesses`);

      // Create Supply Nation lookup maps
      const supplyNationMap = new Map<string, any>();
      const supplyNationNameMap = new Map<string, any>();
      
      supplyNationBusinesses.forEach(snBusiness => {
        if (snBusiness.abn) {
          supplyNationMap.set(snBusiness.abn, snBusiness);
        }
        if (snBusiness.companyName) {
          const normalizedName = snBusiness.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
          supplyNationNameMap.set(normalizedName, snBusiness);
        }
      });

      const searchResults: IntegratedBusiness[] = [];
      let supplyNationProcessed = 0;

      // Process ABR businesses with Supply Nation prioritization
      for (const abrBusiness of abrResults.businesses) {
        try {
          // Check if this business exists in Supply Nation first
          const supplyNationMatch = supplyNationMap.get(abrBusiness.abn) || 
            supplyNationNameMap.get(abrBusiness.entityName.toLowerCase().replace(/[^a-z0-9]/g, ''));

          let enrichedBusiness: any;
          let verificationSource: 'abr_only' | 'supply_nation' | 'both' | 'indigenous_analysis' = 'abr_only';
          let verificationConfidence: 'high' | 'medium' | 'low' = 'low';
          let supplyNationVerified = false;

          if (supplyNationMatch) {
            // PRIORITIZE Supply Nation data when business found on both platforms
            console.log(`🎯 Using Supply Nation data for: ${abrBusiness.entityName}`);
            supplyNationProcessed++;
            
            // Get ABR location data for geocoding fallback
            const abrEnriched = await enrichBusinessWithLocation(abrBusiness);
            
            // Create integrated business using Supply Nation data as primary source
            enrichedBusiness = {
              ...abrEnriched,
              entityName: supplyNationMatch.companyName || abrEnriched.entityName,
              supplyNationData: supplyNationMatch
            };

            verificationSource = 'both';
            verificationConfidence = 'high';
            supplyNationVerified = true;

            // Use Supply Nation location if available for enhanced geocoding
            if (supplyNationMatch.location && supplyNationMatch.location.includes(',')) {
              try {
                console.log(`🗺️ Using Supply Nation address for geocoding: ${supplyNationMatch.location}`);
                const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(supplyNationMatch.location + ', Australia')}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=AU&limit=1`;
                const response = await fetch(geocodeUrl);
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.features && data.features.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    enrichedBusiness.lat = lat;
                    enrichedBusiness.lng = lng;
                    enrichedBusiness.address = {
                      ...enrichedBusiness.address,
                      fullAddress: data.features[0].place_name
                    };
                    console.log(`✅ Enhanced location using Supply Nation data: [${lat}, ${lng}]`);
                  }
                }
              } catch (geocodeError) {
                console.log(`Supply Nation geocoding failed: ${geocodeError}`);
              }
            }
          } else {
            // Use ABR data with Indigenous analysis for non-Supply Nation businesses
            enrichedBusiness = await enrichBusinessWithLocation(abrBusiness);
            
            // Analyze business for Indigenous ownership indicators
            const indigenousAnalysis = indigenousBusinessMatcher.analyzeBusinessForIndigenousOwnership(enrichedBusiness);

            if (indigenousAnalysis.isLikelyIndigenous) {
              verificationSource = 'indigenous_analysis';
              verificationConfidence = indigenousAnalysis.confidence;
              supplyNationVerified = indigenousAnalysis.confidence === 'high';
              console.log(`✓ Indigenous business identified: ${enrichedBusiness.entityName} - ${verificationSource} (${verificationConfidence} confidence)`);
            }
          }

          // Enhanced geocoding for businesses with proper address data
          if (!enrichedBusiness.lat || enrichedBusiness.lat === 0) {
            if (enrichedBusiness.address?.postcode && enrichedBusiness.address?.stateCode) {
              const geocodeAddress = enrichedBusiness.address.suburb 
                ? `${enrichedBusiness.address.suburb}, ${enrichedBusiness.address.postcode}, ${enrichedBusiness.address.stateCode}, Australia`
                : `${enrichedBusiness.address.postcode}, ${enrichedBusiness.address.stateCode}, Australia`;
              
              console.log(`🗺️ Geocoding business: ${enrichedBusiness.entityName} at ${geocodeAddress}`);
              
              try {
                const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geocodeAddress)}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=AU&limit=1`;
                
                const response = await fetch(geocodeUrl);
                console.log(`Geocoding response status: ${response.status}`);
                
                if (response.ok) {
                  const data = await response.json();
                  console.log(`Geocoding response features:`, data.features?.length || 0);
                  
                  if (data.features && data.features.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    enrichedBusiness.lat = lat;
                    enrichedBusiness.lng = lng;
                    enrichedBusiness.address.fullAddress = data.features[0].place_name;
                    console.log(`✅ Geocoded ${enrichedBusiness.entityName} to coordinates: [${lat}, ${lng}]`);
                  } else {
                    console.log(`❌ No geocoding results for ${geocodeAddress}`);
                  }
                } else {
                  console.log(`❌ Geocoding API error: ${response.status} ${response.statusText}`);
                }
              } catch (geocodeError) {
                console.log(`❌ Geocoding failed for ${geocodeAddress}:`, geocodeError);
              }
            } else {
              console.log(`⚠️ No address data available for geocoding: ${enrichedBusiness.entityName}`);
            }
          } else {
            console.log(`📍 Business already has coordinates: ${enrichedBusiness.entityName} [${enrichedBusiness.lat}, ${enrichedBusiness.lng}]`);
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
          supplyNation: { found: supplyNationFound, processed: supplyNationProcessed }
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