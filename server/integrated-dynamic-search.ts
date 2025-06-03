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

    // Cleanup existing session
    await this.cleanupSupplyNationSession();

    let browser = null;
    let page = null;

    try {
      // Initialize optimized browser session
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Extended timeouts for session establishment
      page.setDefaultTimeout(180000); // 3 minutes
      page.setDefaultNavigationTimeout(180000);

      // Navigate to login with extended waiting
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      // Progressive page stabilization
      await this.performProgressiveStabilization(page);

      // Enhanced credential input with multiple attempts
      const credentialsSet = await this.setCredentialsWithRetry(page, username, password);
      if (!credentialsSet) {
        throw new Error('Failed to set credentials after multiple attempts');
      }

      // Submit form with enhanced monitoring
      const formSubmitted = await this.submitFormWithMonitoring(page);
      if (!formSubmitted) {
        throw new Error('Failed to submit authentication form');
      }

      // Extended authentication monitoring
      const authResult = await this.monitorAuthenticationWithExtendedTimeout(page);
      if (!authResult.authenticated) {
        throw new Error(`Authentication failed: ${authResult.message}`);
      }

      // Validate and establish search session
      const searchReady = await this.validateSearchSession(page);
      if (!searchReady) {
        throw new Error('Search functionality not accessible after authentication');
      }

      // Session successfully established
      this.supplyNationSession = browser;
      this.sessionPage = page;
      this.sessionActive = true;
      this.lastSessionActivity = Date.now();

    } catch (error) {
      if (page) await page.close();
      if (browser) await browser.close();
      throw error;
    }
  }

  private async performProgressiveStabilization(page: puppeteer.Page): Promise<void> {
    const stabilizationPhases = [4000, 6000, 8000, 10000];
    
    for (const delay of stabilizationPhases) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const pageValidation = await page.evaluate(() => {
        return {
          documentReady: document.readyState === 'complete',
          formPresent: document.querySelector('form') !== null,
          emailField: document.querySelector('input[type="email"], input[type="text"]') !== null,
          passwordField: document.querySelector('input[type="password"]') !== null,
          submitButton: document.querySelector('button[type="submit"]') !== null,
          pageLoaded: document.body.innerText.length > 1000
        };
      });

      if (pageValidation.documentReady && 
          pageValidation.formPresent && 
          pageValidation.emailField && 
          pageValidation.passwordField && 
          pageValidation.submitButton &&
          pageValidation.pageLoaded) {
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Final stabilization
        return;
      }
    }
  }

  private async setCredentialsWithRetry(page: puppeteer.Page, username: string, password: string): Promise<boolean> {
    const maxAttempts = 12;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await page.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (!emailField || !passwordField) {
            return { success: false, issue: 'Fields not found' };
          }

          if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
            return { success: false, issue: 'Fields not visible' };
          }

          // Clear and set values with enhanced interaction
          emailField.value = '';
          passwordField.value = '';

          emailField.focus();
          emailField.click();
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));
          emailField.blur();

          setTimeout(() => {
            passwordField.focus();
            passwordField.click();
            passwordField.value = pwd;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.blur();
          }, 500);

          return {
            success: true,
            emailSet: emailField.value === usr,
            passwordSet: passwordField.value === pwd
          };
        }, username, password);

        if (result.success && result.emailSet && result.passwordSet) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Extended validation delay
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, 2500));
      } catch (error) {
        console.log(`Credential attempt ${attempt} error:`, error);
      }
    }

    return false;
  }

  private async submitFormWithMonitoring(page: puppeteer.Page): Promise<boolean> {
    const maxAttempts = 8;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const submitted = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          if (!submitButton) return { success: false, issue: 'Button not found' };
          if (submitButton.offsetHeight === 0) return { success: false, issue: 'Button not visible' };
          if (submitButton.hasAttribute('disabled')) return { success: false, issue: 'Button disabled' };

          submitButton.focus();
          submitButton.click();

          // Enhanced form submission
          const form = submitButton.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          }

          return { success: true };
        });

        if (submitted.success) {
          await new Promise(resolve => setTimeout(resolve, 6000)); // Extended processing delay
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`Form submission attempt ${attempt} error:`, error);
      }
    }

    return false;
  }

  private async monitorAuthenticationWithExtendedTimeout(page: puppeteer.Page): Promise<{
    authenticated: boolean;
    message: string;
  }> {
    const maxMonitoringTime = 120000; // 2 minutes
    const checkInterval = 4000; // 4 seconds
    const monitoringStart = Date.now();
    
    let previousUrl = await page.url();
    let redirectCount = 0;

    while ((Date.now() - monitoringStart) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      const currentUrl = await page.url();
      
      if (currentUrl !== previousUrl) {
        redirectCount++;
        previousUrl = currentUrl;
      }

      const authCheck = await page.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();
        
        const successIndicators = [
          !url.includes('login'),
          url.includes('Communities') || url.includes('communities'),
          url.includes('search-results') || url.includes('search'),
          content.includes('search'),
          content.includes('directory'),
          content.includes('logout'),
          document.querySelector('a[href*="logout"]') !== null,
          document.querySelector('.user-menu, .profile-menu') !== null
        ];

        const successCount = successIndicators.filter(Boolean).length;

        return {
          currentUrl: url,
          successCount,
          contentLength: content.length
        };
      });

      // Enhanced success threshold
      if (authCheck.successCount >= 5) {
        return {
          authenticated: true,
          message: `Authentication successful after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`
        };
      }

      // Progress logging every 30 seconds
      if ((Date.now() - monitoringStart) % 30000 === 0) {
        console.log(`Authentication monitoring: ${Math.floor((Date.now() - monitoringStart) / 1000)}s, ${authCheck.successCount} indicators, ${redirectCount} redirects`);
      }
    }

    return {
      authenticated: false,
      message: `Authentication monitoring timeout after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`
    };
  }

  private async validateSearchSession(page: puppeteer.Page): Promise<boolean> {
    try {
      // Navigate to search page if not already there
      const currentUrl = await page.url();
      if (!currentUrl.includes('search-results') && !currentUrl.includes('search')) {
        await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Validate search functionality
      const searchValidation = await page.evaluate(() => {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"]');
        const forms = document.querySelectorAll('form');
        const authElements = document.querySelectorAll('a[href*="logout"], .user-menu');
        
        return {
          searchInputs: searchInputs.length,
          accessibleInputs: Array.from(searchInputs).filter(input => (input as HTMLElement).offsetHeight > 0).length,
          forms: forms.length,
          authElements: authElements.length,
          hasDirectory: document.body.innerText.toLowerCase().includes('directory')
        };
      });

      return searchValidation.accessibleInputs > 0 && 
             searchValidation.authElements > 0 && 
             (searchValidation.hasDirectory || searchValidation.forms > 0);

    } catch (error) {
      console.log('Search session validation error:', error);
      return false;
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