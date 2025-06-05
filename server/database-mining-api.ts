/**
 * Database-powered Mining Tenements API with Advanced Filtering
 * Replaces static dataset with complete authentic WA DMIRS data
 */

import { db } from './db';
import { miningTenements, type MiningTenement } from '@shared/schema';
import { eq, and, like, inArray, between, sql, desc, asc } from 'drizzle-orm';

export interface MiningTenementFilters {
  tenementTypes?: string[];
  status?: string[];
  holders?: string[];
  states?: string[];
  mineralTypes?: string[];
  majorCompaniesOnly?: boolean;
  areaRange?: { min?: number; max?: number };
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'holder' | 'area' | 'grantDate' | 'tenementType';
  sortOrder?: 'asc' | 'desc';
}

export interface MiningAPIResponse {
  success: boolean;
  tenements: Array<{
    id: string;
    type: string;
    status: string;
    holder: string;
    coordinates: number[][];
    area?: number;
    mineralTypes?: string[];
    grantDate?: string;
    expiryDate?: string;
    state: string;
    majorCompany: boolean;
  }>;
  totalFound: number;
  totalInDatabase: number;
  filters: MiningTenementFilters;
  dataSource: string;
  dataIntegrity: {
    authenticData: boolean;
    governmentSource: string;
    databaseStored: boolean;
    lastUpdated: string;
  };
}

