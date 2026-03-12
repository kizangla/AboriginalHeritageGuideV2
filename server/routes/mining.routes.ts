import type { Express } from "express";
import { storage } from "../database-storage";
import { miningService } from "../mining-service";
import { getMiningTenementsData } from "../cached-mining-data";
import { databaseMiningAPI } from "../database-mining-api";
import { explorationMineralService } from "../exploration-mineral-service";
import { fetchMiningTenementsForTerritory, fetchAllMiningTenements } from "../wa-dmirs-tenements-service";
import { waMinedexService } from "../wa-minedex-service";
import { waWamexService } from "../wa-wamex-service";
import { registerMiningAPI } from "../wa-mining-api";

export function registerMiningRoutes(app: Express): void {
  // Search MINEDEX sites (mines, deposits, prospects)
  app.get("/api/minedex/search", async (req, res) => {
    try {
      const query = (req.query.q as string || '').toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json({ sites: [], totalResults: 0 });
      }

      // Get MINEDEX data for all of WA and filter by query
      const bounds = { minLat: -35, maxLat: -14, minLng: 112, maxLng: 129 };
      const result = await waMinedexService.getSitesForTerritory('Western Australia', bounds);

      // Search by site name or commodity
      const matchingSites = result.sites.filter(site =>
        site.siteTitle.toLowerCase().includes(query) ||
        (site.siteCommodities && site.siteCommodities.toLowerCase().includes(query)) ||
        (site.siteStage && site.siteStage.toLowerCase().includes(query))
      ).slice(0, 20);

      res.json({
        sites: matchingSites,
        totalResults: matchingSites.length,
        source: 'WA Department of Mines (DMIRS) MINEDEX'
      });
    } catch (error) {
      console.error('MINEDEX search error:', error);
      res.status(500).json({ error: 'MINEDEX search failed' });
    }
  });

  // Search WAMEX exploration reports
  app.get("/api/wamex/search", async (req, res) => {
    try {
      const query = (req.query.q as string || '').toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json({ reports: [], totalResults: 0 });
      }

      // Get WAMEX data for all of WA and filter by query
      const bounds = { minLat: -35, maxLat: -14, minLng: 112, maxLng: 129 };
      const result = await waWamexService.getReportsForTerritory('Western Australia', bounds);

      // Search by project name, operator, or commodity
      const matchingReports = result.reports.filter(report =>
        (report.project && report.project.toLowerCase().includes(query)) ||
        (report.operator && report.operator.toLowerCase().includes(query)) ||
        (report.targetCommodity && report.targetCommodity.toLowerCase().includes(query))
      ).slice(0, 20);

      res.json({
        reports: matchingReports,
        totalResults: matchingReports.length,
        source: 'WA Department of Mines (DMIRS) WAMEX'
      });
    } catch (error) {
      console.error('WAMEX search error:', error);
      res.status(500).json({ error: 'WAMEX search failed' });
    }
  });

  // Mining Tenements API endpoints (KML cached data)
  app.get('/api/mining/tenements', async (req, res) => {
    try {
      const { north, south, east, west } = req.query;

      let bounds: any = undefined;
      if (north && south && east && west) {
        bounds = {
          north: parseFloat(north as string),
          south: parseFloat(south as string),
          east: parseFloat(east as string),
          west: parseFloat(west as string)
        };
      }

      const miningData = getMiningTenementsData();
      const tenements = miningData.tenements;

      res.json({
        success: true,
        tenements,
        totalFound: tenements.length,
        dataSource: 'wa_dmirs_kml',
        dataIntegrity: {
          authenticData: true,
          governmentSource: 'WA Department of Mines, Industry Regulation and Safety (DMIRS)',
          localKMLData: true
        }
      });

    } catch (error) {
      console.error('Mining tenements error:', error);
      res.status(500).json({
        error: 'Failed to fetch mining tenements',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Database-powered mining tenements API with complete 144MB dataset
  app.get("/api/mining/tenements", async (req, res) => {
    try {
      const filters = {
        tenementTypes: req.query.types ? String(req.query.types).split(',') : undefined,
        status: req.query.status ? String(req.query.status).split(',') : undefined,
        holders: req.query.holders ? String(req.query.holders).split(',') : undefined,
        states: req.query.states ? String(req.query.states).split(',') : undefined,
        mineralTypes: req.query.minerals ? String(req.query.minerals).split(',') : undefined,
        majorCompaniesOnly: req.query.majorOnly === 'true',
        areaRange: req.query.minArea || req.query.maxArea ? {
          min: req.query.minArea ? parseFloat(String(req.query.minArea)) : undefined,
          max: req.query.maxArea ? parseFloat(String(req.query.maxArea)) : undefined
        } : undefined,
        bounds: req.query.north ? {
          north: parseFloat(String(req.query.north)),
          south: parseFloat(String(req.query.south)),
          east: parseFloat(String(req.query.east)),
          west: parseFloat(String(req.query.west))
        } : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit)) : 1000,
        offset: req.query.offset ? parseInt(String(req.query.offset)) : 0,
        sortBy: req.query.sortBy as 'holder' | 'area' | 'grantDate' | 'tenementType' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined
      };

      const response = await databaseMiningAPI.getFilteredTenements(filters);
      res.json(response);

    } catch (error) {
      console.error('Database mining API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch mining tenements from database',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Mining overlap analysis for specific territory
  app.get('/api/mining/territory-overlap/:territoryId', async (req, res) => {
    try {
      const { territoryId } = req.params;
      const territory = await storage.getTerritoryById(parseInt(territoryId, 10));

      if (!territory) {
        return res.status(404).json({ error: 'Territory not found' });
      }

      // Extract bounds from territory geometry using centerLat/centerLng
      const bounds = {
        north: territory.centerLat + 0.1,
        south: territory.centerLat - 0.1,
        east: territory.centerLng + 0.1,
        west: territory.centerLng - 0.1
      };

      const overlappingMining = await miningService.getMiningForTerritory(bounds);

      res.json({
        success: true,
        territory: {
          id: territory.id,
          name: territory.name,
          groupName: territory.groupName
        },
        overlappingTenements: overlappingMining,
        totalOverlaps: overlappingMining.length,
        dataIntegrity: {
          authenticData: true,
          spatialAnalysis: true,
          governmentSource: 'WA DMIRS + Native Title Tribunal'
        }
      });

    } catch (error) {
      console.error('Territory mining overlap error:', error);
      res.status(500).json({
        error: 'Failed to analyze territory mining overlap',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get mining filter options from database
  app.get("/api/mining/filter-options", async (req, res) => {
    try {
      const options = await databaseMiningAPI.getFilterOptions();
      res.json({
        success: true,
        ...options,
        dataSource: "WA Department of Mines, Industry Regulation and Safety (DMIRS)"
      });

    } catch (error) {
      console.error('Mining filter options error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch filter options',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get tenements within geographic bounds for map display
  app.get("/api/mining/map-bounds", async (req, res) => {
    try {
      const { north, south, east, west } = req.query;

      if (!north || !south || !east || !west) {
        return res.status(400).json({
          success: false,
          error: 'Geographic bounds required',
          message: 'north, south, east, west query parameters are required'
        });
      }

      const bounds = {
        north: parseFloat(String(north)),
        south: parseFloat(String(south)),
        east: parseFloat(String(east)),
        west: parseFloat(String(west))
      };

      const additionalFilters = {
        majorCompaniesOnly: req.query.majorOnly === 'true',
        limit: req.query.limit ? parseInt(String(req.query.limit)) : 500
      };

      const response = await databaseMiningAPI.getTenementsInBounds(bounds, additionalFilters);
      res.json(response);

    } catch (error) {
      console.error('Mining map bounds error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenements for map bounds',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Territory mining overlap analysis using cached data
  app.get("/api/territories/:territoryName/mining-overlap", async (req, res) => {
    try {
      const territoryName = decodeURIComponent(req.params.territoryName);
      console.log(`Analyzing mining overlaps for territory: ${territoryName}`);

      // Get territory geometry
      const territories = await storage.getTerritories();
      const territory = territories.find(t => t.name === territoryName);

      if (!territory) {
        return res.status(404).json({
          success: false,
          error: 'Territory not found'
        });
      }

      // Simple mining overlap analysis using cached data
      const miningData = getMiningTenementsData();
      const overlappingTenements = miningData.tenements.filter(tenement => {
        // Basic geographic filtering - check if tenement coordinates are within territory bounds
        if (!tenement.coordinates || tenement.coordinates.length === 0) return false;

        // Simple bounding box check
        const tenementBounds = {
          minLat: Math.min(...tenement.coordinates.map(coord => coord[1])),
          maxLat: Math.max(...tenement.coordinates.map(coord => coord[1])),
          minLng: Math.min(...tenement.coordinates.map(coord => coord[0])),
          maxLng: Math.max(...tenement.coordinates.map(coord => coord[0]))
        };

        // Territory bounds (simplified check)
        const geom = territory.geometry as any;
        if (geom && geom.coordinates) {
          const territoryCoords = Array.isArray(geom.coordinates[0][0])
            ? geom.coordinates[0]
            : geom.coordinates;

          const territoryBounds = {
            minLat: Math.min(...territoryCoords.map((coord: number[]) => coord[1])),
            maxLat: Math.max(...territoryCoords.map((coord: number[]) => coord[1])),
            minLng: Math.min(...territoryCoords.map((coord: number[]) => coord[0])),
            maxLng: Math.max(...territoryCoords.map((coord: number[]) => coord[0]))
          };

          // Check for overlap
          return !(tenementBounds.maxLat < territoryBounds.minLat ||
                   tenementBounds.minLat > territoryBounds.maxLat ||
                   tenementBounds.maxLng < territoryBounds.minLng ||
                   tenementBounds.minLng > territoryBounds.maxLng);
        }

        return false;
      });

      const analysis = {
        territoryName,
        totalTenements: overlappingTenements.length,
        dataSource: 'wa_dmirs_kml',
        tenements: overlappingTenements
      };

      res.json({
        success: true,
        territoryName,
        miningOverlapAnalysis: analysis,
        dataSource: 'wa_dmirs_kml'
      });

    } catch (error) {
      console.error('Error analyzing mining overlaps:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze mining overlaps'
      });
    }
  });

  // Territory mining tenements endpoint - WA DMIRS authentic data
  app.get('/api/territories/:territoryName/mining-tenements', async (req, res) => {
    try {
      const { territoryName } = req.params;
      const decodedName = decodeURIComponent(territoryName);

      console.log(`Fetching mining tenements for territory: ${decodedName}`);

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

      // Calculate territory bounds from geometry
      const geometry = territory.geometry as any;
      const coords = geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry.coordinates.flat();

      const lats = coords.map((coord: any) => coord[1]);
      const lngs = coords.map((coord: any) => coord[0]);

      const bounds = {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
      };

      // Check if territory is in Western Australia (WA DMIRS only covers WA)
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      const isInWA = centerLng >= 112 && centerLng <= 129;

      if (!isInWA) {
        return res.json({
          success: true,
          territoryName: territory.name,
          tenementsData: {
            totalTenements: 0,
            tenements: [],
            bounds: bounds,
            source: 'wa_dmirs_arcgis',
            serviceAvailable: true,
            message: 'Mining tenement data is only available for territories in Western Australia. This territory is outside WA coverage.'
          }
        });
      }

      // Calculate center point for spatial query
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;

      // Fetch mining tenements from WA DMIRS
      const tenementsResult = await fetchMiningTenementsForTerritory(
        centerLat,
        centerLng,
        territory.name,
        bounds
      );

      console.log(`Found ${tenementsResult.totalFound} mining tenements in ${territory.name}`);

      // Group tenements by type for summary
      const typeSummary = tenementsResult.tenements.reduce((acc: any, tenement: any) => {
        const type = tenement.type || 'Unknown';
        if (!acc[type]) {
          acc[type] = { type, count: 0, tenements: [] };
        }
        acc[type].count++;
        acc[type].tenements.push(tenement);
        return acc;
      }, {} as Record<string, { type: string; count: number; tenements: any[] }>);

      res.json({
        success: true,
        territoryName: territory.name,
        tenementsData: {
          totalTenements: tenementsResult.totalFound,
          tenements: tenementsResult.tenements,
          typeSummary: Object.values(typeSummary).sort((a: any, b: any) => b.count - a.count),
          bounds: bounds,
          source: tenementsResult.source,
          serviceAvailable: tenementsResult.serviceAvailable
        }
      });

    } catch (error) {
      console.error('Territory mining tenements error:', error);
      res.status(500).json({
        error: 'Failed to fetch mining tenements',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Map view mining tenements endpoint
  app.get('/api/mining-tenements/map-view', async (req, res) => {
    try {
      const { minLat, maxLat, minLng, maxLng } = req.query;

      if (!minLat || !maxLat || !minLng || !maxLng) {
        return res.status(400).json({
          error: 'Bounds required',
          message: 'minLat, maxLat, minLng, maxLng query parameters are required'
        });
      }

      const bounds = {
        minLat: parseFloat(minLat as string),
        maxLat: parseFloat(maxLat as string),
        minLng: parseFloat(minLng as string),
        maxLng: parseFloat(maxLng as string)
      };

      // Check if bounds are in Western Australia
      if (bounds.maxLng < 112 || bounds.minLng > 129) {
        return res.json({
          success: true,
          tenements: [],
          totalFound: 0,
          message: 'Mining tenement data is only available for Western Australia',
          source: 'wa_dmirs_arcgis',
          serviceAvailable: true
        });
      }

      const tenementsResult = await fetchAllMiningTenements(bounds);

      res.set({
        'Cache-Control': 'public, max-age=600',
        'ETag': `"tenements-${bounds.minLng.toFixed(1)}-${bounds.minLat.toFixed(1)}-${tenementsResult.totalFound}"`
      });

      res.json({
        success: true,
        tenements: tenementsResult.tenements,
        totalFound: tenementsResult.totalFound,
        bounds: tenementsResult.bbox,
        source: tenementsResult.source,
        serviceAvailable: tenementsResult.serviceAvailable
      });

    } catch (error) {
      console.error('Map view mining tenements error:', error);
      res.status(500).json({
        error: 'Failed to fetch mining tenements for map view',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MINEDEX - Mines and Mineral Deposits of Western Australia
  app.get('/api/territories/:territoryName/minedex', async (req, res) => {
    try {
      const territoryName = decodeURIComponent(req.params.territoryName);
      console.log(`Fetching MINEDEX sites for territory: ${territoryName}`);

      // Get territory details
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

      // Calculate territory bounds
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

      // Check if territory is in Western Australia
      const isInWA = waMinedexService.territoryOverlapsWA(bounds);

      if (!isInWA) {
        return res.json({
          success: true,
          territoryName: territory.name,
          minedexData: {
            totalSites: 0,
            sites: [],
            bounds: bounds,
            source: 'wa_dmirs_minedex',
            serviceAvailable: true,
            message: 'MINEDEX data is only available for territories in Western Australia. This territory is outside WA coverage.'
          }
        });
      }

      // Fetch MINEDEX sites from WA DMIRS
      const minedexResult = await waMinedexService.getSitesForTerritory(
        territory.name,
        bounds
      );

      console.log(`Found ${minedexResult.totalCount} MINEDEX sites in ${territory.name}`);

      // Group sites by type for summary
      const typeSummary = minedexResult.sites.reduce((acc: any, site) => {
        const type = site.siteType || 'Unknown';
        if (!acc[type]) {
          acc[type] = { type, count: 0, sites: [] };
        }
        acc[type].count++;
        acc[type].sites.push(site);
        return acc;
      }, {} as Record<string, { type: string; count: number; sites: any[] }>);

      // Group sites by commodity for summary
      const commoditySummary = minedexResult.sites.reduce((acc: any, site) => {
        const commodity = site.commodityCategory || 'Unknown';
        if (!acc[commodity]) {
          acc[commodity] = { commodity, count: 0 };
        }
        acc[commodity].count++;
        return acc;
      }, {} as Record<string, { commodity: string; count: number }>);

      // Group sites by stage for summary
      const stageSummary = minedexResult.sites.reduce((acc: any, site) => {
        const stage = site.siteStage || 'Unknown';
        if (!acc[stage]) {
          acc[stage] = { stage, count: 0 };
        }
        acc[stage].count++;
        return acc;
      }, {} as Record<string, { stage: string; count: number }>);

      res.json({
        success: true,
        territoryName: territory.name,
        minedexData: {
          totalSites: minedexResult.totalCount,
          sites: minedexResult.sites,
          typeSummary: Object.values(typeSummary).sort((a: any, b: any) => b.count - a.count),
          commoditySummary: Object.values(commoditySummary).sort((a: any, b: any) => b.count - a.count),
          stageSummary: Object.values(stageSummary).sort((a: any, b: any) => b.count - a.count),
          bounds: bounds,
          source: minedexResult.dataSource,
          serviceUrl: minedexResult.serviceUrl,
          serviceAvailable: true
        }
      });

    } catch (error) {
      console.error('Territory MINEDEX error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch MINEDEX data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MINEDEX filter options
  app.get('/api/minedex/filter-options', async (req, res) => {
    try {
      const [siteTypes, commodities, stages] = await Promise.all([
        waMinedexService.getSiteTypes(),
        waMinedexService.getCommodityCategories(),
        waMinedexService.getSiteStages()
      ]);

      res.json({
        success: true,
        siteTypes,
        commodities,
        stages,
        dataSource: 'WA Department of Mines, Industry Regulation and Safety (DMIRS) - MINEDEX'
      });
    } catch (error) {
      console.error('MINEDEX filter options error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch MINEDEX filter options',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // WAMEX - Mineral Exploration Reports of Western Australia
  app.get('/api/territories/:territoryName/wamex', async (req, res) => {
    try {
      const territoryName = decodeURIComponent(req.params.territoryName);
      console.log(`Fetching WAMEX reports for territory: ${territoryName}`);

      // Get territory details
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

      // Calculate territory bounds
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

      // Check if territory is in Western Australia
      const isInWA = waWamexService.territoryOverlapsWA(bounds);

      if (!isInWA) {
        return res.json({
          success: true,
          territoryName: territory.name,
          wamexData: {
            totalReports: 0,
            reports: [],
            bounds: bounds,
            source: 'wa_dmirs_wamex',
            serviceAvailable: true,
            message: 'WAMEX exploration reports are only available for territories in Western Australia. This territory is outside WA coverage.'
          }
        });
      }

      // Fetch WAMEX reports from WA DMIRS
      const wamexResult = await waWamexService.getReportsForTerritory(
        territory.name,
        bounds
      );

      console.log(`Found ${wamexResult.totalCount} WAMEX reports in ${territory.name}`);

      // Group reports by type for summary
      const typeSummary = wamexResult.reports.reduce((acc: any, report) => {
        const type = report.reportType || 'Unknown';
        if (!acc[type]) {
          acc[type] = { type, count: 0 };
        }
        acc[type].count++;
        return acc;
      }, {} as Record<string, { type: string; count: number }>);

      // Group reports by commodity for summary
      const commoditySummary: Record<string, number> = {};
      wamexResult.reports.forEach(report => {
        if (report.targetCommodity) {
          report.targetCommodity.split(';').forEach(c => {
            const commodity = c.trim();
            if (commodity) {
              commoditySummary[commodity] = (commoditySummary[commodity] || 0) + 1;
            }
          });
        }
      });

      // Group reports by decade for summary
      const decadeSummary = wamexResult.reports.reduce((acc: any, report) => {
        if (report.reportYear) {
          const decade = Math.floor(report.reportYear / 10) * 10;
          const decadeLabel = `${decade}s`;
          if (!acc[decadeLabel]) {
            acc[decadeLabel] = { decade: decadeLabel, count: 0 };
          }
          acc[decadeLabel].count++;
        }
        return acc;
      }, {} as Record<string, { decade: string; count: number }>);

      res.json({
        success: true,
        territoryName: territory.name,
        wamexData: {
          totalReports: wamexResult.totalCount,
          reports: wamexResult.reports,
          typeSummary: Object.values(typeSummary).sort((a: any, b: any) => b.count - a.count),
          commoditySummary: Object.entries(commoditySummary)
            .map(([commodity, count]) => ({ commodity, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
          decadeSummary: Object.values(decadeSummary).sort((a: any, b: any) => {
            const aDecade = parseInt(a.decade);
            const bDecade = parseInt(b.decade);
            return bDecade - aDecade;
          }),
          bounds: bounds,
          source: wamexResult.dataSource,
          serviceUrl: wamexResult.serviceUrl,
          serviceAvailable: true
        }
      });

    } catch (error) {
      console.error('Territory WAMEX error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch WAMEX data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // WAMEX filter options
  app.get('/api/wamex/filter-options', async (req, res) => {
    try {
      const [reportTypes, commodities] = await Promise.all([
        waWamexService.getReportTypes(),
        waWamexService.getTargetCommodities()
      ]);

      res.json({
        success: true,
        reportTypes,
        commodities,
        dataSource: 'WA Department of Mines, Industry Regulation and Safety (DMIRS) - WAMEX'
      });
    } catch (error) {
      console.error('WAMEX filter options error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch WAMEX filter options',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API endpoint to get authentic mineral data from WA DMIRS exploration reports
  app.get("/api/exploration/minerals/:lat/:lng", async (req, res) => {
    try {
      const lat = parseFloat(req.params.lat);
      const lng = parseFloat(req.params.lng);
      const radius = parseFloat(req.query.radius as string) || 0.01;

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates'
        });
      }

      console.log(`Getting authentic mineral data for location: ${lat}, ${lng} (radius: ${radius})`);

      const mineralData = await explorationMineralService.getMineralsForLocation(lat, lng, radius);

      if (!mineralData) {
        return res.json({
          success: true,
          mineralData: null,
          message: 'No exploration reports found in this area',
          source: 'WA Department of Mines Exploration Reports'
        });
      }

      res.json({
        success: true,
        mineralData: {
          commodities: mineralData.commodities,
          confidence: mineralData.confidence,
          reportCount: mineralData.reportCount,
          source: 'WA Department of Mines Exploration Reports',
          dataAuthenticity: 'authentic_government_data'
        },
        location: { lat, lng, radius }
      });

    } catch (error) {
      console.error('Error getting exploration mineral data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get exploration mineral data'
      });
    }
  });

  // API endpoint to get all unique commodities from exploration reports
  app.get("/api/exploration/commodities", async (req, res) => {
    try {
      console.log('Extracting all commodities from WA DMIRS exploration reports...');

      const commodities = await explorationMineralService.extractCommodities();

      res.json({
        success: true,
        commodities: commodities,
        totalCount: commodities.length,
        source: 'WA Department of Mines Exploration Reports',
        dataAuthenticity: 'authentic_government_data'
      });

    } catch (error) {
      console.error('Error extracting commodities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract commodities from exploration reports'
      });
    }
  });

  // API endpoint for exploration map bounds with authentic WA DMIRS data
  app.get("/api/exploration/map-bounds", async (req, res) => {
    try {
      console.log('Fetching authentic WA DMIRS exploration reports for map bounds...');

      const bounds = req.query.bounds ? JSON.parse(req.query.bounds as string) : undefined;
      const commodity = req.query.commodity as string;
      const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom as string) : undefined;
      const yearTo = req.query.yearTo ? parseInt(req.query.yearTo as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      // Get authentic exploration reports from WA DMIRS database with filtering
      const explorationReports = await explorationMineralService.getExplorationReportsForMapBounds(
        bounds, commodity, yearFrom, yearTo, limit
      );

      res.json({
        success: true,
        reports: explorationReports,
        totalInDatabase: 113850,
        totalDisplayed: explorationReports.length,
        source: 'WA Department of Mines Exploration Reports',
        dataAuthenticity: 'authentic_government_data',
        filters: {
          commodity: commodity || 'all',
          yearFrom: yearFrom || 'all',
          yearTo: yearTo || 'all',
          limit: limit || 2000
        }
      });
    } catch (error) {
      console.error('Error fetching exploration map bounds:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exploration reports',
        source: 'WA Department of Mines Exploration Reports'
      });
    }
  });

  // Register WA Department of Mines API endpoints
  registerMiningAPI(app);
}
