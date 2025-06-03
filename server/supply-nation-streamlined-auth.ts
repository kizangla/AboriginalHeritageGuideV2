/**
 * Streamlined Supply Nation Authentication
 * Focused approach for establishing authenticated connection
 */

import puppeteer from 'puppeteer';

export interface StreamlinedSupplyNationBusiness {
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

export class SupplyNationStreamlinedAuth {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authenticated: boolean = false;

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
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      return true;
    } catch (error) {
      console.error('Initialization failed:', (error as Error).message);
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials required');
        return false;
      }

      console.log('Accessing Supply Nation login...');
      
      await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle2',
        timeout: 20000
      });

      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Fill credentials
      const emailInput = await this.page?.$('input[type="email"], input[type="text"]');
      if (emailInput) {
        await emailInput.type(username);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const passwordInput = await this.page?.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.type(password);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Submit
      await this.page?.keyboard.press('Enter');

      // Wait for authentication
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if authenticated
      const currentUrl = this.page?.url();
      if (currentUrl && !currentUrl.includes('/login')) {
        this.authenticated = true;
        console.log('Authentication successful');
        return true;
      }

      console.log('Authentication verification needed');
      return false;

    } catch (error) {
      console.error('Authentication error:', (error as Error).message);
      return false;
    }
  }

  async searchBusinesses(query: string): Promise<StreamlinedSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          return [];
        }
      }

      console.log(`Searching Supply Nation for: ${query}`);

      // Navigate to search
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Execute search
      const searchInput = await this.page?.$('input[type="search"], input[name*="search"]');
      if (searchInput) {
        await searchInput.type(query);
        await this.page?.keyboard.press('Enter');
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extract results
        const businesses = await this.page?.evaluate(() => {
          const results: any[] = [];
          
          const elements = document.querySelectorAll('.result, .business-card, .listing, article');
          
          elements.forEach((element, index) => {
            if (index < 10) {
              const nameEl = element.querySelector('h1, h2, h3, .name, .title');
              const name = nameEl?.textContent?.trim();
              
              if (name) {
                const business: any = {
                  companyName: name,
                  supplynationId: `sn_${Date.now()}_${index}`,
                  verified: true,
                  categories: []
                };

                // Extract additional data
                const locationEl = element.querySelector('.location, .address');
                if (locationEl) {
                  business.location = locationEl.textContent?.trim();
                }

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

                results.push(business);
              }
            }
          });

          return results;
        }) || [];

        console.log(`Found ${businesses.length} businesses in Supply Nation`);
        return businesses;
      }

      return [];

    } catch (error) {
      console.error('Search error:', (error as Error).message);
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
      }
    } catch (error) {
      console.error('Close error:', (error as Error).message);
    }
  }

  getStatus(): { authenticated: boolean; ready: boolean } {
    return {
      authenticated: this.authenticated,
      ready: this.browser !== null
    };
  }
}

export const supplyNationStreamlinedAuth = new SupplyNationStreamlinedAuth();