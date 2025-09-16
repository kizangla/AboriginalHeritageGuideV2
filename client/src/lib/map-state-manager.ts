/**
 * Map State Manager - Handles saving and loading map views
 * Allows users to save their current map configuration and share it via URL
 */

import { z } from 'zod';
import type { MiningFilters } from '@/components/map/MiningFilterPanel';

// Schema for map state
export const MapStateSchema = z.object({
  center: z.object({
    lat: z.number(),
    lng: z.number()
  }),
  zoom: z.number(),
  layers: z.object({
    territories: z.boolean().default(true),
    nativeTitle: z.boolean().default(false),
    ratsib: z.boolean().default(false),
    mining: z.boolean().default(false),
    exploration: z.boolean().default(false),
    businesses: z.boolean().default(false)
  }),
  filters: z.object({
    region: z.string().nullable().default(null),
    nativeTitle: z.object({
      pending: z.boolean().default(false),
      determined: z.boolean().default(false),
      exists: z.boolean().default(false),
      doesNotExist: z.boolean().default(false)
    }).default({}),
    mining: z.object({
      tenementTypes: z.array(z.string()).default([]),
      status: z.array(z.string()).default([]),
      holders: z.array(z.string()).default([]),
      mineralTypes: z.array(z.string()).default([]),
      majorCompaniesOnly: z.boolean().default(false),
      areaRange: z.object({
        min: z.number().default(0),
        max: z.number().default(100000)
      }).default({ min: 0, max: 100000 }),
      dateRange: z.object({
        start: z.string().default(''),
        end: z.string().default('')
      }).default({ start: '', end: '' }),
      search: z.string().default('')
    }).default({})
  }),
  selectedTerritory: z.string().nullable().default(null),
  timestamp: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional()
});

export type MapState = z.infer<typeof MapStateSchema>;

export class MapStateManager {
  private static readonly STORAGE_KEY = 'savedMapViews';
  private static readonly URL_PARAM = 'view';

  /**
   * Save the current map state to a shareable format
   */
  static saveState(state: MapState): string {
    // Generate a unique ID for this view
    const viewId = this.generateViewId();
    
    // Add timestamp
    const stateWithMeta = {
      ...state,
      timestamp: new Date().toISOString(),
      id: viewId
    };

    // Save to local storage (for recent views)
    this.saveToLocalStorage(viewId, stateWithMeta);

    // Encode state for URL sharing
    const encoded = this.encodeState(stateWithMeta);
    
    return encoded;
  }

  /**
   * Load state from encoded string
   */
  static loadState(encoded: string): MapState | null {
    try {
      const decoded = this.decodeState(encoded);
      return MapStateSchema.parse(decoded);
    } catch (error) {
      console.error('Failed to load map state:', error);
      return null;
    }
  }

  /**
   * Save state to URL
   */
  static saveToUrl(state: MapState): string {
    const encoded = this.saveState(state);
    const url = new URL(window.location.href);
    url.searchParams.set(this.URL_PARAM, encoded);
    
    // Update URL without reloading
    window.history.replaceState({}, '', url.toString());
    
    return url.toString();
  }

  /**
   * Load state from URL
   */
  static loadFromUrl(): MapState | null {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get(this.URL_PARAM);
    
    if (!encoded) return null;
    
    return this.loadState(encoded);
  }

  /**
   * Save to local storage for recent views
   */
  private static saveToLocalStorage(id: string, state: MapState & { id: string }): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const views = stored ? JSON.parse(stored) : {};
      
      views[id] = state;
      
      // Keep only last 10 views
      const viewsList = Object.entries(views)
        .sort(([, a]: any, [, b]: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 10);
      
      const trimmedViews = Object.fromEntries(viewsList);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedViews));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  /**
   * Get saved views from local storage
   */
  static getSavedViews(): Array<MapState & { id: string }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const views = JSON.parse(stored);
      return Object.values(views).sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ) as Array<MapState & { id: string }>;
    } catch (error) {
      console.error('Failed to load saved views:', error);
      return [];
    }
  }

  /**
   * Delete a saved view
   */
  static deleteSavedView(id: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const views = JSON.parse(stored);
      delete views[id];
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(views));
    } catch (error) {
      console.error('Failed to delete saved view:', error);
    }
  }

  /**
   * Clear all saved views
   */
  static clearSavedViews(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Generate a unique view ID
   */
  private static generateViewId(): string {
    return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Encode state to base64 URL-safe string (Unicode-safe)
   */
  private static encodeState(state: any): string {
    const json = JSON.stringify(state);
    // Use TextEncoder for Unicode-safe encoding
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    // Convert Uint8Array to string for btoa
    const base64 = btoa(Array.from(data).map(byte => String.fromCharCode(byte)).join(''));
    // Make URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Decode state from base64 URL-safe string (Unicode-safe)
   */
  private static decodeState(encoded: string): any {
    try {
      // Restore base64 format
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if necessary
      while (base64.length % 4) {
        base64 += '=';
      }
      
      // Use TextDecoder for Unicode-safe decoding
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      const json = decoder.decode(bytes);
      return JSON.parse(json);
    } catch (error) {
      console.error('Failed to decode state:', error);
      throw error;
    }
  }

  /**
   * Generate a short shareable link (would connect to a URL shortener service)
   */
  static async generateShareLink(state: MapState): Promise<string> {
    const fullUrl = this.saveToUrl(state);
    
    // In production, this would call a URL shortener service
    // For now, return the full URL
    return fullUrl;
  }
}