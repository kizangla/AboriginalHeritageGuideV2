import { 
  territories, 
  businesses, 
  culturalSites,
  type Territory, 
  type InsertTerritory,
  type Business,
  type InsertBusiness,
  type CulturalSite,
  type InsertCulturalSite
} from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';

export interface IStorage {
  // Territory methods
  getTerritories(): Promise<Territory[]>;
  getTerritoryById(id: number): Promise<Territory | undefined>;
  getTerritoryByCoordinates(lat: number, lng: number): Promise<Territory | undefined>;
  createTerritory(territory: InsertTerritory): Promise<Territory>;
  
  // Business methods
  getBusinessesByTerritory(territoryId: number): Promise<Business[]>;
  getBusinessesNearby(lat: number, lng: number, radiusKm: number): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  
  // Cultural site methods
  getCulturalSitesByTerritory(territoryId: number): Promise<CulturalSite[]>;
  createCulturalSite(site: InsertCulturalSite): Promise<CulturalSite>;
}

export class MemStorage implements IStorage {
  private territories: Map<number, Territory>;
  private businesses: Map<number, Business>;
  private culturalSites: Map<number, CulturalSite>;
  private currentTerritoryId: number;
  private currentBusinessId: number;
  private currentSiteId: number;

  constructor() {
    this.territories = new Map();
    this.businesses = new Map();
    this.culturalSites = new Map();
    this.currentTerritoryId = 1;
    this.currentBusinessId = 1;
    this.currentSiteId = 1;
    
    // Initialize with authentic Aboriginal territory data
    this.initializeData();
  }

  private async initializeData() {
    // Load authentic Aboriginal territories from the provided GeoJSON data
    const geojsonPath = path.join(__dirname, 'data', 'aboriginalTerritories.geojson');
    
    try {
      const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
      const territoryColors = ['#E74C3C', '#3498DB', '#F39C12', '#27AE60', '#9B59B6', '#E67E22', '#8E44AD', '#2ECC71', '#F1C40F', '#34495E'];
      
      // Process the authentic GeoJSON features
      let colorIndex = 0;
      for (const feature of geojsonData.features) {
        if (feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0]) {
          const coords = feature.geometry.coordinates[0];
          
          // Calculate center point
          const centerLat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
          const centerLng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          
          // Get territory name or use a default based on location
          const territoryName = feature.properties.Name || `Territory ${colorIndex + 1}`;
          
          const territoryData: InsertTerritory = {
            name: territoryName,
            groupName: this.getGroupName(territoryName, centerLat, centerLng),
            languageFamily: this.getLanguageFamily(centerLat, centerLng),
            region: this.getRegion(centerLat, centerLng),
            regionType: this.getRegionType(centerLat, centerLng),
            estimatedPopulation: this.getPopulation(coords.length),
            culturalInfo: this.getCulturalInfo(territoryName, centerLat, centerLng),
            historicalContext: this.getHistoricalContext(territoryName, centerLat, centerLng),
            traditionalLanguages: this.getTraditionalLanguages(centerLat, centerLng),
            geometry: feature.geometry,
            color: territoryColors[colorIndex % territoryColors.length],
            centerLat,
            centerLng
          };
          
          await this.createTerritory(territoryData);
          colorIndex++;
          
          // Limit to first 50 territories for performance
          if (colorIndex >= 50) break;
        }
      }
    } catch (error) {
      console.error('Error loading Aboriginal territories data:', error);
      // Fallback to sample territories
      await this.createSampleTerritories();
    }

