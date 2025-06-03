import { Cluster } from 'puppeteer-cluster';
import type { Page } from 'puppeteer';

export interface SupplyNationBusiness {
  abn?: string;
  companyName: string;
  verified: boolean;
  categories: string[];
  location: string;
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
    contactPerson?: string;
  };
  description?: string;
  supplynationId: string;
  capabilities?: string[];
  certifications?: string[];
  tradingName?: string;
  detailedAddress?: {
    streetAddress?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
  };
  acn?: string;
  lastUpdated?: string;
}

export interface ScrapingResult {
  businesses: SupplyNationBusiness[];
  totalResults: number;
  searchQuery: string;
  timestamp: Date;
}

class SupplyNationScraper {
  private cluster: Cluster | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 2,
        puppeteerOptions: {
          executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ]
        },
        timeout: 60000
      });

      this.isInitialized = true;
      console.log('Supply Nation scraper cluster initialized');
    } catch (error) {
      console.error('Failed to initialize Supply Nation scraper:', error);
      throw error;
    }
  }

  private async handleAuthentication(page: Page): Promise<void> {
    try {
      const currentUrl = page.url();
      
      if (currentUrl.includes('login') || currentUrl.includes('frontdoor')) {
        console.log('Handling Supply Nation authentication...');
        
        await page.waitForSelector('input[type="email"], input[name="username"]', { timeout: 10000 });
        
        const username = process.env.SUPPLY_NATION_USERNAME;
        const password = process.env.SUPPLY_NATION_PASSWORD;
        
        if (!username || !password) {
          throw new Error('Supply Nation credentials not provided');
        }
        
        await page.type('input[type="email"], input[name="username"]', username);
        await page.type('input[type="password"], input[name="password"]', password);
        
        await page.click('input[type="submit"], button[type="submit"]');
        
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        
        console.log('Authentication completed');
      }
    } catch (authError) {
      console.error('Authentication failed:', String(authError));
      throw authError;
    }
  }

  async searchBusinesses(query: string, location?: string): Promise<ScrapingResult> {
    if (!this.cluster) {
      throw new Error('Scraper not initialized');
    }

    try {
      console.log(`Searching Supply Nation for: "${query}" in location: ${location || 'all'}`);
      
      const businesses: SupplyNationBusiness[] = [];
      
      const result = await this.cluster.execute(async ({ page }: any) => {
        const extractedBusinesses: SupplyNationBusiness[] = [];
        const searchQuery = query; // Use the outer scope query variable
        
        try {
          // Navigate to Supply Nation search
          await page.goto('https://ibd.supplynation.org.au/public/s/search-results', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
          });
          
          // Handle the complete authentication flow with redirects
          const currentUrl = page.url();
          if (currentUrl.includes('login') || currentUrl.includes('frontdoor') || currentUrl.includes('auth')) {
            console.log('Authentication required, handling login flow...');
            
            const username = process.env.SUPPLY_NATION_USERNAME;
            const password = process.env.SUPPLY_NATION_PASSWORD;
            
            if (username && password) {
              // Navigate to login page first
              await page.goto('https://ibd.supplynation.org.au/public/s/login', { waitUntil: 'networkidle0' });
              
              // Fill login form
              await page.waitForSelector('input[type="email"], input[name="username"]', { timeout: 10000 });
              await page.type('input[type="email"], input[name="username"]', username);
              await page.type('input[type="password"], input[name="password"]', password);
              
              // Submit and handle redirects
              await page.click('input[type="submit"], button[type="submit"]');
              
              // Wait for the redirect sequence: login → frontdoor.jsp → CommunitiesLanding → homepage
              let redirectCount = 0;
              while (redirectCount < 5) {
                await page.waitForTimeout(2000);
                const url = page.url();
                console.log(`Redirect ${redirectCount + 1}: ${url}`);
                
                if (url.includes('frontdoor.jsp')) {
                  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
                } else if (url.includes('CommunitiesLanding')) {
                  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
                } else if (url.includes('homepage') || url.includes('search-results')) {
                  console.log('Authentication flow completed');
                  break;
                }
                redirectCount++;
              }
            }
          }
          
          // Perform search
          const searchInput = await page.waitForSelector('input[name="q"], input[type="search"]', { timeout: 10000 });
          if (searchInput) {
            await page.evaluate((input) => input.value = '', searchInput);
            await searchInput.type(searchQuery);
            
            // Submit search
            await Promise.race([
              page.keyboard.press('Enter'),
              page.click('button[type="submit"], input[type="submit"]')
            ]);
            
            // Wait for results
            await page.waitForTimeout(3000);
            await page.waitForSelector('.search-results, .business-list, .supplier-card', { timeout: 10000 });
            
            // Extract business data
            const businessElements = await page.$$('.supplier-card, .business-item, .search-result');
            
            for (const element of businessElements) {
              try {
                const companyName = await element.$eval('.company-name, .business-name, h3, h2', (el: any) => el.textContent?.trim()).catch(() => '');
                
                if (companyName && companyName.length > 2) {
                  const location = await element.$eval('.location, .address', (el: any) => el.textContent?.trim()).catch(() => '');
                  const description = await element.$eval('.description, .services', (el: any) => el.textContent?.trim()).catch(() => '');
                  
                  // Extract profile link for Supply Nation ID
                  const profileLink = await element.$eval('a', (el: any) => el.href).catch(() => '');
                  const supplynationId = profileLink.includes('accid=') ? 
                    profileLink.split('accid=')[1].split('&')[0] : 'unknown';
                  
                  extractedBusinesses.push({
                    companyName,
                    verified: true,
                    categories: [],
                    location: location || 'Australia',
                    contactInfo: {},
                    description: description || undefined,
                    supplynationId,
                    capabilities: [],
                    certifications: ['Supply Nation Verified']
                  });
                }
              } catch (extractError) {
                console.error('Error extracting business data:', extractError);
              }
            }
          }
        } catch (searchError) {
          console.error('Search execution error:', searchError);
        }
        
        return extractedBusinesses;
      });
      
      businesses.push(...(result || []));
      
      return {
        businesses,
        totalResults: businesses.length,
        searchQuery: query,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Supply Nation search error:', String(error));
      return {
        businesses: [],
        totalResults: 0,
        searchQuery: query,
        timestamp: new Date()
      };
    }
  }

  async extractDetailedProfile(profileUrl: string): Promise<SupplyNationBusiness | null> {
    if (!this.cluster) {
      throw new Error('Scraper not initialized');
    }

    try {
      console.log(`Extracting detailed profile from: ${profileUrl}`);
      
      const result = await this.cluster.execute(async ({ page }: { page: Page }) => {
        try {
          await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          
          const currentUrl = page.url();
          if (currentUrl.includes('login') || currentUrl.includes('frontdoor')) {
            await this.handleAuthentication(page);
            await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          }
          
          await page.waitForSelector('body', { timeout: 10000 });
          
          const { extractSupplyNationProfile } = await import('./supply-nation-profile-extractor');
          return await extractSupplyNationProfile(page, profileUrl);
        } catch (error) {
          console.error(`Error in profile extraction:`, String(error));
          return null;
        }
      });
      
      return result;
    } catch (error) {
      console.error(`Error extracting detailed profile from ${profileUrl}:`, String(error));
      return null;
    }
  }

  async close(): Promise<void> {
    if (this.cluster) {
      await this.cluster.close();
      this.cluster = null;
    }
  }
}

export async function getSupplyNationScraper(): Promise<SupplyNationScraper> {
  const scraper = new SupplyNationScraper();
  await scraper.initialize();
  return scraper;
}

export async function getSupplyNationProfileDetails(profileUrl: string): Promise<SupplyNationBusiness | null> {
  const scraper = await getSupplyNationScraper();
  try {
    return await scraper.extractDetailedProfile(profileUrl);
  } finally {
    // Don't close here as it might be used by other operations
  }
}

export async function searchSupplyNationWithPuppeteer(
  query: string,
  location?: string
): Promise<ScrapingResult> {
  const scraper = await getSupplyNationScraper();
  try {
    return await scraper.searchBusinesses(query, location);
  } finally {
    // Don't close here as it might be used by other operations
  }
}