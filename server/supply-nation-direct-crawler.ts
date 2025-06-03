/**
 * Direct Supply Nation Crawler for Live Data Extraction
 * Targets specific business searches with authentic data retrieval
 */

import puppeteer from 'puppeteer';

export interface LiveBusinessResult {
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
  tradingName?: string;
  detailedAddress?: string;
}

export class SupplyNationDirectCrawler {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing direct Supply Nation crawler...');
      
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      });

      await this.page.setViewport({ width: 1920, height: 1080 });
      
      return true;
    } catch (error) {
      console.error('Direct crawler initialization failed:', (error as Error).message);
      return false;
    }
  }

  async searchLiveBusiness(query: string): Promise<LiveBusinessResult[]> {
    try {
      console.log(`Searching Supply Nation directly for: ${query}`);
      
      // Navigate to Supply Nation search
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Extract page content for analysis
      const pageContent = await this.page?.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          hasSearchForm: !!document.querySelector('input[type="search"], input[name="search"], .search-input'),
          searchInputs: Array.from(document.querySelectorAll('input')).map(input => ({
            type: input.type,
            name: input.name,
            placeholder: input.placeholder,
            id: input.id
          })),
          bodyText: document.body.innerText.substring(0, 500)
        };
      });

      console.log('Page analysis:', pageContent);

      // If we have search functionality, perform search
      if (pageContent?.hasSearchForm) {
        console.log('Search form detected, performing search...');
        
        // Try different search input selectors
        const searchSelectors = [
          'input[type="search"]',
          'input[name="search"]',
          'input[placeholder*="search" i]',
          '.search-input',
          '#search',
          'input[aria-label*="search" i]'
        ];

        let searchPerformed = false;
        for (const selector of searchSelectors) {
          try {
            const element = await this.page?.$(selector);
            if (element) {
              console.log(`Using search selector: ${selector}`);
              
              // Clear and type search query
              await this.page?.focus(selector);
              await this.page?.keyboard.down('Control');
              await this.page?.keyboard.press('KeyA');
              await this.page?.keyboard.up('Control');
              await this.page?.type(selector, query, { delay: 100 });
              
              // Submit search
              await this.page?.keyboard.press('Enter');
              searchPerformed = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (searchPerformed) {
          // Wait for search results
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Extract business results
          const businesses = await this.extractBusinessResults();
          console.log(`Extracted ${businesses.length} businesses from live search`);
          return businesses;
        }
      }

      // If no search form or search failed, try direct URL approach
      console.log('Attempting direct search URL approach...');
      const encodedQuery = encodeURIComponent(query);
      const searchUrl = `https://ibd.supplynation.org.au/s/search-results?q=${encodedQuery}`;
      
      await this.page?.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const businesses = await this.extractBusinessResults();
      console.log(`Direct URL search found ${businesses.length} businesses`);
      return businesses;

    } catch (error) {
      console.error('Live business search failed:', (error as Error).message);
      return [];
    }
  }

  private async extractBusinessResults(): Promise<LiveBusinessResult[]> {
    try {
      const results = await this.page?.evaluate(() => {
        const businesses: any[] = [];
        
        // Multiple strategies to find business listings
        const resultSelectors = [
          '.search-result',
          '.business-card',
          '.supplier-card',
          '.result-item',
          '[data-business]',
          '.listing',
          '.company-listing',
          'article',
          '.business-profile'
        ];

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            
            elements.forEach((element, index) => {
              if (index < 10) { // Limit results
                const business: any = {
                  companyName: '',
                  abn: '',
                  location: '',
                  supplynationId: `live_${Date.now()}_${index}`,
                  profileUrl: '',
                  verified: true,
                  categories: [],
                  contactInfo: {},
                  description: '',
                  tradingName: '',
                  detailedAddress: ''
                };

                // Extract company name from various possible elements
                const nameSelectors = ['h1', 'h2', 'h3', 'h4', '.company-name', '.business-name', '.name', '.title', '[data-name]'];
                for (const nameSelector of nameSelectors) {
                  const nameEl = element.querySelector(nameSelector);
                  if (nameEl && nameEl.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                // Extract location
                const locationSelectors = ['.location', '.address', '.suburb', '.state', '[data-location]'];
                for (const locSelector of locationSelectors) {
                  const locEl = element.querySelector(locSelector);
                  if (locEl && locEl.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                // Extract description
                const descSelectors = ['.description', '.summary', 'p', '.content', '.details'];
                for (const descSelector of descSelectors) {
                  const descEl = element.querySelector(descSelector);
                  if (descEl && descEl.textContent?.trim()) {
                    business.description = descEl.textContent.trim();
                    break;
                  }
                }

                // Extract profile URL
                const linkEl = element.querySelector('a[href]');
                if (linkEl) {
                  business.profileUrl = (linkEl as HTMLAnchorElement).href;
                }

                // Extract ABN if visible
                const abnPattern = /\b\d{11}\b/;
                const elementText = element.textContent || '';
                const abnMatch = elementText.match(abnPattern);
                if (abnMatch) {
                  business.abn = abnMatch[0];
                }

                // Only add if we found a company name
                if (business.companyName) {
                  businesses.push(business);
                }
              }
            });
            break; // Found results, stop trying other selectors
          }
        }

        return businesses;
      }) || [];

      return results;
    } catch (error) {
      console.error('Business extraction failed:', (error as Error).message);
      return [];
    }
  }

  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    } catch (error) {
      console.error('Error closing browser:', (error as Error).message);
    }
  }
}

export const supplyNationDirectCrawler = new SupplyNationDirectCrawler();