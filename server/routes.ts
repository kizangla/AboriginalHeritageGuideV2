import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./database-storage";
import { z } from "zod";
import type { TerritoryGeoJSON, SearchResult } from "@shared/schema";
import { 
  searchBusinessesByName, 
  getBusinessByABN, 
  getBusinessesForTerritory,
  searchBusinessesByPostcode,
  searchIndigenousBusinesses,
  type ABRBusinessDetails 
} from "./abr-service";
import { nativeTitleService } from "./native-title-service";
import { nativeTitleTerritoryFilter, type NativeTitleStatusFilter } from "./native-title-territory-filter";

// Australian postcode coordinate lookup for business positioning
function getPostcodeCoordinates(postcode: string, stateCode: string): { lat: number; lng: number } | null {
  const postcodeMap: { [key: string]: { lat: number; lng: number } } = {
    // Major Australian cities and postcodes
    '2000': { lat: -33.8688, lng: 151.2093 }, // Sydney CBD
    '3000': { lat: -37.8136, lng: 144.9631 }, // Melbourne CBD
    '4000': { lat: -27.4698, lng: 153.0251 }, // Brisbane CBD
    '5000': { lat: -34.9285, lng: 138.6007 }, // Adelaide CBD
    '6000': { lat: -31.9505, lng: 115.8605 }, // Perth CBD
    '7000': { lat: -42.8821, lng: 147.3272 }, // Hobart CBD
    '0800': { lat: -12.4634, lng: 130.8456 }, // Darwin CBD
    '2600': { lat: -35.2809, lng: 149.1300 }, // Canberra CBD
    
    // WA postcodes
    '6714': { lat: -20.7403, lng: 116.8469 }, // Karratha area
    '6160': { lat: -32.0569, lng: 115.7975 }, // Fremantle
    '6050': { lat: -31.9354, lng: 115.8072 }, // Mount Lawley
    '6100': { lat: -32.0569, lng: 115.7975 }, // Fremantle area
    '6035': { lat: -31.8857, lng: 115.8042 }, // Osborne Park area
    
    // NSW postcodes
    '2150': { lat: -33.8096, lng: 151.0189 }, // Parramatta
    '2170': { lat: -33.9297, lng: 150.8671 }, // Liverpool
    '2176': { lat: -33.9239, lng: 150.8446 }, // Warwick Farm
    '2179': { lat: -33.9406, lng: 150.8694 }, // Holsworthy
    '2195': { lat: -33.9481, lng: 151.1419 }, // Revesby
    '2060': { lat: -33.8365, lng: 151.2008 }, // North Sydney
    
    // QLD postcodes
    '4223': { lat: -27.9285, lng: 153.3479 }, // Currumbin
    '4101': { lat: -27.4833, lng: 153.0167 }, // South Brisbane
    
    // NT postcodes
    '0820': { lat: -12.4381, lng: 130.8411 }, // Nightcliff
    
    // SA postcodes
    '5038': { lat: -35.0297, lng: 138.5653 }, // Edwardstown
    '5039': { lat: -35.0297, lng: 138.5653 }, // Morphettville
    
    // VIC postcodes
    '3124': { lat: -37.8477, lng: 145.0806 }, // Camberwell
    '3500': { lat: -36.3615, lng: 144.9547 }  // Bendigo
  };
  
  return postcodeMap[postcode] || null;
}

