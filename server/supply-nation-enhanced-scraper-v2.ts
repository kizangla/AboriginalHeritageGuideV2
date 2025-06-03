/**
 * Enhanced Supply Nation Scraper v2
 * Incorporating AdvancedWebScraper techniques with Puppeteer fallback
 */

import puppeteer from 'puppeteer';

export interface EnhancedSupplyNationBusiness {
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
}

export class SupplyNationEnhancedScraperV2 {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authenticated: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  async initializeEnhanced(): Promise<boolean> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-extensions',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Enhanced page configuration
      await this.page.setViewport({ width: 1366, height: 768 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      });

      // Advanced stealth techniques
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        
        // Remove automation indicators
        delete window.chrome;
        window.chrome = { runtime: {} };
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      return true;
    } catch (error) {
      console.error('Enhanced scraper initialization failed:', (error as Error).message);
      return false;
    }
  }

  async authenticateEnhanced(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials required for enhanced authentication');
        return false;
      }

      console.log('Starting enhanced authentication sequence...');

      // Navigate with exponential backoff retry mechanism
      const navigationSuccess = await this.retryWithBackoff(async () => {
        await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
        return true;
      });

      if (!navigationSuccess) {
        console.log('Navigation to login page failed');
        return false;
      }

      // Human-like delay
      await this.humanDelay(2000, 3500);

      // Check authentication state
      const currentUrl = this.page?.url();
      if (currentUrl && !currentUrl.includes('/login')) {
        console.log('Already authenticated');
        this.authenticated = true;
        return true;
      }

      // Multiple selector strategies for form detection
      const formDetected = await this.detectLoginForm();
      if (!formDetected) {
        console.log('Login form not detected');
        return false;
      }

      // Enhanced form filling with multiple strategies
      const credentialsFilled = await this.fillCredentialsEnhanced(username, password);
      if (!credentialsFilled) {
        console.log('Failed to fill credentials');
        return false;
      }

      // Submit form with multiple strategies
      const formSubmitted = await this.submitFormEnhanced();
      if (!formSubmitted) {
        console.log('Failed to submit form');
        return false;
      }

      // Wait for authentication response with timeout
      await this.humanDelay(4000, 6000);

      // Verify authentication success
      const finalUrl = this.page?.url();
      if (finalUrl && !finalUrl.includes('/login')) {
        this.authenticated = true;
        console.log('Enhanced authentication successful');
        return true;
      } else {
        console.log('Enhanced authentication failed');
        return this.retryAuthentication();
      }

    } catch (error) {
      console.error('Enhanced authentication error:', (error as Error).message);
      return this.retryAuthentication();
    }
  }

  private async detectLoginForm(): Promise<boolean> {
    try {
      const formData = await this.page?.evaluate(() => {
        const emailInputs = document.querySelectorAll('input[type="email"], input[type="text"], input[name*="email"], input[name*="username"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign In")');
        
        return {
          emailCount: emailInputs.length,
          passwordCount: passwordInputs.length,
          submitCount: submitButtons.length,
          hasForm: emailInputs.length > 0 && passwordInputs.length > 0
        };
      });

      console.log('Form detection result:', formData);
      return formData?.hasForm || false;
    } catch (error) {
      console.error('Form detection error:', (error as Error).message);
      return false;
    }
  }

  private async fillCredentialsEnhanced(username: string, password: string): Promise<boolean> {
    try {
      // Multiple strategies for username input
      const usernameSelectors = [
        'input[type="email"]',
        'input[type="text"]',
        'input[name*="email"]',
        'input[name*="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]'
      ];

      let usernameFilled = false;
      for (const selector of usernameSelectors) {
        try {
          await this.page?.waitForSelector(selector, { timeout: 2000 });
          const element = await this.page?.$(selector);
          
          if (element) {
            await element.click();
            await this.humanDelay(200, 500);
            await element.type('', { delay: 0 }); // Clear
            await element.type(username, { delay: this.getRandomDelay(80, 180) });
            usernameFilled = true;
            console.log(`Username filled using: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!usernameFilled) {
        console.log('Failed to fill username');
        return false;
      }

      await this.humanDelay(500, 1000);

      // Multiple strategies for password input
      const passwordSelectors = [
        'input[type="password"]',
        'input[name*="password"]',
        'input[placeholder*="password" i]'
      ];

      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          await this.page?.waitForSelector(selector, { timeout: 2000 });
          const element = await this.page?.$(selector);
          
          if (element) {
            await element.click();
            await this.humanDelay(200, 500);
            await element.type('', { delay: 0 }); // Clear
            await element.type(password, { delay: this.getRandomDelay(80, 180) });
            passwordFilled = true;
            console.log(`Password filled using: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      return passwordFilled;
    } catch (error) {
      console.error('Credential filling error:', (error as Error).message);
      return false;
    }
  }

  private async submitFormEnhanced(): Promise<boolean> {
    try {
      await this.humanDelay(800, 1500);

      // Multiple submit strategies
      const submitStrategies = [
        async () => {
          const button = await this.page?.$('button[type="submit"]');
          if (button) {
            await button.click();
            return true;
          }
          return false;
        },
        async () => {
          const button = await this.page?.$('input[type="submit"]');
          if (button) {
            await button.click();
            return true;
          }
          return false;
        },
        async () => {
          await this.page?.keyboard.press('Enter');
          return true;
        },
        async () => {
          const form = await this.page?.$('form');
          if (form) {
            await form.evaluate((f: HTMLFormElement) => f.submit());
            return true;
          }
          return false;
        }
      ];

      for (const strategy of submitStrategies) {
        try {
          const success = await strategy();
          if (success) {
            console.log('Form submitted successfully');
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      console.log('All submit strategies failed');
      return false;
    } catch (error) {
      console.error('Form submission error:', (error as Error).message);
      return false;
    }
  }

  async searchEnhancedBusinesses(query: string): Promise<EnhancedSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const authSuccess = await this.authenticateEnhanced();
        if (!authSuccess) {
          console.log('Cannot search without enhanced authentication');
          return [];
        }
      }

      console.log(`Executing enhanced search for: ${query}`);

      // Navigate to search page
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      await this.humanDelay(2500, 4000);

      // Execute search with multiple strategies
      const searchExecuted = await this.executeEnhancedSearch(query);
      
      if (searchExecuted) {
        await this.humanDelay(3500, 5500);
        const businesses = await this.extractEnhancedResults();
        console.log(`Enhanced search found ${businesses.length} businesses`);
        return businesses;
      }

      console.log('Enhanced search execution failed');
      return [];

    } catch (error) {
      console.error('Enhanced search error:', (error as Error).message);
      return [];
    }
  }

  private async executeEnhancedSearch(query: string): Promise<boolean> {
    try {
      // Multiple search input strategies
      const searchSelectors = [
        'input[type="search"]',
        'input[name*="search"]',
        'input[placeholder*="search" i]',
        'input[placeholder*="business" i]',
        'input[placeholder*="company" i]',
        '.search-input',
        '#search',
        '[data-search]',
        'input[aria-label*="search" i]'
      ];

      for (const selector of searchSelectors) {
        try {
          const element = await this.page?.$(selector);
          if (element) {
            await element.click();
            await this.humanDelay(300, 600);
            await element.type('', { delay: 0 }); // Clear
            await element.type(query, { delay: this.getRandomDelay(100, 200) });
            await this.humanDelay(600, 1200);
            
            // Try submitting search
            await this.page?.keyboard.press('Enter');
            console.log(`Enhanced search executed using: ${selector}`);
            return true;
          }
        } catch (selectorError) {
          continue;
        }
      }

      console.log('No search mechanism found in enhanced search');
      return false;
    } catch (error) {
      console.error('Enhanced search execution error:', (error as Error).message);
      return false;
    }
  }

  private async extractEnhancedResults(): Promise<EnhancedSupplyNationBusiness[]> {
    try {
      const businesses = await this.page?.evaluate(() => {
        const results: any[] = [];
        
        // Comprehensive selectors for business results
        const businessSelectors = [
          '.business-result', '.search-result', '.supplier-listing',
          '.business-card', '.company-listing', 'article',
          '.result-item', '.business-profile', '.supplier-card',
          '.listing', '.search-item', '.business-entry'
        ];

        for (const selector of businessSelectors) {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length > 0) {
            elements.forEach((element, index) => {
              if (index < 30) { // Process more results
                const business: any = {
                  companyName: '',
                  abn: '',
                  location: '',
                  supplynationId: `enh_${Date.now()}_${index}`,
                  profileUrl: '',
                  verified: true,
                  categories: [],
                  contactInfo: {},
                  description: ''
                };

                // Enhanced name extraction
                const nameSelectors = [
                  'h1', 'h2', 'h3', 'h4', 'h5',
                  '.name', '.company-name', '.business-name', '.title',
                  '[data-name]', '[data-business-name]', '.heading'
                ];

                for (const nameSelector of nameSelectors) {
                  const nameEl = element.querySelector(nameSelector);
                  if (nameEl?.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                // Enhanced location extraction
                const locationSelectors = [
                  '.location', '.address', '.suburb', '.state', '.postcode',
                  '[data-location]', '[data-address]', '.business-location',
                  '.locality', '.region'
                ];

                for (const locSelector of locationSelectors) {
                  const locEl = element.querySelector(locSelector);
                  if (locEl?.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                // Enhanced description extraction
                const descSelectors = [
                  '.description', '.summary', '.business-description',
                  'p', '.content', '.details', '[data-description]',
                  '.excerpt', '.overview'
                ];

                for (const descSelector of descSelectors) {
                  const descEl = element.querySelector(descSelector);
                  if (descEl?.textContent?.trim()) {
                    business.description = descEl.textContent.trim();
                    break;
                  }
                }

                // Enhanced URL extraction
                const linkEl = element.querySelector('a[href]');
                if (linkEl) {
                  const href = (linkEl as HTMLAnchorElement).href;
                  business.profileUrl = href.startsWith('http') ? href : `https://ibd.supplynation.org.au${href}`;
                }

                // Enhanced text-based extraction
                const elementText = element.textContent || '';
                
                // ABN extraction
                const abnMatch = elementText.match(/\b\d{11}\b/);
                if (abnMatch) {
                  business.abn = abnMatch[0];
                }

                // Enhanced phone extraction
                const phonePatterns = [
                  /\b(?:\+61[\s-]?)?\d{2,4}[\s-]?\d{4}[\s-]?\d{4}\b/,
                  /\b(?:\(0\d\)[\s-]?)?\d{4}[\s-]?\d{4}\b/,
                  /\b0\d[\s-]?\d{4}[\s-]?\d{4}\b/
                ];

                for (const pattern of phonePatterns) {
                  const phoneMatch = elementText.match(pattern);
                  if (phoneMatch) {
                    business.contactInfo.phone = phoneMatch[0];
                    break;
                  }
                }

                // Enhanced email extraction
                const emailMatch = elementText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) {
                  business.contactInfo.email = emailMatch[0];
                }

                // Enhanced category extraction
                const categoryElements = element.querySelectorAll(
                  '.category, .tag, .service, .industry, .sector, ' +
                  '.classification, .type, .specialty'
                );
                
                categoryElements.forEach(cat => {
                  const categoryText = cat.textContent?.trim();
                  if (categoryText && categoryText.length > 2) {
                    business.categories.push(categoryText);
                  }
                });

                if (business.companyName && business.companyName.length > 2) {
                  results.push(business);
                }
              }
            });
            break; // Found results, stop checking other selectors
          }
        }

        return results;
      }) || [];

      return businesses;
    } catch (error) {
      console.error('Enhanced result extraction error:', (error as Error).message);
      return [];
    }
  }

  private async retryAuthentication(): Promise<boolean> {
    this.retryCount++;
    
    if (this.retryCount < this.maxRetries) {
      console.log(`Retrying enhanced authentication (attempt ${this.retryCount + 1}/${this.maxRetries})`);
      await this.humanDelay(3000, 5000);
      return await this.authenticateEnhanced();
    }
    
    console.log('Maximum enhanced authentication retries reached');
    return false;
  }

  private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T | null> {
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          console.error(`Operation failed after ${maxAttempts} attempts:`, (error as Error).message);
          return null;
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }

  private async humanDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async closeEnhanced(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.authenticated = false;
        this.retryCount = 0;
      }
    } catch (error) {
      console.error('Error closing enhanced scraper:', (error as Error).message);
    }
  }

  getEnhancedStatus(): { 
    authenticated: boolean; 
    retryCount: number; 
    maxRetries: number;
    browserActive: boolean;
  } {
    return {
      authenticated: this.authenticated,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      browserActive: this.browser !== null
    };
  }
}

export const supplyNationEnhancedScraperV2 = new SupplyNationEnhancedScraperV2();