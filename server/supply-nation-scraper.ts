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

  async searchBusinesses(query: string, location?: string): Promise<ScrapingResult> {
    if (!this.cluster) {
      throw new Error('Scraper not initialized');
    }

    try {
      console.log(`Searching Supply Nation for: "${query}" in location: ${location || 'all'}`);
      
      const businesses: SupplyNationBusiness[] = [];
      
      const result = await this.cluster.execute(async ({ page }: any) => {
        const extractedBusinesses: SupplyNationBusiness[] = [];
        const searchQuery = query;
        
        try {
          // Navigate to Supply Nation homepage first
          await page.goto('https://ibd.supplynation.org.au/public/s/homepage', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
          });
          
          console.log(`Starting page: ${page.url()}`);
          
          // Handle authentication if needed
          const currentUrl = page.url();
          if (currentUrl.includes('login') || currentUrl.includes('frontdoor') || currentUrl.includes('auth')) {
            console.log('Authentication required, handling login flow...');
            
            const username = process.env.SUPPLY_NATION_USERNAME;
            const password = process.env.SUPPLY_NATION_PASSWORD;
            
            if (username && password) {
              // Navigate to login page
              await page.goto('https://ibd.supplynation.org.au/public/s/login', { waitUntil: 'networkidle0' });
              
              // Fill login form
              await page.waitForSelector('input[type="email"], input[name="username"]', { timeout: 10000 });
              await page.type('input[type="email"], input[name="username"]', username);
              await page.type('input[type="password"], input[name="password"]', password);
              
              // Submit and handle redirects
              await page.click('input[type="submit"], button[type="submit"]');
              
              console.log('Waiting for authentication redirects...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Handle redirect sequence manually
              let currentPageUrl = page.url();
              let redirectAttempts = 0;
              const maxRedirects = 6;
              
              while (redirectAttempts < maxRedirects) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                currentPageUrl = page.url();
                console.log(`Redirect attempt ${redirectAttempts + 1}: ${currentPageUrl}`);
                
                if (currentPageUrl.includes('frontdoor.jsp')) {
                  console.log('Detected frontdoor.jsp, continuing...');
                } else if (currentPageUrl.includes('CommunitiesLanding')) {
                  console.log('Detected CommunitiesLanding, continuing...');
                } else if (currentPageUrl.includes('homepage') || 
                          currentPageUrl.includes('search-results') ||
                          (!currentPageUrl.includes('login') && !currentPageUrl.includes('frontdoor'))) {
                  console.log('Authentication flow completed successfully');
                  break;
                }
                
                redirectAttempts++;
              }
            }
          }
          
          // Navigate to search page with query
          const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?search=${encodeURIComponent(searchQuery)}&searchfield=all`;
          console.log(`Navigating to search URL: ${searchUrl}`);
          
          await page.goto(searchUrl, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
          });
          
          console.log(`Search page loaded: ${page.url()}`);
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Get page content
          const pageContent = await page.content();
          console.log(`Search results page loaded, length: ${pageContent.length}`);
          
          // Extract business data using robust JavaScript evaluation
          const businesses = await page.evaluate((searchTerm: string) => {
            const foundBusinesses: any[] = [];
            
            // Look for business-like content patterns
            const allElements = Array.from(document.querySelectorAll('*'));
            const potentialBusinessElements: Element[] = [];
            
            // Search for elements with business patterns
            for (const element of allElements) {
              const text = element.textContent?.toLowerCase() || '';
              
              if ((text.includes(searchTerm.toLowerCase()) || 
                   text.includes('pty ltd') || 
                   text.includes('group') ||
                   text.includes('services') ||
                   text.includes('consulting')) &&
                  text.length > 5 && text.length < 200) {
                
                if (!potentialBusinessElements.some(existing => 
                    existing.textContent === element.textContent)) {
                  potentialBusinessElements.push(element);
                }
              }
            }
            
            console.log(`Found ${potentialBusinessElements.length} potential business elements`);
            
            // Extract business information
            for (const element of potentialBusinessElements) {
              try {
                const text = element.textContent?.trim() || '';
                
                // Look for company name patterns
                const companyNameMatch = text.match(/([A-Z][A-Z\s&]+(?:PTY\s+LTD|GROUP|SERVICES|CONSULTING|SOLUTIONS))/i);
                if (companyNameMatch) {
                  const companyName = companyNameMatch[1].trim();
                  
                  // Find associated location
                  const parentElement = element.closest('div, article, section, li');
                  const parentText = parentElement?.textContent || '';
                  
                  const locationMatch = parentText.match(/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|\d{4})/);
                  const location = locationMatch ? locationMatch[0] : 'Australia';
                  
                  const abnMatch = parentText.match(/ABN\s*:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
                  const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;
                  
                  foundBusinesses.push({
                    companyName,
                    verified: true,
                    categories: [],
                    location,
                    contactInfo: {},
                    description: `Supply Nation verified Indigenous business`,
                    supplynationId: `sn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    capabilities: [],
                    certifications: ['Supply Nation Verified'],
                    abn
                  });
                }
              } catch (error) {
                console.error('Error processing element:', error);
              }
            }
            
            return foundBusinesses;
          }, searchQuery);
          
          console.log(`Extracted ${businesses.length} businesses from Supply Nation`);
          extractedBusinesses.push(...businesses);
          
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

export async function searchSupplyNationWithPuppeteer(
  query: string,
  location?: string
): Promise<ScrapingResult> {
  const scraper = await getSupplyNationScraper();
  try {
    return await scraper.searchBusinesses(query, location);
  } finally {
    // Keep scraper alive for potential reuse
  }
}