/**
 * Supply Nation Session Establishment Optimizer
 * Advanced session management and persistence for reliable authentication
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export interface SessionData {
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  authTokens: Record<string, string>;
  timestamp: number;
}

export interface OptimizedSupplyNationBusiness {
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

export class SupplyNationSessionOptimizer {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private sessionData: SessionData | null = null;
  private sessionFile: string = path.join(__dirname, '.supply-nation-session.json');
  private authenticated: boolean = false;
  private maxRetries: number = 5;
  private connectionRetries: number = 0;

  async initializeSessionOptimizer(): Promise<boolean> {
    try {
      console.log('Initializing session optimizer with enhanced configuration...');
      
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
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Enhanced page configuration for session management
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
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      });

      // Advanced stealth configuration
      await this.page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-AU', 'en-US', 'en'],
        });

        // Mock hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8,
        });

        // Mock device memory
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8,
        });

        // Override permissions API
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Remove automation indicators
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
      });

      return true;
    } catch (error) {
      console.error('Session optimizer initialization failed:', (error as Error).message);
      return false;
    }
  }

  async restoreSession(): Promise<boolean> {
    try {
      const sessionExists = await this.loadSessionData();
      if (!sessionExists) {
        console.log('No previous session found');
        return false;
      }

      if (!this.sessionData || this.isSessionExpired()) {
        console.log('Session expired or invalid');
        return false;
      }

      console.log('Restoring previous session...');

      // Set cookies
      if (this.sessionData.cookies.length > 0) {
        await this.page?.setCookie(...this.sessionData.cookies);
        console.log(`Restored ${this.sessionData.cookies.length} cookies`);
      }

      // Restore localStorage
      if (Object.keys(this.sessionData.localStorage).length > 0) {
        await this.page?.evaluate((storage) => {
          Object.keys(storage).forEach(key => {
            localStorage.setItem(key, storage[key]);
          });
        }, this.sessionData.localStorage);
      }

      // Restore sessionStorage
      if (Object.keys(this.sessionData.sessionStorage).length > 0) {
        await this.page?.evaluate((storage) => {
          Object.keys(storage).forEach(key => {
            sessionStorage.setItem(key, storage[key]);
          });
        }, this.sessionData.sessionStorage);
      }

      // Test session validity
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'networkidle2',
        timeout: 20000
      });

      await this.waitWithDelay(2000, 3000);

      const currentUrl = this.page?.url();
      const isValid = currentUrl && !currentUrl.includes('/login');

      if (isValid) {
        console.log('Session restored successfully');
        this.authenticated = true;
        return true;
      } else {
        console.log('Restored session is invalid');
        await this.clearSessionData();
        return false;
      }

    } catch (error) {
      console.error('Session restoration failed:', (error as Error).message);
      return false;
    }
  }

  async establishOptimizedSession(): Promise<boolean> {
    try {
      // First try to restore existing session
      const sessionRestored = await this.restoreSession();
      if (sessionRestored) {
        return true;
      }

      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials required for session establishment');
        return false;
      }

      console.log('Establishing new optimized session...');

      // Navigate with connection optimization
      const navigationSuccess = await this.optimizedNavigation();
      if (!navigationSuccess) {
        return this.retrySessionEstablishment();
      }

      // Enhanced authentication with session tracking
      const authSuccess = await this.performOptimizedAuthentication(username, password);
      if (!authSuccess) {
        return this.retrySessionEstablishment();
      }

      // Capture and persist session
      await this.captureSessionData();
      
      this.authenticated = true;
      console.log('Optimized session established successfully');
      return true;

    } catch (error) {
      console.error('Session establishment error:', (error as Error).message);
      return this.retrySessionEstablishment();
    }
  }

  private async optimizedNavigation(): Promise<boolean> {
    try {
      console.log('Performing optimized navigation to login page...');

      // Multiple navigation strategies with timeouts
      const navigationStrategies = [
        { waitUntil: 'networkidle2' as const, timeout: 25000 },
        { waitUntil: 'domcontentloaded' as const, timeout: 20000 },
        { waitUntil: 'load' as const, timeout: 15000 }
      ];

      for (const strategy of navigationStrategies) {
        try {
          await this.page?.goto('https://ibd.supplynation.org.au/s/login', strategy);
          
          // Wait for page stability
          await this.waitWithDelay(2000, 3500);
          
          // Check if page loaded correctly
          const pageTitle = await this.page?.title();
          const currentUrl = this.page?.url();
          
          if (pageTitle && currentUrl && currentUrl.includes('supplynation.org.au')) {
            console.log('Navigation successful');
            return true;
          }
        } catch (navError) {
          console.log(`Navigation strategy failed: ${(navError as Error).message}`);
          continue;
        }
      }

      console.log('All navigation strategies failed');
      return false;
    } catch (error) {
      console.error('Navigation error:', (error as Error).message);
      return false;
    }
  }

  private async performOptimizedAuthentication(username: string, password: string): Promise<boolean> {
    try {
      console.log('Performing optimized authentication...');

      // Check if already authenticated
      const currentUrl = this.page?.url();
      if (currentUrl && !currentUrl.includes('/login')) {
        console.log('Already authenticated');
        return true;
      }

      // Enhanced form detection with multiple strategies
      const formDetected = await this.detectAuthenticationForm();
      if (!formDetected) {
        console.log('Authentication form not detected');
        return false;
      }

      // Optimized credential filling
      const credentialsFilled = await this.fillCredentialsOptimized(username, password);
      if (!credentialsFilled) {
        console.log('Failed to fill credentials');
        return false;
      }

      // Enhanced form submission with session monitoring
      const formSubmitted = await this.submitAuthenticationForm();
      if (!formSubmitted) {
        console.log('Failed to submit authentication form');
        return false;
      }

      // Wait for authentication with enhanced monitoring
      const authCompleted = await this.waitForAuthenticationCompletion();
      if (!authCompleted) {
        console.log('Authentication completion timeout');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Authentication error:', (error as Error).message);
      return false;
    }
  }

  private async detectAuthenticationForm(): Promise<boolean> {
    try {
      // Wait for form elements with multiple strategies
      const detectionStrategies = [
        async () => {
          await this.page?.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
          await this.page?.waitForSelector('input[type="password"]', { timeout: 5000 });
          return true;
        },
        async () => {
          await this.page?.waitForSelector('form', { timeout: 8000 });
          const hasInputs = await this.page?.evaluate(() => {
            const form = document.querySelector('form');
            const emailInputs = form?.querySelectorAll('input[type="email"], input[type="text"]');
            const passwordInputs = form?.querySelectorAll('input[type="password"]');
            return emailInputs && emailInputs.length > 0 && passwordInputs && passwordInputs.length > 0;
          });
          return hasInputs || false;
        }
      ];

      for (const strategy of detectionStrategies) {
        try {
          const detected = await strategy();
          if (detected) {
            console.log('Authentication form detected');
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Form detection error:', (error as Error).message);
      return false;
    }
  }

  private async fillCredentialsOptimized(username: string, password: string): Promise<boolean> {
    try {
      // Enhanced username filling
      const usernameSelectors = [
        'input[type="email"]',
        'input[type="text"][name*="email"]',
        'input[type="text"][name*="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="username" i]'
      ];

      let usernameFilled = false;
      for (const selector of usernameSelectors) {
        try {
          const element = await this.page?.$(selector);
          if (element) {
            await element.click();
            await this.waitWithDelay(200, 400);
            await element.evaluate(el => (el as HTMLInputElement).value = '');
            await element.type(username, { delay: this.getRandomDelay(80, 150) });
            usernameFilled = true;
            console.log('Username filled successfully');
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!usernameFilled) {
        return false;
      }

      await this.waitWithDelay(500, 800);

      // Enhanced password filling
      const passwordSelectors = [
        'input[type="password"]',
        'input[name*="password"]'
      ];

      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          const element = await this.page?.$(selector);
          if (element) {
            await element.click();
            await this.waitWithDelay(200, 400);
            await element.evaluate(el => (el as HTMLInputElement).value = '');
            await element.type(password, { delay: this.getRandomDelay(80, 150) });
            passwordFilled = true;
            console.log('Password filled successfully');
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

  private async submitAuthenticationForm(): Promise<boolean> {
    try {
      await this.waitWithDelay(800, 1200);

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
        }
      ];

      for (const strategy of submitStrategies) {
        try {
          const success = await strategy();
          if (success) {
            console.log('Authentication form submitted');
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Form submission error:', (error as Error).message);
      return false;
    }
  }

  private async waitForAuthenticationCompletion(): Promise<boolean> {
    try {
      // Enhanced authentication monitoring with multiple checks
      const authMonitoringStrategies = [
        // URL change monitoring
        async () => {
          await this.page?.waitForFunction(
            () => !window.location.href.includes('/login'),
            { timeout: 15000 }
          );
          return true;
        },
        // Element monitoring
        async () => {
          await this.page?.waitForSelector('.authenticated-content, .dashboard, .search-results', { timeout: 12000 });
          return true;
        },
        // Network monitoring
        async () => {
          await this.page?.waitForResponse(
            response => response.url().includes('supplynation') && response.status() === 200,
            { timeout: 10000 }
          );
          return true;
        }
      ];

      for (const strategy of authMonitoringStrategies) {
        try {
          await strategy();
          
          // Additional verification
          await this.waitWithDelay(2000, 3000);
          const finalUrl = this.page?.url();
          
          if (finalUrl && !finalUrl.includes('/login')) {
            console.log('Authentication completed successfully');
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Authentication completion monitoring error:', (error as Error).message);
      return false;
    }
  }

  private async captureSessionData(): Promise<void> {
    try {
      console.log('Capturing session data for persistence...');

      // Capture cookies
      const cookies = await this.page?.cookies() || [];

      // Capture localStorage
      const localStorage = await this.page?.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            storage[key] = window.localStorage.getItem(key) || '';
          }
        }
        return storage;
      }) || {};

      // Capture sessionStorage
      const sessionStorage = await this.page?.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            storage[key] = window.sessionStorage.getItem(key) || '';
          }
        }
        return storage;
      }) || {};

      // Capture auth tokens from page
      const authTokens = await this.page?.evaluate(() => {
        const tokens: Record<string, string> = {};
        
        // Look for common auth token patterns
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || '';
          const tokenPatterns = [
            /token['":\s]*['"]([^'"]+)['"]/i,
            /csrf['":\s]*['"]([^'"]+)['"]/i,
            /sessionId['":\s]*['"]([^'"]+)['"]/i
          ];
          
          tokenPatterns.forEach((pattern, index) => {
            const match = content.match(pattern);
            if (match) {
              tokens[`token_${index}`] = match[1];
            }
          });
        });
        
        return tokens;
      }) || {};

      this.sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        authTokens,
        timestamp: Date.now()
      };

      await this.saveSessionData();
      console.log('Session data captured and saved');
    } catch (error) {
      console.error('Session capture error:', (error as Error).message);
    }
  }

  async searchWithOptimizedSession(query: string): Promise<OptimizedSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const sessionEstablished = await this.establishOptimizedSession();
        if (!sessionEstablished) {
          console.log('Cannot search without optimized session');
          return [];
        }
      }

      console.log(`Executing search with optimized session for: ${query}`);

      // Navigate to search page with session
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      await this.waitWithDelay(2000, 3000);

      // Execute search
      const searchExecuted = await this.executeOptimizedSearch(query);
      
      if (searchExecuted) {
        await this.waitWithDelay(3000, 5000);
        const businesses = await this.extractOptimizedResults();
        console.log(`Optimized session search found ${businesses.length} businesses`);
        return businesses;
      }

      console.log('Optimized search execution failed');
      return [];

    } catch (error) {
      console.error('Optimized session search error:', (error as Error).message);
      return [];
    }
  }

  private async executeOptimizedSearch(query: string): Promise<boolean> {
    try {
      const searchSelectors = [
        'input[type="search"]',
        'input[name*="search"]',
        'input[placeholder*="search" i]',
        '.search-input',
        '#search'
      ];

      for (const selector of searchSelectors) {
        try {
          const element = await this.page?.$(selector);
          if (element) {
            await element.click();
            await this.waitWithDelay(300, 500);
            await element.evaluate(el => (el as HTMLInputElement).value = '');
            await element.type(query, { delay: this.getRandomDelay(100, 180) });
            await this.waitWithDelay(600, 1000);
            await this.page?.keyboard.press('Enter');
            console.log(`Search executed using: ${selector}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Search execution error:', (error as Error).message);
      return false;
    }
  }

  private async extractOptimizedResults(): Promise<OptimizedSupplyNationBusiness[]> {
    try {
      const businesses = await this.page?.evaluate(() => {
        const results: any[] = [];
        
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
                  supplynationId: `opt_session_${Date.now()}_${index}`,
                  profileUrl: '',
                  verified: true,
                  categories: [],
                  contactInfo: {},
                  description: ''
                };

                // Extract company name
                const nameSelectors = ['h1', 'h2', 'h3', '.name', '.company-name', '.business-name', '.title'];
                for (const nameSelector of nameSelectors) {
                  const nameEl = element.querySelector(nameSelector);
                  if (nameEl?.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                // Extract location
                const locationSelectors = ['.location', '.address', '.suburb', '.state'];
                for (const locSelector of locationSelectors) {
                  const locEl = element.querySelector(locSelector);
                  if (locEl?.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                // Extract description
                const descSelectors = ['.description', '.summary', 'p'];
                for (const descSelector of descSelectors) {
                  const descEl = element.querySelector(descSelector);
                  if (descEl?.textContent?.trim()) {
                    business.description = descEl.textContent.trim();
                    break;
                  }
                }

                // Extract URL
                const linkEl = element.querySelector('a[href]');
                if (linkEl) {
                  business.profileUrl = (linkEl as HTMLAnchorElement).href;
                }

                // Extract ABN and contact info
                const elementText = element.textContent || '';
                const abnMatch = elementText.match(/\b\d{11}\b/);
                if (abnMatch) {
                  business.abn = abnMatch[0];
                }

                const phoneMatch = elementText.match(/\b(?:\+61[\s-]?)?\d{2,4}[\s-]?\d{4}[\s-]?\d{4}\b/);
                if (phoneMatch) {
                  business.contactInfo.phone = phoneMatch[0];
                }

                const emailMatch = elementText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
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
      console.error('Result extraction error:', (error as Error).message);
      return [];
    }
  }

  private async retrySessionEstablishment(): Promise<boolean> {
    this.connectionRetries++;
    
    if (this.connectionRetries < this.maxRetries) {
      console.log(`Retrying session establishment (attempt ${this.connectionRetries + 1}/${this.maxRetries})`);
      await this.waitWithDelay(3000, 5000);
      return await this.establishOptimizedSession();
    }
    
    console.log('Maximum session establishment retries reached');
    return false;
  }

  private async loadSessionData(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf-8');
      this.sessionData = JSON.parse(data);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async saveSessionData(): Promise<void> {
    try {
      if (this.sessionData) {
        await fs.writeFile(this.sessionFile, JSON.stringify(this.sessionData, null, 2));
      }
    } catch (error) {
      console.error('Failed to save session data:', (error as Error).message);
    }
  }

  private async clearSessionData(): Promise<void> {
    try {
      await fs.unlink(this.sessionFile);
      this.sessionData = null;
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  private isSessionExpired(): boolean {
    if (!this.sessionData) return true;
    
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return (Date.now() - this.sessionData.timestamp) > maxAge;
  }

  private async waitWithDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async closeSessionOptimizer(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.authenticated = false;
        this.connectionRetries = 0;
      }
    } catch (error) {
      console.error('Error closing session optimizer:', (error as Error).message);
    }
  }

  getSessionStatus(): { 
    authenticated: boolean; 
    sessionValid: boolean; 
    retries: number; 
    maxRetries: number;
    hasSessionData: boolean;
  } {
    return {
      authenticated: this.authenticated,
      sessionValid: this.sessionData !== null && !this.isSessionExpired(),
      retries: this.connectionRetries,
      maxRetries: this.maxRetries,
      hasSessionData: this.sessionData !== null
    };
  }
}

export const supplyNationSessionOptimizer = new SupplyNationSessionOptimizer();