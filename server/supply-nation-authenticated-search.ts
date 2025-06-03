/**
 * Authenticated Supply Nation Search Service
 * Direct business search with credential-based authentication
 */

import puppeteer from 'puppeteer';

export interface AuthenticatedBusinessResult {
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

export class SupplyNationAuthenticatedSearch {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private isAuthenticated: boolean = false;

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
      
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      });

      await this.page.setViewport({ width: 1920, height: 1080 });
      return true;
    } catch (error) {
      console.error('Authentication search initialization failed:', (error as Error).message);
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials not available');
        return false;
      }

      console.log('Navigating to Supply Nation login...');
      await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for login form to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fill credentials
      const emailInput = await this.page?.$('input[type="email"], input[name*="email"], input[name*="username"]');
      const passwordInput = await this.page?.$('input[type="password"]');

      if (emailInput && passwordInput) {
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(username);
        
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(password);

        // Submit form
        const submitButton = await this.page?.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          
          // Wait for authentication response
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check if authentication succeeded
          const currentUrl = this.page?.url();
          if (currentUrl && !currentUrl.includes('/login')) {
            console.log('Authentication successful');
            this.isAuthenticated = true;
            return true;
          }
        }
      }

      console.log('Authentication failed');
      return false;
    } catch (error) {
      console.error('Authentication error:', (error as Error).message);
      return false;
    }
  }

  async searchBusiness(query: string): Promise<AuthenticatedBusinessResult[]> {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          console.log('Cannot search without authentication');
          return [];
        }
      }

      console.log(`Searching for business: ${query}`);
      
      // Navigate to authenticated search interface
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Look for search functionality
      const searchInput = await this.page?.$('input[type="search"], input[name*="search"], .search-input');
      
      if (searchInput) {
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(query);
        await this.page?.keyboard.press('Enter');
        
        // Wait for search results
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Extract business results
        const businesses = await this.page?.evaluate(() => {
          const results: any[] = [];
          
          // Look for business listings in authenticated interface
          const businessElements = document.querySelectorAll([
            '.business-listing',
            '.search-result',
            '.supplier-card',
            '.business-card',
            'article',
            '.result-item'
          ].join(', '));

          businessElements.forEach((element, index) => {
            if (index < 20) { // Process up to 20 results
              const business: any = {
                companyName: '',
                abn: '',
                location: '',
                supplynationId: `auth_${Date.now()}_${index}`,
                profileUrl: '',
                verified: true,
                categories: [],
                contactInfo: {},
                description: '',
                tradingName: '',
                detailedAddress: ''
              };

              // Extract company name
              const nameElement = element.querySelector('h1, h2, h3, .name, .company-name, .business-name');
              if (nameElement) {
                business.companyName = nameElement.textContent?.trim() || '';
              }

              // Extract location
              const locationElement = element.querySelector('.location, .address, .suburb');
              if (locationElement) {
                business.location = locationElement.textContent?.trim() || '';
              }

              // Extract description
              const descElement = element.querySelector('.description, .summary, p');
              if (descElement) {
                business.description = descElement.textContent?.trim() || '';
              }

              // Extract profile link
              const linkElement = element.querySelector('a[href]');
              if (linkElement) {
                business.profileUrl = (linkElement as HTMLAnchorElement).href;
              }

              // Extract ABN if present
              const text = element.textContent || '';
              const abnMatch = text.match(/\b\d{11}\b/);
              if (abnMatch) {
                business.abn = abnMatch[0];
              }

              // Extract categories
              const categoryElements = element.querySelectorAll('.category, .tag, .service');
              categoryElements.forEach(cat => {
                const categoryText = cat.textContent?.trim();
                if (categoryText) {
                  business.categories.push(categoryText);
                }
              });

              if (business.companyName) {
                results.push(business);
              }
            }
          });

          return results;
        }) || [];

        console.log(`Found ${businesses.length} businesses in authenticated search`);
        return businesses;
      }

      console.log('No search interface found in authenticated area');
      return [];

    } catch (error) {
      console.error('Business search failed:', (error as Error).message);
      return [];
    }
  }

  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.isAuthenticated = false;
      }
    } catch (error) {
      console.error('Error closing browser:', (error as Error).message);
    }
  }
}

export const supplyNationAuthenticatedSearch = new SupplyNationAuthenticatedSearch();