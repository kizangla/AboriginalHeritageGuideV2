import puppeteer from 'puppeteer';

export interface SupplyNationBusinessProfile {
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

export class SupplyNationPuppeteerCrawler {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private isAuthenticated: boolean = false;

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing Puppeteer browser...');
      
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent and viewport
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await this.page.setViewport({ width: 1366, height: 768 });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Puppeteer browser:', error);
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    if (!this.page) {
      console.log('Browser not initialized');
      return false;
    }

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.log('Supply Nation credentials not available');
        return false;
      }

      console.log('Navigating to Supply Nation login page...');
      await this.page.goto('https://ibd.supplynation.org.au/public/s/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for login form to load
      console.log('Waiting for login form...');
      await this.page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 10000 });
      await this.page.waitForSelector('input[name="password"], input[type="password"]', { timeout: 10000 });

      // Fill in credentials
      console.log('Filling login credentials...');
      const usernameSelector = 'input[name="username"], input[type="email"]';
      const passwordSelector = 'input[name="password"], input[type="password"]';
      
      await this.page.type(usernameSelector, username);
      await this.page.type(passwordSelector, password);

      // Submit the form
      console.log('Submitting login form...');
      const submitButton = await this.page.$('input[type="submit"], button[type="submit"], .loginButton, .btn-login');
      
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try form submission if no button found
        await this.page.keyboard.press('Enter');
      }

      // Wait for navigation after login
      console.log('Waiting for authentication to complete...');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

      // Handle any modal popups that appear after login
      await this.handlePostLoginModals();

      // Check if we're successfully authenticated
      const currentUrl = this.page.url();
      console.log(`Post-login URL: ${currentUrl}`);

      // Look for authenticated page indicators
      const isAuthenticated = await this.page.evaluate(() => {
        const indicators = [
          'searchIBDButton',
          'Search Indigenous Business',
          'Indigenous Business Directory',
          'Communities Landing'
        ];
        
        const pageText = document.body.innerText;
        return indicators.some(indicator => pageText.includes(indicator));
      });

      if (isAuthenticated) {
        console.log('Supply Nation authentication successful');
        this.isAuthenticated = true;
        return true;
      } else {
        console.log('Supply Nation authentication failed - no authenticated page indicators found');
        return false;
      }

    } catch (error) {
      console.error('Supply Nation authentication error:', error);
      return false;
    }
  }

  private async handlePostLoginModals(): Promise<void> {
    try {
      console.log('Checking for post-login modals...');

      // Set modal dismissal flag in local storage
      await this.page.evaluate(() => {
        localStorage.setItem('modalHasShownToday', 'yes');
      });

      // Wait a moment for any modals to appear
      await this.page.waitForTimeout(2000);

      // Look for common modal close buttons
      const modalSelectors = [
        '.modal-close',
        '.close-modal',
        '.modal .close',
        '[data-dismiss="modal"]',
        '.slds-modal__close',
        '.modal-footer .btn',
        '.modal-overlay',
        '.popup-close'
      ];

      for (const selector of modalSelectors) {
        const modalElement = await this.page.$(selector);
        if (modalElement) {
          console.log(`Found modal with selector: ${selector}, closing...`);
          await modalElement.click();
          await this.page.waitForTimeout(1000);
          break;
        }
      }

      // Press Escape key to close any remaining modals
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);

    } catch (error) {
      console.log('Modal handling completed (some errors expected)');
    }
  }

  async searchBusinesses(query: string): Promise<SupplyNationBusinessProfile[]> {
    if (!this.page || !this.isAuthenticated) {
      console.log('Not authenticated or browser not ready');
      return [];
    }

    try {
      console.log(`Searching Supply Nation for: "${query}"`);

      // Navigate to search page
      const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?q=${encodeURIComponent(query)}`;
      await this.page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for search results to load
      await this.page.waitForTimeout(3000);

      // Extract business listings from search results
      const businesses = await this.page.evaluate((searchQuery) => {
        const businessElements = document.querySelectorAll('.search-result-item, .business-card, .supplier-card, .directory-item');
        const results: any[] = [];

        businessElements.forEach((element, index) => {
          if (index >= 10) return; // Limit to first 10 results

          const nameElement = element.querySelector('.company-name, .business-name, .supplier-name, h3, h4, .title');
          const locationElement = element.querySelector('.location, .address, .supplier-location');
          const linkElement = element.querySelector('a[href*="/public/s/profile"]');
          
          if (nameElement) {
            const companyName = nameElement.textContent?.trim() || '';
            const location = locationElement?.textContent?.trim() || '';
            const profileUrl = linkElement?.getAttribute('href') || '';
            
            // Extract Supply Nation ID from profile URL
            const supplynationId = profileUrl.match(/profile\/([^\/\?]+)/)?.[1] || `sn-${index}`;

            if (companyName && companyName.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push({
                companyName,
                location,
                profileUrl: profileUrl.startsWith('http') ? profileUrl : `https://ibd.supplynation.org.au${profileUrl}`,
                supplynationId,
                verified: true,
                categories: []
              });
            }
          }
        });

        return results;
      }, query);

      console.log(`Found ${businesses.length} businesses in search results`);

      // Enhance with detailed profile information
      const detailedBusinesses: SupplyNationBusinessProfile[] = [];
      
      for (const business of businesses.slice(0, 3)) { // Limit to 3 detailed profiles
        const detailed = await this.getBusinessProfile(business);
        if (detailed) {
          detailedBusinesses.push(detailed);
        }
      }

      return detailedBusinesses;

    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async getBusinessProfile(business: any): Promise<SupplyNationBusinessProfile | null> {
    if (!this.page || !business.profileUrl) {
      return business;
    }

    try {
      console.log(`Getting detailed profile for: ${business.companyName}`);
      
      await this.page.goto(business.profileUrl, {
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      await this.page.waitForTimeout(2000);

      const profileData = await this.page.evaluate(() => {
        // Extract detailed business information from profile page
        const getTextContent = (selector: string): string => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        const abn = getTextContent('.abn, .business-number, [class*="abn"]') || 
                   document.body.innerText.match(/ABN[:\s]*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i)?.[1]?.replace(/\s/g, '') || '';

        const description = getTextContent('.description, .about, .business-description, .company-info');
        const tradingName = getTextContent('.trading-name, .business-name, .alternate-name');
        const detailedAddress = getTextContent('.full-address, .complete-address, .business-address');

        // Extract contact information
        const phone = document.body.innerText.match(/(?:Phone|Tel|Mobile)[:\s]*([0-9\s\(\)\+\-]+)/i)?.[1]?.trim() || '';
        const email = document.body.innerText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1] || '';
        const website = document.body.innerText.match(/(https?:\/\/[^\s]+)/)?.[1] || '';

        // Extract categories/services
        const categoryElements = document.querySelectorAll('.category, .service, .industry, .tag');
        const categories: string[] = [];
        categoryElements.forEach(el => {
          const category = el.textContent?.trim();
          if (category && category.length > 2) {
            categories.push(category);
          }
        });

        return {
          abn: abn || undefined,
          description: description || undefined,
          tradingName: tradingName || undefined,
          detailedAddress: detailedAddress || undefined,
          contactInfo: {
            phone: phone || undefined,
            email: email || undefined,
            website: website || undefined
          },
          categories: categories.length > 0 ? categories : undefined
        };
      });

      return {
        ...business,
        ...profileData
      };

    } catch (error) {
      console.log(`Profile extraction failed for ${business.companyName}:`, error);
      return business;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isAuthenticated = false;
    }
  }
}

export const supplyNationPuppeteerCrawler = new SupplyNationPuppeteerCrawler();