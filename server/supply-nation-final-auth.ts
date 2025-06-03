/**
 * Final Supply Nation Authentication Implementation
 * Comprehensive approach with session persistence and error handling
 */

import puppeteer from 'puppeteer';

export interface FinalSupplyNationBusiness {
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

export class SupplyNationFinalAuth {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authenticated: boolean = false;
  private sessionCookies: any[] = [];

  async initializeFinal(): Promise<boolean> {
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
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      
      await this.page.setViewport({ width: 1280, height: 720 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      return true;
    } catch (error) {
      console.error('Final auth initialization failed:', (error as Error).message);
      return false;
    }
  }

  async authenticateFinal(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials required for authentication');
        return false;
      }

      console.log('Executing final authentication sequence...');

      // Navigate to login with error handling
      try {
        await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
          waitUntil: 'networkidle0',
          timeout: 25000
        });
      } catch (navError) {
        console.log('Navigation timeout, continuing with available page state');
      }

      // Wait for page stability
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check current URL state
      const currentUrl = this.page?.url();
      console.log('Current URL:', currentUrl);

      if (currentUrl && !currentUrl.includes('/login')) {
        console.log('Already authenticated or redirected');
        this.authenticated = true;
        return true;
      }

      // Comprehensive form detection
      const loginFormExists = await this.page?.evaluate(() => {
        const emailInputs = document.querySelectorAll('input[type="email"], input[type="text"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        
        return {
          hasEmailInput: emailInputs.length > 0,
          hasPasswordInput: passwordInputs.length > 0,
          hasSubmitButton: submitButtons.length > 0,
          emailInputCount: emailInputs.length,
          passwordInputCount: passwordInputs.length,
          submitButtonCount: submitButtons.length
        };
      });

      console.log('Login form detection:', loginFormExists);

      if (!loginFormExists?.hasEmailInput || !loginFormExists?.hasPasswordInput) {
        console.log('Login form elements not found');
        return false;
      }

      // Fill credentials with robust error handling
      try {
        // Fill username
        await this.page?.waitForSelector('input[type="email"], input[type="text"]', { timeout: 5000 });
        const usernameInput = await this.page?.$('input[type="email"], input[type="text"]');
        
        if (usernameInput) {
          await usernameInput.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          await usernameInput.type(username, { delay: 100 });
          console.log('Username entered');
        }

        // Fill password
        await this.page?.waitForSelector('input[type="password"]', { timeout: 5000 });
        const passwordInput = await this.page?.$('input[type="password"]');
        
        if (passwordInput) {
          await passwordInput.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          await passwordInput.type(password, { delay: 100 });
          console.log('Password entered');
        }

        // Submit form
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const submitButton = await this.page?.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          console.log('Login form submitted');
        } else {
          await this.page?.keyboard.press('Enter');
          console.log('Login submitted via Enter key');
        }

        // Wait for authentication response
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check authentication success
        const finalUrl = this.page?.url();
        console.log('Post-login URL:', finalUrl);

        if (finalUrl && !finalUrl.includes('/login')) {
          // Capture session data
          this.sessionCookies = await this.page?.cookies() || [];
          this.authenticated = true;
          console.log('Final authentication successful');
          return true;
        } else {
          console.log('Authentication failed - still on login page');
          return false;
        }

      } catch (formError) {
        console.error('Form filling error:', (formError as Error).message);
        return false;
      }

    } catch (error) {
      console.error('Final authentication error:', (error as Error).message);
      return false;
    }
  }

  async searchFinalBusinesses(query: string): Promise<FinalSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const authSuccess = await this.authenticateFinal();
        if (!authSuccess) {
          console.log('Cannot perform search without authentication');
          return [];
        }
      }

      console.log(`Executing final search for: ${query}`);

      // Navigate to search page
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Execute search
      const searchSuccess = await this.executeFinalSearch(query);
      
      if (searchSuccess) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        const businesses = await this.extractFinalResults();
        console.log(`Final search extracted ${businesses.length} businesses`);
        return businesses;
      }

      console.log('Final search execution failed');
      return [];

    } catch (error) {
      console.error('Final search error:', (error as Error).message);
      return [];
    }
  }

  private async executeFinalSearch(query: string): Promise<boolean> {
    try {
      // Detect search interface
      const searchInterface = await this.page?.evaluate(() => {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="search" i]');
        const searchButtons = document.querySelectorAll('button[type="submit"], .search-btn, [data-search]');
        
        return {
          inputCount: searchInputs.length,
          buttonCount: searchButtons.length,
          hasSearch: searchInputs.length > 0
        };
      });

      console.log('Search interface detection:', searchInterface);

      if (!searchInterface?.hasSearch) {
        console.log('No search interface found');
        return false;
      }

      // Perform search input
      const searchInput = await this.page?.$('input[type="search"], input[name*="search"], input[placeholder*="search" i]');
      
      if (searchInput) {
        await searchInput.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        await searchInput.type(query, { delay: 120 });
        await new Promise(resolve => setTimeout(resolve, 800));
        await this.page?.keyboard.press('Enter');
        console.log('Search query submitted');
        return true;
      }

      console.log('Search input not accessible');
      return false;
    } catch (error) {
      console.error('Search execution error:', (error as Error).message);
      return false;
    }
  }

  private async extractFinalResults(): Promise<FinalSupplyNationBusiness[]> {
    try {
      const businesses = await this.page?.evaluate(() => {
        const results: any[] = [];
        
        // Comprehensive business result selectors
        const businessSelectors = [
          '.business-result', '.search-result', '.supplier-listing',
          '.business-card', '.company-listing', 'article',
          '.result-item', '.business-profile', '.supplier-card'
        ];

        for (const selector of businessSelectors) {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length > 0) {
            elements.forEach((element, index) => {
              if (index < 25) {
                const business: any = {
                  companyName: '',
                  abn: '',
                  location: '',
                  supplynationId: `final_${Date.now()}_${index}`,
                  profileUrl: '',
                  verified: true,
                  categories: [],
                  contactInfo: {},
                  description: ''
                };

                // Extract company name
                const nameElements = element.querySelectorAll('h1, h2, h3, h4, .name, .company-name, .business-name, .title');
                for (const nameEl of nameElements) {
                  if (nameEl.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                // Extract location
                const locationElements = element.querySelectorAll('.location, .address, .suburb, .state');
                for (const locEl of locationElements) {
                  if (locEl.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                // Extract description
                const descElements = element.querySelectorAll('.description, .summary, p');
                for (const descEl of descElements) {
                  if (descEl.textContent?.trim()) {
                    business.description = descEl.textContent.trim();
                    break;
                  }
                }

                // Extract profile URL
                const linkEl = element.querySelector('a[href]');
                if (linkEl) {
                  business.profileUrl = (linkEl as HTMLAnchorElement).href;
                }

                // Extract ABN
                const text = element.textContent || '';
                const abnMatch = text.match(/\b\d{11}\b/);
                if (abnMatch) {
                  business.abn = abnMatch[0];
                }

                // Extract contact info
                const phoneMatch = text.match(/\b(?:\+61[\s-]?)?\d{2,4}[\s-]?\d{4}[\s-]?\d{4}\b/);
                if (phoneMatch) {
                  business.contactInfo.phone = phoneMatch[0];
                }

                const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) {
                  business.contactInfo.email = emailMatch[0];
                }

                if (business.companyName && business.companyName.length > 2) {
                  results.push(business);
                }
              }
            });
            break;
          }
        }

        return results;
      }) || [];

      return businesses;
    } catch (error) {
      console.error('Final result extraction error:', (error as Error).message);
      return [];
    }
  }

  async closeFinal(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.authenticated = false;
        this.sessionCookies = [];
      }
    } catch (error) {
      console.error('Error closing final auth:', (error as Error).message);
    }
  }

  getFinalStatus(): { authenticated: boolean; cookieCount: number; hasSession: boolean } {
    return {
      authenticated: this.authenticated,
      cookieCount: this.sessionCookies.length,
      hasSession: this.sessionCookies.length > 0
    };
  }
}

export const supplyNationFinalAuth = new SupplyNationFinalAuth();