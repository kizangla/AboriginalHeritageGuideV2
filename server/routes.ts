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
      const results = await dataIntegrationService.searchIntegratedBusinesses(
        name,
        location as string,
        includeSupplyNation === "true"
      );
      
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
