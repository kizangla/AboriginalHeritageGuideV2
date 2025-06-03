/**
 * Native Title Territory Filtering API Routes
 * Provides authentic filtering based on real determination data
 */

import type { Express } from "express";
import { z } from "zod";
import { nativeTitleService } from "./native-title-service";

// Native Title filter schema
const NativeTitleFilterSchema = z.object({
  determined: z.boolean().optional().default(false),
  pending: z.boolean().optional().default(false),
  exists: z.boolean().optional().default(false),
  doesNotExist: z.boolean().optional().default(false),
  partialArea: z.boolean().optional().default(false),
  entireArea: z.boolean().optional().default(false),
  discontinued: z.boolean().optional().default(false),
  dismissed: z.boolean().optional().default(false)
});

export function setupNativeTitleFilterRoutes(app: Express) {
  // Filter territories by Native Title status using authentic data
  app.post("/api/territories/filter/native-title", async (req, res) => {
    try {
      const filters = NativeTitleFilterSchema.parse(req.body);
      
      // If no filters active, return all territories
      const hasActiveFilters = Object.values(filters).some(Boolean);
      if (!hasActiveFilters) {
        return res.json({ filteredTerritories: [], message: "No filters active" });
      }

      console.log('Filtering territories by Native Title status:', filters);
      
      // Get base territories data
      const { storage } = await import("./database-storage");
      const territoriesData = await storage.getTerritories();
      
      if (!territoriesData?.features) {
        return res.status(404).json({ message: "No territories data available" });
      }

      const matchingTerritories = [];
      let processedCount = 0;
      const totalTerritories = territoriesData.features.length;

      // Process territories in batches to avoid timeout
      for (const feature of territoriesData.features.slice(0, 100)) { // Limit to first 100 for performance
        const territory = feature.properties;
        const territoryName = territory?.Name || territory?.name || 'Unknown';
        
        // Extract coordinates from territory geometry
        let lat = 0, lng = 0;
        if (feature.geometry?.coordinates) {
          if (feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0];
            lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
            lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
          } else if (feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.coordinates[0][0];
            lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
            lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
          }
        }

        try {
          // Get authentic Native Title data for this territory
          const nativeTitleInfo = await nativeTitleService.getNativeTitleInfo(lat, lng, territoryName);
          
          // Analyze if territory matches filters based on authentic data
          if (matchesNativeTitleFilters(nativeTitleInfo, filters)) {
            matchingTerritories.push(feature);
          }
        } catch (error) {
          console.error(`Error analyzing ${territoryName}:`, error);
        }

        processedCount++;
        
        // Prevent timeout - limit processing time
        if (processedCount >= 50) break;
      }

      console.log(`Processed ${processedCount}/${totalTerritories} territories, found ${matchingTerritories.length} matches`);

      res.json({
        filteredTerritories: matchingTerritories,
        processedCount,
        totalTerritories: totalTerritories,
        matchCount: matchingTerritories.length,
        filters
      });

    } catch (error) {
      console.error('Native Title filtering error:', error);
      res.status(500).json({ message: "Failed to filter territories by Native Title status" });
    }
  });
}

/**
 * Check if territory matches Native Title filters based on authentic determination data
 */
function matchesNativeTitleFilters(nativeTitleInfo: any, filters: any): boolean {
  if (!nativeTitleInfo || !nativeTitleInfo.applications) {
    return false;
  }

  const hasApplications = nativeTitleInfo.applications.length > 0;
  if (!hasApplications) return false;

  // Analyze applications for matching criteria
  const statusAnalysis = {
    hasDetermined: false,
    hasPending: false,
    hasExists: false,
    hasDoesNotExist: false,
    hasPartialArea: false,
    hasEntireArea: false,
    hasDiscontinued: false,
    hasDismissed: false
  };

  nativeTitleInfo.applications.forEach((app: any) => {
    const status = app.status?.toLowerCase() || '';
    const outcome = app.outcome?.toLowerCase() || '';
    
    if (status.includes('determined')) {
      statusAnalysis.hasDetermined = true;
      
      if (status.includes('exists') || outcome.includes('exists')) {
        statusAnalysis.hasExists = true;
        
        if (status.includes('entire') || outcome.includes('entire')) {
          statusAnalysis.hasEntireArea = true;
        } else if (status.includes('part') || outcome.includes('part')) {
          statusAnalysis.hasPartialArea = true;
        }
      } else if (status.includes('does not exist') || outcome.includes('does not exist')) {
        statusAnalysis.hasDoesNotExist = true;
      } else if (status.includes('discontinued') || outcome.includes('discontinued')) {
        statusAnalysis.hasDiscontinued = true;
      } else if (status.includes('dismissed') || outcome.includes('dismissed')) {
        statusAnalysis.hasDismissed = true;
      }
    } else {
      statusAnalysis.hasPending = true;
    }
  });

  // Check if territory matches any active filter
  return (
    (filters.determined && statusAnalysis.hasDetermined) ||
    (filters.pending && statusAnalysis.hasPending) ||
    (filters.exists && statusAnalysis.hasExists) ||
    (filters.doesNotExist && statusAnalysis.hasDoesNotExist) ||
    (filters.partialArea && statusAnalysis.hasPartialArea) ||
    (filters.entireArea && statusAnalysis.hasEntireArea) ||
    (filters.discontinued && statusAnalysis.hasDiscontinued) ||
    (filters.dismissed && statusAnalysis.hasDismissed)
  );
}