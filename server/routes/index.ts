import type { Express } from "express";
import { createServer, type Server } from "http";
import { initializeMiningData } from "../complete-mining-import";
import { registerTerritoryRoutes } from "./territory.routes";
import { registerBusinessRoutes } from "./business.routes";
import { registerMiningRoutes } from "./mining.routes";
import { registerGeographicRoutes } from "./geographic.routes";
import { registerSystemRoutes } from "./system.routes";
import { registerNationalMiningRoutes } from "./national-mining.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize complete mining dataset from 144MB KML file
  initializeMiningData();

  // Register all domain-specific route modules
  registerSystemRoutes(app);
  registerTerritoryRoutes(app);
  registerBusinessRoutes(app);
  registerMiningRoutes(app);
  registerGeographicRoutes(app);
  registerNationalMiningRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
