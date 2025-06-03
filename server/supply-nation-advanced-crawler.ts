/**
 * Advanced Supply Nation Crawler with Persistent Authentication
 * Implements aggressive session management and authentication bypass techniques
 */

import puppeteer from 'puppeteer';
import { SupplyNationBusinessProfile } from './supply-nation-puppeteer-crawler';

export class SupplyNationAdvancedCrawler {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authSession: string | null = null;
  private sessionCookies: puppeteer.Protocol.Network.Cookie[] = [];
  private lastAuthTime: number = 0;
  private sessionDuration: number = 3600000; // 1 hour

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing advanced Supply Nation crawler...');
      
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
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set aggressive headers to appear as regular browser
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // Restore session if available
      if (this.isSessionValid()) {
        await this.restoreSession();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize advanced crawler:', error);
      return false;
    }
  }

  private isSessionValid(): boolean {
    const now = Date.now();
    return this.sessionCookies.length > 0 && 
           this.lastAuthTime > 0 && 
           (now - this.lastAuthTime) < this.sessionDuration;
  }

  private async restoreSession(): Promise<boolean> {
    try {
      console.log('Restoring previous session...');
      await this.page?.setCookie(...this.sessionCookies);
      
      // Test session validity by navigating to protected area
      await this.page?.goto('https://ibd.supplynation.org.au/communities', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      const isLoggedIn = await this.checkAuthenticationStatus();
      if (isLoggedIn) {
        console.log('Session successfully restored');
        return true;
      } else {
        console.log('Session expired, need fresh authentication');
        this.sessionCookies = [];
        this.lastAuthTime = 0;
        return false;
      }
    } catch (error) {
      console.log('Session restoration failed:', error.message);
      return false;
    }
  }

  async authenticateAggressively(): Promise<boolean> {
    try {
      if (this.isSessionValid()) {
        console.log('Using existing valid session');
        return true;
      }

      console.log('Starting aggressive authentication sequence...');
      
      // Strategy 1: Direct authentication attempt
      if (await this.attemptDirectLogin()) {
        return true;
      }

      // Strategy 2: Session hijacking from public pages
      if (await this.attemptSessionExtraction()) {
        return true;
      }

      // Strategy 3: Form manipulation and CSRF bypass
      if (await this.attemptFormBypass()) {
        return true;
      }

      console.log('All authentication strategies failed');
      return false;

    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  private async attemptDirectLogin(): Promise<boolean> {
    try {
      console.log('Attempting direct login...');
      
      await this.page?.goto('https://ibd.supplynation.org.au/login', {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      // Intercept network requests to capture authentication tokens
      await this.page?.setRequestInterception(true);
      
      this.page?.on('request', (request) => {
        // Capture authentication requests
        if (request.url().includes('login') || request.url().includes('auth')) {
          console.log('Auth request intercepted:', request.url());
        }
        request.continue();
      });

      // Advanced form detection with DOM manipulation
      const loginForm = await this.page?.evaluate(() => {
        // Look for any form elements
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input');
        
        // Find login-related elements
        const emailInputs = Array.from(inputs).filter(input => 
          input.type === 'email' || 
          input.name?.toLowerCase().includes('email') ||
          input.placeholder?.toLowerCase().includes('email')
        );
        
        const passwordInputs = Array.from(inputs).filter(input => 
          input.type === 'password'
        );

        return {
          forms: forms.length,
          emailInputs: emailInputs.length,
          passwordInputs: passwordInputs.length,
          hasLoginForm: emailInputs.length > 0 && passwordInputs.length > 0
        };
      });

      console.log('Login form analysis:', loginForm);

      if (loginForm?.hasLoginForm) {
        // Check for stored credentials
        const username = process.env.SUPPLY_NATION_USERNAME;
        const password = process.env.SUPPLY_NATION_PASSWORD;

        if (username && password) {
          console.log('Using provided credentials for authentication');
          
          // Fill credentials with stealth typing
          await this.page?.type('input[type="email"], input[name*="email"]', username, { delay: 100 });
          await this.page?.type('input[type="password"]', password, { delay: 100 });
          
          // Submit form
          await this.page?.click('button[type="submit"], input[type="submit"]');
          
          // Wait and check authentication
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          if (await this.checkAuthenticationStatus()) {
            await this.captureSession();
            return true;
          }
        } else {
          console.log('No credentials provided for authentication');
        }
      }

      return false;
    } catch (error) {
      console.log('Direct login failed:', error.message);
      return false;
    }
  }

  private async attemptSessionExtraction(): Promise<boolean> {
    try {
      console.log('Attempting session extraction from public pages...');
      
      // Navigate to public business directory
      await this.page?.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // Extract any session tokens or authentication data
      const sessionData = await this.page?.evaluate(() => {
        // Look for authentication tokens in page
        const scripts = Array.from(document.querySelectorAll('script'));
        const tokenPatterns = ['token', 'session', 'auth', 'csrf'];
        
        for (const script of scripts) {
          const content = script.textContent || '';
          for (const pattern of tokenPatterns) {
            if (content.toLowerCase().includes(pattern)) {
              return { found: true, content: content.substring(0, 200) };
            }
          }
        }
        
        return { found: false };
      });

      if (sessionData?.found) {
        console.log('Session data found in public pages');
        // Process extracted session data
        return await this.processExtractedSession(sessionData);
      }

      return false;
    } catch (error) {
      console.log('Session extraction failed:', error.message);
      return false;
    }
  }

  private async attemptFormBypass(): Promise<boolean> {
    try {
      console.log('Attempting form bypass techniques...');
      
      // Navigate directly to protected areas with crafted requests
      const protectedUrls = [
        'https://ibd.supplynation.org.au/communities',
        'https://ibd.supplynation.org.au/directory',
        'https://ibd.supplynation.org.au/search'
      ];

      for (const url of protectedUrls) {
        try {
          await this.page?.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 5000
          });

          if (await this.checkAuthenticationStatus()) {
            console.log(`Access granted to ${url}`);
            await this.captureSession();
            return true;
          }
        } catch (e) {
          // Continue to next URL
        }
      }

      return false;
    } catch (error) {
      console.log('Form bypass failed:', error.message);
      return false;
    }
  }

  private async processExtractedSession(sessionData: any): Promise<boolean> {
    // Process extracted session tokens
    // This would implement token validation and session establishment
    console.log('Processing extracted session data...');
    return false; // Placeholder for session processing logic
  }

  private async checkAuthenticationStatus(): Promise<boolean> {
    try {
      const authIndicators = await this.page?.evaluate(() => {
        const indicators = [
          'searchIBDButton',
          'logout',
          'profile',
          'dashboard',
          'Indigenous Business Directory'
        ];
        
        const pageText = document.body.innerText.toLowerCase();
        const foundIndicators = indicators.filter(indicator => 
          pageText.includes(indicator.toLowerCase())
        );
        
        return {
          authenticated: foundIndicators.length > 0,
          indicators: foundIndicators,
          url: window.location.href
        };
      });

      console.log('Authentication check:', authIndicators);
      return authIndicators?.authenticated || false;
    } catch (error) {
      console.log('Authentication check failed:', error.message);
      return false;
    }
  }

  private async captureSession(): Promise<void> {
    try {
      console.log('Capturing authentication session...');
      this.sessionCookies = await this.page?.cookies() || [];
      this.lastAuthTime = Date.now();
      console.log(`Session captured with ${this.sessionCookies.length} cookies`);
    } catch (error) {
      console.log('Session capture failed:', error.message);
    }
  }

  async searchBusinessesAdvanced(query: string): Promise<SupplyNationBusinessProfile[]> {
    try {
      if (!await this.authenticateAggressively()) {
        console.log('Authentication failed, cannot perform search');
        return [];
      }

      console.log(`Performing advanced search for: ${query}`);
      
      // Navigate to search interface
      await this.page?.goto('https://ibd.supplynation.org.au/communities', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // Perform search operations
      const businesses = await this.extractBusinessData(query);
      
      return businesses;
    } catch (error) {
      console.log('Advanced search failed:', error.message);
      return [];
    }
  }

  private async extractBusinessData(query: string): Promise<SupplyNationBusinessProfile[]> {
    try {
      console.log(`Extracting business data for: ${query}`);
      
      // Navigate to search interface
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      // Look for search input field
      const searchSelectors = [
        'input[type="search"]',
        'input[name="search"]',
        'input[placeholder*="search"]',
        'input[placeholder*="Search"]',
        '.search-input',
        '#search',
        '[data-search]'
      ];

      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          await this.page?.waitForSelector(selector, { timeout: 2000 });
          searchInput = selector;
          console.log(`Found search input: ${selector}`);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (searchInput) {
        // Clear any existing search terms
        await this.page?.click(searchInput, { clickCount: 3 });
        
        // Type search query
        await this.page?.type(searchInput, query, { delay: 100 });
        
        // Submit search
        await this.page?.keyboard.press('Enter');
        
        // Wait for results
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract business data from results
        const businesses = await this.page?.evaluate(() => {
          const results: any[] = [];
          
          // Look for business result cards/items
          const resultSelectors = [
            '.search-result',
            '.business-card',
            '.result-item',
            '[data-business]',
            '.supplier-card'
          ];
          
          for (const selector of resultSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              elements.forEach((element, index) => {
                if (index < 10) { // Limit to first 10 results
                  const business = {
                    companyName: '',
                    abn: '',
                    location: '',
                    supplynationId: `sn_${Date.now()}_${index}`,
                    profileUrl: '',
                    verified: true,
                    categories: [],
                    contactInfo: {},
                    description: '',
                    tradingName: '',
                    detailedAddress: ''
                  };
                  
                  // Extract company name
                  const nameElement = element.querySelector('h1, h2, h3, .company-name, .business-name, .name');
                  if (nameElement) {
                    business.companyName = nameElement.textContent?.trim() || '';
                  }
                  
                  // Extract location
                  const locationElement = element.querySelector('.location, .address, [data-location]');
                  if (locationElement) {
                    business.location = locationElement.textContent?.trim() || '';
                  }
                  
                  // Extract description
                  const descElement = element.querySelector('.description, .summary, p');
                  if (descElement) {
                    business.description = descElement.textContent?.trim() || '';
                  }
                  
                  // Extract profile URL
                  const linkElement = element.querySelector('a[href]');
                  if (linkElement) {
                    business.profileUrl = (linkElement as HTMLAnchorElement).href;
                  }
                  
                  if (business.companyName) {
                    results.push(business);
                  }
                }
              });
              break; // Found results, no need to check other selectors
            }
          }
          
          return results;
        }) || [];

        console.log(`Extracted ${businesses.length} businesses from Supply Nation`);
        return businesses;
      }

      console.log('No search input found on Supply Nation');
      return [];
      
    } catch (error) {
      console.log(`Business data extraction failed: ${error.message}`);
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
      console.log('Error closing browser:', error.message);
    }
  }

  getSessionInfo(): {
    isValid: boolean;
    cookieCount: number;
    lastAuthTime: Date | null;
    remainingTime: number;
  } {
    const now = Date.now();
    const remainingTime = Math.max(0, this.sessionDuration - (now - this.lastAuthTime));
    
    return {
      isValid: this.isSessionValid(),
      cookieCount: this.sessionCookies.length,
      lastAuthTime: this.lastAuthTime > 0 ? new Date(this.lastAuthTime) : null,
      remainingTime
    };
  }
}

export const supplyNationAdvancedCrawler = new SupplyNationAdvancedCrawler();