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
  abn: text("abn").unique(),
  abnEntityName: text("abn_entity_name"),
  abnStatus: text("abn_status"),
  gstRegistered: integer("gst_registered").default(0),
  dgrStatus: integer("dgr_status").default(0),
  // Indigenous verification fields
  verificationSource: text("verification_source"), // 'manual', 'abr_keywords', 'supply_nation'
  verificationConfidence: text("verification_confidence"), // 'high', 'medium', 'low'
  verificationNotes: text("verification_notes"),
  verifiedBy: text("verified_by"),
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
});

export const nativeTitleClaims = pgTable("native_title_claims", {
  id: serial("id").primaryKey(),
  applicationId: text("application_id").notNull().unique(),
  tribunalNumber: text("tribunal_number"),
  applicantName: text("applicant_name").notNull(),
  status: text("status").notNull(), // 'Determined', 'Registered', 'In Progress', etc.
  determinationDate: text("determination_date"),
  state: text("state").notNull(),
  outcome: text("outcome"), // 'Native Title Exists', 'Native Title Does Not Exist', etc.
  area: real("area"), // Area in square kilometers
  geometry: jsonb("geometry").notNull(), // GeoJSON geometry
  traditionalOwners: text("traditional_owners").array().default([]),
  federalCourtNumber: text("federal_court_number"),
  registrationDate: text("registration_date"),
  lastUpdated: text("last_updated"),
  dataSource: text("data_source").default("Australian Government Native Title Tribunal")
});

export const supplyNationBusinesses = pgTable("supply_nation_businesses", {
  id: serial("id").primaryKey(),
  abn: text("abn"),
  companyName: text("company_name").notNull(),
  verified: integer("verified").default(1),
  categories: text("categories").array(),
  location: text("location"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  description: text("description"),
  supplynationId: text("supplynation_id").notNull().unique(),
  capabilities: text("capabilities").array(),
  certifications: text("certifications").array(),
  lastScraped: text("last_scraped"),
  createdAt: text("created_at")
});

export const miningTenements = pgTable("mining_tenements", {
  id: serial("id").primaryKey(),
  tenementId: text("tenement_id").notNull().unique(), // e.g. "AG 7000003", "M 45/1234"
  tenementType: text("tenement_type").notNull(), // MINING LEASE, EXPLORATION LICENCE, etc.
  status: text("status").notNull(), // LIVE, PENDING, EXPIRED
  holder: text("holder").notNull(), // Company name
  state: text("state").notNull().default("WA"), // State/Territory
  area: real("area"), // Area in hectares
  geometry: jsonb("geometry").notNull(), // GeoJSON polygon coordinates
  centerLat: real("center_lat").notNull(),
  centerLng: real("center_lng").notNull(),
  grantDate: text("grant_date"),
  expiryDate: text("expiry_date"),
  mineralTypes: text("mineral_types").array().default([]), // Iron ore, Gold, Coal, etc.
  dataSource: text("data_source").default("WA Department of Mines, Industry Regulation and Safety (DMIRS)"),
  lastUpdated: text("last_updated").default(new Date().toISOString()),
  // Indexing for fast filtering
  holderNormalized: text("holder_normalized"), // Normalized company name for searching
  majorCompany: integer("major_company").default(0), // 1 if BHP, Rio Tinto, Fortescue, etc.
});

export const insertTerritorySchema = createInsertSchema(territories).omit({
  id: true,
});

export const insertNativeTitleClaimSchema = createInsertSchema(nativeTitleClaims).omit({
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

export const insertMiningTenementSchema = createInsertSchema(miningTenements).omit({
  id: true,
  lastUpdated: true,
});

// Type definitions
export type SupplyNationBusiness = typeof supplyNationBusinesses.$inferSelect;
export type InsertSupplyNationBusiness = z.infer<typeof insertSupplyNationBusinessSchema>;
export type MiningTenement = typeof miningTenements.$inferSelect;
export type InsertMiningTenement = z.infer<typeof insertMiningTenementSchema>;

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
    centerLat: number;
    centerLng: number;
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
  lng?: string; // Alternative for longitude
  place_id: string;
  boundingbox: string[];
  type?: string;
  class?: string;
  importance?: number;
}
