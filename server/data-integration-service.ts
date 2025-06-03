import { searchBusinessesByName, enrichBusinessWithLocation, ABRBusinessDetails } from './abr-service';
import { indigenousBusinessMatcher } from './indigenous-business-matcher';
import { enhancedIndigenousVerification } from './enhanced-indigenous-verification';
import { SupplyNationDynamicIntegration } from './supply-nation-dynamic-integration';
import { supplyNationRobustIntegration } from './supply-nation-robust-integration';

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
  private supplyNationDynamicIntegration = new SupplyNationDynamicIntegration();

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
          const { supplyNationDynamicIntegration } = await import('./supply-nation-dynamic-integration');
          
          // Use dynamic integration for real-time Supply Nation crawling
          const supplyNationResult = await supplyNationDynamicIntegration.searchVerifiedBusinessesDynamic(query);
          supplyNationBusinesses = supplyNationResult.businesses;
          supplyNationFound = supplyNationBusinesses.length;
          
          console.log(`Supply Nation dynamic search: ${supplyNationResult.message}`);
          console.log(`Search method: ${supplyNationResult.searchMethod}`);
          
          if (supplyNationFound > 0) {
            console.log(`Found ${supplyNationFound} verified businesses through Supply Nation`);
          }
        } catch (error) {
          console.log(`Supply Nation search error: ${error}`);
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
          // Always process business regardless of verification status
          let enrichedBusiness = await enrichBusinessWithLocation(abrBusiness);
          let verificationSource: 'abr_only' | 'supply_nation' | 'both' | 'indigenous_analysis' = 'abr_only';
          let verificationConfidence: 'high' | 'medium' | 'low' = 'low';
          let supplyNationVerified = false;
          
          // Check if this business exists in Supply Nation first
          const supplyNationMatch = supplyNationMap.get(abrBusiness.abn) || 
            supplyNationNameMap.get(abrBusiness.entityName.toLowerCase().replace(/[^a-z0-9]/g, ''));

          if (supplyNationMatch) {
            // PRIORITIZE Supply Nation data when business found on both platforms
            console.log(`🎯 Using Supply Nation data for: ${abrBusiness.entityName}`);
            supplyNationProcessed++;
            
            // Create integrated business using Supply Nation data as primary source
            enrichedBusiness.entityName = supplyNationMatch.companyName || enrichedBusiness.entityName;
            enrichedBusiness.supplyNationData = supplyNationMatch;

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
            // Apply enhanced verification using authentic data sources only
            const verificationResult = await enhancedIndigenousVerification.verifyBusiness(enrichedBusiness);

            if (verificationResult.isVerified) {
              verificationSource = verificationResult.verificationSource === 'supply_nation' ? 'supply_nation' : 'indigenous_analysis';
              verificationConfidence = verificationResult.confidence;
              supplyNationVerified = verificationResult.verificationSource === 'supply_nation';
              console.log(`✓ Indigenous business verified: ${enrichedBusiness.entityName} - ${verificationResult.verificationMethod} (${verificationConfidence} confidence)`);
              
              // For medium confidence Indigenous businesses, attempt Supply Nation cross-reference
              if (verificationConfidence === 'medium' && !supplyNationVerified) {
                console.log(`🔍 Cross-referencing ${enrichedBusiness.entityName} with Supply Nation...`);
                
                try {
                  const supplyNationCrossRef = await this.supplyNationDynamicIntegration.searchVerifiedBusinessesDynamic(enrichedBusiness.entityName);
                  
                  if (supplyNationCrossRef.businesses.length > 0) {
                    // Check if any found business matches our ABR business by name or ABN
                    const matchedBusiness = supplyNationCrossRef.businesses.find((snBusiness: any) => 
                      snBusiness.abn === enrichedBusiness.abn || 
                      snBusiness.companyName.toLowerCase().includes(enrichedBusiness.entityName.toLowerCase().split(' ')[0])
                    );
                    
                    if (matchedBusiness) {
                      console.log(`🎯 Found Supply Nation verification for: ${enrichedBusiness.entityName}`);
                      verificationSource = 'both';
                      verificationConfidence = 'high';
                      supplyNationVerified = true;
                      
                      // Update with Supply Nation data if available
                      if (matchedBusiness.location && !enrichedBusiness.lat) {
                        enrichedBusiness.address.fullAddress = matchedBusiness.location;
                      }
                    }
                  }
                } catch (crossRefError) {
                  console.log(`Supply Nation cross-reference failed: ${crossRefError}`);
                  // Continue with existing verification
                }
              }
            } else {
              // Business shows no Indigenous indicators - include with ABR-only status
              verificationSource = 'abr_only';
              verificationConfidence = 'low';
              supplyNationVerified = false;
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

      // Add Supply Nation-only businesses that weren't matched with ABR
      for (const snBusiness of supplyNationBusinesses) {
        const abrMatch = abrResults.businesses.find(abr => 
          abr.abn === snBusiness.abn || 
          abr.entityName.toLowerCase().replace(/[^a-z0-9]/g, '') === snBusiness.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        
        if (!abrMatch) {
          console.log(`📋 Adding Supply Nation-only business: ${snBusiness.companyName}`);
          
          try {
            // Create integrated business from Supply Nation data only
            let lat: number | undefined = undefined;
            let lng: number | undefined = undefined;
            
            // Geocode Supply Nation location if available
            if (snBusiness.location && snBusiness.location.includes(',')) {
              try {
                console.log(`🗺️ Geocoding Supply Nation business: ${snBusiness.companyName} at ${snBusiness.location}`);
                const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(snBusiness.location + ', Australia')}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=AU&limit=1`;
                const response = await fetch(geocodeUrl);
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.features && data.features.length > 0) {
                    [lng, lat] = data.features[0].center;
                    console.log(`✅ Geocoded ${snBusiness.companyName} to coordinates: [${lat}, ${lng}]`);
                  }
                }
              } catch (geocodeError) {
                console.log(`❌ Geocoding failed for ${snBusiness.location}:`, geocodeError);
              }
            }

            const integratedBusiness: IntegratedBusiness = {
              abn: snBusiness.abn || 'SN-' + snBusiness.supplynationId,
              entityName: snBusiness.companyName,
              entityType: 'Company',
              status: 'Active',
              address: {
                fullAddress: snBusiness.location || '',
                stateCode: snBusiness.location?.split(',').pop()?.trim().split(' ')[0] || undefined,
                postcode: snBusiness.location?.match(/\b\d{4}\b/)?.[0] || undefined
              },
              gst: false,
              dgr: false,
              lat,
              lng,
              supplyNationVerified: true,
              verificationSource: 'supply_nation',
              verificationConfidence: 'high',
              lastVerified: new Date()
            };
            
            searchResults.push(integratedBusiness);
            supplyNationProcessed++;
            
          } catch (error) {
            console.error(`Error processing Supply Nation business ${snBusiness.companyName}:`, error);
          }
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