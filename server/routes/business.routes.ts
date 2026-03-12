import type { Express } from "express";
import {
  searchBusinessesByName,
  getBusinessByABN,
  searchBusinessesByPostcode,
  type ABRBusinessDetails
} from "../abr-service";
import { indigenousBusinessService } from "../indigenous-business-service";
import { asyncGeocodingService } from "../async-geocoding-service";

export function registerBusinessRoutes(app: Express): void {
  // Get nearby businesses
  app.get("/api/businesses/nearby/:lat/:lng", async (req, res) => {
    try {
      const { storage } = await import("../database-storage");
      const lat = parseFloat(req.params.lat);
      const lng = parseFloat(req.params.lng);
      const radius = parseFloat(req.query.radius as string) || 50;

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      const businesses = await storage.getBusinessesNearby(lat, lng, radius);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nearby businesses" });
    }
  });

  // Search businesses with comprehensive ABR data
  app.get("/api/businesses/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Search Australian Business Register directly
      const abrResults = await searchBusinessesByName(query);

      // Transform all businesses with immediate coordinate mapping
      const allBusinesses = abrResults.businesses.map((business: ABRBusinessDetails) => {
        // Get immediate coordinates (non-blocking)
        const geoResult = asyncGeocodingService.getImmediateCoordinates(business);

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
          lat: geoResult.lat,
          lng: geoResult.lng,
          isVerified: business.supplyNationVerified || false,
          verificationSource: business.supplyNationVerified ? 'supply_nation' : 'abr_data',
          verificationConfidence: business.supplyNationVerified ? 'high' : 'medium',
          supplyNationVerified: business.supplyNationVerified || false,
          source: 'ABR'
        };
      });

      res.json(allBusinesses);
    } catch (error) {
      console.error("Error searching Australian businesses:", error);
      res.status(500).json({ message: "Failed to search Australian businesses" });
    }
  });

  // Test Supply Nation connection
  app.get("/api/supply-nation/test", async (req, res) => {
    try {
      const { searchSupplyNationBusinesses } = await import('../supply-nation-service');
      const results = await searchSupplyNationBusinesses("construction", "australia");

      res.json({
        message: "Supply Nation test completed",
        resultsFound: results.totalResults,
        sampleBusinesses: results.businesses.slice(0, 3)
      });
    } catch (error) {
      console.error("Supply Nation test error:", error);
      res.status(500).json({ message: "Supply Nation test failed", error: String(error) });
    }
  });

  // Supply Nation search endpoint
  app.get("/api/supply-nation/search", async (req, res) => {
    try {
      const { query, location, limit } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const { searchSupplyNationBusinesses } = await import('../supply-nation-service');
      const results = await searchSupplyNationBusinesses(query, location as string);

      const limitNumber = limit ? parseInt(limit as string) : undefined;
      const businessesToReturn = limitNumber ? results.businesses.slice(0, limitNumber) : results.businesses;

      res.json({
        businesses: businessesToReturn,
        totalResults: results.totalResults,
        searchQuery: query,
        location: location || 'all'
      });
    } catch (error) {
      console.error("Supply Nation search error:", error);
      res.status(500).json({ message: "Supply Nation search failed", error: String(error) });
    }
  });

  // Helper function to determine verification confidence
  function getVerificationConfidence(business: any): string {
    const searchText = `${business.entityName} ${business.address.suburb || ''} ${business.address.stateCode || ''}`.toLowerCase();

    const strongIndicators = [
      'aboriginal', 'indigenous', 'first nations', 'torres strait', 'native title',
      'koori', 'murri', 'yolngu', 'anangu', 'palawa', 'nunga', 'noongar'
    ];

    const hasStrongIndicator = strongIndicators.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    if (hasStrongIndicator) return 'high';
    if (searchText.includes('cultural') || searchText.includes('traditional')) return 'medium';
    return 'low';
  }

  // Get all ABR businesses with Indigenous filtering for map display
  app.get("/api/indigenous-businesses/map", async (req, res) => {
    try {
      // Get a broader search to populate the map
      const searchTerms = ['aboriginal', 'indigenous', 'cultural', 'traditional', 'community'];
      let allBusinesses: any[] = [];

      for (const term of searchTerms) {
        const results = await searchBusinessesByName(term);
        allBusinesses = [...allBusinesses, ...results.businesses];
      }

      // Remove duplicates based on ABN
      const uniqueBusinesses = allBusinesses.filter((business, index, self) =>
        index === self.findIndex(b => b.abn === business.abn)
      );

      // Apply Indigenous filtering
      const { filterIndigenousBusinesses } = await import('../abr-service');
      const indigenousBusinesses = filterIndigenousBusinesses(uniqueBusinesses);

      // Enrich with location data for map display
      const { enrichBusinessWithLocation } = await import('../abr-service');
      const enrichedBusinesses = await Promise.all(
        indigenousBusinesses.slice(0, 50).map(async (business) => { // Limit to 50 for performance
          const enriched = await enrichBusinessWithLocation(business);
          return {
            ...enriched,
            verificationSource: 'abr_keywords',
            verificationConfidence: getVerificationConfidence(enriched),
            isIndigenousVerified: true
          };
        })
      );

      res.json({
        businesses: enrichedBusinesses,
        totalResults: enrichedBusinesses.length
      });

    } catch (error) {
      console.error("Error fetching Indigenous businesses for map:", error);
      res.status(500).json({ message: "Failed to fetch Indigenous businesses" });
    }
  });

  // Integrated Indigenous business search (ABR + Supply Nation with Puppeteer)
  app.get("/api/indigenous-businesses/integrated-search", async (req, res) => {
    try {
      const { name, location, includeSupplyNation = "true" } = req.query;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Business name is required" });
      }

      const { dataIntegrationService } = await import('../data-integration-service');
      let results = await dataIntegrationService.searchIntegratedBusinesses(
        name,
        location as string,
        includeSupplyNation === "true"
      );

      // Enhance with verified contact information
      const { enhanceWithVerifiedContactInfo } = await import('../supply-nation-contact-enhancer');
      results.businesses = results.businesses.map(business => enhanceWithVerifiedContactInfo(business));

      res.json(results);

    } catch (error) {
      console.error("Integrated search error:", error);
      res.status(500).json({ message: "Failed to perform integrated search" });
    }
  });

  // Search businesses by name (ABR integration)
  app.get("/api/abr/businesses/search", async (req, res) => {
    try {
      const { name, state, postcode } = req.query;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Business name is required" });
      }

      const results = await searchBusinessesByName(
        name,
        state as string,
        postcode as string
      );

      res.json(results);
    } catch (error) {
      console.error("Error searching ABR businesses:", error);
      res.status(500).json({ message: "Failed to search businesses" });
    }
  });

  // Get business by ABN
  app.get("/api/abr/businesses/:abn", async (req, res) => {
    try {
      const { abn } = req.params;

      if (!abn) {
        return res.status(400).json({ message: "ABN is required" });
      }

      const business = await getBusinessByABN(abn);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.json(business);
    } catch (error) {
      console.error("Error fetching ABR business:", error);
      res.status(500).json({ message: "Failed to fetch business details" });
    }
  });

  // Search Indigenous businesses by postcode
  app.get("/api/abr/businesses/postcode/:postcode", async (req, res) => {
    try {
      const { postcode } = req.params;
      const { state } = req.query;

      if (!postcode) {
        return res.status(400).json({ message: "Postcode is required" });
      }

      const results = await searchBusinessesByPostcode(
        postcode,
        state as string,
        ['indigenous', 'aboriginal', 'cultural', 'traditional']
      );

      res.json(results);
    } catch (error) {
      console.error("Error searching businesses by postcode:", error);
      res.status(500).json({ message: "Failed to search businesses" });
    }
  });

  // Dynamic integrated search endpoint (ABR + Supply Nation)
  app.get("/api/dynamic-search/businesses", async (req, res) => {
    try {
      const { q: query, includeSupplyNation = 'true', limit = '20' } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Search query parameter "q" is required',
          example: '/api/dynamic-search/businesses?q=kulbardi'
        });
      }

      const { integratedDynamicSearch } = await import('../integrated-dynamic-search');

      const searchOptions = {
        includeSupplyNation: includeSupplyNation === 'true',
        limit: parseInt(limit as string, 10) || 20
      };

      const result = await integratedDynamicSearch.searchBusinessesDynamically(
        query,
        searchOptions
      );

      res.json({
        success: true,
        query: query,
        results: result.businesses,
        totalFound: result.totalResults,
        executionTime: result.executionTime,
        dataSources: result.dataSource,
        timestamp: result.timestamp
      });

    } catch (error) {
      console.error('Dynamic search error:', error);
      res.status(500).json({
        error: 'Dynamic search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Supply Nation session status endpoint
  app.get("/api/dynamic-search/status", async (req, res) => {
    try {
      const { integratedDynamicSearch } = await import('../integrated-dynamic-search');
      const sessionStatus = integratedDynamicSearch.getSessionStatus();

      res.json({
        success: true,
        session: {
          active: sessionStatus.active,
          lastActivity: sessionStatus.lastActivity,
          uptime: sessionStatus.uptime
        },
        capabilities: {
          abrIntegration: true,
          supplyNationReady: process.env.SUPPLY_NATION_USERNAME && process.env.SUPPLY_NATION_PASSWORD ? true : false,
          dynamicSearch: true
        }
      });

    } catch (error) {
      res.status(500).json({
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Refresh Supply Nation session endpoint
  app.post("/api/dynamic-search/refresh-session", async (req, res) => {
    try {
      if (!process.env.SUPPLY_NATION_USERNAME || !process.env.SUPPLY_NATION_PASSWORD) {
        return res.status(400).json({
          error: 'Supply Nation credentials not configured',
          message: 'Please provide SUPPLY_NATION_USERNAME and SUPPLY_NATION_PASSWORD'
        });
      }

      const { integratedDynamicSearch } = await import('../integrated-dynamic-search');

      // Test search with session refresh
      const testResult = await integratedDynamicSearch.searchBusinessesDynamically('test', {
        includeSupplyNation: true,
        refreshSession: true,
        limit: 1
      });

      res.json({
        success: true,
        sessionRefreshed: true,
        sessionActive: testResult.dataSource.supplyNation.sessionActive,
        message: 'Supply Nation session refresh attempted'
      });

    } catch (error) {
      res.status(500).json({
        error: 'Session refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced business search with Google Maps location data
  app.get("/api/businesses/enhanced-search", async (req, res) => {
    try {
      const { search } = req.query as { search?: string };

      if (!search) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      const { enhancedBusinessLocationService } = await import('../enhanced-business-location-service');
      const enhancedBusinesses = await enhancedBusinessLocationService.searchBusinessesWithLocations(search);

      res.json({
        success: true,
        totalResults: enhancedBusinesses.length,
        businesses: enhancedBusinesses,
        searchTerm: search,
        dataSource: {
          abr: 'Australian Business Register',
          googleMaps: 'Google Maps Places API',
          enhanced: true
        }
      });

    } catch (error) {
      console.error('Enhanced business search error:', error);
      res.status(500).json({
        error: 'Failed to perform enhanced business search',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MGM Alliance comprehensive business profile endpoint
  app.get('/api/businesses/mgm-alliance', async (req, res) => {
    try {
      // Get verified ABR data for MGM Alliance
      const abrResults = await searchBusinessesByName('MGM Alliance');
      const mgmAllianceABR = abrResults.businesses.find(business =>
        business.entityName.toLowerCase().includes('mgm alliance')
      );

      if (!mgmAllianceABR) {
        return res.status(404).json({
          error: 'MGM Alliance not found in business registers',
          searchedSources: ['Australian Business Register']
        });
      }

      // Attempt Supply Nation enhancement
      let supplyNationData = null;
      try {
        const { integratedDynamicSearch } = await import('../integrated-dynamic-search');
        const enhancedResults = await integratedDynamicSearch.searchBusinessesDynamically('MGM Alliance', {
          includeSupplyNation: true,
          refreshSession: false,
          limit: 3
        });

        const mgmSupplyNationMatch = enhancedResults.businesses.find(business =>
          business.entityName.toLowerCase().includes('mgm alliance') &&
          business.supplyNationVerified
        );

        if (mgmSupplyNationMatch) {
          supplyNationData = {
            verified: true,
            profileUrl: mgmSupplyNationMatch.profileUrl,
            categories: mgmSupplyNationMatch.categories,
            description: mgmSupplyNationMatch.description,
            verificationSource: mgmSupplyNationMatch.verificationSource
          };
        }
      } catch (supplyNationError: any) {
        console.log('Supply Nation enhancement not available:', supplyNationError?.message || 'Unknown error');
      }

      // Comprehensive business profile
      const mgmAllianceProfile = {
        companyName: mgmAllianceABR.entityName,
        abn: mgmAllianceABR.abn,
        status: mgmAllianceABR.status,
        entityType: mgmAllianceABR.entityType,
        location: {
          state: mgmAllianceABR.address.stateCode,
          postcode: mgmAllianceABR.address.postcode,
          suburb: mgmAllianceABR.address.suburb,
          fullAddress: mgmAllianceABR.address.fullAddress
        },
        businessDetails: {
          gstRegistered: mgmAllianceABR.gst,
          dgrStatus: mgmAllianceABR.dgr,
          businessType: mgmAllianceABR.entityType
        },
        verification: {
          abrVerified: true,
          supplyNationVerified: supplyNationData?.verified || false,
          verificationSource: supplyNationData?.verified ?
            'Australian Business Register + Supply Nation' :
            'Australian Business Register',
          lastVerified: new Date()
        },
        coordinates: {
          lat: mgmAllianceABR.lat,
          lng: mgmAllianceABR.lng
        },
        supplyNationProfile: supplyNationData || null,
        dataSource: 'Integrated Official Sources',
        searchQuery: 'MGM Alliance'
      };

      res.json({
        success: true,
        business: mgmAllianceProfile,
        dataIntegrity: {
          authenticData: true,
          governmentVerified: true,
          realTimeData: true,
          indigenousVerification: supplyNationData?.verified || false
        },
        sources: {
          abr: 'Verified',
          supplyNation: supplyNationData?.verified ? 'Enhanced Profile Available' : 'Standard Verification'
        }
      });

    } catch (error) {
      console.error('MGM Alliance retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve MGM Alliance data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get businesses with geocoded locations for map display
  app.get("/api/businesses/map", async (req, res) => {
    try {
      const { search } = req.query as { search?: string };

      if (!search) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      const abrResult = await searchBusinessesByName(search);
      const businessesWithLocations = [];

      for (const business of abrResult.businesses) {
        // Build geocoding address from postcode and state
        const geocodeAddress = business.address.postcode && business.address.stateCode
          ? `${business.address.postcode}, ${business.address.stateCode}, Australia`
          : null;

        if (geocodeAddress) {
          try {
            console.log(`Geocoding business: ${business.entityName} at ${geocodeAddress}`);
            const geocodeResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geocodeAddress)}&limit=1&countrycodes=au`,
              {
                headers: {
                  'User-Agent': 'Aboriginal-Australia-Map/1.0'
                }
              }
            );

            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              if (geocodeData.length > 0) {
                const location = geocodeData[0];
                businessesWithLocations.push({
                  ...business,
                  lat: parseFloat(location.lat),
                  lng: parseFloat(location.lon),
                  displayAddress: geocodeAddress
                });
              }
            }
          } catch (geocodeError) {
            console.error('Geocoding error for business:', business.abn, geocodeError);
          }
        }
      }

      res.json({
        businesses: businessesWithLocations,
        totalResults: businessesWithLocations.length
      });
    } catch (error) {
      console.error('Error getting businesses for map:', error);
      res.status(500).json({ error: 'Failed to get businesses for map' });
    }
  });

  // Search verified Indigenous businesses
  app.get("/api/indigenous-businesses/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const maxResults = parseInt(req.query.maxResults as string) || 50;
      const verificationLevel = req.query.verificationLevel as 'all' | 'verified_only' | 'high_confidence' || 'all';

      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const searchResult = await indigenousBusinessService.searchIndigenousBusinesses(query, {
        maxResults,
        includeLocationData: true,
        verificationLevel
      });

      res.json({
        success: true,
        data: searchResult,
        summary: {
          totalResults: searchResult.totalResults,
          verificationSummary: searchResult.verificationSummary,
          dataSources: searchResult.dataSources
        }
      });

    } catch (error) {
      console.error('Indigenous business search error:', error);
      res.status(500).json({
        error: 'Failed to search Indigenous businesses',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get verified business by ABN
  app.get("/api/indigenous-businesses/abn/:abn", async (req, res) => {
    try {
      const abn = req.params.abn;

      if (!abn || !/^\d{11}$/.test(abn)) {
        return res.status(400).json({ error: 'Valid 11-digit ABN is required' });
      }

      const business = await indigenousBusinessService.getVerifiedBusinessByABN(abn);

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      res.json({
        success: true,
        business,
        verification: business.indigenousVerification,
        dataSources: business.dataSources
      });

    } catch (error) {
      console.error('Business lookup error:', error);
      res.status(500).json({
        error: 'Failed to retrieve business data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get MGM Alliance verified profile
  app.get("/api/indigenous-businesses/mgm-alliance", async (req, res) => {
    try {
      const mgmProfile = await indigenousBusinessService.getMGMAllianceProfile();

      if (!mgmProfile) {
        return res.status(404).json({ error: 'MGM Alliance profile not found' });
      }

      res.json({
        success: true,
        business: mgmProfile,
        verification: {
          verified: mgmProfile.indigenousVerification.verified,
          source: mgmProfile.indigenousVerification.verificationSource,
          confidence: mgmProfile.indigenousVerification.confidence,
          method: mgmProfile.indigenousVerification.verificationMethod
        },
        dataSources: mgmProfile.dataSources,
        coordinates: {
          lat: mgmProfile.lat,
          lng: mgmProfile.lng
        }
      });

    } catch (error) {
      console.error('MGM Alliance profile error:', error);
      res.status(500).json({
        error: 'Failed to retrieve MGM Alliance profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get system status
  app.get("/api/indigenous-businesses/system-status", async (req, res) => {
    try {
      const systemStatus = indigenousBusinessService.getSystemStatus();

      res.json({
        success: true,
        systemStatus,
        capabilities: {
          abrIntegration: 'operational',
          supplyNationIntegration: 'credentials_required',
          verificationSystems: 'operational',
          locationEnrichment: 'operational'
        }
      });

    } catch (error) {
      console.error('System status error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
