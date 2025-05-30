import { pgTable, text, serial, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const territories = pgTable("territories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  groupName: text("group_name").notNull(),
  languageFamily: text("language_family").notNull(),
  region: text("region").notNull(),
  regionType: text("region_type").notNull(), // e.g., "Coastal", "Desert", "Rainforest"
  estimatedPopulation: integer("estimated_population"),
  culturalInfo: text("cultural_info"),
  historicalContext: text("historical_context"),
  traditionalLanguages: text("traditional_languages").array().default([]),
  geometry: jsonb("geometry").notNull(), // GeoJSON geometry
  color: text("color").notNull(), // Hex color for map display
  centerLat: real("center_lat").notNull(),
  centerLng: real("center_lng").notNull(),
  // Enhanced cultural information
  seasonalCalendar: text("seasonal_calendar"),
  traditionalFoods: text("traditional_foods").array().default([]),
  medicinalPlants: text("medicinal_plants").array().default([]),
  culturalProtocols: text("cultural_protocols"),
  connectionToCountry: text("connection_to_country"),
  artStyles: text("art_styles").array().default([]),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  businessType: text("business_type").notNull(), // e.g., "Cultural Tourism", "Art Gallery", "Traditional Food"
  territoryId: integer("territory_id").references(() => territories.id),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  website: text("website"),
  isAboriginalOwned: integer("is_aboriginal_owned").default(1), // 1 for true, 0 for false
  // Enhanced business information
  operatingHours: text("operating_hours"),
  services: text("services").array().default([]),
  culturalExperiences: text("cultural_experiences").array().default([]),
  bookingRequired: integer("booking_required").default(0),
  accessibility: text("accessibility"),
  priceRange: text("price_range"), // e.g., "$", "$$", "$$$"
  socialMedia: jsonb("social_media"), // JSON object for various social platforms
  // ABR Integration fields
  abn: text("abn"),
  abnStatus: text("abn_status"),
  entityType: text("entity_type"),
});

// Supply Nation certified businesses database table
export const supplyNationBusinesses = pgTable("supply_nation_businesses", {
  id: serial("id").primaryKey(),
  
  // Core business information
  abn: text("abn").notNull(),
  companyName: text("company_name").notNull(),
  tradingName: text("trading_name"),
  supplynationId: text("supplynation_id").notNull().unique(),
  
  // Verification and certification status
  verified: integer("verified").notNull().default(1), // 1 for verified, 0 for not
  certifications: text("certifications").array().default([]), // Array of certification types
  certificationBadges: jsonb("certification_badges"), // JSON object storing badge details
  
  // Contact information
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  website: text("website"),
  contactPerson: text("contact_person"),
  
  // Address details
  streetAddress: text("street_address"),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  fullAddress: text("full_address"),
  
  // Geolocation
  lat: real("lat"),
  lng: real("lng"),
  
  // Business services and categories
  categories: text("categories").array().default([]),
  capabilities: text("capabilities").array().default([]),
  description: text("description"),
  
  // Supply Nation specific data
  profileUrl: text("profile_url"),
  lastUpdated: text("last_updated"),
  
  // Metadata
  extractedAt: text("extracted_at").notNull(),
  dataSource: text("data_source").notNull().default('supply_nation'),
});

// ABR business data cache table
export const abrBusinesses = pgTable("abr_businesses", {
  id: serial("id").primaryKey(),
  
  // ABR identifiers
  abn: text("abn").notNull().unique(),
  acn: text("acn"),
  
  // Business details
  entityName: text("entity_name").notNull(),
  entityType: text("entity_type"),
  abnStatus: text("abn_status"),
  abnStatusEffectiveFrom: text("abn_status_effective_from"),
  
  // Address information
  addressPostcode: text("address_postcode"),
  addressState: text("address_state"),
  addressSuburb: text("address_suburb"),
  addressStreet: text("address_street"),
  fullAddress: text("full_address"),
  
  // Business names
  businessNames: text("business_names").array().default([]),
  
  // GST and DGR status
  gstStatus: integer("gst_status").default(0),
  dgrStatus: integer("dgr_status").default(0),
  
  // Geolocation (enriched)
  lat: real("lat"),
  lng: real("lng"),
  
  // Cache metadata
  lastFetched: text("last_fetched").notNull(),
  dataSource: text("data_source").notNull().default('abr'),
});

