/**
 * Native Title Territory Filter Service
 * Provides territory-level filtering based on Native Title determination status
 */

import { nativeTitleService } from './native-title-service';

export interface TerritoryNativeTitleStatus {
  territoryName: string;
  hasNativeTitle: boolean;
  hasPendingApplications: boolean;
  hasDeterminations: boolean;
  statusTypes: {
    determined: boolean;
    pending: boolean;
    exists: boolean;
    doesNotExist: boolean;
    partialArea: boolean;
    entireArea: boolean;
    discontinued: boolean;
    dismissed: boolean;
  };
  applicationCount: number;
  determinationCount: number;
}

export interface NativeTitleStatusFilter {
  determined: boolean;
  pending: boolean;
  exists: boolean;
  doesNotExist: boolean;
  partialArea: boolean;
  entireArea: boolean;
  discontinued: boolean;
  dismissed: boolean;
}

class NativeTitleTerritoryFilter {
  /**
   * Analyze Native Title status for a territory
   */
  async analyzeTerritoryNativeTitleStatus(territoryName: string, lat: number, lng: number): Promise<TerritoryNativeTitleStatus> {
    try {
      const nativeTitleInfo = await nativeTitleService.getNativeTitleInfo(lat, lng, territoryName);
      
      const statusTypes = {
        determined: false,
        pending: false,
        exists: false,
        doesNotExist: false,
        partialArea: false,
        entireArea: false,
        discontinued: false,
        dismissed: false
      };

      let applicationCount = 0;
      let determinationCount = 0;

      if (nativeTitleInfo.hasNativeTitle && nativeTitleInfo.applications) {
        nativeTitleInfo.applications.forEach((app: any) => {
          if (app.status.includes('Determined')) {
            determinationCount++;
            statusTypes.determined = true;
            
            if (app.status.includes('exists') || app.outcome?.includes('exists')) {
              statusTypes.exists = true;
              
              if (app.status.includes('entire') || app.outcome?.includes('entire')) {
                statusTypes.entireArea = true;
              } else if (app.status.includes('part') || app.outcome?.includes('part')) {
                statusTypes.partialArea = true;
              }
            } else if (app.status.includes('does not exist') || app.outcome?.includes('does not exist')) {
              statusTypes.doesNotExist = true;
            } else if (app.status.includes('discontinued') || app.outcome?.includes('discontinued')) {
              statusTypes.discontinued = true;
            } else if (app.status.includes('dismissed') || app.outcome?.includes('dismissed')) {
              statusTypes.dismissed = true;
            }
          } else {
            applicationCount++;
            statusTypes.pending = true;
          }
        });
      }

      return {
        territoryName,
        hasNativeTitle: nativeTitleInfo.success && nativeTitleInfo.nativeTitle?.hasNativeTitle || false,
        hasPendingApplications: applicationCount > 0,
        hasDeterminations: determinationCount > 0,
        statusTypes,
        applicationCount,
        determinationCount
      };
    } catch (error) {
      console.error(`Error analyzing Native Title status for ${territoryName}:`, error);
      return {
        territoryName,
        hasNativeTitle: false,
        hasPendingApplications: false,
        hasDeterminations: false,
        statusTypes: {
          determined: false,
          pending: false,
          exists: false,
          doesNotExist: false,
          partialArea: false,
          entireArea: false,
          discontinued: false,
          dismissed: false
        },
        applicationCount: 0,
        determinationCount: 0
      };
    }
  }

  /**
   * Check if territory matches Native Title status filters
   */
  matchesNativeTitleFilter(territoryStatus: TerritoryNativeTitleStatus, filters: NativeTitleStatusFilter): boolean {
    // If no filters are active, show all territories
    const hasActiveFilters = Object.values(filters).some(Boolean);
    if (!hasActiveFilters) {
      return true;
    }

    // Check each filter condition
    const matches = [];

    if (filters.determined) {
      matches.push(territoryStatus.statusTypes.determined);
    }
    
    if (filters.pending) {
      matches.push(territoryStatus.statusTypes.pending);
    }
    
    if (filters.exists) {
      matches.push(territoryStatus.statusTypes.exists);
    }
    
    if (filters.doesNotExist) {
      matches.push(territoryStatus.statusTypes.doesNotExist);
    }
    
    if (filters.partialArea) {
      matches.push(territoryStatus.statusTypes.partialArea);
    }
    
    if (filters.entireArea) {
      matches.push(territoryStatus.statusTypes.entireArea);
    }
    
    if (filters.discontinued) {
      matches.push(territoryStatus.statusTypes.discontinued);
    }
    
    if (filters.dismissed) {
      matches.push(territoryStatus.statusTypes.dismissed);
    }

    // Territory matches if any of the active filters are true
    return matches.some(Boolean);
  }

  /**
   * Filter territories based on Native Title status
   */
  async filterTerritoriesByNativeTitleStatus(
    territories: any[], 
    filters: NativeTitleStatusFilter
  ): Promise<any[]> {
    // If no filters are active, return all territories
    const hasActiveFilters = Object.values(filters).some(Boolean);
    if (!hasActiveFilters) {
      return territories;
    }

    console.log(`Filtering ${territories.length} territories by Native Title status...`);
    
    const filteredTerritories = [];
    
    for (const territory of territories) {
      // Extract coordinates from territory geometry
      let lat = 0, lng = 0;
      
      if (territory.geometry?.coordinates) {
        if (territory.geometry.type === 'Polygon') {
          // Use centroid of first polygon ring
          const coords = territory.geometry.coordinates[0];
          lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        } else if (territory.geometry.type === 'MultiPolygon') {
          // Use centroid of first polygon in multipolygon
          const coords = territory.geometry.coordinates[0][0];
          lng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          lat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        }
      }

      const territoryName = territory.properties?.Name || territory.properties?.name || 'Unknown';
      
      // Analyze Native Title status for this territory
      const status = await this.analyzeTerritoryNativeTitleStatus(territoryName, lat, lng);
      
      // Check if territory matches filters
      if (this.matchesNativeTitleFilter(status, filters)) {
        filteredTerritories.push(territory);
      }
    }

    console.log(`Filtered to ${filteredTerritories.length} territories matching Native Title status`);
    return filteredTerritories;
  }
}

export const nativeTitleTerritoryFilter = new NativeTitleTerritoryFilter();