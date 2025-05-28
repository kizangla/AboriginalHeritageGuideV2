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

export const insertTerritorySchema = createInsertSchema(territories).omit({
  id: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
});

export const insertCulturalSiteSchema = createInsertSchema(culturalSites).omit({
  id: true,
});

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
