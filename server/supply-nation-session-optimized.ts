/**
 * Supply Nation Session Optimized Integration
 * Persistent session management with timing optimization
 */

import puppeteer from 'puppeteer';

export interface SessionOptimizedResult {
  authenticated: boolean;
  businessVerified: boolean;
  sessionTime: number;
  businessDetails?: {
    name: string;
    abn?: string;
    location?: string;
    profileUrl: string;
    verified: boolean;
  };
  message: string;
}

export class SupplyNationSessionOptimized {
  
  async verifyBusinessWithPersistentSession(businessName: string): Promise<SessionOptimizedResult> {
    const startTime = Date.now();
    let browser = null;
    let page = null;

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        return {
          authenticated: false,
          businessVerified: false,
          sessionTime: 0,
          message: 'Supply Nation credentials required for verification'
        };
      }

      console.log('Initializing session-optimized authentication...');

      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

      // Step 1: Optimized login sequence
      console.log('Executing optimized login sequence...');
      
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle2',
        timeout: 20000
      });

      // Progressive page stabilization
      await this.waitForStabilization(page, [1500, 2500]);

      // Enhanced credential input with validation
      const credentialsSet = await page.evaluate((usr, pwd) => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailField && passwordField) {
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          
          passwordField.value = pwd;
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          
          return emailField.value === usr && passwordField.value === pwd;
        }
        return false;
      }, username, password);

      if (!credentialsSet) {
        await browser.close();
        return {
          authenticated: false,
          businessVerified: false,
          sessionTime: Date.now() - startTime,
          message: 'Failed to set credentials in login form'
        };
      }

      // Submit with enhanced timing
      await page.evaluate(() => {
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
        if (submitBtn) {
          submitBtn.click();
        }
      });

      console.log('Authentication submitted, monitoring session...');

      // Step 2: Session establishment monitoring
      const sessionResult = await this.monitorSessionEstablishment(page);

      if (!sessionResult.success) {
        await browser.close();
        return {
          authenticated: false,
          businessVerified: false,
          sessionTime: Date.now() - startTime,
          message: sessionResult.message
        };
      }

      console.log('Session established, accessing search functionality...');

      // Step 3: Direct search execution
      const searchResult = await this.executeDirectSearch(page, businessName);

      await browser.close();

      if (searchResult.businessFound) {
        return {
          authenticated: true,
          businessVerified: true,
          sessionTime: Date.now() - startTime,
          businessDetails: searchResult.businessDetails,
          message: `${searchResult.businessDetails?.name} verified as Indigenous business in ${Date.now() - startTime}ms`
        };
      } else {
        return {
          authenticated: true,
          businessVerified: false,
          sessionTime: Date.now() - startTime,
          message: `${businessName} not found in Supply Nation directory`
        };
      }

    } catch (error) {
      if (browser) await browser.close();
      return {
        authenticated: false,
        businessVerified: false,
        sessionTime: Date.now() - startTime,
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async waitForStabilization(page: puppeteer.Page, delays: number[]): Promise<void> {
    for (const delay of delays) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const isReady = await page.evaluate(() => {
        return document.readyState === 'complete' && 
               document.querySelector('input[type="email"], input[type="text"]') !== null &&
               document.querySelector('input[type="password"]') !== null;
      });

      if (isReady) {
        console.log(`Page stabilized after ${delay}ms`);
        return;
      }
    }
  }

  private async monitorSessionEstablishment(page: puppeteer.Page): Promise<{
    success: boolean;
    message: string;
  }> {
    const maxMonitorTime = 15000; // 15 seconds
    const checkInterval = 2000; // 2 seconds
    const startTime = Date.now();
    
    let currentUrl = await page.url();
    console.log(`Starting session monitoring from: ${currentUrl}`);

    while ((Date.now() - startTime) < maxMonitorTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      const newUrl = await page.url();
      if (newUrl !== currentUrl) {
        currentUrl = newUrl;
        console.log(`Session redirect detected: ${currentUrl}`);
      }

      // Check for successful authentication indicators
      if (currentUrl.includes('CommunitiesLanding') || 
          currentUrl.includes('search-results') ||
          (currentUrl.includes('supplynation.org.au') && !currentUrl.includes('login'))) {
        
        console.log('Authentication session established successfully');
        return {
          success: true,
          message: 'Session establishment completed'
        };
      }

      // Check for persistent login page (authentication failure)
      if (currentUrl.includes('login') && (Date.now() - startTime) > 8000) {
        const hasErrors = await page.evaluate(() => {
          return document.querySelector('.error, .alert-danger, .slds-has-error') !== null;
        });

        if (hasErrors) {
          return {
            success: false,
            message: 'Authentication failed - error detected on login page'
          };
        }
      }
    }

    return {
      success: false,
      message: 'Session establishment timeout - authentication incomplete'
    };
  }

  private async executeDirectSearch(page: puppeteer.Page, businessName: string): Promise<{
    businessFound: boolean;
    businessDetails?: {
      name: string;
      abn?: string;
      location?: string;
      profileUrl: string;
      verified: boolean;
    };
  }> {
    try {
      // Navigate to search if not already there
      const currentUrl = await page.url();
      if (!currentUrl.includes('search-results')) {
        console.log('Navigating to search results page...');
        await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 12000
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`Executing search for: ${businessName}`);

      // Execute search with enhanced reliability
      const searchExecuted = await page.evaluate((query) => {
        const searchSelectors = [
          'input[type="search"]',
          'input[name*="search"]',
          'input[placeholder*="search" i]'
        ];

        for (const selector of searchSelectors) {
          const searchInput = document.querySelector(selector) as HTMLInputElement;
          if (searchInput && searchInput.offsetHeight > 0) {
            searchInput.focus();
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Submit search
            const form = searchInput.closest('form');
            if (form) {
              form.submit();
              return true;
            }

            // Alternative: Enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            searchInput.dispatchEvent(enterEvent);
            return true;
          }
        }
        return false;
      }, businessName);

      if (!searchExecuted) {
        console.log('Search input not accessible');
        return { businessFound: false };
      }

      // Wait for search results
      console.log('Waiting for search results...');
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Extract business results with enhanced matching
      const searchResults = await page.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        const businesses: any[] = [];

        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl) {
            // Extract additional details from surrounding elements
            const parentElement = link.closest('article, .result-item, .business-listing') || link.parentElement;
            const contextText = parentElement?.textContent || '';
            
            // Look for ABN
            const abnMatch = contextText.match(/ABN:?\s*(\d{11})/i);
            const abn = abnMatch ? abnMatch[1] : undefined;
            
            // Look for location
            const locationMatch = contextText.match(/([A-Z]{2,3})\s*(\d{4})/);
            const location = locationMatch ? `${locationMatch[1]} ${locationMatch[2]}` : undefined;

            businesses.push({
              name: companyName.trim(),
              abn,
              location,
              profileUrl,
              verified: true
            });
          }
        });

        return businesses;
      });

      console.log(`Found ${searchResults.length} businesses in search results`);

      // Find matching business with enhanced matching logic
      const matchingBusiness = this.findBestMatch(searchResults, businessName);

      if (matchingBusiness) {
        console.log(`Found matching business: ${matchingBusiness.name}`);
        return {
          businessFound: true,
          businessDetails: matchingBusiness
        };
      } else {
        console.log('No matching business found in search results');
        return { businessFound: false };
      }

    } catch (error) {
      console.log(`Search execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { businessFound: false };
    }
  }

  private findBestMatch(businesses: any[], searchTerm: string): any {
    const normalizedSearch = searchTerm.toLowerCase();
    
    // Direct name match
    let match = businesses.find(business => 
      business.name.toLowerCase().includes(normalizedSearch) ||
      normalizedSearch.includes(business.name.toLowerCase())
    );

    if (match) return match;

    // Word-based matching for compound business names
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 2);
    
    match = businesses.find(business => {
      const businessWords = business.name.toLowerCase().split(/\s+/);
      return searchWords.some(searchWord => 
        businessWords.some(businessWord => 
          businessWord.includes(searchWord) || searchWord.includes(businessWord)
        )
      );
    });

    return match;
  }
}

export const supplyNationSessionOptimized = new SupplyNationSessionOptimized();