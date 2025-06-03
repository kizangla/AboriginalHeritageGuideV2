/**
 * Comprehensive Supply Nation Connection Manager
 * Uses all discovered URLs, elements, and patterns to establish reliable authentication
 */

import puppeteer from 'puppeteer';
import { SupplyNationUrlElementAnalyzer } from './supply-nation-url-element-analysis';

export interface ConnectionResult {
  success: boolean;
  authenticated: boolean;
  stage: string;
  details: string;
  error?: string;
  sessionData?: {
    cookies: any[];
    localStorage: any;
    currentUrl: string;
  };
}

export interface BusinessSearchResult {
  success: boolean;
  authenticationStatus: 'success' | 'failed' | 'timeout' | 'unknown';
  searchExecuted: boolean;
  businesses: Array<{
    companyName: string;
    abn?: string;
    location?: string;
    verified: boolean;
    profileUrl?: string;
    contactInfo?: {
      phone?: string;
      email?: string;
    };
    description?: string;
  }>;
  error?: string;
}

export class SupplyNationComprehensiveConnector {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private isAuthenticated: boolean = false;
  private sessionData: any = null;

  async establishConnection(): Promise<ConnectionResult> {
    console.log('Starting comprehensive Supply Nation connection...');

    try {
      // Initialize browser with optimized settings
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
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set realistic browser environment
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Set extra headers to mimic real browser
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // Test multiple login URLs
      const loginUrls = SupplyNationUrlElementAnalyzer.getAllLoginUrls();
      let connectionEstablished = false;
      let lastError = '';

      for (const url of loginUrls) {
        console.log(`Testing connection to: ${url}`);
        
        try {
          const response = await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          });

          if (response && response.status() === 200) {
            console.log(`Successfully connected to: ${url}`);
            connectionEstablished = true;
            break;
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          console.log(`Failed to connect to ${url}: ${lastError}`);
          continue;
        }
      }

      if (!connectionEstablished) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          stage: 'connection',
          details: 'Failed to connect to any Supply Nation URL',
          error: lastError
        };
      }

      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Analyze page structure
      const pageAnalysis = await this.analyzePage();
      console.log('Page analysis:', pageAnalysis);

      // Attempt authentication
      const authResult = await this.attemptAuthentication();
      
      if (authResult.success) {
        // Capture session data for future use
        this.sessionData = await this.captureSessionData();
        this.isAuthenticated = true;
        
        return {
          success: true,
          authenticated: true,
          stage: 'authenticated',
          details: 'Successfully authenticated with Supply Nation',
          sessionData: this.sessionData
        };
      } else {
        return authResult;
      }

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        authenticated: false,
        stage: 'error',
        details: 'Connection attempt failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async analyzePage(): Promise<any> {
    return await this.page?.evaluate(() => {
      const analysis = {
        url: window.location.href,
        title: document.title,
        forms: document.querySelectorAll('form').length,
        emailInputs: document.querySelectorAll('input[type="email"], input[type="text"]').length,
        passwordInputs: document.querySelectorAll('input[type="password"]').length,
        submitButtons: document.querySelectorAll('button[type="submit"], input[type="submit"]').length,
        authIndicators: [] as string[]
      };

      // Check for authentication indicators
      const authIndicators = [
        'searchIBDButton',
        'Search Indigenous Business',
        'Indigenous Business Directory',
        'Communities Landing'
      ];

      const bodyText = document.body.innerText;
      authIndicators.forEach(indicator => {
        if (bodyText.includes(indicator)) {
          analysis.authIndicators.push(indicator);
        }
      });

      return analysis;
    });
  }

  private async attemptAuthentication(): Promise<ConnectionResult> {
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;

    if (!username || !password) {
      return {
        success: false,
        authenticated: false,
        stage: 'credentials',
        details: 'Supply Nation credentials not available',
        error: 'Missing username or password'
      };
    }

    try {
      console.log('Attempting authentication with provided credentials...');

      // Wait for form elements to be available
      await this.page?.waitForSelector('input[type="email"], input[type="text"], input[type="password"]', {
        timeout: 10000
      });

      // Find and fill email/username field
      const emailFilled = await this.page?.evaluate((usr) => {
        const emailSelectors = [
          'input[type="email"]',
          'input[type="text"]',
          'input[name*="email"]',
          'input[name*="username"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="username" i]'
        ];

        for (const selector of emailSelectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input && !input.disabled && !input.readOnly) {
            input.focus();
            input.value = usr;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, username);

      if (!emailFilled) {
        return {
          success: false,
          authenticated: false,
          stage: 'email_input',
          details: 'Could not locate or fill email field',
          error: 'Email input not found'
        };
      }

      // Find and fill password field
      const passwordFilled = await this.page?.evaluate((pwd) => {
        const passwordSelectors = [
          'input[type="password"]',
          'input[name*="password"]',
          'input[placeholder*="password" i]'
        ];

        for (const selector of passwordSelectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input && !input.disabled && !input.readOnly) {
            input.focus();
            input.value = pwd;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, password);

      if (!passwordFilled) {
        return {
          success: false,
          authenticated: false,
          stage: 'password_input',
          details: 'Could not locate or fill password field',
          error: 'Password input not found'
        };
      }

      console.log('Credentials entered, submitting form...');

      // Submit the form
      const submitted = await this.page?.evaluate(() => {
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:contains("Login")',
          'button:contains("Sign In")'
        ];

        for (const selector of submitSelectors) {
          const button = document.querySelector(selector) as HTMLElement;
          if (button && !button.hidden) {
            button.click();
            return true;
          }
        }

        // Try form submission as fallback
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) {
          form.submit();
          return true;
        }

        return false;
      });

      if (!submitted) {
        return {
          success: false,
          authenticated: false,
          stage: 'form_submission',
          details: 'Could not submit authentication form',
          error: 'Submit button not found'
        };
      }

      // Wait for navigation or authentication indicators
      console.log('Waiting for authentication response...');
      
      try {
        await this.page?.waitForNavigation({ 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
      } catch (navError) {
        console.log('Navigation timeout, checking for authentication indicators...');
      }

      // Check if authentication was successful
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const authSuccess = await this.page?.evaluate(() => {
        const indicators = [
          'searchIBDButton',
          'Search Indigenous Business',
          'Indigenous Business Directory',
          'Communities Landing'
        ];
        
        const pageText = document.body.innerText;
        const authFound = indicators.some(indicator => pageText.includes(indicator));
        
        const currentUrl = window.location.href;
        const notOnLoginPage = !currentUrl.includes('/login');
        
        return {
          authIndicatorsFound: authFound,
          notOnLoginPage: notOnLoginPage,
          currentUrl: currentUrl,
          pageTitle: document.title
        };
      });

      if (authSuccess?.authIndicatorsFound || authSuccess?.notOnLoginPage) {
        console.log('Authentication successful');
        return {
          success: true,
          authenticated: true,
          stage: 'authenticated',
          details: `Authentication successful. Current URL: ${authSuccess.currentUrl}`
        };
      } else {
        return {
          success: false,
          authenticated: false,
          stage: 'authentication_failed',
          details: 'Form submitted but authentication indicators not found',
          error: 'Authentication may have failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        authenticated: false,
        stage: 'authentication_error',
        details: 'Error during authentication process',
        error: error instanceof Error ? error.message : 'Unknown authentication error'
      };
    }
  }

  private async captureSessionData(): Promise<any> {
    if (!this.page) return null;

    try {
      const cookies = await this.page.cookies();
      const localStorage = await this.page.evaluate(() => {
        const data: any = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key);
          }
        }
        return data;
      });
      
      const currentUrl = await this.page.url();

      return {
        cookies,
        localStorage,
        currentUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error capturing session data:', error);
      return null;
    }
  }

  async searchBusinesses(query: string): Promise<BusinessSearchResult> {
    if (!this.isAuthenticated || !this.page) {
      return {
        success: false,
        authenticationStatus: 'failed',
        searchExecuted: false,
        businesses: [],
        error: 'Not authenticated with Supply Nation'
      };
    }

    try {
      console.log(`Searching Supply Nation for: "${query}"`);

      // Navigate to search page
      const searchUrls = SupplyNationUrlElementAnalyzer.getAllSearchUrls();
      let searchPageFound = false;

      for (const searchUrl of searchUrls) {
        try {
          await this.page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 15000 
          });
          searchPageFound = true;
          break;
        } catch (error) {
          console.log(`Failed to navigate to search URL: ${searchUrl}`);
          continue;
        }
      }

      if (!searchPageFound) {
        return {
          success: false,
          authenticationStatus: 'success',
          searchExecuted: false,
          businesses: [],
          error: 'Could not access search page'
        };
      }

      // Perform search
      const searchExecuted = await this.page.evaluate((searchQuery) => {
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
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input) {
            input.focus();
            input.value = searchQuery;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Try to submit
            const form = input.closest('form');
            if (form) {
              form.submit();
              return true;
            }
            
            // Try enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            input.dispatchEvent(enterEvent);
            return true;
          }
        }
        return false;
      }, query);

      if (!searchExecuted) {
        return {
          success: false,
          authenticationStatus: 'success',
          searchExecuted: false,
          businesses: [],
          error: 'Could not execute search'
        };
      }

      // Wait for results
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract business results
      const businesses = await this.page.evaluate(() => {
        const results: any[] = [];
        
        // Try multiple result selectors
        const resultSelectors = [
          'p.slds-text-heading_medium.main-header',
          '.main-header',
          'a[href*="supplierprofile"]',
          '.business-result',
          '.search-result',
          '.supplier-listing',
          '.business-card',
          '.company-listing',
          'article',
          '.result-item'
        ];

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          
          elements.forEach((element) => {
            const profileLink = element.querySelector('a[href*="supplierprofile"]') || 
                              (element as HTMLAnchorElement).href?.includes('supplierprofile') ? element as HTMLAnchorElement : null;
            
            if (profileLink) {
              const companyName = profileLink.textContent?.trim() || '';
              const profileUrl = (profileLink as HTMLAnchorElement).href;
              
              if (companyName && profileUrl) {
                results.push({
                  companyName,
                  profileUrl,
                  verified: true,
                  abn: undefined,
                  location: undefined,
                  contactInfo: {},
                  description: undefined
                });
              }
            }
          });
          
          if (results.length > 0) break;
        }

        return results;
      });

      return {
        success: true,
        authenticationStatus: 'success',
        searchExecuted: true,
        businesses: businesses || []
      };

    } catch (error) {
      return {
        success: false,
        authenticationStatus: 'success',
        searchExecuted: false,
        businesses: [],
        error: error instanceof Error ? error.message : 'Search error'
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isAuthenticated = false;
      this.sessionData = null;
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    hasSessionData: boolean;
  } {
    return {
      connected: this.browser !== null && this.page !== null,
      authenticated: this.isAuthenticated,
      hasSessionData: this.sessionData !== null
    };
  }
}

export const supplyNationComprehensiveConnector = new SupplyNationComprehensiveConnector();