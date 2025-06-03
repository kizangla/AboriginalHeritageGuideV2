/**
 * Integrated Dynamic Search System
 * Combines ABR and Supply Nation data for dynamic map searches
 */

import { searchBusinessesByName, getBusinessByABN, ABRBusinessDetails } from './abr-service';
import puppeteer from 'puppeteer';

export interface IntegratedBusinessResult {
  // Core business data
  abn?: string;
  entityName: string;
  entityType: string;
  status: string;
  address: {
    stateCode?: string;
    postcode?: string;
    suburb?: string;
    streetAddress?: string;
    fullAddress?: string;
  };
  gst: boolean;
  dgr?: boolean;
  lat?: number;
  lng?: number;
  
  // Verification data
  abrVerified: boolean;
  supplyNationVerified: boolean;
  verificationSource: 'abr_only' | 'supply_nation_only' | 'both' | 'integrated';
  verificationConfidence: 'high' | 'medium' | 'low';
  
  // Supply Nation specific data
  profileUrl?: string;
  categories?: string[];
  description?: string;
  
  // Integration metadata
  lastVerified: Date;
  searchQuery: string;
}

export interface DynamicSearchResult {
  businesses: IntegratedBusinessResult[];
  totalResults: number;
  searchQuery: string;
  executionTime: number;
  dataSource: {
    abr: { found: number; processed: number };
    supplyNation: { found: number; processed: number; sessionActive: boolean };
  };
  timestamp: Date;
}

export class IntegratedDynamicSearch {
  private supplyNationSession: puppeteer.Browser | null = null;
  private sessionPage: puppeteer.Page | null = null;
  private sessionActive: boolean = false;
  private lastSessionActivity: number = 0;

  async searchBusinessesDynamically(query: string, options: {
    includeSupplyNation?: boolean;
    limit?: number;
    refreshSession?: boolean;
  } = {}): Promise<DynamicSearchResult> {
    const startTime = Date.now();
    const { includeSupplyNation = true, limit = 20, refreshSession = false } = options;
    
    const dataSource = {
      abr: { found: 0, processed: 0 },
      supplyNation: { found: 0, processed: 0, sessionActive: false }
    };

    try {
      // Phase 1: ABR Search (Always reliable and fast)
      const abrResults = await this.executeABRSearch(query, limit);
      dataSource.abr.found = abrResults.totalResults;
      dataSource.abr.processed = abrResults.businesses.length;

      let integratedBusinesses: IntegratedBusinessResult[] = abrResults.businesses.map(business => ({
        ...business,
        abrVerified: true,
        supplyNationVerified: false,
        verificationSource: 'abr_only' as const,
        verificationConfidence: 'high' as const,
        lastVerified: new Date(),
        searchQuery: query
      }));

      // Phase 2: Supply Nation Search (If requested and session available)
      if (includeSupplyNation) {
        try {
          const supplyNationResults = await this.executeSupplyNationSearch(query, refreshSession);
          dataSource.supplyNation = supplyNationResults.dataSource;

          if (supplyNationResults.businesses.length > 0) {
            // Integrate Supply Nation results
            const integratedSupplyNation = this.integrateSupplyNationResults(
              integratedBusinesses,
              supplyNationResults.businesses,
              query
            );
            integratedBusinesses = integratedSupplyNation;
          }
        } catch (supplyNationError) {
          console.log(`Supply Nation search skipped: ${supplyNationError instanceof Error ? supplyNationError.message : 'Unknown error'}`);
        }
      }

      return {
        businesses: integratedBusinesses,
        totalResults: integratedBusinesses.length,
        searchQuery: query,
        executionTime: Date.now() - startTime,
        dataSource,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Integrated search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeABRSearch(query: string, limit: number): Promise<{
    businesses: ABRBusinessDetails[];
    totalResults: number;
  }> {
    try {
      const abrResult = await searchBusinessesByName(query, { limit });
      return {
        businesses: abrResult.businesses,
        totalResults: abrResult.totalResults
      };
    } catch (error) {
      console.error('ABR search error:', error);
      return { businesses: [], totalResults: 0 };
    }
  }

  private async executeSupplyNationSearch(query: string, refreshSession: boolean): Promise<{
    businesses: any[];
    dataSource: { found: number; processed: number; sessionActive: boolean };
  }> {
    const dataSource = { found: 0, processed: 0, sessionActive: false };

    try {
      // Check if session needs refresh or establishment
      if (refreshSession || !this.sessionActive || (Date.now() - this.lastSessionActivity) > 300000) {
        await this.establishSupplyNationSession();
      }

      if (!this.sessionActive || !this.sessionPage) {
        return { businesses: [], dataSource };
      }

      dataSource.sessionActive = true;

      // Execute search in existing session
      const searchResults = await this.performSupplyNationSearch(query);
      dataSource.found = searchResults.length;
      dataSource.processed = searchResults.length;

      this.lastSessionActivity = Date.now();

      return {
        businesses: searchResults,
        dataSource
      };

    } catch (error) {
      console.error('Supply Nation search error:', error);
      await this.cleanupSupplyNationSession();
      return { businesses: [], dataSource };
    }
  }

  private async establishSupplyNationSession(): Promise<void> {
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;

    if (!username || !password) {
      throw new Error('Supply Nation credentials not configured');
    }

    try {
      // Cleanup existing session
      await this.cleanupSupplyNationSession();

      // Initialize new session
      this.supplyNationSession = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });

      this.sessionPage = await this.supplyNationSession.newPage();
      await this.sessionPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Login process with timeout
      await this.sessionPage.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 25000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Enter credentials
      const credentialsSet = await this.sessionPage.evaluate((usr, pwd) => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailField && passwordField) {
          emailField.value = usr;
          passwordField.value = pwd;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, username, password);

      if (!credentialsSet) {
        throw new Error('Failed to set credentials');
      }

      // Submit form
      await this.sessionPage.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
        if (submitButton) submitButton.click();
      });

      // Wait for authentication with timeout
      let authenticated = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUrl = await this.sessionPage.url();
        if (!currentUrl.includes('login')) {
          authenticated = true;
          break;
        }
      }

