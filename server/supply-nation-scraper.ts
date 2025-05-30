import puppeteer, { Browser, Page } from 'puppeteer';
import { Cluster } from 'puppeteer-cluster';

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
  };
  description?: string;
  supplynationId: string;
  capabilities?: string[];
  certifications?: string[];
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

    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 3, // Limit to be respectful to the server
      puppeteerOptions: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      },
      timeout: 30000
    });

    this.isInitialized = true;
    console.log('Supply Nation scraper cluster initialized');
  }

  async searchBusinesses(query: string, location?: string): Promise<ScrapingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.cluster!.execute({ query, location }, async ({ page, data }) => {
        try {
          const { query, location } = data;
          console.log(`Scraping Supply Nation for: "${query}" in location: "${location || 'all'}"`);

          // Navigate to Supply Nation search page
          await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
            waitUntil: 'networkidle0',
            timeout: 30000
          });

          // Wait for the page to load completely
          await page.waitForSelector('body', { timeout: 10000 });

          // Handle authentication if required
          await this.handleAuthentication(page);

          // Wait for the search interface to load
          await this.waitForSearchInterface(page);

          // Perform the search
          const searchResults = await this.performSearch(page, query, location);

          console.log(`Found ${searchResults.businesses.length} businesses for query: ${query}`);
          resolve(searchResults);

        } catch (error) {
          console.error('Error scraping Supply Nation:', error);
          reject(error);
        }
      }).then(resolve).catch(reject);
    });
  }

  private async handleAuthentication(page: Page): Promise<void> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.log('No Supply Nation credentials provided, proceeding as guest');
        return;
      }

      // Check if login is required
      const loginButton = await page.$('input[type="submit"][value*="Log"], button:contains("Log"), a:contains("Log")');
      
      if (loginButton) {
        console.log('Authentication required, logging in...');
        
        // Fill in credentials
        await page.type('input[type="email"], input[name*="username"], input[name*="email"]', username);
        await page.type('input[type="password"], input[name*="password"]', password);
        
        // Submit login form
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          page.click('input[type="submit"], button[type="submit"]')
        ]);

        console.log('Authentication completed');
      }
    } catch (error) {
      console.log('Authentication not required or failed, continuing as guest');
    }
  }

  private async waitForSearchInterface(page: Page): Promise<void> {
    try {
      // Wait for Salesforce Lightning components to load
      await page.waitForFunction(() => {
        return window.performance && window.performance.navigation.type !== window.performance.navigation.TYPE_RELOAD;
      }, { timeout: 15000 });

      // Wait for search elements to be present
      await page.waitForSelector('input, [contenteditable="true"], .slds-input', { timeout: 10000 });
      
      console.log('Search interface loaded');
    } catch (error) {
      console.log('Search interface detection failed, proceeding with available elements');
    }
  }

  private async performSearch(page: Page, query: string, location?: string): Promise<ScrapingResult> {
    try {
      // Multiple strategies to find and interact with search elements
      const searchStrategies = [
        // Strategy 1: Standard input fields
        async () => {
          const searchInput = await page.$('input[placeholder*="search"], input[name*="search"], input[id*="search"]');
          if (searchInput) {
            await searchInput.click();
            await searchInput.type(query);
            return true;
          }
          return false;
        },
        
        // Strategy 2: Salesforce Lightning specific selectors
        async () => {
          const lightningInput = await page.$('.slds-input, [data-aura-class*="input"]');
          if (lightningInput) {
            await lightningInput.click();
            await lightningInput.type(query);
            return true;
          }
          return false;
        },
        
        // Strategy 3: Content editable elements
        async () => {
          const editableElement = await page.$('[contenteditable="true"]');
          if (editableElement) {
            await editableElement.click();
            await editableElement.type(query);
            return true;
          }
          return false;
        }
      ];

      let searchExecuted = false;
      for (const strategy of searchStrategies) {
        if (await strategy()) {
          searchExecuted = true;
          break;
        }
      }

      if (!searchExecuted) {
        console.log('Could not find search input, trying to trigger search through URL parameters');
        const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?search=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle0' });
      } else {
        // Submit the search
        await this.submitSearch(page);
      }

      // Wait for results to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract business data
      const businesses = await this.extractBusinessData(page);

      return {
        businesses,
        totalResults: businesses.length,
        searchQuery: query,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error performing search:', error);
      return {
        businesses: [],
        totalResults: 0,
        searchQuery: query,
        timestamp: new Date()
      };
    }
  }

  private async submitSearch(page: Page): Promise<void> {
    try {
      // Multiple strategies to submit the search
      const submitStrategies = [
        () => page.keyboard.press('Enter'),
        () => page.click('button[type="submit"], input[type="submit"]'),
        () => page.click('button:contains("Search"), .search-button, [data-aura-class*="button"]'),
        () => page.click('.slds-button')
      ];

      for (const strategy of submitStrategies) {
        try {
          await strategy();
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.log('Search submission method not found, relying on URL navigation');
    }
  }

  private async extractBusinessData(page: Page): Promise<SupplyNationBusiness[]> {
    try {
      // Wait for potential dynamic content loading
      await new Promise(resolve => setTimeout(resolve, 2000));

      const businesses = await page.evaluate(() => {
        const results: SupplyNationBusiness[] = [];

        // Multiple selectors to find business listings
        const businessSelectors = [
          '.business-card',
          '.search-result',
          '.listing-item',
          '[data-aura-class*="item"]',
          '.slds-card',
          '.business-listing',
          '.result-item'
        ];

        let businessElements: NodeListOf<Element> | null = null;

        for (const selector of businessSelectors) {
          businessElements = document.querySelectorAll(selector);
          if (businessElements.length > 0) {
            console.log(`Found ${businessElements.length} businesses using selector: ${selector}`);
            break;
          }
        }

        if (!businessElements || businessElements.length === 0) {
          console.log('No business elements found, trying text-based extraction');
          // Fallback: look for text patterns that might indicate business listings
          const textContent = document.body.innerText;
          const abnPattern = /ABN[:\s]*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/gi;
          const abnMatches = textContent.match(abnPattern);
          
          if (abnMatches) {
            console.log(`Found ${abnMatches.length} ABN references in page text`);
          }
          
          return results;
        }

        businessElements.forEach((element, index) => {
          try {
            const companyName = 
              element.querySelector('h1, h2, h3, .title, .name, .company-name')?.textContent?.trim() ||
              element.querySelector('a')?.textContent?.trim() ||
              `Business ${index + 1}`;

            if (companyName && companyName.length > 2) {
              const description = element.querySelector('.description, .summary, p')?.textContent?.trim() || '';
              const location = element.querySelector('.location, .address, .suburb')?.textContent?.trim() || '';
              
              // Extract ABN if present
              const elementText = element.textContent || '';
              const abnMatch = elementText.match(/ABN[:\s]*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
              const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;

              // Extract categories
              const categories: string[] = [];
              element.querySelectorAll('.category, .tag, .capability').forEach(cat => {
                const categoryText = cat.textContent?.trim();
                if (categoryText) categories.push(categoryText);
              });

              // Extract contact info
              const email = element.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.replace('mailto:', '') || undefined;
              const phone = element.querySelector('.phone, a[href^="tel:"]')?.textContent?.trim() || undefined;
              const website = element.querySelector('a[href^="http"]')?.getAttribute('href') || undefined;

              results.push({
                abn,
                companyName,
                verified: true, // All Supply Nation listings are verified Indigenous businesses
                categories,
                location,
                contactInfo: {
                  email,
                  phone,
                  website
                },
                description,
                supplynationId: `sn_${index}`,
                capabilities: categories,
                certifications: ['Supply Nation Verified']
              });
            }
          } catch (error) {
            console.error('Error extracting business data:', error);
          }
        });

        return results;
      });

      console.log(`Extracted ${businesses.length} businesses from page`);
      return businesses;

    } catch (error) {
      console.error('Error extracting business data:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.cluster) {
      await this.cluster.close();
      this.isInitialized = false;
      console.log('Supply Nation scraper cluster closed');
    }
  }
}

// Singleton instance
let scraperInstance: SupplyNationScraper | null = null;

export async function getSupplyNationScraper(): Promise<SupplyNationScraper> {
  if (!scraperInstance) {
    scraperInstance = new SupplyNationScraper();
    await scraperInstance.initialize();
  }
  return scraperInstance;
}

export async function searchSupplyNationWithPuppeteer(
  query: string,
  location?: string
): Promise<ScrapingResult> {
  const scraper = await getSupplyNationScraper();
  return await scraper.searchBusinesses(query, location);
}