/**
 * Optimized Supply Nation Authentication System
 * Handles specific authentication flow and session management
 */

import puppeteer from 'puppeteer';

export interface OptimizedSupplyNationBusiness {
  companyName: string;
  abn?: string;
  location?: string;
  supplynationId: string;
  profileUrl?: string;
  verified: boolean;
  categories?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  description?: string;
}

export class SupplyNationOptimizedAuth {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authenticated: boolean = false;
  private authRetries: number = 0;
  private maxRetries: number = 3;

  async initialize(): Promise<boolean> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set realistic viewport and headers
      await this.page.setViewport({ width: 1366, height: 768 });
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
      });

      // Remove automation detection
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en-US', 'en'] });
      });

      return true;
    } catch (error) {
      console.error('Optimized auth initialization failed:', (error as Error).message);
      return false;
    }
  }

  async authenticateOptimized(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials not available');
        return false;
      }

      console.log('Starting optimized Supply Nation authentication...');

      // Navigate to login page with realistic timing
      await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      // Wait for page to stabilize
      await this.waitWithRandomDelay(2000, 3000);

      // Check if already logged in
      const currentUrl = this.page?.url();
      if (currentUrl && !currentUrl.includes('/login')) {
        console.log('Already authenticated');
        this.authenticated = true;
        return true;
      }

      // Wait for login form elements
      await this.page?.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
      await this.page?.waitForSelector('input[type="password"]', { timeout: 10000 });

      // Human-like interaction delays
      await this.waitWithRandomDelay(1000, 2000);

      // Find and fill username field
      const usernameField = await this.page?.$('input[type="email"], input[type="text"]');
      if (usernameField) {
        await usernameField.click();
        await this.waitWithRandomDelay(200, 500);
        await usernameField.type(username, { delay: this.getRandomDelay(50, 150) });
      }

      await this.waitWithRandomDelay(500, 1000);

      // Find and fill password field
      const passwordField = await this.page?.$('input[type="password"]');
      if (passwordField) {
        await passwordField.click();
        await this.waitWithRandomDelay(200, 500);
        await passwordField.type(password, { delay: this.getRandomDelay(50, 150) });
      }

      await this.waitWithRandomDelay(1000, 1500);

      // Submit the form
      const submitButton = await this.page?.$('button[type="submit"], input[type="submit"], .login-button');
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try pressing Enter as fallback
        await this.page?.keyboard.press('Enter');
      }

      // Wait for authentication response with timeout handling
      const authResult = await Promise.race([
        this.waitForAuthenticationSuccess(),
        this.createTimeout(15000)
      ]);

      if (authResult === 'success') {
        console.log('Optimized authentication successful');
        this.authenticated = true;
        return true;
      } else if (authResult === 'timeout') {
        console.log('Authentication timed out');
        return await this.retryAuthentication();
      } else {
        console.log('Authentication failed');
        return await this.retryAuthentication();
      }

    } catch (error) {
      console.error('Optimized authentication error:', (error as Error).message);
      return await this.retryAuthentication();
    }
  }

  private async waitForAuthenticationSuccess(): Promise<string> {
    try {
      // Wait for navigation away from login page
      await this.page?.waitForFunction(
        () => !window.location.href.includes('/login'),
        { timeout: 10000 }
      );
      return 'success';
    } catch (error) {
      // Check for error messages or other indicators
      const hasError = await this.page?.evaluate(() => {
        const errorSelectors = ['.error', '.alert', '.message', '[role="alert"]'];
        return errorSelectors.some(selector => document.querySelector(selector));
      });

      return hasError ? 'error' : 'unknown';
    }
  }

  private async retryAuthentication(): Promise<boolean> {
    this.authRetries++;
    
    if (this.authRetries < this.maxRetries) {
      console.log(`Retrying authentication (attempt ${this.authRetries + 1}/${this.maxRetries})`);
      await this.waitWithRandomDelay(2000, 4000);
      return await this.authenticateOptimized();
    }
    
    console.log('Maximum authentication retries reached');
    return false;
  }

  private createTimeout(ms: number): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => resolve('timeout'), ms);
    });
  }

  async searchOptimizedBusinesses(query: string): Promise<OptimizedSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const authSuccess = await this.authenticateOptimized();
        if (!authSuccess) {
          console.log('Cannot search without authentication');
          return [];
        }
      }

      console.log(`Performing optimized search for: ${query}`);

      // Navigate to search page
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await this.waitWithRandomDelay(2000, 3000);

      // Perform search with human-like behavior
      const searchExecuted = await this.executeOptimizedSearch(query);
      
      if (searchExecuted) {
        await this.waitWithRandomDelay(3000, 5000);
        const businesses = await this.extractOptimizedResults();
        console.log(`Optimized search found ${businesses.length} businesses`);
        return businesses;
      }

      console.log('Optimized search execution failed');
      return [];

    } catch (error) {
      console.error('Optimized search failed:', (error as Error).message);
      return [];
    }
  }

  private async executeOptimizedSearch(query: string): Promise<boolean> {
    try {
      // Look for search input with multiple strategies
      const searchSelectors = [
        'input[type="search"]',
        'input[name*="search"]',
        'input[placeholder*="search" i]',
        'input[placeholder*="business" i]',
        '.search-input',
        '#search',
        '[data-search]'
      ];

      for (const selector of searchSelectors) {
        try {
          const element = await this.page?.$(selector);
          if (element) {
            // Clear existing content
            await element.click({ clickCount: 3 });
            await this.waitWithRandomDelay(200, 400);
            
            // Type search query with human-like timing
            await element.type(query, { delay: this.getRandomDelay(80, 200) });
            await this.waitWithRandomDelay(500, 1000);
            
            // Submit search
            await this.page?.keyboard.press('Enter');
            console.log(`Search executed using: ${selector}`);
            return true;
          }
        } catch (selectorError) {
          continue;
        }
      }

      // Try alternative search methods
      const searchButton = await this.page?.$('button[type="submit"], .search-button, [data-search-submit]');
      if (searchButton) {
        await searchButton.click();
        return true;
      }

      console.log('No search mechanism found');
      return false;
    } catch (error) {
      console.error('Search execution error:', (error as Error).message);
      return false;
    }
  }

  private async extractOptimizedResults(): Promise<OptimizedSupplyNationBusiness[]> {
    try {
      const businesses = await this.page?.evaluate(() => {
        const results: any[] = [];
        
        // Comprehensive selectors for business results
        const businessSelectors = [
          '.business-result',
          '.search-result',
          '.supplier-listing',
          '.business-card',
          '.company-listing',
          'article[data-business]',
          '.result-item',
          '[data-testid*="business"]',
          '.business-profile-card'
        ];

        for (const selector of businessSelectors) {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length > 0) {
            elements.forEach((element, index) => {
              if (index < 20) { // Process up to 20 results
                const business: any = {
                  companyName: '',
                  abn: '',
                  location: '',
                  supplynationId: `opt_${Date.now()}_${index}`,
                  profileUrl: '',
                  verified: true,
                  categories: [],
                  contactInfo: {},
                  description: ''
                };

                // Extract company name with multiple strategies
                const nameSelectors = [
                  'h1', 'h2', 'h3', 'h4',
                  '.business-name', '.company-name', '.name', '.title',
                  '[data-testid*="name"]', '[data-business-name]'
                ];

                for (const nameSelector of nameSelectors) {
                  const nameEl = element.querySelector(nameSelector);
                  if (nameEl?.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                // Extract location information
                const locationSelectors = [
                  '.location', '.address', '.suburb', '.state', '.postcode',
                  '[data-location]', '[data-address]', '.business-location'
                ];

                for (const locSelector of locationSelectors) {
                  const locEl = element.querySelector(locSelector);
                  if (locEl?.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                // Extract description
                const descSelectors = [
                  '.description', '.summary', '.business-description',
                  'p', '.content', '.details', '[data-description]'
                ];

                for (const descSelector of descSelectors) {
                  const descEl = element.querySelector(descSelector);
                  if (descEl?.textContent?.trim()) {
                    business.description = descEl.textContent.trim();
                    break;
                  }
                }

                // Extract profile URL
                const linkEl = element.querySelector('a[href]');
                if (linkEl) {
                  business.profileUrl = (linkEl as HTMLAnchorElement).href;
                }

                // Extract ABN from text content
                const text = element.textContent || '';
                const abnMatch = text.match(/\b\d{11}\b/);
                if (abnMatch) {
                  business.abn = abnMatch[0];
                }

                // Extract contact information
                const phoneMatch = text.match(/\b(?:\+61[\s-]?)?(?:\(0\d\)[\s-]?|\d{2}[\s-]?)\d{4}[\s-]?\d{4}\b/);
                if (phoneMatch) {
                  business.contactInfo.phone = phoneMatch[0];
                }

                const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) {
                  business.contactInfo.email = emailMatch[0];
                }

                // Extract categories/services
                const categoryElements = element.querySelectorAll('.category, .tag, .service, .industry, .sector');
                categoryElements.forEach(cat => {
                  const categoryText = cat.textContent?.trim();
                  if (categoryText && categoryText.length > 2) {
                    business.categories.push(categoryText);
                  }
                });

                if (business.companyName && business.companyName.length > 2) {
                  results.push(business);
                }
              }
            });
            break; // Found results, stop checking other selectors
          }
        }

        return results;
      }) || [];

      return businesses;
    } catch (error) {
      console.error('Result extraction error:', (error as Error).message);
      return [];
    }
  }

  private async waitWithRandomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.authenticated = false;
        this.authRetries = 0;
      }
    } catch (error) {
      console.error('Error closing optimized auth:', (error as Error).message);
    }
  }

  getAuthStatus(): { authenticated: boolean; retries: number; maxRetries: number } {
    return {
      authenticated: this.authenticated,
      retries: this.authRetries,
      maxRetries: this.maxRetries
    };
  }
}

export const supplyNationOptimizedAuth = new SupplyNationOptimizedAuth();