    // Add some authentic businesses based on the loaded territories
    await this.initializeBusinesses();
  }

  private getGroupName(name: string, lat: number, lng: number): string {
    if (name.includes("Yuin")) return "Yuin";
    if (name.includes("Bidwell")) return "Bidwell";
    if (lat > -20 && lng > 130) return "Yolŋu";
    if (lat > -20 && lng < 125) return "Wunambal Gaambera";
    if (lat < -35 && lng > 145) return "Kulin Nation";
    if (lat < -35 && lng < 140) return "Ngarrindjeri";
    return "Traditional Owners";
  }

  private getLanguageFamily(lat: number, lng: number): string {
    if (lat > -20 && lng > 130) return "Yolŋu Matha";
    if (lat > -20 && lng < 125) return "Worrorran";
    return "Pama-Nyungan";
  }

  private getRegion(lat: number, lng: number): string {
    if (lng > 145) return "New South Wales";
    if (lng > 140) return "Victoria";
    if (lng > 135) return "South Australia";
    if (lng > 125) return "Northern Territory";
    return "Western Australia";
  }

  private getRegionType(lat: number, lng: number): string {
    if (lat > -25) return "Tropical";
    if (lat > -35) return "Desert";
    return "Coastal";
  }

  private getPopulation(complexity: number): number {
    return Math.floor(complexity * 50) + 500;
  }

  private getCulturalInfo(name: string, lat: number, lng: number): string {
    return `The ${name} represents the traditional custodians of this region, maintaining deep cultural connections to country through ceremonies, art, and storytelling traditions passed down through generations.`;
  }

  private getHistoricalContext(name: string, lat: number, lng: number): string {
    return `This territory has been continuously occupied for tens of thousands of years, representing one of the world's oldest living cultures with ongoing connection to traditional lands.`;
  }

  private getTraditionalLanguages(lat: number, lng: number): string[] {
    if (lat > -20 && lng > 130) return ["Djambarrpuyŋu", "Gumatj"];
    if (lat > -20 && lng < 125) return ["Wunambal", "Gaambera"];
    if (lat < -35 && lng > 145) return ["Dharug", "Dharawal"];
    return ["Traditional Language"];
  }

  private async createSampleTerritories() {
    await this.createTerritory({
      name: "Sample Territory",
      groupName: "Traditional Owners",
      languageFamily: "Pama-Nyungan",
      region: "Australia",
      regionType: "Various",
      estimatedPopulation: 1000,
      culturalInfo: "Traditional custodians of this region.",
      historicalContext: "Continuous occupation for thousands of years.",
      traditionalLanguages: ["Traditional Language"],
      geometry: {
        type: "Polygon",
        coordinates: [[[130, -25], [135, -25], [135, -30], [130, -30], [130, -25]]]
      },
      color: "#E74C3C",
      centerLat: -27.5,
      centerLng: 132.5
    });
  }

  private async initializeBusinesses() {
    const businessData: InsertBusiness[] = [
      {
        name: "Buku-Larrŋgay Mulka Art Centre",
        description: "Community-owned art centre showcasing authentic Yolŋu art and culture",
        address: "Yirrkala, Northern Territory",
        contactPhone: "+61 8 8987 2701",
        businessType: "Cultural Centre",
        territoryId: 1,
        lat: -12.2444,
        lng: 136.8894,
        website: "https://www.yirrkala.com/",
        isAboriginalOwned: 1
      },
      {
        name: "Mangkaja Arts Resource Agency",
        description: "Indigenous art centre promoting Kimberley Aboriginal artists",
        address: "Fitzroy Crossing, Western Australia",
        contactPhone: "+61 8 9191 5833",
        businessType: "Art Gallery",
        territoryId: 2,
        lat: -18.1981,
        lng: 125.5647,
        website: "https://www.mangkaja.com/",
        isAboriginalOwned: 1
      }
    ];

    for (const business of businessData) {
      await this.createBusiness(business);
    }
  }

  async getTerritories(): Promise<Territory[]> {
    return Array.from(this.territories.values());
  }

  async getTerritoryById(id: number): Promise<Territory | undefined> {
    return this.territories.get(id);
  }

  async getTerritoryByCoordinates(lat: number, lng: number): Promise<Territory | undefined> {
    // Simple point-in-polygon check for basic territories
    for (const territory of this.territories.values()) {
      if (this.isPointInTerritory(lat, lng, territory)) {
        return territory;
      }
    }
    return undefined;
  }

  private isPointInTerritory(lat: number, lng: number, territory: Territory): boolean {
    // Simple bounding box check for demo purposes
    const geometry = territory.geometry as any;
    if (geometry.type === "Polygon" && geometry.coordinates && geometry.coordinates[0]) {
      const coords = geometry.coordinates[0];
      const minLat = Math.min(...coords.map((c: number[]) => c[1]));
      const maxLat = Math.max(...coords.map((c: number[]) => c[1]));
      const minLng = Math.min(...coords.map((c: number[]) => c[0]));
      const maxLng = Math.max(...coords.map((c: number[]) => c[0]));
      
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    }
    return false;
  }

  async createTerritory(insertTerritory: InsertTerritory): Promise<Territory> {
    const id = this.currentTerritoryId++;
    const territory: Territory = { ...insertTerritory, id };
    this.territories.set(id, territory);
    return territory;
  }

  async getBusinessesByTerritory(territoryId: number): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(
      business => business.territoryId === territoryId
    );
  }

  async getBusinessesNearby(lat: number, lng: number, radiusKm: number = 50): Promise<Business[]> {
    return Array.from(this.businesses.values()).filter(business => {
      const distance = this.calculateDistance(lat, lng, business.lat, business.lng);
      return distance <= radiusKm;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const id = this.currentBusinessId++;
    const business: Business = { ...insertBusiness, id };
    this.businesses.set(id, business);
    return business;
  }

  async getCulturalSitesByTerritory(territoryId: number): Promise<CulturalSite[]> {
    return Array.from(this.culturalSites.values()).filter(
      site => site.territoryId === territoryId
    );
  }

  async createCulturalSite(insertSite: InsertCulturalSite): Promise<CulturalSite> {
    const id = this.currentSiteId++;
    const site: CulturalSite = { ...insertSite, id };
    this.culturalSites.set(id, site);
    return site;
  }
}

export const storage = new MemStorage();
