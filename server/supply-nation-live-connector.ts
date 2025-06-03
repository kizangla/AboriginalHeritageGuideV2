/**
 * Supply Nation Live Connector
 * Establishes authenticated connection to retrieve live Indigenous business data
 */

import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

export interface LiveSupplyNationBusiness {
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
  tradingName?: string;
  detailedAddress?: string;
}

export class SupplyNationLiveConnector {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authenticated: boolean = false;
  private sessionCookies: string = '';

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
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      return true;
    } catch (error) {
      console.error('Live connector initialization failed:', (error as Error).message);
      return false;
    }
  }

  async establishConnection(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials not available for live connection');
        return false;
      }

      console.log('Establishing Supply Nation live connection...');
      
      // Navigate to login page
      await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle2',
        timeout: 20000
      });

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Find and fill login form
      const usernameInput = await this.page?.$('input[type="email"], input[name*="email"], input[name*="username"]');
      const passwordInput = await this.page?.$('input[type="password"]');

      if (!usernameInput || !passwordInput) {
        console.log('Login form elements not found');
        return false;
      }

      // Clear and fill credentials
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type(username, { delay: 50 });
      
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(password, { delay: 50 });

      // Submit login
      await this.page?.keyboard.press('Enter');
      
      // Wait for authentication response
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check authentication success
      const currentUrl = this.page?.url();
      const isAuthenticated = currentUrl && !currentUrl.includes('/login');
      
      if (isAuthenticated) {
        // Capture session cookies
        const cookies = await this.page?.cookies();
        this.sessionCookies = cookies?.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') || '';
        this.authenticated = true;
        
        console.log('Supply Nation connection established successfully');
        return true;
      }

      console.log('Supply Nation connection failed - authentication unsuccessful');
      return false;
    } catch (error) {
      console.error('Connection establishment error:', (error as Error).message);
      return false;
    }
  }

  async searchLiveBusinesses(query: string): Promise<LiveSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const connected = await this.establishConnection();
        if (!connected) {
          console.log('Cannot search without authenticated connection');
          return [];
        }
      }

      console.log(`Searching live Supply Nation data for: ${query}`);

      // Navigate to search interface
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      // Perform search
      const searchSuccess = await this.performSearch(query);
      
      if (searchSuccess) {
        const businesses = await this.extractBusinessData();
        console.log(`Retrieved ${businesses.length} businesses from live Supply Nation search`);
        return businesses;
      }

      console.log('Live search execution failed');
      return [];

    } catch (error) {
      console.error('Live business search failed:', (error as Error).message);
      return [];
    }
  }

  private async performSearch(query: string): Promise<boolean> {
    try {
      // Look for search input
      const searchSelectors = [
        'input[type="search"]',
        'input[name*="search"]',
        'input[placeholder*="search" i]',
        '.search-input',
        '#search'
      ];

      for (const selector of searchSelectors) {
        try {
          await this.page?.waitForSelector(selector, { timeout: 2000 });
          
          // Clear and enter search term
          await this.page?.click(selector, { clickCount: 3 });
          await this.page?.type(selector, query, { delay: 100 });
          
          // Submit search
          await this.page?.keyboard.press('Enter');
          
          // Wait for results to load
          await new Promise(resolve => setTimeout(resolve, 4000));
          
          console.log(`Search performed using selector: ${selector}`);
          return true;
        } catch (selectorError) {
          continue;
        }
      }

      console.log('No search input found on page');
      return false;
    } catch (error) {
      console.error('Search execution error:', (error as Error).message);
      return false;
    }
  }

  private async extractBusinessData(): Promise<LiveSupplyNationBusiness[]> {
    try {
      const businesses = await this.page?.evaluate(() => {
        const results: any[] = [];
        
        // Multiple selectors for business listings
        const businessSelectors = [
          '.business-listing',
          '.search-result',
          '.supplier-card',
          '.business-card',
          'article',
          '.result-item',
          '.company-profile'
        ];

        for (const selector of businessSelectors) {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length > 0) {
            elements.forEach((element, index) => {
              if (index < 15) { // Limit to 15 results
                const business: any = {
                  companyName: '',
                  abn: '',
                  location: '',
                  supplynationId: `live_${Date.now()}_${index}`,
                  profileUrl: '',
                  verified: true,
                  categories: [],
                  contactInfo: {},
                  description: '',
                  tradingName: '',
                  detailedAddress: ''
                };

                // Extract company name
                const nameSelectors = ['h1', 'h2', 'h3', '.name', '.company-name', '.business-name', '.title'];
                for (const nameSelector of nameSelectors) {
                  const nameEl = element.querySelector(nameSelector);
                  if (nameEl?.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                // Extract location
                const locationSelectors = ['.location', '.address', '.suburb', '.state', '[data-location]'];
                for (const locSelector of locationSelectors) {
                  const locEl = element.querySelector(locSelector);
                  if (locEl?.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                // Extract description
                const descSelectors = ['.description', '.summary', 'p', '.content'];
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

                // Extract ABN if present
                const text = element.textContent || '';
                const abnMatch = text.match(/\b\d{11}\b/);
                if (abnMatch) {
                  business.abn = abnMatch[0];
                }

                // Extract contact information
                const phoneMatch = text.match(/\b\d{2,4}[\s-]?\d{4}[\s-]?\d{4}\b/);
                if (phoneMatch) {
                  business.contactInfo.phone = phoneMatch[0];
                }

                const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) {
                  business.contactInfo.email = emailMatch[0];
                }

                // Extract categories/services
                const categoryElements = element.querySelectorAll('.category, .tag, .service, .industry');
                categoryElements.forEach(cat => {
                  const categoryText = cat.textContent?.trim();
                  if (categoryText) {
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
      console.error('Business data extraction failed:', (error as Error).message);
      return [];
    }
  }

  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.authenticated = false;
        this.sessionCookies = '';
      }
    } catch (error) {
      console.error('Error closing live connector:', (error as Error).message);
    }
  }

  getConnectionStatus(): { connected: boolean; authenticated: boolean; hasCookies: boolean } {
    return {
      connected: this.browser !== null,
      authenticated: this.authenticated,
      hasCookies: this.sessionCookies.length > 0
    };
  }
}

export const supplyNationLiveConnector = new SupplyNationLiveConnector();