      if (authenticated) {
        // Navigate to search page
        try {
          await this.sessionPage.goto('https://ibd.supplynation.org.au/public/s/search-results', {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          this.sessionActive = true;
          this.lastSessionActivity = Date.now();
        } catch (navError) {
          throw new Error('Failed to navigate to search page');
        }
      } else {
        throw new Error('Authentication timeout');
      }

    } catch (error) {
      await this.cleanupSupplyNationSession();
      throw error;
    }
  }

  private async performSupplyNationSearch(query: string): Promise<any[]> {
    if (!this.sessionPage) {
      return [];
    }

    try {
      // Execute search
      const searchExecuted = await this.sessionPage.evaluate((searchQuery) => {
        const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;
        
        if (searchInput && searchInput.offsetHeight > 0) {
          searchInput.value = searchQuery;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          const form = searchInput.closest('form');
          if (form) {
            form.submit();
            return true;
          }
        }
        return false;
      }, query);

      if (!searchExecuted) {
        return [];
      }

      // Wait for results
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract results
      const businesses = await this.sessionPage.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        const results: any[] = [];

        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl) {
            const parentElement = link.closest('article, .result-item, .business-listing') || link.parentElement;
            const contextText = parentElement?.textContent || '';
            
            const abnMatch = contextText.match(/ABN:?\s*(\d{11})/i);
            const abn = abnMatch ? abnMatch[1] : undefined;
            
            const locationMatch = contextText.match(/([A-Z]{2,3})\s*(\d{4})/);
            const location = locationMatch ? `${locationMatch[1]} ${locationMatch[2]}` : undefined;

            results.push({
              entityName: companyName.trim(),
              abn,
              address: { fullAddress: location },
              profileUrl,
              categories: ['Indigenous Business'],
              source: 'supply_nation'
            });
          }
        });

        return results;
      });

      return businesses;

    } catch (error) {
      console.error('Supply Nation search execution error:', error);
      return [];
    }
  }

  private integrateSupplyNationResults(
    abrBusinesses: IntegratedBusinessResult[],
    supplyNationBusinesses: any[],
    query: string
  ): IntegratedBusinessResult[] {
    const integratedResults: IntegratedBusinessResult[] = [...abrBusinesses];

    supplyNationBusinesses.forEach(snBusiness => {
      // Try to match with existing ABR business
      const existingBusiness = integratedResults.find(abrBiz => 
        (snBusiness.abn && abrBiz.abn === snBusiness.abn) ||
        this.fuzzyMatchBusinessNames(abrBiz.entityName, snBusiness.entityName)
      );

      if (existingBusiness) {
        // Enhance existing business with Supply Nation data
        existingBusiness.supplyNationVerified = true;
        existingBusiness.verificationSource = 'both';
        existingBusiness.verificationConfidence = 'high';
        existingBusiness.profileUrl = snBusiness.profileUrl;
        existingBusiness.categories = snBusiness.categories;
        existingBusiness.description = snBusiness.description;
      } else {
        // Add new Supply Nation-only business
        integratedResults.push({
          abn: snBusiness.abn,
          entityName: snBusiness.entityName,
          entityType: 'Indigenous Business',
          status: 'Active',
          address: snBusiness.address || {},
          gst: false,
          abrVerified: false,
          supplyNationVerified: true,
          verificationSource: 'supply_nation_only',
          verificationConfidence: 'medium',
          profileUrl: snBusiness.profileUrl,
          categories: snBusiness.categories,
          description: snBusiness.description,
          lastVerified: new Date(),
          searchQuery: query
        });
      }
    });

    return integratedResults;
  }

  private fuzzyMatchBusinessNames(name1: string, name2: string): boolean {
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);
    
    return normalized1.includes(normalized2) || normalized2.includes(normalized1) ||
           this.calculateSimilarity(normalized1, normalized2) > 0.8;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || (word1.length > 3 && word2.includes(word1))) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  async cleanupSupplyNationSession(): Promise<void> {
    try {
      if (this.sessionPage) {
        await this.sessionPage.close();
        this.sessionPage = null;
      }
      if (this.supplyNationSession) {
        await this.supplyNationSession.close();
        this.supplyNationSession = null;
      }
      this.sessionActive = false;
      this.lastSessionActivity = 0;
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  getSessionStatus(): {
    active: boolean;
    lastActivity: number;
    uptime: number;
  } {
    return {
      active: this.sessionActive,
      lastActivity: this.lastSessionActivity,
      uptime: this.lastSessionActivity > 0 ? Date.now() - this.lastSessionActivity : 0
    };
  }
}

export const integratedDynamicSearch = new IntegratedDynamicSearch();