export const culturalSites = pgTable("cultural_sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  significance: text("significance"),
  territoryId: integer("territory_id").references(() => territories.id),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accessInfo: text("access_info"),
  isPublicAccess: integer("is_public_access").default(1),
  // Enhanced cultural site information
  siteType: text("site_type").notNull(), // e.g., "Sacred Site", "Art Gallery", "Cultural Centre", "Museum"
  dreamtimeStories: text("dreamtime_stories"),
  visitingProtocols: text("visiting_protocols"),
  culturalActivities: text("cultural_activities").array().default([]),
  languageLearning: text("language_learning"),
  artworkDisplays: text("artwork_displays").array().default([]),
  guidedTours: integer("guided_tours").default(0),
  respectGuidelines: text("respect_guidelines"),
  createdAt: text("created_at")
});

export const insertTerritorySchema = createInsertSchema(territories).omit({
  id: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
}).extend({
  verificationSource: z.enum(['manual', 'abr_keywords', 'supply_nation']).optional(),
  verificationConfidence: z.enum(['high', 'medium', 'low']).optional()
});

export const insertCulturalSiteSchema = createInsertSchema(culturalSites).omit({
  id: true,
});

export const insertSupplyNationBusinessSchema = createInsertSchema(supplyNationBusinesses).omit({
  id: true,
  lastScraped: true,
  createdAt: true,
});

// Type definitions
export type SupplyNationBusiness = typeof supplyNationBusinesses.$inferSelect;
export type InsertSupplyNationBusiness = z.infer<typeof insertSupplyNationBusinessSchema>;

// Integrated Business Type with Supply Nation data
export interface IntegratedBusiness {
  abn: string;
  entityName: string;
  entityType: string;
  status: string;
  lat?: number;
  lng?: number;
  displayAddress?: string;
  address: {
    stateCode?: string;
    postcode?: string;
    suburb?: string;
    streetAddress?: string;
    fullAddress?: string;
  };
  gst?: boolean;
  dgr?: boolean;
  supplyNationVerified: boolean;
  verificationConfidence?: 'high' | 'medium' | 'low';
  verificationSource?: 'abr_only' | 'supply_nation' | 'both';
  supplyNationData?: {
    companyName: string;
    verified: boolean;
    categories: string[];
    location: string;
    contactInfo: {
      email?: string;
      phone?: string;
      website?: string;
    };
    description?: string;
    supplynationId: string;
    capabilities?: string[];
    certifications?: string[];
  };
}

export interface ABRBusiness extends IntegratedBusiness {
  // ABRBusiness extends IntegratedBusiness for compatibility
}

// Relations
import { relations } from "drizzle-orm";

export const territoriesRelations = relations(territories, ({ many }) => ({
  businesses: many(businesses),
  culturalSites: many(culturalSites),
}));

export const businessesRelations = relations(businesses, ({ one }) => ({
  territory: one(territories, {
    fields: [businesses.territoryId],
    references: [territories.id],
  }),
}));

export const culturalSitesRelations = relations(culturalSites, ({ one }) => ({
  territory: one(territories, {
    fields: [culturalSites.territoryId],
    references: [territories.id],
  }),
}));

export type Territory = typeof territories.$inferSelect;
export type InsertTerritory = z.infer<typeof insertTerritorySchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type CulturalSite = typeof culturalSites.$inferSelect;
export type InsertCulturalSite = z.infer<typeof insertCulturalSiteSchema>;

// GeoJSON types for frontend
export interface TerritoryGeoJSON {
  type: "Feature";
  properties: {
    id: number;
    name: string;
    groupName: string;
    languageFamily: string;
    region: string;
    regionType: string;
    estimatedPopulation: number | null;
    culturalInfo: string | null;
    historicalContext: string | null;
    traditionalLanguages: string[];
    color: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  boundingbox: string[];
}
