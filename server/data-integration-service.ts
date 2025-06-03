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
          
          let verificationSource: 'abr_only' | 'supply_nation' | 'both' | 'indigenous_analysis' = 'abr_only';
          let verificationConfidence: 'high' | 'medium' | 'low' = 'low';
          let supplyNationVerified = false;

          // Determine verification based on Indigenous analysis
          if (indigenousAnalysis.isLikelyIndigenous) {
            verificationSource = 'indigenous_analysis';
            verificationConfidence = indigenousAnalysis.confidence;
            supplyNationVerified = indigenousAnalysis.confidence === 'high';
            console.log(`✓ Indigenous business identified: ${enrichedBusiness.entityName} - ${verificationSource} (${verificationConfidence} confidence)`);
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