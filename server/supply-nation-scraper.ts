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
          
          // Log page title and URL for debugging
          const pageTitle = await page.title();
          console.log(`Page title: "${pageTitle}", URL: ${page.url()}`);
          
          // Check if we're actually on a search results page
          if (pageContent.includes('No results found') || pageContent.includes('0 results')) {
            console.log('No search results found on page');
          } else if (pageContent.includes('results') || pageContent.includes('businesses')) {
            console.log('Search results page appears to contain business listings');
          }
          
          // Extract business data by looking for actual business directory listings
          const businesses = await page.evaluate((searchTerm: string) => {
            const foundBusinesses: any[] = [];
            
            // Look for specific Supply Nation business listing patterns
            const businessSelectors = [
              '[data-testid*="business"]',
              '[class*="supplier"]',
              '[class*="business"]', 
              '[class*="listing"]',
              '[class*="result"]',
              '.slds-card',
              '.lightning-card',
              'article',
              '[role="article"]'
            ];
            
            let businessElements: Element[] = [];
            for (const selector of businessSelectors) {
              const elements = Array.from(document.querySelectorAll(selector));
              businessElements.push(...elements);
            }
            
            // If no specific elements found, search for links containing business names
            if (businessElements.length === 0) {
              const allLinks = Array.from(document.querySelectorAll('a[href]'));
              businessElements = allLinks.filter(link => {
                const text = link.textContent?.toLowerCase() || '';
                const href = link.getAttribute('href') || '';
                return (text.includes(searchTerm.toLowerCase()) || 
                       text.includes('pty ltd') || 
                       href.includes('supplier') ||
                       href.includes('business')) &&
                       text.length > 3 && text.length < 100 &&
                       !text.includes('export') && 
                       !text.includes('reports') &&
                       !text.includes('fact sheets') &&
                       !text.includes('media releases');
              });
            }
            
            console.log(`Found ${businessElements.length} potential business elements`);
            
            // Extract legitimate business information
            for (const element of businessElements) {
              try {
                const text = element.textContent?.trim() || '';
                const href = element.getAttribute?.('href') || '';
                
                // Skip navigation and website elements
                if (text.includes('Resources') || 
                    text.includes('Fact sheets') || 
                    text.includes('Export Nation') ||
                    text.includes('Media releases') ||
                    text.includes('Annual reports') ||
                    text.includes('Support services') ||
                    text.includes('FAQ') ||
                    text.length < 5 ||
                    text.length > 150) {
                  continue;
                }
                
                // Look for proper company name patterns
                let companyName = '';
                
                // Check if the text itself is a company name
                if (text.match(/^[A-Z][A-Za-z\s&'.-]+(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES)$/i)) {
                  companyName = text;
                } else {
                  // Try to extract company name from text
                  const nameMatch = text.match(/([A-Z][A-Za-z\s&'.-]{2,50}(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES))/i);
                  if (nameMatch) {
                    companyName = nameMatch[1].trim();
                  } else if (text.includes(searchTerm) && text.length < 80) {
                    // If it contains the search term and is reasonable length, use it
                    companyName = text;
                  }
                }
                
                if (companyName && companyName.length > 3) {
                  // Look for additional business details in surrounding context
                  const parentElement = element.closest('div, article, section, li, tr');
                  const parentText = parentElement?.textContent || text;
                  
                  // Extract location
                  const locationMatch = parentText.match(/(Victoria|VIC|New South Wales|NSW|Queensland|QLD|Western Australia|WA|South Australia|SA|Tasmania|TAS|Northern Territory|NT|Australian Capital Territory|ACT|\d{4})/i);
                  const location = locationMatch ? locationMatch[0] : 'Australia';
                  
                  // Extract ABN if present
                  const abnMatch = parentText.match(/ABN\s*:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
                  const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;
                  
                  // Extract Supply Nation ID from profile link
                  const profileIdMatch = href.match(/accid=([^&]+)/);
                  const supplynationId = profileIdMatch ? profileIdMatch[1] : `sn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  
                  foundBusinesses.push({
                    companyName: companyName.trim(),
                    verified: true,
                    categories: [],
                    location: location,
                    contactInfo: {},
                    description: `Supply Nation verified Indigenous business`,
                    supplynationId: supplynationId,
                    capabilities: [],
                    certifications: ['Supply Nation Verified'],
                    abn: abn
                  });
                }
              } catch (error) {
                console.error('Error processing business element:', error);
              }
            }
            
            // Remove duplicates by company name
            const uniqueBusinesses = foundBusinesses.filter((business, index, array) => 
              array.findIndex(b => b.companyName.toLowerCase() === business.companyName.toLowerCase()) === index
            );
            
            return uniqueBusinesses;
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