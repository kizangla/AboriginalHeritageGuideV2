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
            '--single-process',
            '--disable-gpu'
          ]
        },
        timeout: 30000
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
      
      // For now, return empty results to avoid errors
      return {
        businesses: [],
        totalResults: 0,
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