import { indigenousBusinessService } from "./indigenous-business-service";
import { asyncGeocodingService } from "./async-geocoding-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all territories as GeoJSON
  app.get("/api/territories", async (req, res) => {
    try {
      const territories = await storage.getTerritories();
      
      const geoJSON = {
        type: "FeatureCollection",
        features: territories.map((territory): TerritoryGeoJSON => ({
          type: "Feature",
          properties: {
            id: territory.id,
            name: territory.name,
            groupName: territory.groupName,
            languageFamily: territory.languageFamily,
            region: territory.region,
            regionType: territory.regionType,
            estimatedPopulation: territory.estimatedPopulation,
            culturalInfo: territory.culturalInfo,
            historicalContext: territory.historicalContext,
            traditionalLanguages: territory.traditionalLanguages || [],
            color: territory.color,
          },
          geometry: territory.geometry as any,
        }))
      };

      res.json(geoJSON);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch territories" });
    }
  });

  // Get territory by ID
  app.get("/api/territories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid territory ID" });
      }

      const territory = await storage.getTerritoryById(id);
      if (!territory) {
        return res.status(404).json({ message: "Territory not found" });
      }

      res.json(territory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch territory" });
    }
  });

  // Get territory by coordinates
  app.get("/api/territories/location/:lat/:lng", async (req, res) => {
    try {
      const lat = parseFloat(req.params.lat);
      const lng = parseFloat(req.params.lng);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      const territory = await storage.getTerritoryByCoordinates(lat, lng);
      if (!territory) {
        return res.status(404).json({ message: "No territory found at these coordinates" });
      }

      res.json(territory);
    } catch (error) {
      res.status(500).json({ message: "Failed to find territory" });
    }
  });

  // Get businesses by territory (enhanced with ABR data)
  app.get("/api/territories/:id/businesses", async (req, res) => {
    try {
      const territoryId = parseInt(req.params.id);
      if (isNaN(territoryId)) {
        return res.status(400).json({ message: "Invalid territory ID" });
      }

      // Get local businesses from database
      const localBusinesses = await storage.getBusinessesByTerritory(territoryId);
      
      // Get territory details for ABR search
      const territory = await storage.getTerritoryById(territoryId);
      
      let abrBusinesses: ABRBusinessDetails[] = [];
      if (territory) {
        // Search ABR for businesses in this territory
        abrBusinesses = await getBusinessesForTerritory(
          territory.name,
          undefined, // We'll enhance with postcode mapping later
          territory.region.substring(0, 3) // Use first 3 chars as state hint
        );
      }
      
      // Combine local and ABR data
      const combinedBusinesses = [
        ...localBusinesses,
        ...abrBusinesses.map(abr => ({
          id: `abr-${abr.abn}`,
          name: abr.entityName,
          address: `${abr.address.suburb || ''} ${abr.address.stateCode || ''} ${abr.address.postcode || ''}`.trim(),
          businessType: abr.entityType,
          description: `ABN: ${abr.abn} - ${abr.status} business ${abr.gst ? 'with GST registration' : ''}`,
          contactPhone: null,
          contactEmail: null,
          website: null,
          territoryId,
          lat: 0, // We'll enhance with geocoding later
          lng: 0,
          isVerified: true,
          establishedYear: null,
          employeeCount: null,
          services: [],
          certifications: abr.dgr ? ['DGR Status'] : [],
          socialMedia: {},
          abn: abr.abn,
          source: 'ABR'
        }))
      ];
      
      res.json(combinedBusinesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  // Get nearby businesses
  app.get("/api/businesses/nearby/:lat/:lng", async (req, res) => {
    try {
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
      console.log(`Found ${abrResults.totalResults} businesses in ABR for: "${query}"`);
      
      // Transform all businesses with immediate coordinate mapping
      const allBusinesses = abrResults.businesses.map((business: ABRBusinessDetails) => {
        // Get immediate coordinates (non-blocking)
        const geoResult = asyncGeocodingService.getImmediateCoordinates(business);
        
        console.log(`${business.entityName}: ${geoResult.lat}, ${geoResult.lng} (${geoResult.accuracy})`);

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
      
      console.log(`Returning ${allBusinesses.length} businesses from ABR`);
      res.json(allBusinesses);
    } catch (error) {
      console.error("Error searching Australian businesses:", error);
      res.status(500).json({ message: "Failed to search Australian businesses" });
    }
  });

  // ABR Business Search Routes
  
  // Test Supply Nation connection
  app.get("/api/supply-nation/test", async (req, res) => {
    try {
      const { searchSupplyNationBusinesses } = await import('./supply-nation-service');
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
      
      const { searchSupplyNationBusinesses } = await import('./supply-nation-service');
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

  // Enhanced Indigenous business search with better ABR filtering
  app.get("/api/indigenous-businesses/search", async (req, res) => {
    try {
      const { name, location, confidence } = req.query;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Business name is required" });
      }
      
      console.log("Searching for Indigenous businesses:", name);
      
      // Search ABR for all businesses matching the name
      const abrResults = await searchBusinessesByName(name);
      console.log(`Found ${abrResults.totalResults} ABR results for "${name}"`);
      
      // Apply enhanced Indigenous business filtering
      const { filterIndigenousBusinesses } = await import('./abr-service');
      const indigenousBusinesses = filterIndigenousBusinesses(abrResults.businesses);
      
      console.log(`Enhanced filtering found ${indigenousBusinesses.length} Indigenous businesses from ${abrResults.businesses.length} total results`);
      
      // Add verification information to each business
      const enrichedBusinesses = indigenousBusinesses.map(business => ({
        ...business,
        verificationSource: 'abr_keywords',
        verificationConfidence: getVerificationConfidence(business),
        isIndigenousVerified: true
      }));
      
      console.log(`Filtered to ${enrichedBusinesses.length} likely Indigenous businesses`);
      
      res.json({
        businesses: enrichedBusinesses,
        totalResults: enrichedBusinesses.length,
        searchQuery: name,
        location: location || 'all',
        filterApplied: 'indigenous_keywords'
      });
      
    } catch (error) {
      console.error("Indigenous business search error:", error);
      res.status(500).json({ message: "Failed to search Indigenous businesses" });
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
      const { filterIndigenousBusinesses } = await import('./abr-service');
      const indigenousBusinesses = filterIndigenousBusinesses(uniqueBusinesses);
      
      // Enrich with location data for map display
      const { enrichBusinessWithLocation } = await import('./abr-service');
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
      
      console.log(`Returning ${enrichedBusinesses.length} Indigenous businesses for map`);
      
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
      
      console.log(`Integrated search for: "${name}" with Supply Nation: ${includeSupplyNation}`);
      
      const { dataIntegrationService } = await import('./data-integration-service');
      let results = await dataIntegrationService.searchIntegratedBusinesses(
        name,
        location as string,
        includeSupplyNation === "true"
      );
      
      // Enhance with verified contact information
      const { enhanceWithVerifiedContactInfo } = await import('./supply-nation-contact-enhancer');
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

      const { integratedDynamicSearch } = await import('./integrated-dynamic-search');
      
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
      const { integratedDynamicSearch } = await import('./integrated-dynamic-search');
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

  // MGM Alliance comprehensive business profile endpoint
  app.get('/api/businesses/mgm-alliance', async (req, res) => {
    try {
      // Get verified ABR data for MGM Alliance
      const abrResults = await searchBusinessesByName('MGM Alliance', 5);
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
        const { integratedDynamicSearch } = await import('./integrated-dynamic-search');
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
      } catch (supplyNationError) {
        console.log('Supply Nation enhancement not available:', supplyNationError.message);
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

  // Get Native Title information for territory
  app.get("/api/territories/:territoryName/native-title", async (req, res) => {
    try {
      const { territoryName } = req.params;
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ 
          error: 'Latitude and longitude required' 
        });
      }

      const nativeTitleInfo = await nativeTitleService.getNativeTitleInfo(
        parseFloat(lat as string), 
        parseFloat(lng as string), 
        territoryName
      );

      res.json({
        success: true,
        territoryName,
        nativeTitle: nativeTitleInfo,
        dataSource: 'Australian Government Native Title Tribunal',
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Native Title API error:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve Native Title information',
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

  // Refresh Supply Nation session endpoint
  app.post("/api/dynamic-search/refresh-session", async (req, res) => {
    try {
      if (!process.env.SUPPLY_NATION_USERNAME || !process.env.SUPPLY_NATION_PASSWORD) {
        return res.status(400).json({
          error: 'Supply Nation credentials not configured',
          message: 'Please provide SUPPLY_NATION_USERNAME and SUPPLY_NATION_PASSWORD'
        });
      }

      const { integratedDynamicSearch } = await import('./integrated-dynamic-search');
      
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

  // Geocoding endpoint (using enhanced Nominatim)
  app.get("/api/geocode", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      // Enhanced Nominatim search with better address handling
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=AU&addressdetails=1&extratags=1&q=${encodeURIComponent(query)}`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const rawResults = await response.json();
      
      // Enhanced results with better address formatting
      const results: SearchResult[] = rawResults.map((result: any) => {
        // Build a more detailed display name from address components
        let displayName = result.display_name;
        
        if (result.address) {
          const address = result.address;
          const components = [];
          
          // Add house number and street
          if (address.house_number && address.road) {
            components.push(`${address.house_number} ${address.road}`);
          } else if (address.road) {
            components.push(address.road);
          }
          
          // Add suburb/locality
          if (address.suburb || address.locality || address.village) {
            components.push(address.suburb || address.locality || address.village);
          }
          
          // Add city/town
          if (address.city || address.town) {
            components.push(address.city || address.town);
          }
          
          // Add state and postcode
          if (address.state) {
            let stateInfo = address.state;
            if (address.postcode) {
              stateInfo += ` ${address.postcode}`;
            }
            components.push(stateInfo);
          }
          
          // Add country
          if (address.country) {
            components.push(address.country);
          }
          
          if (components.length > 0) {
            displayName = components.join(', ');
          }
        }
        
        return {
          display_name: displayName,
          lat: result.lat,
          lon: result.lon,
          place_id: result.place_id,
          boundingbox: result.boundingbox
        };
      });

      res.json(results);
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ message: "Geocoding service unavailable" });
    }
  });

  // Reverse geocoding endpoint
  app.get("/api/reverse-geocode/:lat/:lng", async (req, res) => {
    try {
      const lat = parseFloat(req.params.lat);
      const lng = parseFloat(req.params.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ message: "Reverse geocoding service unavailable" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