class DatabaseMiningAPI {
  /**
   * Get filtered mining tenements from database
   */
  async getFilteredTenements(filters: MiningTenementFilters = {}): Promise<MiningAPIResponse> {
    try {
      // Build query conditions
      const conditions = this.buildQueryConditions(filters);
      
      // Get total count in database
      const totalCountResult = await db.select({ count: sql<number>`count(*)` }).from(miningTenements);
      const totalInDatabase = totalCountResult[0]?.count || 0;

      // Build main query with filters
      let query = db.select().from(miningTenements);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Apply sorting
      if (filters.sortBy) {
        const sortColumn = this.getSortColumn(filters.sortBy);
        const sortDirection = filters.sortOrder === 'desc' ? desc : asc;
        query = query.orderBy(sortDirection(sortColumn)) as any;
      } else {
        // Default sort by holder name
        query = query.orderBy(asc(miningTenements.holder)) as any;
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit) as any;
      }
      if (filters.offset) {
        query = query.offset(filters.offset) as any;
      }

      const results = await query;

      // Transform results for API response
      const tenements = results.map(this.transformTenementForAPI);

      return {
        success: true,
        tenements,
        totalFound: tenements.length,
        totalInDatabase,
        filters,
        dataSource: "WA Department of Mines, Industry Regulation and Safety (DMIRS)",
        dataIntegrity: {
          authenticData: true,
          governmentSource: "WA Department of Mines, Industry Regulation and Safety (DMIRS)",
          databaseStored: true,
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error fetching filtered tenements:', error);
      throw new Error('Failed to fetch mining tenements from database');
    }
  }

  /**
   * Get available filter options from database
   */
  async getFilterOptions(): Promise<{
    tenementTypes: string[];
    statuses: string[];
    holders: string[];
    states: string[];
    mineralTypes: string[];
    statistics: {
      totalTenements: number;
      majorCompanies: number;
      avgArea: number;
    };
  }> {
    try {
      // Get all unique values for filters
      const [
        tenementTypes,
        statuses,
        holders,
        states,
        mineralTypesResults,
        stats
      ] = await Promise.all([
        db.selectDistinct({ value: miningTenements.tenementType }).from(miningTenements),
        db.selectDistinct({ value: miningTenements.status }).from(miningTenements),
        db.selectDistinct({ value: miningTenements.holder }).from(miningTenements).orderBy(asc(miningTenements.holder)),
        db.selectDistinct({ value: miningTenements.state }).from(miningTenements),
        db.select({ mineralTypes: miningTenements.mineralTypes }).from(miningTenements),
        db.select({
          total: sql<number>`count(*)`,
          majorCompanies: sql<number>`sum(case when major_company = 1 then 1 else 0 end)`,
          avgArea: sql<number>`avg(area)`
        }).from(miningTenements)
      ]);

      // Extract unique mineral types
      const allMineralTypes = new Set<string>();
      mineralTypesResults.forEach(result => {
        if (result.mineralTypes && Array.isArray(result.mineralTypes)) {
          result.mineralTypes.forEach(mineral => allMineralTypes.add(mineral));
        }
      });

      return {
        tenementTypes: tenementTypes.map(t => t.value).filter(Boolean),
        statuses: statuses.map(s => s.value).filter(Boolean),
        holders: holders.map(h => h.value).filter(Boolean),
        states: states.map(s => s.value).filter(Boolean),
        mineralTypes: Array.from(allMineralTypes).sort(),
        statistics: {
          totalTenements: stats[0]?.total || 0,
          majorCompanies: stats[0]?.majorCompanies || 0,
          avgArea: Math.round(stats[0]?.avgArea || 0)
        }
      };

    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw new Error('Failed to fetch filter options');
    }
  }

  /**
   * Get tenements within geographic bounds
   */
  async getTenementsInBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }, additionalFilters: MiningTenementFilters = {}): Promise<MiningAPIResponse> {
    const filters: MiningTenementFilters = {
      ...additionalFilters,
      bounds,
      limit: additionalFilters.limit || 1000 // Default limit for map display
    };

    return this.getFilteredTenements(filters);
  }

  /**
   * Build query conditions from filters
   */
  private buildQueryConditions(filters: MiningTenementFilters) {
    const conditions = [];

    if (filters.tenementTypes && filters.tenementTypes.length > 0) {
      conditions.push(inArray(miningTenements.tenementType, filters.tenementTypes));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(miningTenements.status, filters.status));
    }

    if (filters.holders && filters.holders.length > 0) {
      conditions.push(inArray(miningTenements.holder, filters.holders));
    }

    if (filters.states && filters.states.length > 0) {
      conditions.push(inArray(miningTenements.state, filters.states));
    }

    if (filters.majorCompaniesOnly) {
      conditions.push(eq(miningTenements.majorCompany, 1));
    }

    if (filters.areaRange) {
      if (filters.areaRange.min !== undefined) {
        conditions.push(sql`${miningTenements.area} >= ${filters.areaRange.min}`);
      }
      if (filters.areaRange.max !== undefined) {
        conditions.push(sql`${miningTenements.area} <= ${filters.areaRange.max}`);
      }
    }

    if (filters.bounds) {
      conditions.push(
        and(
          sql`${miningTenements.centerLat} >= ${filters.bounds.south}`,
          sql`${miningTenements.centerLat} <= ${filters.bounds.north}`,
          sql`${miningTenements.centerLng} >= ${filters.bounds.west}`,
          sql`${miningTenements.centerLng} <= ${filters.bounds.east}`
        )
      );
    }

    if (filters.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`(
          lower(${miningTenements.holder}) like ${searchTerm} OR
          lower(${miningTenements.tenementId}) like ${searchTerm} OR
          lower(${miningTenements.tenementType}) like ${searchTerm}
        )`
      );
    }

    if (filters.mineralTypes && filters.mineralTypes.length > 0) {
      // Check if any of the specified mineral types are in the array
      const mineralConditions = filters.mineralTypes.map(mineral =>
        sql`${miningTenements.mineralTypes} @> ${JSON.stringify([mineral])}`
      );
      conditions.push(sql`(${sql.join(mineralConditions, sql` OR `)})`);
    }

    return conditions;
  }

  /**
   * Get sort column for ordering
   */
  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case 'holder':
        return miningTenements.holder;
      case 'area':
        return miningTenements.area;
      case 'grantDate':
        return miningTenements.grantDate;
      case 'tenementType':
        return miningTenements.tenementType;
      default:
        return miningTenements.holder;
    }
  }

  /**
   * Transform database tenement for API response
   */
  private transformTenementForAPI(tenement: MiningTenement) {
    // Extract coordinates from geometry
    const geometry = tenement.geometry as any;
    const coordinates = geometry?.coordinates?.[0] || [];

    return {
      id: tenement.tenementId,
      type: tenement.tenementType,
      status: tenement.status,
      holder: tenement.holder,
      coordinates,
      area: tenement.area || undefined,
      mineralTypes: tenement.mineralTypes || undefined,
      grantDate: tenement.grantDate || undefined,
      expiryDate: tenement.expiryDate || undefined,
      state: tenement.state,
      majorCompany: Boolean(tenement.majorCompany)
    };
  }
}

export const databaseMiningAPI = new DatabaseMiningAPI();