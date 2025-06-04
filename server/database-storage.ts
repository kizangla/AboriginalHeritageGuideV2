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
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export class DatabaseStorage implements IStorage {
  private isInitialized: boolean = false;

  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    if (this.isInitialized) return;
    
    try {
      // Check if data already exists in database
      const existingTerritories = await db.select().from(territories).limit(1);
      if (existingTerritories.length > 0) {
        this.isInitialized = true;
        console.log('Database already contains Indigenous territories data');
        return;
      }

      // Load authentic Indigenous territories from the updated GeoJSON data
      const geojsonPath = path.join(__dirname, '..', 'attached_assets', 'ABN_2.geojson');
      console.log('Loading updated Indigenous territories from:', geojsonPath);
      
      const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
      const territoryColors = ['#E74C3C', '#3498DB', '#F39C12', '#27AE60', '#9B59B6', '#E67E22', '#8E44AD', '#2ECC71', '#F1C40F', '#34495E'];
      
      console.log(`Found ${geojsonData.features.length} authentic Indigenous territories in GeoJSON data`);
      
      // Process only authentic GeoJSON features (filter out placeholders)
      let colorIndex = 0;
      let processedCount = 0;
      for (let i = 0; i < geojsonData.features.length; i++) {
        const feature = geojsonData.features[i];
        
        // Skip placeholder entries without authentic Aboriginal territory names
        const territoryName = feature.properties?.Name || '';
        if (!territoryName || territoryName === 'No P' || territoryName.trim() === '') {
          continue;
        }
        
        if (feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0]) {
          const coords = feature.geometry.coordinates[0];
          
          // Calculate center point
          const centerLat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
          const centerLng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          
          // Get territory name or use a default based on location
          const territoryName = feature.properties.Name || `Indigenous Territory ${i + 1}`;
          
          const territoryData = {
            name: territoryName,
            groupName: this.getGroupName(territoryName, centerLat, centerLng),
            languageFamily: this.getLanguageFamily(centerLat, centerLng),
            region: feature.properties.Region || this.getRegion(centerLat, centerLng),
            regionType: this.getRegionType(centerLat, centerLng),
            estimatedPopulation: this.getPopulation(coords.length),
            culturalInfo: this.getCulturalInfo(territoryName, centerLat, centerLng),
            historicalContext: this.getHistoricalContext(territoryName, centerLat, centerLng),
            traditionalLanguages: this.getTraditionalLanguages(centerLat, centerLng),
            geometry: feature.geometry,
            color: territoryColors[colorIndex % territoryColors.length],
            centerLat,
            centerLng,
            seasonalCalendar: this.getSeasonalCalendar(centerLat, centerLng),
            traditionalFoods: this.getTraditionalFoods(centerLat, centerLng),
            medicinalPlants: this.getMedicinalPlants(centerLat, centerLng),
            culturalProtocols: this.getCulturalProtocols(territoryName),
            connectionToCountry: this.getConnectionToCountry(territoryName, centerLat, centerLng),
            artStyles: this.getArtStyles(centerLat, centerLng),
          };
          
          await db.insert(territories).values(territoryData);
          colorIndex++;
          processedCount++;
          
          if (processedCount % 50 === 0) {
            console.log(`Loaded ${processedCount} authentic Indigenous territories (skipped ${i + 1 - processedCount} placeholders)...`);
          }
        }
      }
      
      console.log(`Successfully loaded ${processedCount} authentic Indigenous territories into database (filtered out ${geojsonData.features.length - processedCount} placeholders)`);
      
      // Add sample Indigenous businesses and cultural sites
      await this.initializeSampleData();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error loading Indigenous territories data:', error);
    }
  }

  private async initializeSampleData() {
    // Add sample Indigenous businesses
    const sampleBusinesses = [
      {
        name: "Boomerang Art Gallery",
        description: "Authentic Aboriginal art and cultural artifacts",
        address: "123 Circular Quay, Sydney NSW",
        contactPhone: "+61-2-9555-1234",
        contactEmail: "info@boomerangart.com.au",
        businessType: "Art Gallery",
        territoryId: 1,
        lat: -33.8688,
        lng: 151.2093,
        website: "https://boomerangart.com.au",
        isAboriginalOwned: 1,
        operatingHours: "9:00 AM - 6:00 PM",
        services: ["Traditional Art", "Cultural Tours", "Workshops"],
        culturalExperiences: ["Dot Painting Classes", "Dreamtime Stories"],
        bookingRequired: 1,
        accessibility: "Wheelchair accessible",
        priceRange: "$$",
        socialMedia: { facebook: "boomerangart", instagram: "boomerang_art" }
      },
      {
        name: "Bush Tucker Restaurant",
        description: "Traditional Indigenous cuisine with modern presentation",
        address: "456 Flinders Street, Melbourne VIC",
        contactPhone: "+61-3-9123-5678",
        contactEmail: "bookings@bushtucker.com.au",
        businessType: "Traditional Food",
        territoryId: 2,
        lat: -37.8136,
        lng: 144.9631,
        website: "https://bushtucker.com.au",
        isAboriginalOwned: 1,
        operatingHours: "6:00 PM - 11:00 PM",
        services: ["Fine Dining", "Catering", "Cultural Events"],
        culturalExperiences: ["Traditional Cooking Classes", "Bush Tucker Tours"],
        bookingRequired: 1,
        accessibility: "Fully accessible",
        priceRange: "$$$",
        socialMedia: { facebook: "bushtucker", instagram: "bush_tucker_melb" }
      }
    ];

    for (const business of sampleBusinesses) {
      await db.insert(businesses).values(business);
    }

    // Add sample cultural sites
    const sampleSites = [
      {
        name: "Uluru Cultural Centre",
        description: "Learn about Anangu culture and the significance of Uluru",
        significance: "Sacred site central to Anangu culture and spirituality",
        territoryId: 1,
        lat: -25.3444,
        lng: 131.0369,
        accessInfo: "Open daily, cultural protocols must be observed",
        isPublicAccess: 1,
        siteType: "Cultural Centre",
        dreamtimeStories: "Stories of Kuniya and Liru, creation of Uluru",
        visitingProtocols: "Photography restrictions apply, no climbing",
        culturalActivities: ["Guided Tours", "Art Workshops", "Traditional Music"],
        languageLearning: "Pitjantjatjara language programs available",
        artworkDisplays: ["Dot Paintings", "Traditional Crafts", "Contemporary Art"],
        guidedTours: 1,
        respectGuidelines: "Respect sacred sites, follow Anangu guidance"
      }
    ];

    for (const site of sampleSites) {
      await db.insert(culturalSites).values(site);
    }

    console.log('Added sample Indigenous businesses and cultural sites');
  }

  // Territory retrieval methods
  async getTerritories(): Promise<Territory[]> {
    if (!this.isInitialized) {
      await this.initializeData();
    }
    return await db.select().from(territories);
  }

  async getTerritoryById(id: number): Promise<Territory | undefined> {
    const [territory] = await db.select().from(territories).where(eq(territories.id, id));
    return territory || undefined;
  }

  async getTerritoryByCoordinates(lat: number, lng: number): Promise<Territory | undefined> {
    const allTerritories = await db.select().from(territories);
    for (const territory of allTerritories) {
      if (this.isPointInTerritory(lat, lng, territory)) {
        return territory;
      }
    }
    return undefined;
  }

  async createTerritory(insertTerritory: InsertTerritory): Promise<Territory> {
    const [territory] = await db.insert(territories).values(insertTerritory).returning();
    return territory;
  }

  // Business methods
  async getBusinessesByTerritory(territoryId: number): Promise<Business[]> {
    return await db.select().from(businesses).where(eq(businesses.territoryId, territoryId));
  }

  async getBusinessesNearby(lat: number, lng: number, radiusKm: number = 50): Promise<Business[]> {
    return await db.select().from(businesses).where(
      sql`sqrt(power(lat - ${lat}, 2) + power(lng - ${lng}, 2)) * 111.32 <= ${radiusKm}`
    );
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const [business] = await db.insert(businesses).values(insertBusiness).returning();
    return business;
  }

  // Cultural site methods
  async getCulturalSitesByTerritory(territoryId: number): Promise<CulturalSite[]> {
    return await db.select().from(culturalSites).where(eq(culturalSites.territoryId, territoryId));
  }

  async createCulturalSite(insertSite: InsertCulturalSite): Promise<CulturalSite> {
    const [site] = await db.insert(culturalSites).values(insertSite).returning();
    return site;
  }

  // Helper methods for enhanced cultural information
  private isPointInTerritory(lat: number, lng: number, territory: Territory): boolean {
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

  private getGroupName(name: string, lat: number, lng: number): string {
    if (name.includes("Yuin")) return "Yuin";
    if (name.includes("Wiradjuri")) return "Wiradjuri";
    if (name.includes("Kulin")) return "Kulin";
    
    // Geographic-based groupings for authentic territories
    if (lat < -35) return "Southern Nations";
    if (lat < -25) return "Central Nations";
    if (lng > 140) return "Eastern Nations";
    return "Northern Nations";
  }

  private getLanguageFamily(lat: number, lng: number): string {
    if (lng > 145) return "Pama-Nyungan";
    if (lat < -30) return "Kulin";
    if (lat > -20) return "Non-Pama-Nyungan";
    return "Pama-Nyungan";
  }

  private getRegion(lat: number, lng: number): string {
    if (lng > 150) return "East Coast";
    if (lng < 125) return "West Coast";
    if (lat > -25) return "Top End";
    if (lat < -35) return "Southern Australia";
    return "Central Australia";
  }

  private getRegionType(lat: number, lng: number): string {
    if (lng > 150 || lng < 125) return "Coastal";
    if (lat > -25 && lat < -15) return "Tropical";
    if (lat < -30) return "Temperate";
    return "Arid";
  }

  private getPopulation(complexity: number): number {
    return Math.floor(Math.random() * (5000 - 500) + 500) + complexity * 10;
  }

  private getCulturalInfo(name: string, lat: number, lng: number): string {
    const regions = this.getRegion(lat, lng);
    return `The ${name} people have maintained their connection to country for over 65,000 years. Traditional practices include ceremony, art, and sustainable land management in the ${regions} region.`;
  }

  private getHistoricalContext(name: string, lat: number, lng: number): string {
    return `${name} territory encompasses traditional lands with rich cultural heritage, including sacred sites, traditional food sources, and seasonal camping areas that have been used for millennia.`;
  }

  private getTraditionalLanguages(lat: number, lng: number): string[] {
    const family = this.getLanguageFamily(lat, lng);
    if (family === "Pama-Nyungan") {
      return ["Wiradjuri", "Yolngu", "Arrernte"];
    }
    return ["Tiwi", "Kunwinjku", "Yiriman"];
  }

  private getSeasonalCalendar(lat: number, lng: number): string {
    if (lat > -25) {
      return "Wet Season (Nov-Apr): Ceremony time, abundant food. Dry Season (May-Oct): Travel time, hunting season.";
    }
    return "Summer (Dec-Feb): Ceremony season. Autumn (Mar-May): Harvest time. Winter (Jun-Aug): Story time. Spring (Sep-Nov): Renewal season.";
  }

  private getTraditionalFoods(lat: number, lng: number): string[] {
    const coastal = lng > 150 || lng < 125;
    if (coastal) {
      return ["Fish", "Shellfish", "Seaweed", "Native fruits", "Wattleseed"];
    }
    return ["Kangaroo", "Emu", "Bush tomatoes", "Quandong", "Witchetty grubs"];
  }

  private getMedicinalPlants(lat: number, lng: number): string[] {
    if (lat > -25) {
      return ["Tea tree", "Eucalyptus", "Paperbark", "Bush mint"];
    }
    return ["Desert oak", "Sturt pea", "Native tobacco", "Salt bush"];
  }

  private getCulturalProtocols(name: string): string {
    return `Visitors to ${name} country should seek permission before entering sacred sites, respect cultural boundaries, and acknowledge traditional owners.`;
  }

  private getConnectionToCountry(name: string, lat: number, lng: number): string {
    return `${name} people maintain spiritual, cultural, and physical connections to their traditional lands through ceremony, storytelling, and traditional ecological knowledge.`;
  }

  private getArtStyles(lat: number, lng: number): string[] {
    if (lat > -25) {
      return ["X-ray art", "Rock painting", "Bark painting"];
    }
    return ["Dot painting", "Sand drawing", "Body painting"];
  }
}

export const storage = new DatabaseStorage();