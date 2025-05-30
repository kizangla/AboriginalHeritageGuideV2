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
      // Use direct puppeteer instead of cluster for better compatibility
      const puppeteer = require('puppeteer');
      
      this.browser = await puppeteer.launch({
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote'
        ]
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
      
      const result = await this.cluster.execute(async ({ page }: { page: Page }) => {
        try {
          // Navigate to Supply Nation search page
          await page.goto('https://ibd.supplynation.org.au/public/s/search-results', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
          });

          // Check if we need to authenticate
          const currentUrl = page.url();
          if (currentUrl.includes('login') || currentUrl.includes('frontdoor')) {
            await this.handleAuthentication(page);
            await page.goto('https://ibd.supplynation.org.au/public/s/search-results', { 
              waitUntil: 'networkidle0', 
              timeout: 30000 
            });
          }

          // Wait for search form and perform search
          await page.waitForSelector('input[placeholder*="Search"], input[type="search"], #searchInput', { timeout: 10000 });
          
          // Find and fill the search input
          const searchSelector = await page.$('input[placeholder*="Search"]') || 
                                 await page.$('input[type="search"]') ||
                                 await page.$('#searchInput') ||
                                 await page.$('input[name*="search"]');

          if (searchSelector) {
            await searchSelector.click();
            await searchSelector.clear();
            await searchSelector.type(query);
            
            // Submit search
            const submitButton = await page.$('button[type="submit"]') ||
                                await page.$('button:contains("Search")') ||
                                await page.$('.search-button');
            
            if (submitButton) {
              await submitButton.click();
            } else {
              await searchSelector.press('Enter');
            }

            // Wait for results to load
            await page.waitForTimeout(3000);
          }

          // Extract business results from the page
          const businesses = await page.evaluate((searchQuery) => {
            const results: any[] = [];
            
            // Look for business cards/items in common Supply Nation structures
            const businessElements = document.querySelectorAll(
              '.supplier-card, .business-card, .search-result-item, [data-component*="Supplier"], .result-item'
            );

            businessElements.forEach((element, index) => {
              try {
                const titleElement = element.querySelector('h2, h3, .title, .business-name, .supplier-name') as HTMLElement;
                const companyName = titleElement?.textContent?.trim() || '';

                if (companyName && companyName.toLowerCase().includes(searchQuery.toLowerCase())) {
                  // Extract basic information
                  const locationElement = element.querySelector('.location, .address, .suburb') as HTMLElement;
                  const location = locationElement?.textContent?.trim() || '';

                  // Extract categories/services
                  const categoryElements = element.querySelectorAll('.category, .service, .tag, .capability');
                  const categories: string[] = [];
                  categoryElements.forEach(cat => {
                    const text = cat.textContent?.trim();
                    if (text) categories.push(text);
                  });

                  // Look for contact information
                  const phoneElement = element.querySelector('[href^="tel:"], .phone') as HTMLElement;
                  const emailElement = element.querySelector('[href^="mailto:"], .email') as HTMLElement;
                  const websiteElement = element.querySelector('[href^="http"], .website') as HTMLElement;

                  const phone = phoneElement?.textContent?.trim() || phoneElement?.getAttribute('href')?.replace('tel:', '') || '';
                  const email = emailElement?.textContent?.trim() || emailElement?.getAttribute('href')?.replace('mailto:', '') || '';
                  const website = websiteElement?.getAttribute('href') || '';

                  // Extract address components
                  const addressElement = element.querySelector('.full-address, .address-details') as HTMLElement;
                  const fullAddress = addressElement?.textContent?.trim() || '';
                  
                  // Look for certification badges
                  const certifiedElement = element.querySelector('.certified, .verified, [src*="certif"]');
                  const isVerified = !!certifiedElement;

                  // Get profile link for more details
                  const profileLink = element.querySelector('a[href*="supplier"]')?.getAttribute('href') || '';

                  results.push({
                    abn: '', // Will be extracted from profile if available
                    companyName,
                    verified: isVerified,
                    categories: categories.length > 0 ? categories : ['Indigenous business services'],
                    location: location || 'Australia',
                    contactInfo: {
                      phone: phone,
                      email: email,
                      website: website
                    },
                    description: categories.join(' • '),
                    supplynationId: `sn_${index + 1}`,
                    detailedAddress: {
                      streetAddress: '',
                      suburb: '',
                      state: '',
                      postcode: ''
                    },
                    profileUrl: profileLink ? `https://ibd.supplynation.org.au${profileLink}` : ''
                  });
                }
              } catch (err) {
                console.log('Error extracting business data:', err);
              }
            });

            return results;
          }, query);

          return businesses;
        } catch (error) {
          console.error('Search execution error:', error);
          return [];
        }
      });

      console.log(`Extracted ${result.length} businesses from Supply Nation search`);
      
      return {
        businesses: result || [],
        totalResults: result?.length || 0,
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