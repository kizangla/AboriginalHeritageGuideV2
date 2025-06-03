/**
 * Advanced Supply Nation Session Manager
 * Comprehensive session establishment with intelligent retry mechanisms
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export interface AdvancedSessionData {
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  userAgent: string;
  timestamp: number;
  authenticated: boolean;
  sessionId?: string;
  authTokens: Record<string, string>;
}

export interface AdvancedSupplyNationBusiness {
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

export class SupplyNationAdvancedSessionManager {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private sessionFile: string = path.join(__dirname, '.sn-advanced-session.json');
  private authenticated: boolean = false;
  private currentSessionData: AdvancedSessionData | null = null;
  private userAgent: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

  async initializeAdvancedSession(): Promise<boolean> {
    try {
      console.log('Initializing advanced session manager...');
      
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
          '--disable-ipc-flooding-protection',
          '--user-agent=' + this.userAgent
        ]
      });

      this.page = await this.browser.newPage();
      
      // Advanced session configuration
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent(this.userAgent);
      
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });

      // Enhanced stealth configuration
      await this.page.evaluateOnNewDocument(() => {
        // Override navigator properties
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        
        // Mock chrome object
        (window as any).chrome = {
          runtime: {},
          loadTimes: function() { return {}; },
          csi: function() { return {}; },
          app: {}
        };

        // Override permissions query
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission as any }) :
            originalQuery(parameters)
        );
      });

      return true;
    } catch (error) {
      console.error('Advanced session initialization failed:', (error as Error).message);
      return false;
    }
  }

  async establishPersistentSession(): Promise<boolean> {
    try {
      // Try to restore existing session first
      const sessionRestored = await this.restoreAdvancedSession();
      if (sessionRestored) {
        console.log('Existing session restored successfully');
        return true;
      }

      console.log('Establishing new persistent session...');
      
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials required for session establishment');
        return false;
      }

      // Multi-stage authentication with intelligent retry
      const authSteps = [
        () => this.navigateToLoginWithRetry(),
        () => this.waitForPageStability(),
        () => this.detectAndAnalyzeLoginForm(),
        () => this.performIntelligentAuthentication(username, password),
        () => this.waitForAuthenticationSuccess(),
        () => this.captureAdvancedSessionData()
      ];

      for (const step of authSteps) {
        const success = await step();
        if (!success) {
          console.log('Authentication step failed, retrying session establishment...');
          return await this.retrySessionEstablishment();
        }
      }

      this.authenticated = true;
      console.log('Persistent session established successfully');
      return true;

    } catch (error) {
      console.error('Session establishment error:', (error as Error).message);
      return false;
    }
  }

  private async navigateToLoginWithRetry(): Promise<boolean> {
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Navigation attempt ${attempt}/${maxAttempts}...`);
        
        const response = await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        if (response?.status() === 200) {
          console.log('Navigation successful');
          return true;
        }
        
        console.log(`Navigation attempt ${attempt} failed with status: ${response?.status()}`);
        
      } catch (error) {
        console.log(`Navigation attempt ${attempt} failed: ${(error as Error).message}`);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
        }
      }
    }
    
    return false;
  }

  private async waitForPageStability(): Promise<boolean> {
    try {
      console.log('Waiting for page stability...');
      
      // Wait for network to settle
      await this.page?.waitForLoadState?.('networkidle') || 
            new Promise(resolve => setTimeout(resolve, 5000));
      
      // Additional stability check
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return true;
    } catch (error) {
      console.error('Page stability wait failed:', (error as Error).message);
      return false;
    }
  }

  private async detectAndAnalyzeLoginForm(): Promise<boolean> {
    try {
      console.log('Detecting and analyzing login form...');
      
      // Wait for form elements with multiple strategies
      const formDetection = await Promise.race([
        this.page?.waitForSelector('input[type="email"], input[type="text"]', { timeout: 15000 }),
        this.page?.waitForSelector('form', { timeout: 15000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Form detection timeout')), 20000))
      ]);

      if (!formDetection) {
        console.log('Login form not detected within timeout');
        return false;
      }

      // Analyze form structure
      const formAnalysis = await this.page?.evaluate(() => {
        const emailInputs = document.querySelectorAll('input[type="email"], input[type="text"], input[name*="email"], input[name*="username"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button');
        
        return {
          emailInputs: emailInputs.length,
          passwordInputs: passwordInputs.length,
          submitButtons: submitButtons.length,
          hasValidForm: emailInputs.length > 0 && passwordInputs.length > 0
        };
      });

      if (formAnalysis?.hasValidForm) {
        console.log(`Login form detected: ${formAnalysis.emailInputs} email fields, ${formAnalysis.passwordInputs} password fields`);
        return true;
      } else {
        console.log('Valid login form not found');
        return false;
      }

    } catch (error) {
      console.error('Form detection error:', (error as Error).message);
      return false;
    }
  }

  private async performIntelligentAuthentication(username: string, password: string): Promise<boolean> {
    try {
      console.log('Performing intelligent authentication...');

      // Enhanced username input with multiple strategies
      const usernameSuccess = await this.fillFieldIntelligently(
        ['input[type="email"]', 'input[type="text"]', 'input[name*="email"]', 'input[name*="username"]'],
        username,
        'username'
      );

      if (!usernameSuccess) {
        console.log('Failed to fill username field');
        return false;
      }

      // Delay between username and password
      await new Promise(resolve => setTimeout(resolve, 800));

      // Enhanced password input
      const passwordSuccess = await this.fillFieldIntelligently(
        ['input[type="password"]', 'input[name*="password"]'],
        password,
        'password'
      );

      if (!passwordSuccess) {
        console.log('Failed to fill password field');
        return false;
      }

      // Submit form with multiple strategies
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const submitSuccess = await this.submitFormIntelligently();
      
      return submitSuccess;

    } catch (error) {
      console.error('Authentication error:', (error as Error).message);
      return false;
    }
  }

  private async fillFieldIntelligently(selectors: string[], value: string, fieldType: string): Promise<boolean> {
    for (const selector of selectors) {
      try {
        const element = await this.page?.$(selector);
        if (element) {
          await element.click();
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Clear field
          await element.evaluate((el: any) => el.value = '');
          
          // Type with human-like delays
          await element.type(value, { 
            delay: Math.floor(Math.random() * 100) + 50 
          });
          
          console.log(`${fieldType} field filled using: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  }

  private async submitFormIntelligently(): Promise<boolean> {
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
        // Find any button that might be the submit button
        const buttons = await this.page?.$$('button');
        if (buttons && buttons.length > 0) {
          for (const button of buttons) {
            const text = await button.evaluate(el => el.textContent?.toLowerCase());
            if (text?.includes('login') || text?.includes('sign in') || text?.includes('submit')) {
              await button.click();
              return true;
            }
          }
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
          console.log('Form submitted successfully');
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  private async waitForAuthenticationSuccess(): Promise<boolean> {
    try {
      console.log('Waiting for authentication success...');
      
      // Monitor for authentication success with multiple indicators
      const authSuccess = await Promise.race([
        // URL change indicator
        this.page?.waitForFunction(
          () => !window.location.href.includes('/login'),
          { timeout: 20000 }
        ).then(() => 'url_change'),
        
        // Page content indicator
        this.page?.waitForSelector('.authenticated, .dashboard, .search-results', { timeout: 15000 }).then(() => 'content_indicator'),
        
        // Network response indicator
        this.page?.waitForResponse(
          response => response.url().includes('supplynation') && response.status() === 200 && !response.url().includes('/login'),
          { timeout: 18000 }
        ).then(() => 'network_response'),
        
        // Timeout
        new Promise((_, reject) => setTimeout(() => reject(new Error('Authentication timeout')), 25000))
      ]);

      if (authSuccess) {
        console.log(`Authentication successful (detected via: ${authSuccess})`);
        
        // Additional verification
        await new Promise(resolve => setTimeout(resolve, 2000));
        const currentUrl = this.page?.url();
        
        if (currentUrl && !currentUrl.includes('/login')) {
          return true;
        }
      }
      
      return false;

    } catch (error) {
      console.error('Authentication success monitoring failed:', (error as Error).message);
      return false;
    }
  }

  private async captureAdvancedSessionData(): Promise<boolean> {
    try {
      console.log('Capturing advanced session data...');

      const cookies = await this.page?.cookies() || [];
      
      const storageData = await this.page?.evaluate(() => {
        const localStorage: Record<string, string> = {};
        const sessionStorage: Record<string, string> = {};
        const authTokens: Record<string, string> = {};
        
        // Capture localStorage
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            localStorage[key] = window.localStorage.getItem(key) || '';
          }
        }
        
        // Capture sessionStorage
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            sessionStorage[key] = window.sessionStorage.getItem(key) || '';
          }
        }
        
        // Capture auth tokens from scripts and meta tags
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          const content = script.textContent || '';
          const tokenPatterns = [
            { pattern: /token['":\s]*['"]([^'"]+)['"]/i, name: 'auth_token' },
            { pattern: /csrf['":\s]*['"]([^'"]+)['"]/i, name: 'csrf_token' },
            { pattern: /sessionId['":\s]*['"]([^'"]+)['"]/i, name: 'session_id' },
            { pattern: /apiKey['":\s]*['"]([^'"]+)['"]/i, name: 'api_key' }
          ];
          
          tokenPatterns.forEach(({ pattern, name }) => {
            const match = content.match(pattern);
            if (match) {
              authTokens[name] = match[1];
            }
          });
        });
        
        return { localStorage, sessionStorage, authTokens };
      }) || { localStorage: {}, sessionStorage: {}, authTokens: {} };

      this.currentSessionData = {
        cookies,
        localStorage: storageData.localStorage,
        sessionStorage: storageData.sessionStorage,
        userAgent: this.userAgent,
        timestamp: Date.now(),
        authenticated: true,
        authTokens: storageData.authTokens
      };

      await this.saveAdvancedSessionData();
      console.log(`Session data captured: ${cookies.length} cookies, ${Object.keys(storageData.localStorage).length} localStorage items`);
      
      return true;

    } catch (error) {
      console.error('Session data capture failed:', (error as Error).message);
      return false;
    }
  }

  private async restoreAdvancedSession(): Promise<boolean> {
    try {
      const sessionExists = await this.loadAdvancedSessionData();
      if (!sessionExists || !this.currentSessionData) {
        return false;
      }

      // Check if session is expired (24 hours)
      if (Date.now() - this.currentSessionData.timestamp > 24 * 60 * 60 * 1000) {
        console.log('Session expired');
        return false;
      }

      console.log('Restoring advanced session...');

      // Set cookies
      if (this.currentSessionData.cookies.length > 0) {
        await this.page?.setCookie(...this.currentSessionData.cookies);
      }

      // Set user agent
      await this.page?.setUserAgent(this.currentSessionData.userAgent);

      // Restore storage
      await this.page?.evaluate((sessionData) => {
        // Restore localStorage
        Object.keys(sessionData.localStorage).forEach(key => {
          localStorage.setItem(key, sessionData.localStorage[key]);
        });
        
        // Restore sessionStorage
        Object.keys(sessionData.sessionStorage).forEach(key => {
          sessionStorage.setItem(key, sessionData.sessionStorage[key]);
        });
      }, this.currentSessionData);

      // Test session validity
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'networkidle0',
        timeout: 20000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = this.page?.url();
      const isValid = currentUrl && !currentUrl.includes('/login');

      if (isValid) {
        this.authenticated = true;
        console.log('Advanced session restored successfully');
        return true;
      } else {
        console.log('Restored session is invalid');
        await this.clearAdvancedSessionData();
        return false;
      }

    } catch (error) {
      console.error('Session restoration failed:', (error as Error).message);
      return false;
    }
  }

  async searchWithAdvancedSession(query: string): Promise<AdvancedSupplyNationBusiness[]> {
    try {
      if (!this.authenticated) {
        const sessionEstablished = await this.establishPersistentSession();
        if (!sessionEstablished) {
          console.log('Cannot search without authenticated session');
          return [];
        }
      }

      console.log(`Executing advanced session search for: ${query}`);

      // Navigate to search page
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Execute search
      const searchExecuted = await this.executeAdvancedSearch(query);
      
      if (searchExecuted) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        const businesses = await this.extractAdvancedResults();
        console.log(`Advanced session search found ${businesses.length} businesses`);
        return businesses;
      }

      console.log('Advanced search execution failed');
      return [];

    } catch (error) {
      console.error('Advanced session search error:', (error as Error).message);
      return [];
    }
  }

  private async executeAdvancedSearch(query: string): Promise<boolean> {
    try {
      const searchSelectors = [
        'input[type="search"]',
        'input[name*="search"]',
        'input[placeholder*="search" i]',
        'input[placeholder*="business" i]',
        'input[placeholder*="company" i]',
        '.search-input',
        '#search',
        '[data-search]'
      ];

      for (const selector of searchSelectors) {
        try {
          const element = await this.page?.$(selector);
          if (element) {
            await element.click();
            await new Promise(resolve => setTimeout(resolve, 300));
            await element.evaluate((el: any) => el.value = '');
            await element.type(query, { delay: Math.floor(Math.random() * 100) + 80 });
            await new Promise(resolve => setTimeout(resolve, 800));
            await this.page?.keyboard.press('Enter');
            console.log(`Advanced search executed using: ${selector}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Advanced search execution error:', (error as Error).message);
      return false;
    }
  }

  private async extractAdvancedResults(): Promise<AdvancedSupplyNationBusiness[]> {
    try {
      const businesses = await this.page?.evaluate(() => {
        const results: any[] = [];
        
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
              if (index < 30) {
                const business: any = {
                  companyName: '',
                  abn: '',
                  location: '',
                  supplynationId: `adv_session_${Date.now()}_${index}`,
                  profileUrl: '',
                  verified: true,
                  categories: [],
                  contactInfo: {},
                  description: ''
                };

                // Enhanced data extraction
                const nameSelectors = ['h1', 'h2', 'h3', 'h4', '.name', '.company-name', '.business-name', '.title'];
                for (const nameSelector of nameSelectors) {
                  const nameEl = element.querySelector(nameSelector);
                  if (nameEl?.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                const locationSelectors = ['.location', '.address', '.suburb', '.state', '.postcode'];
                for (const locSelector of locationSelectors) {
                  const locEl = element.querySelector(locSelector);
                  if (locEl?.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                const descSelectors = ['.description', '.summary', '.business-description', 'p'];
                for (const descSelector of descSelectors) {
                  const descEl = element.querySelector(descSelector);
                  if (descEl?.textContent?.trim()) {
                    business.description = descEl.textContent.trim();
                    break;
                  }
                }

                const linkEl = element.querySelector('a[href]');
                if (linkEl) {
                  const href = (linkEl as HTMLAnchorElement).href;
                  business.profileUrl = href.startsWith('http') ? href : `https://ibd.supplynation.org.au${href}`;
                }

                const elementText = element.textContent || '';
                
                // Enhanced pattern matching
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
      console.error('Advanced result extraction error:', (error as Error).message);
      return [];
    }
  }

  private async retrySessionEstablishment(): Promise<boolean> {
    console.log('Retrying session establishment with enhanced parameters...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    return await this.establishPersistentSession();
  }

  private async loadAdvancedSessionData(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf-8');
      this.currentSessionData = JSON.parse(data);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async saveAdvancedSessionData(): Promise<void> {
    try {
      if (this.currentSessionData) {
        await fs.writeFile(this.sessionFile, JSON.stringify(this.currentSessionData, null, 2));
      }
    } catch (error) {
      console.error('Failed to save advanced session data:', (error as Error).message);
    }
  }

  private async clearAdvancedSessionData(): Promise<void> {
    try {
      await fs.unlink(this.sessionFile);
      this.currentSessionData = null;
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  async closeAdvancedSession(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.authenticated = false;
      }
    } catch (error) {
      console.error('Error closing advanced session:', (error as Error).message);
    }
  }

  getAdvancedSessionStatus(): { 
    authenticated: boolean; 
    sessionData: boolean; 
    timestamp?: number;
    cookieCount?: number;
  } {
    return {
      authenticated: this.authenticated,
      sessionData: this.currentSessionData !== null,
      timestamp: this.currentSessionData?.timestamp,
      cookieCount: this.currentSessionData?.cookies.length
    };
  }
}

export const supplyNationAdvancedSessionManager = new SupplyNationAdvancedSessionManager();