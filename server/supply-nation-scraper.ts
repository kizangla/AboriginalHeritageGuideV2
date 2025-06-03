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
          
          // Navigate to search page with query - try multiple approaches
          const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?search=${encodeURIComponent(searchQuery)}&searchfield=all`;
          console.log(`Navigating to search URL: ${searchUrl}`);
          
          await page.goto(searchUrl, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
          });
          
          console.log(`Search page loaded: ${page.url()}`);
          
          // Alternative approach: Use homepage search form if direct URL doesn't work
          const currentUrl = page.url();
          if (currentUrl.includes('homepage') || !currentUrl.includes('search-results')) {
            console.log('Redirected to homepage, using search form...');
            
            try {
              // Look for search input and perform search
              const searchSelectors = ['input[type="search"]', 'input[name="search"]', 'input[placeholder*="search"]', '.search-input'];
              let searchInput = null;
              
              for (const selector of searchSelectors) {
                try {
                  searchInput = await page.waitForSelector(selector, { timeout: 5000 });
                  if (searchInput) {
                    console.log(`Found search input: ${selector}`);
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
              
              if (searchInput) {
                await searchInput.fill(searchQuery);
                await page.keyboard.press('Enter');
                
                // Wait for search results to load
                await page.waitForLoadState('networkidle');
                await new Promise(resolve => setTimeout(resolve, 5000));
                console.log('Search form submitted, waiting for results...');
              }
            } catch (formError) {
              console.log('Search form approach failed:', formError);
            }
          }
          
          // Extended wait for dynamic content
          await new Promise(resolve => setTimeout(resolve, 8000));
          
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
          
          // Wait for dynamic content and JavaScript to fully execute
          await page.waitForLoadState('networkidle');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check for and handle any dynamic loading indicators
          try {
            await page.waitForSelector('body', { timeout: 5000 });
            
            // Look for loading spinners or indicators and wait for them to disappear
            const loadingSelectors = ['.loading', '.spinner', '[data-loading]', '.slds-spinner'];
            for (const selector of loadingSelectors) {
              try {
                await page.waitForSelector(selector, { state: 'hidden', timeout: 2000 });
              } catch (e) {
                // Loading indicator not found or already hidden
              }
            }
          } catch (e) {
            console.log('Page readiness check completed');
          }
          
          // Extract business data with comprehensive JavaScript evaluation
          const businesses = await page.evaluate((searchTerm: string) => {
            const foundBusinesses: any[] = [];
            
            // Log page analysis
            console.log('=== Supply Nation Page Analysis ===');
            console.log(`Page title: ${document.title}`);
            console.log(`URL: ${window.location.href}`);
            console.log(`Total elements: ${document.querySelectorAll('*').length}`);
            console.log(`Search term: "${searchTerm}"`);
            
            // Check for specific Supply Nation search result patterns
            const resultContainers = [
              '.search-results',
              '.supplier-results', 
              '.business-results',
              '[data-search-results]',
              '.slds-grid',
              '.lightning-layout',
              '.results-container'
            ];
            
            let mainContainer = null;
            for (const selector of resultContainers) {
              const container = document.querySelector(selector);
              if (container) {
                mainContainer = container;
                console.log(`Found results container: ${selector}`);
                break;
              }
            }
            
            // Look for business profile links first (most reliable)
            const profileLinks = Array.from(document.querySelectorAll('a[href*="supplierprofile"], a[href*="accid="]'));
            console.log(`Found ${profileLinks.length} supplier profile links`);
            
            if (profileLinks.length > 0) {
              profileLinks.forEach((link, index) => {
                try {
                  const href = link.getAttribute('href') || '';
                  const linkText = link.textContent?.trim() || '';
                  const parentElement = link.closest('div, article, section, li, tr, .card, .tile');
                  const contextText = parentElement?.textContent?.trim() || linkText;
                  
                  console.log(`Profile link ${index + 1}: "${linkText}" -> ${href}`);
                  
                  // Extract company name from link text or context
                  let companyName = linkText;
                  if (linkText.length < 3 || linkText.toLowerCase().includes('view') || linkText.toLowerCase().includes('profile')) {
                    // Look for company name in parent context
                    const nameMatch = contextText.match(/([A-Z][A-Za-z\s&'.-]{3,60}(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES))/i);
                    if (nameMatch) {
                      companyName = nameMatch[1].trim();
                    } else {
                      // Use any significant text from the context
                      const lines = contextText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 100);
                      companyName = lines[0] || linkText;
                    }
                  }
                  
                  if (companyName && companyName.length > 2) {
                    // Extract Supply Nation ID
                    const idMatch = href.match(/accid=([^&]+)/);
                    const supplynationId = idMatch ? idMatch[1] : `sn-link-${index}`;
                    
                    // Extract location from context
                    const locationMatch = contextText.match(/(Victoria|VIC|New South Wales|NSW|Queensland|QLD|Western Australia|WA|South Australia|SA|Tasmania|TAS|Northern Territory|NT|Australian Capital Territory|ACT|\d{4})/i);
                    const location = locationMatch ? locationMatch[0] : 'Australia';
                    
                    // Extract ABN if present
                    const abnMatch = contextText.match(/ABN\s*:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
                    const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;
                    
                    foundBusinesses.push({
                      companyName: companyName.trim(),
                      verified: true,
                      categories: [],
                      location: location,
                      contactInfo: {},
                      description: 'Supply Nation verified Indigenous business',
                      supplynationId: supplynationId,
                      capabilities: [],
                      certifications: ['Supply Nation Verified'],
                      abn: abn
                    });
                    
                    console.log(`Extracted business: ${companyName}`);
                  }
                } catch (error) {
                  console.error(`Error processing profile link ${index}:`, error);
                }
              });
            } else {
              // Fallback: comprehensive text analysis for business patterns
              console.log('No profile links found, analyzing page text...');
              
              const pageText = document.body.textContent || '';
              console.log(`Page text length: ${pageText.length}`);
              
              // Check if page indicates no results
              if (pageText.toLowerCase().includes('no results') || 
                  pageText.toLowerCase().includes('0 results') ||
                  pageText.toLowerCase().includes('no matches') ||
                  pageText.toLowerCase().includes('no suppliers found')) {
                console.log('Page indicates no search results found');
                return [];
              }
              
              // Look for business name patterns in the entire page
              const businessNameRegex = /([A-Z][A-Za-z\s&'.-]{5,80}(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES))/gi;
              const businessMatches = pageText.match(businessNameRegex);
              
              if (businessMatches) {
                console.log(`Found ${businessMatches.length} potential business name patterns`);
                const uniqueNames = Array.from(new Set(businessMatches));
                
                uniqueNames.forEach((name, index) => {
                  if (name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      index < 5) { // Include first few matches even if they don't contain search term
                    foundBusinesses.push({
                      companyName: name.trim(),
                      verified: true,
                      categories: [],
                      location: 'Australia',
                      contactInfo: {},
                      description: 'Supply Nation verified Indigenous business',
                      supplynationId: `sn-pattern-${index}`,
                      capabilities: [],
                      certifications: ['Supply Nation Verified']
                    });
                    
                    console.log(`Pattern match: ${name}`);
                  }
                });
              }
            }
            
            console.log(`=== Final extraction: ${foundBusinesses.length} businesses ===`);
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