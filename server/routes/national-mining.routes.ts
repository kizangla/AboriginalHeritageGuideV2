import type { Express } from "express";
import { geoscienceAustraliaService } from "../geoscience-australia-service";
import { saSarigService } from "../sa-sarig-service";
import { qldGsqService } from "../qld-gsq-service";
import { nswMinviewService } from "../nsw-minview-service";
import { vicGeovicService } from "../vic-geovic-service";
import { ntStrikeService } from "../nt-strike-service";
import { tasMrtService } from "../tas-mrt-service";

export function registerNationalMiningRoutes(app: Express): void {
  // Geoscience Australia - National Critical Minerals
  app.get("/api/national/critical-minerals", async (req, res) => {
    try {
      console.log('Fetching national critical minerals from Geoscience Australia...');
      const state = req.query.state as string | undefined;
      const commodity = req.query.commodity as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await geoscienceAustraliaService.getAllDeposits({
        state,
        commodity,
        limit
      });

      res.json({
        success: true,
        deposits: result.deposits,
        totalCount: result.totalCount,
        source: 'Geoscience Australia',
        dataAuthenticity: 'authentic_government_data',
        lastUpdated: result.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching Geoscience Australia data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch national critical minerals data',
        source: 'Geoscience Australia'
      });
    }
  });

  // South Australia - SARIG Mineral Tenements
  app.get("/api/state/sa/tenements", async (req, res) => {
    try {
      console.log('Fetching SA mineral tenements from SARIG...');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await saSarigService.getTenements({ limit });

      res.json({
        success: true,
        tenements: result.tenements,
        totalCount: result.totalCount,
        source: 'SA Department for Energy and Mining (SARIG)',
        dataAuthenticity: 'authentic_government_data',
        lastUpdated: result.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching SA SARIG data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SA mineral tenements',
        source: 'SA SARIG'
      });
    }
  });

  // Queensland - GSQ Exploration Reports
  app.get("/api/state/qld/exploration", async (req, res) => {
    try {
      console.log('Fetching QLD exploration reports from GSQ...');
      const commodity = req.query.commodity as string | undefined;
      const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await qldGsqService.getExplorationReports({
        commodity,
        yearFrom,
        limit
      });

      res.json({
        success: true,
        reports: result.reports,
        totalCount: result.totalCount,
        source: 'Geological Survey of Queensland (GSQ)',
        dataAuthenticity: 'authentic_government_data',
        lastUpdated: result.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching QLD GSQ data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QLD exploration reports',
        source: 'QLD GSQ'
      });
    }
  });

  // NSW - MinView Mining Titles
  app.get("/api/state/nsw/titles", async (req, res) => {
    try {
      console.log('Fetching NSW mining titles from MinView...');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await nswMinviewService.getTitles({ limit });

      res.json({
        success: true,
        titles: result.titles,
        totalCount: result.totalCount,
        source: 'NSW Resources Regulator (MinView)',
        dataAuthenticity: 'authentic_government_data',
        lastUpdated: result.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching NSW MinView data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch NSW mining titles',
        source: 'NSW MinView'
      });
    }
  });

  // Victoria - GeoVic Mineral Sites
  app.get("/api/state/vic/sites", async (req, res) => {
    try {
      console.log('Fetching VIC mineral sites from GeoVic...');
      const siteType = req.query.siteType as string | undefined;
      const commodity = req.query.commodity as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await vicGeovicService.getMineralSites({
        siteType,
        commodity,
        limit
      });

      res.json({
        success: true,
        sites: result.sites,
        totalCount: result.totalCount,
        source: 'Geological Survey of Victoria (GeoVic)',
        dataAuthenticity: 'authentic_government_data',
        lastUpdated: result.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching VIC GeoVic data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch VIC mineral sites',
        source: 'VIC GeoVic'
      });
    }
  });

  // Northern Territory - STRIKE Tenements
  app.get("/api/state/nt/tenements", async (req, res) => {
    try {
      console.log('Fetching NT mineral tenements from STRIKE...');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await ntStrikeService.getTenements({ limit });

      res.json({
        success: true,
        tenements: result.tenements,
        totalCount: result.totalCount,
        source: 'Northern Territory Geological Survey (STRIKE)',
        dataAuthenticity: 'authentic_government_data',
        lastUpdated: result.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching NT STRIKE data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch NT mineral tenements',
        source: 'NT STRIKE'
      });
    }
  });

  // Tasmania - MRT Mining Leases
  app.get("/api/state/tas/leases", async (req, res) => {
    try {
      console.log('Fetching TAS mining leases from MRT...');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await tasMrtService.getMiningLeases({ limit });

      res.json({
        success: true,
        leases: result.leases,
        totalCount: result.totalCount,
        source: 'Mineral Resources Tasmania (MRT)',
        dataAuthenticity: 'authentic_government_data',
        lastUpdated: result.lastUpdated
      });
    } catch (error) {
      console.error('Error fetching TAS MRT data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch TAS mining leases',
        source: 'TAS MRT'
      });
    }
  });

  // Unified endpoint to get all state mining data
  app.get("/api/national/all-states", async (req, res) => {
    try {
      console.log('Fetching mining data from all Australian states...');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;

      const [ga, sa, qld, nsw, vic, nt, tas] = await Promise.allSettled([
        geoscienceAustraliaService.getAllDeposits({ limit }),
        saSarigService.getTenements({ limit }),
        qldGsqService.getExplorationReports({ limit }),
        nswMinviewService.getTitles({ limit }),
        vicGeovicService.getMineralSites({ limit }),
        ntStrikeService.getTenements({ limit }),
        tasMrtService.getMiningLeases({ limit })
      ]);

      const results: any = {
        success: true,
        sources: {}
      };

      if (ga.status === 'fulfilled') {
        results.sources.geoscienceAustralia = {
          deposits: ga.value.deposits,
          count: ga.value.totalCount,
          source: 'Geoscience Australia'
        };
      }
      if (sa.status === 'fulfilled') {
        results.sources.southAustralia = {
          tenements: sa.value.tenements,
          count: sa.value.totalCount,
          source: 'SA SARIG'
        };
      }
      if (qld.status === 'fulfilled') {
        results.sources.queensland = {
          reports: qld.value.reports,
          count: qld.value.totalCount,
          source: 'QLD GSQ'
        };
      }
      if (nsw.status === 'fulfilled') {
        results.sources.newSouthWales = {
          titles: nsw.value.titles,
          count: nsw.value.totalCount,
          source: 'NSW MinView'
        };
      }
      if (vic.status === 'fulfilled') {
        results.sources.victoria = {
          sites: vic.value.sites,
          count: vic.value.totalCount,
          source: 'VIC GeoVic'
        };
      }
      if (nt.status === 'fulfilled') {
        results.sources.northernTerritory = {
          tenements: nt.value.tenements,
          count: nt.value.totalCount,
          source: 'NT STRIKE'
        };
      }
      if (tas.status === 'fulfilled') {
        results.sources.tasmania = {
          leases: tas.value.leases,
          count: tas.value.totalCount,
          source: 'TAS MRT'
        };
      }

      results.totalSources = Object.keys(results.sources).length;
      results.dataAuthenticity = 'authentic_government_data';

      res.json(results);
    } catch (error) {
      console.error('Error fetching all-states data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch multi-state mining data'
      });
    }
  });
}
