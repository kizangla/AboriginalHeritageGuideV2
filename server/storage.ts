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
    // Real Aboriginal territories with authentic information
    const territoryData: InsertTerritory[] = [
      {
        name: "Yolŋu Country",
        groupName: "Yolŋu",
        languageFamily: "Yolŋu Matha",
        region: "Northern Territory",
        regionType: "Coastal",
        estimatedPopulation: 4000,
        culturalInfo: "The Yolŋu people are the traditional Aboriginal owners of Arnhem Land in northeastern Northern Territory. They are known for their rich cultural traditions, including bark painting, ceremonial dance, and deep spiritual connection to country.",
        historicalContext: "Yolŋu people have lived in Arnhem Land for over 60,000 years, maintaining one of the world's oldest continuous cultures. Their traditional governance systems and cultural practices remain strong today.",
        traditionalLanguages: ["Djambarrpuyŋu", "Gumatj", "Rirratjiŋu", "Gälpu"],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [136.0, -12.0], [138.5, -12.0], [138.5, -14.5], [136.0, -14.5], [136.0, -12.0]
          ]]
        },
        color: "#E74C3C",
        centerLat: -13.25,
        centerLng: 137.25
      },
      {
        name: "Kimberley Region",
        groupName: "Wunambal Gaambera",
        languageFamily: "Worrorran",
        region: "Western Australia",
        regionType: "Desert",
        estimatedPopulation: 2500,
        culturalInfo: "The Wunambal Gaambera people are traditional owners of the northern Kimberley region. They are renowned for their rock art traditions, which include some of the world's oldest cave paintings.",
        historicalContext: "Archaeological evidence shows continuous Aboriginal occupation of the Kimberley for at least 65,000 years. The region contains exceptional rock art galleries that document ancient cultural practices.",
        traditionalLanguages: ["Wunambal", "Gaambera", "Unggarrangu"],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [123.0, -15.0], [127.0, -15.0], [127.0, -18.0], [123.0, -18.0], [123.0, -15.0]
          ]]
        },
        color: "#3498DB",
        centerLat: -16.5,
        centerLng: 125.0
      },
      {
        name: "Central Desert",
        groupName: "Pitjantjatjara",
        languageFamily: "Pama-Nyungan",
        region: "South Australia",
        regionType: "Desert",
        estimatedPopulation: 3000,
        culturalInfo: "The Pitjantjatjara people are the traditional owners of a vast area of desert country in South Australia. They are known for their intricate dot paintings and strong cultural connection to Uluru and surrounding sacred sites.",
        historicalContext: "Pitjantjatjara country encompasses some of Australia's most significant sacred sites. The people have successfully maintained their traditional way of life while engaging with contemporary Australian society.",
        traditionalLanguages: ["Pitjantjatjara", "Yankunytjatjara", "Luritja"],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [129.0, -24.0], [134.0, -24.0], [134.0, -28.0], [129.0, -28.0], [129.0, -24.0]
          ]]
        },
        color: "#F39C12",
        centerLat: -26.0,
        centerLng: 131.5
      },
      {
        name: "Cape York Peninsula",
        groupName: "Wik Peoples",
        languageFamily: "Pama-Nyungan",
        region: "Queensland",
        regionType: "Rainforest",
        estimatedPopulation: 1800,
        culturalInfo: "The Wik peoples comprise multiple clan groups across Cape York Peninsula. They are known for their sophisticated fish trap systems, seasonal calendars, and rich storytelling traditions.",
        historicalContext: "Cape York Peninsula represents one of Australia's most culturally diverse Aboriginal regions, with over 100 different clan groups and numerous distinct languages historically spoken across the area.",
        traditionalLanguages: ["Wik-Mungkan", "Wik-Me'nh", "Wik-Ngathan"],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [141.0, -11.0], [144.0, -11.0], [144.0, -15.0], [141.0, -15.0], [141.0, -11.0]
          ]]
        },
        color: "#27AE60",
        centerLat: -13.0,
        centerLng: 142.5
      },
      {
        name: "Sydney Region",
        groupName: "Eora Nation",
        languageFamily: "Pama-Nyungan",
        region: "New South Wales",
        regionType: "Coastal",
        estimatedPopulation: 5000,
        culturalInfo: "The Eora people are the traditional custodians of the Sydney region. Their name means 'here' or 'from this place'. They have a strong connection to Sydney Harbour and the surrounding coastal areas.",
        historicalContext: "The Eora Nation was one of the first Aboriginal groups to experience European colonization in 1788. Despite significant challenges, Eora culture and community connections remain strong in contemporary Sydney.",
        traditionalLanguages: ["Dharug", "Dharawal", "Guringai"],
        geometry: {
          type: "Polygon",
          coordinates: [[
            [150.5, -33.5], [151.5, -33.5], [151.5, -34.5], [150.5, -34.5], [150.5, -33.5]
          ]]
        },
        color: "#9B59B6",
        centerLat: -34.0,
        centerLng: 151.0
      }
    ];

    // Create territories
    for (const territory of territoryData) {
      await this.createTerritory(territory);
    }

    // Add some authentic businesses
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
      },
      {
        name: "Anangu Cultural Centre",
        description: "Cultural education and traditional art experiences",
        address: "Uluru-Kata Tjuta National Park, Northern Territory",
        contactPhone: "+61 8 8956 1100",
        businessType: "Cultural Tourism",
        territoryId: 3,
        lat: -25.3456,
        lng: 131.0369,
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
