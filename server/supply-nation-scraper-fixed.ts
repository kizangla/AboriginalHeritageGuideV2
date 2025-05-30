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

class SupplyNationScraperFixed {
  private cluster: Cluster | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 2,
        puppeteerOptions: {
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

  async extractDetailedProfile(profileUrl: string): Promise<SupplyNationBusiness | null> {
    if (!this.cluster) {
      throw new Error('Scraper not initialized');
    }

    try {
      console.log(`Extracting detailed profile from: ${profileUrl}`);
      
      const result = await this.cluster.execute(async ({ page }: { page: Page }) => {
        try {
          // Navigate to the profile page
          await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          
          // Handle authentication if needed
          const currentUrl = page.url();
          if (currentUrl.includes('login') || currentUrl.includes('frontdoor')) {
            await this.handleAuthentication(page);
            await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          }
          
          // Wait for content to load
          await page.waitForSelector('body', { timeout: 10000 });
          
          // Use the profile extractor
          const { extractSupplyNationProfile } = await import('./supply-nation-profile-extractor');
          return await extractSupplyNationProfile(page, profileUrl);
        } catch (error) {
          console.error(`Error in profile extraction:`, error);
          return null;
        }
      });
      
      return result;
    } catch (error) {
      console.error(`Error extracting detailed profile from ${profileUrl}:`, error);
      return null;
    }
  }

  private async handleAuthentication(page: Page): Promise<void> {
    try {
      // Check if we're on a login page
      const currentUrl = page.url();
      
      if (currentUrl.includes('login') || currentUrl.includes('frontdoor')) {
        console.log('Handling Supply Nation authentication...');
        
        // Wait for login form
        await page.waitForSelector('input[type="email"], input[name="username"]', { timeout: 10000 });
        
        // Fill in credentials
        const username = process.env.SUPPLY_NATION_USERNAME;
        const password = process.env.SUPPLY_NATION_PASSWORD;
        
        if (!username || !password) {
          throw new Error('Supply Nation credentials not provided');
        }
        
        await page.type('input[type="email"], input[name="username"]', username);
        await page.type('input[type="password"], input[name="password"]', password);
        
        // Submit the form
        await page.click('input[type="submit"], button[type="submit"]');
        
        // Wait for navigation or redirect
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        
        console.log('Authentication completed');
      }
    } catch (authError) {
      console.error('Authentication failed:', authError);
      throw authError;
    }
  }

  async searchBusinesses(query: string, location?: string): Promise<ScrapingResult> {
    // Implementation for search businesses
    return {
      businesses: [],
      totalResults: 0,
      searchQuery: query,
      timestamp: new Date()
    };
  }

  async close(): Promise<void> {
    if (this.cluster) {
      await this.cluster.close();
      this.cluster = null;
    }
  }
}

export async function getSupplyNationScraper(): Promise<SupplyNationScraperFixed> {
  const scraper = new SupplyNationScraperFixed();
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