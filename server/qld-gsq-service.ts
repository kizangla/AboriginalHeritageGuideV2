/**
 * Queensland GSQ Service - Geological Survey Data
 * Fetches exploration reports and mining data from Queensland CKAN API
 * 
 * Data Source: Geological Survey of Queensland (GSQ) Open Data Portal
 * Covers 20,000+ exploration reports, borehole data, geochemistry
 */

export interface QldExplorationReport {
  id: string;
  title: string;
  reportType: string;
  permitNumber: string;
  operator: string;
  commodity: string;
  reportYear: number;
  openFileDate: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  abstractUrl: string;
  dataSource: 'qld_gsq';
}

export interface GSQResult {
  reports: QldExplorationReport[];
  totalCount: number;
  dataSource: 'qld_gsq';
  serviceUrl: string;
  lastUpdated: Date;
}

interface GSQQueryOptions {
  commodity?: string;
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

const GSQ_API_URL = 'https://geoscience.data.qld.gov.au/api/3/action';

class QldGsqService {
  private cache: Map<string, { data: GSQResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  /**
   * Fetch exploration reports
   */
  async getExplorationReports(options: GSQQueryOptions = {}): Promise<GSQResult> {
    const cacheKey = `qld_reports_${options.commodity || 'all'}_${options.yearFrom || ''}_${options.yearTo || ''}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached QLD GSQ data');
      return cached.data;
    }

    console.log('Fetching exploration reports from Queensland GSQ...');

    try {
      const reports = await this.queryCKAN(options);

      const result: GSQResult = {
        reports,
        totalCount: reports.length,
        dataSource: 'qld_gsq',
        serviceUrl: GSQ_API_URL,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`Fetched ${reports.length} exploration reports from Queensland GSQ`);

      return result;
    } catch (error) {
      console.error('Error fetching QLD GSQ data:', error);
      throw error;
    }
  }

  /**
   * Query Queensland CKAN API
   */
  private async queryCKAN(options: GSQQueryOptions): Promise<QldExplorationReport[]> {
    const limit = options.limit || 500;
    
    // Build filter query for permit reports
    const filters: string[] = ['georesource_report_type:permit-report-final'];
    
    if (options.commodity) {
      filters.push(`commodity:${options.commodity}`);
    }
    
    if (options.yearFrom) {
      filters.push(`open_file_date:[${options.yearFrom}-01-01T00:00:00Z TO NOW]`);
    }

    const fq = filters.join(' AND ');
    const url = `${GSQ_API_URL}/package_search?fq=${encodeURIComponent(fq)}&rows=${limit}`;

    console.log('Querying Queensland GSQ CKAN API...');

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Indigenous-Map-Platform/1.0'
        }
      });

      if (!response.ok) {
        console.error(`QLD GSQ API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!data.success || !data.result?.results) {
        console.log('No results from QLD GSQ');
        return [];
      }

      const reports: QldExplorationReport[] = [];

      for (const pkg of data.result.results) {
        // Extract coordinates from spatial field if available
        let lat = 0, lng = 0;
        
        if (pkg.spatial) {
          try {
            const spatial = JSON.parse(pkg.spatial);
            if (spatial.type === 'Point') {
              lng = spatial.coordinates[0];
              lat = spatial.coordinates[1];
            } else if (spatial.type === 'Polygon' && spatial.coordinates?.[0]) {
              const coords = spatial.coordinates[0];
              lat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length;
              lng = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length;
            }
          } catch {
            // Skip if spatial parsing fails
          }
        }

        // Use bounding box as fallback
        if (!lat && pkg.geospatial_lat) lat = parseFloat(pkg.geospatial_lat);
        if (!lng && pkg.geospatial_lon) lng = parseFloat(pkg.geospatial_lon);

        // Skip if no valid coordinates
        if (!lat || !lng) continue;

        reports.push({
          id: pkg.id || pkg.name,
          title: pkg.title || 'Unknown Report',
          reportType: pkg.georesource_report_type || 'Unknown',
          permitNumber: pkg.georesource_permit_number || pkg.permit_number || '',
          operator: pkg.organization?.title || pkg.operator || 'Unknown',
          commodity: this.extractCommodity(pkg),
          reportYear: this.extractYear(pkg.open_file_date || pkg.metadata_created),
          openFileDate: pkg.open_file_date || '',
          coordinates: { lat, lng },
          abstractUrl: `https://geoscience.data.qld.gov.au/dataset/${pkg.name}`,
          dataSource: 'qld_gsq'
        });
      }

      return reports;
    } catch (error) {
      console.error('Error querying QLD GSQ CKAN:', error);
      return [];
    }
  }

  private extractCommodity(pkg: any): string {
    if (pkg.commodity) return pkg.commodity;
    if (pkg.georesource_commodity) return pkg.georesource_commodity;
    if (pkg.extras) {
      const commodityExtra = pkg.extras.find((e: any) => e.key === 'commodity');
      if (commodityExtra) return commodityExtra.value;
    }
    return 'Unknown';
  }

  private extractYear(dateStr: string): number {
    if (!dateStr) return 0;
    const match = dateStr.match(/(\d{4})/);
    return match ? parseInt(match[1]) : 0;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const qldGsqService = new QldGsqService();
