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
  isAboriginalOwned: serial("is_aboriginal_owned").default(1), // 1 for true, 0 for false
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
  isPublicAccess: serial("is_public_access").default(1),
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
