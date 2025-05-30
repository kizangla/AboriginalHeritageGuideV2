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
      maxConcurrency: 2, // Conservative limit for system resources
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
      timeout: 60000 // Increased timeout for Supply Nation's heavy JavaScript
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
      // Wait for dynamic content and potential lazy loading
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Debug: Take screenshot and log page content
      console.log('Current URL:', await page.url());
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);
      
      // Save page HTML for analysis
      const pageContent = await page.content();
      console.log('Page content length:', pageContent.length);
      
      // Log key page elements for debugging
      const bodyText = await page.evaluate(() => document.body.innerText?.substring(0, 500));
      console.log('Page body text sample:', bodyText);

      const businesses = await page.evaluate(() => {
        const results: any[] = [];

        // Enhanced selectors for Salesforce Lightning components
        const businessSelectors = [
          // Salesforce Lightning specific selectors
          'c-search-results [data-key]',
          'c-business-card',
          '.slds-card',
          '.slds-tile',
          '[data-aura-class*="searchResult"]',
          '[data-aura-class*="businessCard"]',
          '[data-aura-class*="item"]',
          // Generic selectors
          '.business-card',
          '.search-result',
          '.listing-item',
          '.business-listing',
          '.result-item',
          '.business-item',
          // Fallback broad selectors
          '[class*="business"]',
          '[class*="result"]',
          '[class*="card"]'
        ];

        let businessElements: NodeListOf<Element> | null = null;
        let usedSelector = '';

        for (const selector of businessSelectors) {
          businessElements = document.querySelectorAll(selector);
          if (businessElements && businessElements.length > 0) {
            usedSelector = selector;
            console.log(`Found ${businessElements.length} elements using selector: ${selector}`);
            break;
          }
        }

        if (!businessElements || businessElements.length === 0) {
          console.log('No business elements found with selectors, trying text-based extraction');
          
          // Enhanced text-based extraction for dynamic content
          const textContent = document.body.innerText || '';
          const htmlContent = document.body.innerHTML || '';
          
          console.log('Text content length:', textContent.length);
          console.log('HTML content length:', htmlContent.length);
          
          // Look for business name patterns in text
          const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 3);
          console.log('Total text lines found:', lines.length);
          console.log('Sample lines:', lines.slice(0, 10));
          
          // Extract potential business names using patterns
          const businessPatterns = [
            /([A-Z][a-z]+ [A-Z][a-z]+ (PTY|Pty|Ltd|Limited|Group|Services|Solutions|Company))/g,
            /([A-Z][A-Z]+ [A-Z][a-z]+)/g,
            /([A-Z][a-z]+ & [A-Z][a-z]+)/g
          ];
          
          let foundBusinesses = 0;
          
          businessPatterns.forEach((pattern, patternIndex) => {
            const matches = textContent.match(pattern);
            if (matches) {
              console.log(`Pattern ${patternIndex} found ${matches.length} matches:`, matches.slice(0, 5));
              
              matches.slice(0, 10).forEach((match, index) => {
                if (match.length > 5 && match.length < 100) {
                  results.push({
                    companyName: match.trim(),
                    verified: true,
                    categories: ['Indigenous Business'],
                    location: 'Australia',
                    contactInfo: {},
                    supplynationId: `sn_text_${patternIndex}_${index}`,
                    description: 'Extracted from Supply Nation directory'
                  });
                  foundBusinesses++;
                }
              });
            }
          });
          
          // Look for ABN patterns
          const abnPattern = /ABN[:\s]*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/gi;
          const abnMatches = textContent.match(abnPattern);
          
          if (abnMatches) {
            console.log(`Found ${abnMatches.length} ABN references in page text`);
          }
          
          console.log(`Text-based extraction found ${foundBusinesses} potential businesses`);
          return results;
        }

        businessElements.forEach((element, index) => {
          try {
            // Debug: Log element structure to understand what we're working with
            if (index === 0) {
              console.log(`Element ${index} HTML sample:`, element.outerHTML.substring(0, 500));
              console.log(`Element ${index} text content:`, element.textContent?.substring(0, 200));
            }
            
            // Enhanced business name extraction for Supply Nation's structure
            let companyName = '';
            
            // Try multiple strategies to extract real business names
            const nameSelectors = [
              // Salesforce Lightning specific selectors
              'lightning-formatted-text[data-output-element-id*="name"]',
              'lightning-formatted-text[data-output-element-id*="title"]',
              '.slds-text-heading_medium',
              '.slds-text-heading_small', 
              '.slds-text-title',
              // Standard selectors
              'h1, h2, h3, h4',
              '.title, .name, .company-name',
              '[data-company-name], [data-business-name]',
              'a[href*="business"], .business-title, .listing-title',
              'strong, .bold, .heading',
              // Text content extraction
              'div[class*="name"], span[class*="name"]',
              '[class*="title"], [class*="heading"]'
            ];
            
            for (const selector of nameSelectors) {
              const nameElement = element.querySelector(selector);
              if (nameElement && nameElement.textContent?.trim()) {
                const text = nameElement.textContent.trim();
                // Filter out generic text and navigation elements
                if (text.length > 2 && 
                    !text.toLowerCase().includes('search') &&
                    !text.toLowerCase().includes('filter') &&
                    !text.toLowerCase().includes('result') &&
                    !text.toLowerCase().includes('page') &&
                    text !== 'Login' && text !== 'Join now') {
                  companyName = text;
                  break;
                }
              }
            }
            
            // If no name found, try extracting from full text content
            if (!companyName) {
              const fullText = element.textContent?.trim() || '';
              const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
              
              // Look for the first meaningful line that could be a business name
              for (const line of lines.slice(0, 5)) {
                if (line.length > 2 && line.length < 100 &&
                    !line.toLowerCase().includes('search') &&
                    !line.toLowerCase().includes('filter') &&
                    !line.toLowerCase().includes('certified') &&
                    !line.toLowerCase().includes('login')) {
                  companyName = line;
                  break;
                }
              }
            }
            
            // Only use fallback if absolutely no name found
            if (!companyName || companyName.length < 3) {
              companyName = `Business ${index + 1}`;
            }

            if (companyName && companyName.length > 2) {
              // Enhanced description extraction
              const description = 
                element.querySelector('.description, .summary, .about, .services, .overview')?.textContent?.trim() ||
                element.querySelector('p:not(.location):not(.contact)')?.textContent?.trim() ||
                '';

              // Enhanced location extraction  
              const location = 
                element.querySelector('.location, .address, .suburb, .state, .postcode')?.textContent?.trim() ||
                element.querySelector('[data-location], [data-address]')?.textContent?.trim() ||
                '';
              
              // Enhanced ABN extraction
              const elementText = element.textContent || '';
              const abnMatch = elementText.match(/ABN[:\s]*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
              const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;

              // Enhanced contact information extraction
              const contactInfo: { email?: string; phone?: string; website?: string } = {};
              
              // Email extraction
              const emailMatch = elementText.match(/[\w.-]+@[\w.-]+\.\w+/);
              if (emailMatch) contactInfo.email = emailMatch[0];
              
              // Phone extraction
              const phoneMatch = elementText.match(/(\+?61\s?)?[0-9\s\-\(\)]{8,15}/);
              if (phoneMatch) contactInfo.phone = phoneMatch[0].trim();
              
              // Website extraction
              const websiteElement = element.querySelector('a[href^="http"], a[href^="www"]');
              if (websiteElement) contactInfo.website = websiteElement.getAttribute('href') || '';

              // Enhanced categories extraction
              const categories: string[] = [];
              const categorySelectors = [
                '.category, .service, .industry, .tags, .capabilities, .sectors',
                '[data-category], [data-service], [data-industry]',
                '.badge, .chip, .label'
              ];
              
              categorySelectors.forEach(selector => {
                element.querySelectorAll(selector).forEach(catEl => {
                  const catText = catEl.textContent?.trim();
                  if (catText && catText.length > 2 && catText.length < 50) {
                    categories.push(catText);
                  }
                });
              });

              // Extract certification information
              const certifications: string[] = [];
              const certificationKeywords = ['certified', 'registered', 'accredited', 'verified', 'approved'];
              certificationKeywords.forEach(keyword => {
                if (elementText.toLowerCase().includes(keyword)) {
                  certifications.push(`Supply Nation ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
                }
              });

              // Extract capabilities
              const capabilities: string[] = [];
              const capabilityKeywords = ['consulting', 'services', 'solutions', 'management', 'development', 'training', 'design', 'construction'];
              capabilityKeywords.forEach(capability => {
                if (elementText.toLowerCase().includes(capability)) {
                  capabilities.push(capability.charAt(0).toUpperCase() + capability.slice(1));
                }
              });
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