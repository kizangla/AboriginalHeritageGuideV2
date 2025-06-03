/**
 * Supply Nation Playwright-based Scraper
 * Implementing advanced techniques from AdvancedWebScraper repository
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';

export interface PlaywrightSupplyNationBusiness {
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

export class SupplyNationPlaywrightScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private authenticated: boolean = false;
  private results: PlaywrightSupplyNationBusiness[] = [];

  async initialize(): Promise<boolean> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      this.page = await this.context.newPage();

      // Remove automation detection
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en-US', 'en'] });
      });

      return true;
    } catch (error) {
      console.error('Playwright scraper initialization failed:', (error as Error).message);
      return false;
    }
  }

  async authenticatePlaywright(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials required for Playwright authentication');
        return false;
      }

      console.log('Starting Playwright-based authentication...');

      // Navigate to login page with proper error handling
      await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait for page stability
      await this.page?.waitForTimeout(2000);

      // Check if already authenticated
      const currentUrl = this.page?.url();
      if (currentUrl && !currentUrl.includes('/login')) {
        console.log('Already authenticated');
        this.authenticated = true;
        return true;
      }

      // Wait for login form elements
      try {
        await this.page?.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
        await this.page?.waitForSelector('input[type="password"]', { timeout: 5000 });
      } catch (selectorError) {
        console.log('Login form elements not found within timeout');
        return false;
      }

      // Fill credentials with human-like behavior
      const usernameInput = this.page?.locator('input[type="email"], input[type="text"]').first();
      const passwordInput = this.page?.locator('input[type="password"]').first();

      if (usernameInput && passwordInput) {
        // Clear and fill username
        await usernameInput.click();
        await this.page?.waitForTimeout(300);
        await usernameInput.fill('');
        await usernameInput.type(username, { delay: 120 });

        await this.page?.waitForTimeout(500);

        // Clear and fill password
        await passwordInput.click();
        await this.page?.waitForTimeout(300);
        await passwordInput.fill('');
        await passwordInput.type(password, { delay: 120 });

        await this.page?.waitForTimeout(800);

        // Submit form
        const submitButton = this.page?.locator('button[type="submit"], input[type="submit"]').first();
        if (await submitButton?.isVisible()) {
          await submitButton.click();
        } else {
          await this.page?.keyboard.press('Enter');
        }

        // Wait for authentication response
        await this.page?.waitForTimeout(6000);

        // Check authentication success
        const finalUrl = this.page?.url();
        if (finalUrl && !finalUrl.includes('/login')) {
          this.authenticated = true;
          console.log('Playwright authentication successful');
          return true;
        } else {
          console.log('Playwright authentication failed - still on login page');
          return false;
        }
      }

      console.log('Login form inputs not accessible');
      return false;

    } catch (error) {
      console.error('Playwright authentication error:', (error as Error).message);
      return false;
    }
  }

  async searchPlaywrightBusinesses(query: string): Promise<PlaywrightSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const authSuccess = await this.authenticatePlaywright();
        if (!authSuccess) {
          console.log('Cannot search without Playwright authentication');
          return [];
        }
      }

      console.log(`Executing Playwright search for: ${query}`);

      // Navigate to search page
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      await this.page?.waitForTimeout(3000);

      // Execute search using Playwright locators
      const searchExecuted = await this.executePlaywrightSearch(query);
      
      if (searchExecuted) {
        await this.page?.waitForTimeout(4000);
        await this.extractPlaywrightResults();
        console.log(`Playwright search found ${this.results.length} businesses`);
        return this.results;
      }

      console.log('Playwright search execution failed');
      return [];

    } catch (error) {
      console.error('Playwright search error:', (error as Error).message);
      return [];
    }
  }

  private async executePlaywrightSearch(query: string): Promise<boolean> {
    try {
      // Multiple search input strategies using Playwright locators
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
          const searchInput = this.page?.locator(selector).first();
          
          if (await searchInput?.isVisible({ timeout: 2000 })) {
            // Clear and enter search query
            await searchInput.click();
            await this.page?.waitForTimeout(300);
            await searchInput.fill('');
            await searchInput.type(query, { delay: 150 });
            await this.page?.waitForTimeout(700);
            
            // Submit search
            await this.page?.keyboard.press('Enter');
            console.log(`Playwright search executed using: ${selector}`);
            return true;
          }
        } catch (selectorError) {
          continue;
        }
      }

      // Try submit button approach
      const searchButton = this.page?.locator('button[type="submit"], .search-button, [data-search-submit]').first();
      if (await searchButton?.isVisible({ timeout: 2000 })) {
        await searchButton.click();
        return true;
      }

      console.log('No search mechanism found with Playwright');
      return false;
    } catch (error) {
      console.error('Playwright search execution error:', (error as Error).message);
      return false;
    }
  }

  private async extractPlaywrightResults(): Promise<void> {
    try {
      this.results = [];

      // Use Playwright's powerful selector capabilities
      const businessSelectors = [
        '.business-result',
        '.search-result',
        '.supplier-listing',
        '.business-card',
        '.company-listing',
        'article',
        '.result-item',
        '.business-profile',
        '.supplier-card'
      ];

      for (const selector of businessSelectors) {
        const elements = this.page?.locator(selector);
        const count = await elements?.count() || 0;
        
        if (count > 0) {
          console.log(`Found ${count} elements with selector: ${selector}`);
          
          for (let i = 0; i < Math.min(count, 20); i++) {
            const element = elements?.nth(i);
            
            const business: PlaywrightSupplyNationBusiness = {
              companyName: '',
              abn: '',
              location: '',
              supplynationId: `pw_${Date.now()}_${i}`,
              profileUrl: '',
              verified: true,
              categories: [],
              contactInfo: {},
              description: ''
            };

            // Extract company name
            const nameSelectors = ['h1', 'h2', 'h3', 'h4', '.name', '.company-name', '.business-name', '.title'];
            for (const nameSelector of nameSelectors) {
              try {
                const nameElement = element?.locator(nameSelector).first();
                const nameText = await nameElement?.textContent({ timeout: 1000 });
                if (nameText?.trim()) {
                  business.companyName = nameText.trim();
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            // Extract location
            const locationSelectors = ['.location', '.address', '.suburb', '.state'];
            for (const locSelector of locationSelectors) {
              try {
                const locElement = element?.locator(locSelector).first();
                const locText = await locElement?.textContent({ timeout: 1000 });
                if (locText?.trim()) {
                  business.location = locText.trim();
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            // Extract description
            const descSelectors = ['.description', '.summary', 'p'];
            for (const descSelector of descSelectors) {
              try {
                const descElement = element?.locator(descSelector).first();
                const descText = await descElement?.textContent({ timeout: 1000 });
                if (descText?.trim()) {
                  business.description = descText.trim();
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            // Extract profile URL
            try {
              const linkElement = element?.locator('a[href]').first();
              const href = await linkElement?.getAttribute('href', { timeout: 1000 });
              if (href) {
                business.profileUrl = href.startsWith('http') ? href : `https://ibd.supplynation.org.au${href}`;
              }
            } catch (e) {
              // Continue without link
            }

            // Extract ABN and contact info from text content
            try {
              const elementText = await element?.textContent({ timeout: 1000 }) || '';
              
              // Extract ABN
              const abnMatch = elementText.match(/\b\d{11}\b/);
              if (abnMatch) {
                business.abn = abnMatch[0];
              }

              // Extract phone
              const phoneMatch = elementText.match(/\b(?:\+61[\s-]?)?\d{2,4}[\s-]?\d{4}[\s-]?\d{4}\b/);
              if (phoneMatch) {
                business.contactInfo.phone = phoneMatch[0];
              }

              // Extract email
              const emailMatch = elementText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
              if (emailMatch) {
                business.contactInfo.email = emailMatch[0];
              }
            } catch (e) {
              // Continue without text extraction
            }

            // Extract categories
            try {
              const categoryElements = element?.locator('.category, .tag, .service, .industry');
              const catCount = await categoryElements?.count() || 0;
              for (let j = 0; j < catCount; j++) {
                const catText = await categoryElements?.nth(j).textContent({ timeout: 500 });
                if (catText?.trim()) {
                  business.categories?.push(catText.trim());
                }
              }
            } catch (e) {
              // Continue without categories
            }

            if (business.companyName && business.companyName.length > 2) {
              this.results.push(business);
            }
          }
          break; // Found results, stop checking other selectors
        }
      }

    } catch (error) {
      console.error('Playwright result extraction error:', (error as Error).message);
    }
  }

  async closePlaywright(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.browser = null;
      this.context = null;
      this.page = null;
      this.authenticated = false;
      this.results = [];
    } catch (error) {
      console.error('Error closing Playwright scraper:', (error as Error).message);
    }
  }

  getPlaywrightStatus(): { 
    authenticated: boolean; 
    resultCount: number; 
    browserActive: boolean;
    contextActive: boolean;
  } {
    return {
      authenticated: this.authenticated,
      resultCount: this.results.length,
      browserActive: this.browser !== null,
      contextActive: this.context !== null
    };
  }
}

export const supplyNationPlaywrightScraper = new SupplyNationPlaywrightScraper();