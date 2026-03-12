import type { Express } from "express";
import { storage } from "../database-storage";
import type { TerritoryGeoJSON } from "@shared/schema";
import { validateParams, territoryIdSchema, coordinatesSchema } from "../validation";
import { getBusinessesForTerritory, type ABRBusinessDetails } from "../abr-service";
import { nativeTitleCacheService } from "../native-title-cache-service";
import { geoscienceAustraliaService } from "../geoscience-australia-service";
import { geoscienceAustraliaPlaceNames } from "../geoscience-australia-placenames";
import { fetchRATSIBBoundaries } from "../ratsib-service";
import { simplifyCoordinates, getTerritoryBounds } from "./helpers";

export function registerTerritoryRoutes(app: Express): void {
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
            centerLat: territory.centerLat,
            centerLng: territory.centerLng,
          },
          geometry: {
            ...(territory.geometry as any),
            coordinates: simplifyCoordinates((territory.geometry as any).coordinates),
          },
        }))
      };

      // Territory data is static — cache for 5 minutes, allow stale for 1 hour
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
      res.json(geoJSON);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch territories" });
    }
  });

  // Search territories by name (must be before :id route)
  app.get("/api/territories/search", async (req, res) => {
    try {
      const query = (req.query.q as string || '').toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json({ territories: [], totalResults: 0 });
      }

      const allTerritories = await storage.getTerritories();

      // Search by name, group name, language family, or region
      const matchingTerritories = allTerritories.filter(t =>
        t.name.toLowerCase().includes(query) ||
        (t.groupName && t.groupName.toLowerCase().includes(query)) ||
        (t.languageFamily && t.languageFamily.toLowerCase().includes(query)) ||
        (t.region && t.region.toLowerCase().includes(query))
      ).slice(0, 20); // Limit results

      const territories = matchingTerritories.map(t => ({
        id: t.id,
        name: t.name,
        groupName: t.groupName,
        region: t.region,
        regionType: t.regionType,
        centerLat: t.centerLat,
        centerLng: t.centerLng,
        languageFamily: t.languageFamily
      }));

      res.json({
        territories,
        totalResults: territories.length,
        source: 'Aboriginal Territory Database'
      });
    } catch (error) {
      console.error('Territory search error:', error);
      res.status(500).json({ error: 'Territory search failed' });
    }
  });

  // Get territory by ID
  app.get("/api/territories/:id", validateParams(territoryIdSchema), async (req, res) => {
    try {
      const id = Number(req.params.id);
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
  app.get("/api/territories/location/:lat/:lng", validateParams(coordinatesSchema), async (req, res) => {
    try {
      const lat = Number(req.params.lat);
      const lng = Number(req.params.lng);

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

  // Get mining impact analysis for territory
  app.get("/api/territories/:id/mining-impact", async (req, res) => {
    try {
      const territoryId = parseInt(req.params.id);
      if (isNaN(territoryId)) {
        return res.status(400).json({ message: "Invalid territory ID" });
      }

      const territory = await storage.getTerritoryById(territoryId);
      if (!territory) {
        return res.status(404).json({ message: "Territory not found" });
      }

      // Get territory bounds from the GeoJSON geometry
      const bounds = getTerritoryBounds(territory);

      // Fetch deposits from Geoscience Australia
      const gaResult = await geoscienceAustraliaService.getAllDeposits({ limit: 500 });

      // Filter deposits that fall within territory bounds
      const overlappingDeposits = gaResult.deposits.filter(deposit => {
        if (!deposit.coordinates) return false;
        const { lat, lng } = deposit.coordinates;
        const inBounds = lat >= bounds.south && lat <= bounds.north &&
               lng >= bounds.west && lng <= bounds.east;
        return inBounds;
      });
      // Calculate commodity breakdown
      const commodityBreakdown: Record<string, number> = {};
      overlappingDeposits.forEach(deposit => {
        const commodities = deposit.commodities || '';
        // Handle both string and array formats
        const commodityList = Array.isArray(commodities)
          ? commodities
          : (typeof commodities === 'string' ? commodities.split(',') : []);

        commodityList.forEach((commodity: string) => {
          const cleanCommodity = commodity.trim().split(',')[0].trim();
          if (cleanCommodity) {
            commodityBreakdown[cleanCommodity] = (commodityBreakdown[cleanCommodity] || 0) + 1;
          }
        });
      });

      res.json({
        deposits: overlappingDeposits.map(d => ({
          id: d.id,
          name: d.name,
          state: d.state,
          commodities: d.commodities,
          status: d.status,
          coordinates: d.coordinates
        })),
        totalCount: overlappingDeposits.length,
        commodityBreakdown,
        territoryName: territory.name,
        source: 'Geoscience Australia'
      });
    } catch (error) {
      console.error("Error fetching mining impact:", error);
      res.status(500).json({ message: "Failed to fetch mining impact data" });
    }
  });

  // Territory details endpoint for dynamic content pages
  app.get('/api/territories/:territoryName/details', async (req, res) => {
    try {
      const { territoryName } = req.params;
      const decodedName = decodeURIComponent(territoryName);

      console.log(`Fetching territory details for: ${decodedName}`);

      // Get territory from database using the correct method
      const allTerritories = await storage.getTerritories();
      const territory = allTerritories.find(t =>
        t.name === decodedName ||
        t.groupName === decodedName ||
        t.name.toLowerCase() === decodedName.toLowerCase() ||
        t.groupName.toLowerCase() === decodedName.toLowerCase()
      );

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found',
          searchedName: decodedName,
          availableTerritories: allTerritories.slice(0, 5).map(t => t.name)
        });
      }

      // Get related territories from the same language family for traditional languages
      const relatedLanguages = allTerritories
        .filter(t =>
          t.region === territory.region ||
          t.languageFamily === territory.languageFamily
        )
        .map(t => t.name)
        .filter(name => name !== territory.name)
        .slice(0, 5);

      const territoryDetails = {
        ...territory,
        traditionalLanguages: relatedLanguages.length > 0 ? relatedLanguages : [territory.name]
      };

      console.log(`Found territory details for ${territory.name}`);
      res.json(territoryDetails);

    } catch (error) {
      console.error('Territory details error:', error);
      res.status(500).json({
        error: 'Failed to fetch territory details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Native Title information for territory
  app.get("/api/territories/:territoryName/native-title", async (req, res) => {
    try {
      const { territoryName } = req.params;
      const decodedName = decodeURIComponent(territoryName);

      // Get territory from database to extract coordinates
      const allTerritories = await storage.getTerritories();
      const territory = allTerritories.find(t =>
        t.name === decodedName ||
        t.groupName === decodedName ||
        t.name.toLowerCase() === decodedName.toLowerCase() ||
        t.groupName.toLowerCase() === decodedName.toLowerCase()
      );

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found',
          searchedName: decodedName
        });
      }

      // Extract coordinates from territory geometry or center point
      let lat, lng;
      if (territory.geometry && (territory.geometry as any).coordinates) {
        const coords = (territory.geometry as any).coordinates[0][0]; // First coordinate of polygon
        lng = coords[0];
        lat = coords[1];
      } else {
        // Fallback to center coordinates if available
        lat = (territory as any).centerLat || (territory as any).lat;
        lng = (territory as any).centerLng || (territory as any).lng;
      }

      if (!lat || !lng) {
        return res.status(400).json({
          error: 'Territory coordinates not available'
        });
      }

      // Use optimized cache service for faster loading (reduces 16-19s to <2s)
      const cachedData = await nativeTitleCacheService.getNativeTitleForLocation(lat, lng);

      // Separate applications from determinations based on authentic government data
      const allRecords = [...cachedData.applications, ...cachedData.determinations];

      // Categorize based on DETOUTCOME field from Australian Government data
      const applications = allRecords.filter((det: any) => {
        const outcome = det.properties?.DETOUTCOME || '';
        return !outcome.includes('Native title exists') && !outcome.includes('Native title does not exist');
      });

      const determinations = allRecords.filter((det: any) => {
        const outcome = det.properties?.DETOUTCOME || '';
        return outcome.includes('Native title exists') || outcome.includes('Native title does not exist');
      });

      // Format data to match expected structure
      const nativeTitleInfo = {
        hasNativeTitle: allRecords.length > 0,
        applications: allRecords.map((det: any) => ({
          applicationId: det.properties?.TRIBID || det.properties?.FCNO || `APP_${Math.random().toString(36).substr(2, 9)}`,
          tribunalNumber: det.properties?.FCNO || det.properties?.TRIBID || 'N/A',
          applicantName: det.properties?.NAME || det.properties?.FCNAME || 'Traditional Owners',
          status: det.properties?.DETOUTCOME || 'Active Application',
          area: parseFloat(det.properties?.AREASQKM || '0') || 0,
          state: det.properties?.JURIS || 'NT',
          outcome: det.properties?.DETOUTCOME || 'Application in progress',
          traditionalOwners: [det.properties?.NAME || det.properties?.FCNAME || 'Traditional Owners'],
          coordinates: { lat: 0, lng: 0 },
          references: {
            sourceUrl: 'https://data.gov.au/data/dataset/native-title-determinations',
            lastUpdated: '2025-05-30T00:00:00Z',
            dataProvider: 'National Native Title Tribunal (NNTT)',
            licenseType: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
            citation: `National Native Title Tribunal. (2025). Native Title Determinations Register. Tribunal File: ${det.properties?.FCNO || det.properties?.TRIBID || 'N/A'}. Retrieved from https://data.gov.au/data/dataset/native-title-determinations`
          }
        })),
        // Add correct counts for UI display
        totalRecords: allRecords.length,
        applicationsCount: applications.length,
        determinationsCount: determinations.length,
        status: determinations.length > 0 ? 'determined' : 'pending'
      };

      res.json({
        success: true,
        territoryName: decodedName,
        nativeTitleData: nativeTitleInfo,
        dataSource: 'Australian Government Native Title Tribunal (Cached)',
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

  // Territory place names endpoint - Geoscience Australia data
  app.get('/api/territories/:territoryName/place-names', async (req, res) => {
    try {
      const territoryName = decodeURIComponent(req.params.territoryName);
      console.log(`Fetching place names for territory: ${territoryName}`);

      // Get territory details for bounds - use getTerritories and find by name
      const territories = await storage.getTerritories();
      const territory = territories.find(t =>
        t.name === territoryName ||
        t.groupName === territoryName ||
        t.name.toLowerCase() === territoryName.toLowerCase()
      );
      if (!territory || !territory.geometry) {
        return res.status(404).json({
          success: false,
          error: 'Territory not found or missing geometry'
        });
      }

      // Calculate territory bounds for place name search
      const geometry = territory.geometry as any;
      const coordinates = geometry.coordinates[0];
      const lats = coordinates.map((coord: number[]) => coord[1]);
      const lngs = coordinates.map((coord: number[]) => coord[0]);

      const bounds = {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
      };

      console.log(`Territory bounds for ${territoryName}:`, bounds);

      // Fetch place names from Geoscience Australia
      const placeNamesResult = await geoscienceAustraliaPlaceNames.getPlaceNamesForTerritory(
        territoryName,
        bounds
      );

      console.log(`Found ${placeNamesResult.totalFound} place names for ${territoryName}`);

      res.json({
        success: true,
        territoryName: territory.name,
        placeNamesData: {
          totalPlaces: placeNamesResult.totalFound,
          places: placeNamesResult.places,
          bounds: bounds,
          source: 'geoscience_australia_official'
        }
      });

    } catch (error) {
      console.error('Error fetching place names:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch place names data',
        requiresApiKey: true,
        dataSource: 'geoscience_australia_gazetteer'
      });
    }
  });

  // AI-generated cultural content for territory
  app.get('/api/territories/:territoryName/ai-content', async (req, res) => {
    try {
      const { territoryName } = req.params;
      const decodedName = decodeURIComponent(territoryName);

      console.log(`Fetching AI content for territory: ${decodedName}`);

      const allTerritories = await storage.getTerritories();
      const territory = allTerritories.find(t =>
        t.name === decodedName ||
        t.groupName === decodedName ||
        t.name.toLowerCase() === decodedName.toLowerCase() ||
        t.groupName.toLowerCase() === decodedName.toLowerCase()
      );

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found',
          searchedName: decodedName
        });
      }

      const { getAITerritoryContent } = await import('../ai-content-service');
      const aiContent = await getAITerritoryContent(
        territory.name,
        territory.region,
        territory.centerLat,
        territory.centerLng
      );

      if (!aiContent) {
        return res.json({
          success: false,
          message: 'AI content generation unavailable',
          territory: territory.name
        });
      }

      res.json({
        success: true,
        territory: territory.name,
        aiContent: {
          ...aiContent,
          disclaimer: 'This content was researched and generated by AI. While we strive for accuracy, this information should be verified with Traditional Owners and official Aboriginal cultural resources.',
          isAIGenerated: true
        }
      });

    } catch (error) {
      console.error('AI content error:', error);
      res.status(500).json({
        error: 'Failed to generate AI content',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Territory exploration reports endpoint
  app.get('/api/territories/:territoryName/exploration', async (req, res) => {
    try {
      const { territoryName } = req.params;
      const decodedName = decodeURIComponent(territoryName);

      console.log(`Fetching exploration data for territory: ${decodedName}`);

      // Get territory geometry
      const allTerritories = await storage.getTerritories();
      const territory = allTerritories.find(t =>
        t.name === decodedName ||
        t.groupName === decodedName ||
        t.name.toLowerCase() === decodedName.toLowerCase() ||
        t.groupName.toLowerCase() === decodedName.toLowerCase()
      );

      if (!territory || !territory.geometry) {
        return res.status(404).json({
          error: 'Territory not found or no geometry available',
          searchedName: decodedName
        });
      }

      // Use the exploration mineral service to fetch reports within territory bounds
      const { explorationMineralService } = await import('../exploration-mineral-service');

      // Calculate territory bounds from geometry
      const geometry = territory.geometry as any;
      const coords = geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry.coordinates.flat();

      const lats = coords.map((coord: any) => coord[1]);
      const lngs = coords.map((coord: any) => coord[0]);

      const bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
      };

      // Fetch exploration reports within territory bounds using the correct method
      const explorationReports = await explorationMineralService.getExplorationReportsForMapBounds(
        bounds,
        undefined, // commodity filter
        undefined, // yearFrom filter
        undefined, // yearTo filter
        500 // limit for territory display
      );

      // Simple point-in-polygon utility for territory filtering
      const pointInPolygon = (point: [number, number], polygon: any): boolean => {
        const [x, y] = point;
        const polyCoords = polygon.type === 'Polygon'
          ? polygon.coordinates[0]
          : polygon.coordinates.flat();

        let inside = false;
        for (let i = 0, j = polyCoords.length - 1; i < polyCoords.length; j = i++) {
          const [xi, yi] = polyCoords[i];
          const [xj, yj] = polyCoords[j];

          if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
          }
        }
        return inside;
      };

      // Filter reports that actually intersect with territory geometry
      const territoryReports = explorationReports.filter((report: any) => {
        if (!report.coordinates || report.coordinates.length === 0) return false;

        // Simple point-in-polygon check for report center
        const centerLat = report.coordinates.reduce((sum: number, coord: any) => sum + coord[0], 0) / report.coordinates.length;
        const centerLng = report.coordinates.reduce((sum: number, coord: any) => sum + coord[1], 0) / report.coordinates.length;

        return pointInPolygon([centerLng, centerLat], territory.geometry);
      });

      // Group by commodity for summary - ensure accurate counts match database records
      const commoditySummary = territoryReports.reduce((acc: any, report: any) => {
        if (!report.targetCommodity) return acc;

        // Handle multiple commodities separated by semicolons or commas
        const commodities = report.targetCommodity
          .split(/[;,]/)
          .map((c: string) => c.trim().toUpperCase())
          .filter((c: string) => c && c.length > 0);

        // Count each commodity mentioned in the report
        commodities.forEach((commodity: string) => {
          if (!acc[commodity]) {
            acc[commodity] = {
              commodity: commodity,
              count: 0,
              reports: []
            };
          }

          // Only count each report once per commodity to avoid duplicates
          if (!acc[commodity].reports.find((r: any) => r.id === report.id)) {
            acc[commodity].count++;
            acc[commodity].reports.push(report);
          }
        });

        return acc;
      }, {} as Record<string, { commodity: string; count: number; reports: any[] }>);

      console.log(`Found ${territoryReports.length} exploration reports in ${territory.name}`);

      res.json({
        success: true,
        territoryName: territory.name,
        explorationData: {
          totalReports: territoryReports.length,
          reports: territoryReports, // Return all reports to match commodity counts
          commoditySummary: Object.values(commoditySummary).sort((a: any, b: any) => b.count - a.count),
          bounds: bounds,
          source: 'wa_dmirs_authentic'
        }
      });

    } catch (error) {
      console.error('Territory exploration data error:', error);
      res.status(500).json({
        error: 'Failed to fetch exploration data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get RATSIB boundaries for territory
  app.get("/api/territories/:territoryName/ratsib", async (req, res) => {
    try {
      const { territoryName } = req.params;
      const decodedName = decodeURIComponent(territoryName);

      // Get territory from database to extract coordinates
      const allTerritories = await storage.getTerritories();
      const territory = allTerritories.find(t =>
        t.name === decodedName ||
        t.groupName === decodedName ||
        t.name.toLowerCase() === decodedName.toLowerCase() ||
        t.groupName.toLowerCase() === decodedName.toLowerCase()
      );

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found',
          searchedName: decodedName
        });
      }

      // Extract coordinates from territory geometry or center point
      let lat, lng;
      if (territory.geometry && (territory.geometry as any).coordinates) {
        const coords = (territory.geometry as any).coordinates[0][0]; // First coordinate of polygon
        lng = coords[0];
        lat = coords[1];
      } else {
        // Fallback to center coordinates if available
        lat = (territory as any).centerLat || (territory as any).lat;
        lng = (territory as any).centerLng || (territory as any).lng;
      }

      if (!lat || !lng) {
        return res.status(400).json({
          error: 'Territory coordinates not available'
        });
      }

      const ratsibData = await fetchRATSIBBoundaries(lat, lng, decodedName);

      res.json({
        success: true,
        territoryName: decodedName,
        coordinates: { lat, lng },
        ratsibData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('RATSIB boundaries error:', error);
      res.status(500).json({
        error: 'Failed to fetch RATSIB boundaries',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
